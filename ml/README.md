# RelayClarity Risk Model (`ml/`)

A real, trained machine-learning pipeline for the case-risk classifier. It
replaces the deterministic heuristic in `server/ai/risk-scoring.tsx` as the
primary scorer, while that heuristic remains the fallback when no model artifact
is present.

## Design

- **Model:** multinomial logistic regression (scikit-learn). Linear and fully
  transparent — chosen for auditability and per-feature explainability over raw
  accuracy, which matters in a governed / public-sector setting.
- **Shared feature contract:** `features.py` defines the exact feature vector.
  `server/ai/risk-features.tsx` reimplements the same logic so training and
  serving cannot drift apart.
- **Portable artifact:** training exports `artifacts/risk_model.json` (scaler
  stats, coefficients, intercepts, calibration temperature, baseline
  distribution, thresholds). The TypeScript server loads this JSON and runs
  inference natively — no Python runtime needed in production.
- **Calibrated confidence:** training fits a post-hoc **temperature** on a
  held-out calibration slice (`_fit_temperature` in `train.py`, currently
  **T = 1.0446**). The same temperature is applied identically in `infer.py` and
  `server/ai/risk-model.tsx`, so confidence values are trustworthy and the
  predicted class is unchanged. Measured **ECE = 0.0167**.
- **Synthetic data only.** No real customer or resident data is used.

Architecture: **train → JSON artifact → {TypeScript server, FastAPI service,
Azure ML endpoint}** — one model, three consumers, no skew.

## Pipeline

```bash
python -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements.txt

ml/.venv/bin/python ml/generate_data.py --rows 6000 --seed 42   # synth train/test
ml/.venv/bin/python ml/train.py --trained-at "$(date -u +%FT%TZ)" # fit + export artifact
ml/.venv/bin/python ml/evaluate.py                               # metrics + fairness + gate
```

Or, from the project root: `npm run ml:pipeline`.

## Files

| File | Purpose |
| --- | --- |
| `features.py` | Single source of truth for the feature contract (mirrored in TS). |
| `generate_data.py` | Synthetic labelled cases with a noisy latent ground truth. |
| `train.py` | Fits the model + temperature calibration, exports `artifacts/risk_model.json`. |
| `evaluate.py` | Accuracy, macro-F1, high-risk recall, confusion matrix, **calibration (ECE + reliability)**, **performance (latency/throughput/cost)**, fairness slices, deployment gate. |
| `infer.py` | Artifact-based inference (with temperature scaling) used by `evaluate.py` (parity with the TS server). |
| `export_parity_fixtures.py` | Runs representative inputs through `infer.py` and writes `server/ai/__fixtures__/parity-fixtures.json` for the TS parity test (`server/ai/parity.test.tsx`) — proves no train-serve skew. |
| `retrain_from_feedback.py` | Gated retraining from human feedback (see below). |

## Evaluation outputs

`evaluate.py` writes `artifacts/evaluation.json`, which now includes:

- **Quality:** accuracy 0.8042, macroF1 0.7692, highRecall 0.8541, per-class
  precision/recall/F1, confusion matrix.
- **Calibration:** `calibration.expectedCalibrationError` (0.0167) plus a
  reliability table (mean confidence vs accuracy per bin).
- **Performance:** `performance.meanLatencyMs` (0.0357), `p95LatencyMs` (0.0532),
  `throughputPerSec` (~28,012), and an indicative `estimatedCostPer1kGbp`.
- **Fairness:** high-risk-rate disparity gaps — customerTier 0.2059, channel
  0.0691, category 0.3252.

## Deployment gate

`evaluate.py` blocks promotion unless accuracy ≥ 0.70, high-risk recall ≥ 0.70,
and macro-F1 ≥ 0.65 (`deploymentGate` in `artifacts/evaluation.json`).

## Parity (no train-serve skew)

`export_parity_fixtures.py` runs a diverse set of inputs through `infer.py` and
writes `server/ai/__fixtures__/parity-fixtures.json`. The TypeScript parity test
(`server/ai/parity.test.tsx`) asserts the TS scorer reproduces the Python model's
labels and probabilities exactly. The FastAPI service (`serving/`) and Azure
endpoint (`azure/`) reuse `infer.py` directly, so all paths are identical.

## Retraining from feedback

`retrain_from_feedback.py` closes the field-to-model loop. It consumes
officer-confirmed feedback (from `GET /api/monitoring/training-feedback`), merges
it with the synthetic training set at a higher sample weight, retrains a
shape-identical candidate (with the same temperature calibration), re-evaluates
both the live model and the candidate on the held-out test set, and **promotes
the candidate only if every gate passes**: accuracy ≥ 0.70, high-risk recall
≥ 0.70, macro-F1 ≥ 0.65, **no** high-risk recall regression > 0.02, and **no**
tier fairness regression > 0.02.

```bash
# Safe by default: dry-run, prints a current-vs-candidate comparison + gates,
# never writes the live artifact.
ml/.venv/bin/python ml/retrain_from_feedback.py --feedback feedback.json

# Promote ONLY if all gates pass; backs up the live artifact to
# risk_model.prev.json first (the rollback point).
ml/.venv/bin/python ml/retrain_from_feedback.py --feedback feedback.json --promote
```

A report is written to `artifacts/retrain_report.json`. Promotion requested but
blocked by gates exits non-zero (CI-friendly).

## Serving & cloud

The exported artifact is served three ways from one source of truth
(`artifacts/risk_model.json`):

- **TypeScript server** — `server/ai/risk-model.tsx` (`scoreRisk`), live in-app
  scoring with the heuristic fallback intact.
- **FastAPI service** — [`serving/`](../serving): a Python HTTP scoring service
  reusing `ml/infer.py`, containerised (`serving/Dockerfile`) for AKS or any
  container runtime.
- **Azure ML managed online endpoint** — [`azure/`](../azure): `azure/score.py`
  reuses the same inference code; `register_and_deploy.sh` registers the model,
  creates the endpoint, and supports blue/green rollback.

## Monitoring

- Drift (PSI vs the training baseline, warn 0.10 / alert 0.20):
  `GET /api/monitoring/drift-report`.
- Fairness (live `customerTier`/`channel` disparity, warn 0.20 / alert 0.30) and
  operational health: same drift report.
- Human override / feedback loop: `POST /api/risk/feedback`,
  `GET /api/monitoring/feedback-report`, `GET /api/monitoring/training-feedback`.
- Model provenance: `GET /api/risk/model`.

See `docs/model-card.md`, `docs/responsible-ai.md`, `docs/dpia.md`, and
`docs/incident-runbook.md`.
