# RelayClarity Risk Scoring — FastAPI service

A production HTTP scoring service for the RelayClarity risk model. It is a thin
wrapper around the existing inference code in [`ml/`](../ml): `serving/app.py`
adds `ml/` to `sys.path` and reuses `ml/features.py` + `ml/infer.py` directly, so
predictions are **identical** to `ml/infer.py` and to the TypeScript server
(`server/ai/risk-model.tsx`). There is no duplicated inference math and no model
skew — all three paths evaluate the same exported artifact
(`ml/artifacts/risk_model.json`).

## Endpoints

| Method | Path      | Description |
| ------ | --------- | ----------- |
| GET    | `/health` | `{status, modelVersion, modelLoaded}` |
| GET    | `/model`  | Provenance: name, version, framework, trainedAt, feature count, calibration, reviewThreshold |
| POST   | `/score`  | Body = one case record; returns the scoring contract (below). Returns `503` if the model failed to load. |

### `/score` request body (camelCase, all optional)

```json
{
  "transcriptText": "customer threatening legal action over a fraudulent charge",
  "summary": "...",
  "category": "billing",
  "priority": "urgent",
  "sentiment": "negative",
  "customerTier": "vip",
  "callOutcome": "handoff",
  "channel": "voice",
  "confidence": 0.4,
  "previousOpenTickets": 5,
  "escalate": true,
  "durationSeconds": 900
}
```

### `/score` response

```json
{
  "riskLevel": "high",
  "riskScore": 95.0,
  "confidence": 0.99,
  "classProbabilities": {"low": 0.0, "medium": 0.01, "high": 0.99},
  "humanReviewRequired": true,
  "modelVersion": "risk-scoring-logreg-1.0.0",
  "scoredAt": "2026-06-25T12:00:00+00:00"
}
```

- `riskScore` is `0–100`, computed as the probability-weighted expectation over
  `scoreWeights` (`low:0, medium:0.5, high:1`).
- `confidence` is the maximum class probability.
- `humanReviewRequired` is `true` when `riskLevel == "high"`, or
  `confidence < reviewThreshold` (0.6), or `escalate` is truthy.

## Run locally

From the **repo root** (so `ml/` is on the relative path):

```bash
# Install into a venv (or reuse ml/.venv):
ml/.venv/bin/pip install -r serving/requirements.txt

# Start the service:
RISK_MODEL_PATH=ml/artifacts/risk_model.json \
  ml/.venv/bin/uvicorn serving.app:app --host 0.0.0.0 --port 8080

# Smoke test:
curl localhost:8080/health
curl localhost:8080/model
curl -X POST localhost:8080/score -H 'content-type: application/json' \
  -d '{"priority":"urgent","escalate":true,"sentiment":"negative","category":"billing","transcriptText":"legal lawsuit fraud chargeback"}'
```

Interactive docs are served at `http://localhost:8080/docs`.

## Test

```bash
ml/.venv/bin/pip install fastapi httpx uvicorn pydantic pytest   # once
ml/.venv/bin/python -m pytest serving/test_app.py -q
```

The tests assert `/health`, `/model`, and that `/score` reproduces
`infer.predict_label` / `infer.predict_proba` exactly for a high-risk and a
low-risk case.

## Build the container

Build from the repo root so the build context includes `ml/`:

```bash
docker build -f serving/Dockerfile -t relayclarity-scoring:latest .
docker run -p 8080:8080 relayclarity-scoring:latest
```

## Environment variables

| Variable          | Default                         | Purpose |
| ----------------- | ------------------------------- | ------- |
| `RISK_MODEL_PATH` | `ml/artifacts/risk_model.json`  | Path to the exported model artifact loaded at startup. |
| `ML_DIR`          | `<repo>/ml`                     | Directory added to `sys.path` so `ml/infer.py` + `ml/features.py` import. Set to `/app/ml` in the container. |

## Relationship to Azure and the TypeScript server

This FastAPI service is the **custom-container serving path** (deployable to
AKS or any container runtime). The [`azure/`](../azure) directory provides the
**Azure ML managed online endpoint** path, which reuses the *same* `ml/`
inference code via `azure/score.py`. The TypeScript server
(`server/ai/risk-model.tsx`) is a third consumer of the same artifact for live
in-app scoring. Because all paths load `ml/artifacts/risk_model.json` and share
the feature/inference logic, there is a single source of truth and no
train/serve skew. See `azure/README.md` for the deployment architecture and how
to choose between the managed-endpoint and AKS/custom-container paths.
