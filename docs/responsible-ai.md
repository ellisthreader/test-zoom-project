# Responsible AI — Case-Risk Classifier

A responsible-AI summary for the RelayClarity risk model. The **full** UK GDPR
Data Protection Impact Assessment lives in [`dpia.md`](./dpia.md); this document
is the operational responsible-AI overview that points to it.

## 1. Purpose & necessity

Prioritising support cases by risk so human teams handle the most urgent and
sensitive issues first. The model is a triage aid, not a decision-maker.

## 2. Data & lawful basis

- The published model uses **synthetic data only** — no personal data, so no
  lawful-basis question for this demo.
- Before any real data: complete a full DPIA, agree a lawful basis, minimise
  fields, and confirm retention with Information Governance.

## 3. Automated decision-making (UK GDPR Art. 22)

- No solely-automated decisions with legal/significant effect.
- Every recommendation is advisory; a named human owner reviews and can
  override. Overrides are logged (`POST /api/risk/feedback`).

## 4. Calibrated confidence

Class probabilities are **calibrated** via post-hoc temperature scaling
(temperature **1.0446** in `ml/artifacts/risk_model.json`), applied identically
in `ml/infer.py` and `server/ai/risk-model.tsx`. Measured **Expected Calibration
Error = 0.0167**. Calibration leaves the predicted class unchanged, so accuracy
and high-risk recall are untouched, while the confidence that drives the 0.6
mandatory-review threshold is trustworthy.

## 5. Key risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Proxy discrimination (tier, channel, postcode-like proxies) | Fairness slices reported every evaluation (tier gap **0.2059**, channel **0.0691**, category **0.3252**) **and live** by `customerTier`/`channel`; gaps reviewed by a human, not auto-tuned. |
| Over-reliance / automation bias | Advisory framing, calibrated confidence shown (ECE 0.0167), low-confidence cases force review, override rate monitored. |
| Free-text bias | Transparent keyword counts rather than opaque embeddings; documented. |
| Label bias | Synthetic labels documented; real labels enter only via the gated retraining loop with no fairness/recall regression allowed. |
| Silent degradation | PSI drift monitoring (warn 0.10 / alert 0.20) with a documented rollback (`risk_model.prev.json` / Azure traffic shift). |
| Train-serve skew | Parity test (`server/ai/parity.test.tsx`) proves the TS scorer matches the Python model on fixtures from `ml/export_parity_fixtures.py`. |
| Lack of recourse | Plain-English reasons and attributions so a person can understand and challenge a score. |

## 5a. Live fairness monitoring

`server/ai/monitoring.tsx` computes the high-risk-rate disparity gap by
`customerTier` and `channel` on real traffic (`GET /api/monitoring/drift-report`,
under `fairness`). Thresholds: **warn ≥ 0.20, alert ≥ 0.30**, with a minimum
30 total / 10 per group before a gap is trusted. A fairness alert notifies the
model owner and DPO; gaps are never silently re-tuned.

## 5b. Retraining loop with promotion gates

`ml/retrain_from_feedback.py` closes the field-to-model loop: officer-confirmed
feedback is merged with the synthetic set and a candidate is retrained, then
promoted **only** if every gate holds — accuracy ≥ 0.70, high-risk recall ≥ 0.70,
macro-F1 ≥ 0.65, **no** recall regression > 0.02, and **no** tier fairness
regression > 0.02. It is **dry-run by default** and backs up the live artifact to
`risk_model.prev.json` before any promotion.

## 6. Human oversight

- Mandatory review when risk is high, confidence is below threshold, or the case
  was escalated (`humanReviewRequired`).
- Officer accept/override decisions are captured and fed back for retraining —
  the field-to-model feedback loop.

## 7. Transparency

- Model card: `docs/model-card.md`.
- Full DPIA: `docs/dpia.md`. Incident runbook: `docs/incident-runbook.md`.
- Provenance endpoint: `GET /api/risk/model`.
- Suitable for an Algorithmic Transparency Recording Standard (ATRS) entry in a
  public-sector context.

## 8. Security & operations (before real data)

- Serve behind authentication and an API gateway; keep secrets in a vault. The
  Azure ML endpoint uses key auth (`azure/endpoint.yml`).
- Audit predictions, decisions, model version, and confidence durably.
- Access controls, retention limits, and incident response agreed with IG — see
  `docs/dpia.md` (§10–§11) and `docs/incident-runbook.md`.

## 9. Review cadence

Re-assess on every model version, on a material data change, on a sustained
fairness/drift alert, or at least annually. Re-run `npm run ml:pipeline` (or the
gated `ml/retrain_from_feedback.py`) and review metrics, calibration, fairness,
and drift before promotion. See the full DPIA review cadence in `docs/dpia.md`.
