# RelayClarity Risk Model — Azure ML deployment

Infrastructure-as-code to serve the RelayClarity risk model on an **Azure ML
managed online endpoint**. The scoring entry script (`score.py`) reuses the
exact inference logic from [`ml/`](../ml) — `ml/features.py` + `ml/infer.py` — so
the Azure endpoint, the [FastAPI service](../serving), and the TypeScript server
all produce identical predictions from the same artifact
(`ml/artifacts/risk_model.json`). No model skew, one source of truth.

## Architecture

```
  ml/train.py ──> ml/artifacts/risk_model.json   (exported, calibrated artifact)
                          │
        ┌─────────────────┼──────────────────────────────┐
        │                 │                               │
   az ml model       FastAPI service               TypeScript server
   create            (serving/, custom             (server/ai/risk-model.tsx,
        │             container -> AKS)             live in-app scoring)
        ▼
  Registered model (risk-scoring-logreg:N)
        │
        ▼
  Managed online endpoint (relayclarity-risk)
        │  deployment "blue": score.py + conda env + Standard_DS2_v2 x1
        ▼
  HTTPS scoring URI + key
```

Two serving paths share the same inference code:

- **Managed online endpoint (this folder)** — the Azure-native MLOps path.
  Azure manages the container, autoscaling, auth, logging, and blue/green
  traffic. `score.py` runs inside Azure's inference server.
- **FastAPI custom container ([`serving/`](../serving)) on AKS** — the
  portable path when you need a custom image, non-Azure runtime, or to colocate
  with other services. Deploy the `serving/Dockerfile` image to AKS (or any
  Kubernetes/container host) behind an ingress.

Choose managed endpoints for the least operational overhead; choose the AKS/
custom-container path for portability or custom runtime needs.

## Files

| File                    | Purpose |
| ----------------------- | ------- |
| `score.py`              | AML entry script: `init()` loads the model from `AZUREML_MODEL_DIR` (fallback `RISK_MODEL_PATH`); `run(raw_data)` parses JSON and returns the scoring contract. Importable and unit-tested locally. |
| `environment.yml`       | Conda spec for the inference environment (python, numpy, scikit-learn, azureml inference server). |
| `endpoint.yml`          | Managed online endpoint definition (`auth_mode: key`). |
| `deployment.yml`        | Deployment: model + environment + `score.py` code dir + `Standard_DS2_v2` x1 + liveness/readiness probes. |
| `register_and_deploy.sh`| End-to-end `az ml` CLI v2 script: register model -> create env/endpoint -> create deployment -> 100% traffic -> smoke-test invoke. |
| `test_score.py`         | Local pytest: `init()` + `run()` against the local artifact, asserts parity with `ml/infer.predict_label`. |

## Prerequisites

```bash
az login
az extension add -n ml          # Azure ML CLI v2
az account set --subscription <your-subscription>
# A resource group + Azure ML workspace must already exist.
```

## Deploy

Edit the variables at the top of `register_and_deploy.sh` (or export them), then:

```bash
export RESOURCE_GROUP=my-rg
export WORKSPACE=my-aml-ws
bash azure/register_and_deploy.sh
```

The script performs, in order:

1. **Stage** `ml/features.py`, `ml/infer.py`, and the artifact into `azure/ml/`
   so the inference code ships inside the deployment code directory (AML only
   packages the code dir, not sibling folders). `score.py` discovers this via
   its `azure/ml` candidate path.
2. `az ml model create` — register the artifact (a new version each run).
3. `az ml online-endpoint create` — create the endpoint (reused if it exists).
4. `az ml online-deployment create --all-traffic` — build the environment,
   deploy `score.py` on `Standard_DS2_v2`, and route 100% traffic to it.
5. `az ml online-endpoint invoke` — smoke-test with a sample high-risk case.

Retrieve the scoring URI and key:

```bash
az ml online-endpoint show   -g $RESOURCE_GROUP -w $WORKSPACE --name relayclarity-risk --query scoring_uri -o tsv
az ml online-endpoint get-credentials -g $RESOURCE_GROUP -w $WORKSPACE --name relayclarity-risk -o tsv
```

## Test locally (no Azure)

```bash
ml/.venv/bin/python -m pytest azure/test_score.py -q
```

This sets `RISK_MODEL_PATH` to the local artifact, calls `init()`/`run()`, and
asserts the result matches `ml/infer.py` for high- and low-risk cases.

## Rollback / blue-green

Each run of the script registers a new model version and you can keep multiple
deployments behind one endpoint, then shift traffic instantly. For a true
blue/green rollout, create the second deployment *without* taking traffic by
dropping `--all-traffic` from the `az ml online-deployment create` call, then
shift manually:

```bash
# Create "green" alongside "blue" without routing traffic to it yet:
az ml online-deployment create -g $RG -w $WS --file azure/deployment.yml \
  --name green --endpoint-name relayclarity-risk \
  --set model=azureml:risk-scoring-logreg:<new-version>

# Canary 10% to green:
az ml online-endpoint update -g $RG -w $WS --name relayclarity-risk \
  --traffic "blue=90 green=10"

# Promote green:
az ml online-endpoint update -g $RG -w $WS --name relayclarity-risk \
  --traffic "blue=0 green=100"

# Roll back to the previous deployment instantly:
az ml online-endpoint update -g $RG -w $WS --name relayclarity-risk \
  --traffic "blue=100 green=0"

# Delete the bad deployment:
az ml online-deployment delete -g $RG -w $WS --endpoint-name relayclarity-risk --name green --yes
```

Because old model versions remain registered, you can also recreate a deployment
pinned to any prior version: `--set model=azureml:risk-scoring-logreg:<old>`.

## Monitoring

- **Endpoint metrics / logs**: Azure ML managed endpoints emit request count,
  latency, and error rate to **Azure Monitor**; container stdout/stderr stream
  to **Application Insights** when enabled on the workspace. View with
  `az ml online-deployment get-logs` or in the Azure Monitor portal.
- **Model quality (drift / fairness)**: the live drift and fairness metrics are
  computed by the TypeScript server (`server/ai/monitoring.tsx`) against
  real traffic and labels. Those signals are the system of record; they can be
  exported into Azure ML's **data collector** (model data collection) so request
  payloads and predictions land in blob storage for Azure ML's built-in data
  drift / model monitoring jobs. Add `data_collector:` to `deployment.yml` to
  capture inputs/outputs when you wire that up.
- **Alerting**: configure Azure Monitor alert rules on latency/error-rate and on
  the exported drift metrics to page on regressions.
