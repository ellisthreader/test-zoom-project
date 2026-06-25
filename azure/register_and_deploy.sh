#!/usr/bin/env bash
#
# Register the RelayClarity risk model and deploy it to an Azure ML managed
# online endpoint. Run this ONCE after you have:
#   1. `az login`
#   2. installed the ML CLI v2 extension: `az extension add -n ml`
#   3. set your default workspace/resource group (or filled the vars below).
#
# This script is idempotent-ish: re-running creates a new model version and a
# new deployment revision you can shift traffic to (see rollback in README.md).
#
# Nothing here runs without Azure credentials; it is real, copy-pasteable IaC.
set -euo pipefail

# ----------------------------------------------------------------------------
# Configuration — EDIT THESE (or export them in your shell before running).
# ----------------------------------------------------------------------------
RESOURCE_GROUP="${RESOURCE_GROUP:-<your-resource-group>}"
WORKSPACE="${WORKSPACE:-<your-aml-workspace>}"
ENDPOINT_NAME="${ENDPOINT_NAME:-relayclarity-risk}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-blue}"
MODEL_NAME="${MODEL_NAME:-risk-scoring-logreg}"

# Resolve paths relative to this script so it works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MODEL_FILE="${REPO_ROOT}/ml/artifacts/risk_model.json"

# Pin every az ml call to the same workspace/group.
AZ_ML_ARGS=(--resource-group "${RESOURCE_GROUP}" --workspace-name "${WORKSPACE}")

echo ">> Repo root:   ${REPO_ROOT}"
echo ">> Model file:  ${MODEL_FILE}"
echo ">> Endpoint:    ${ENDPOINT_NAME}"
echo ">> Deployment:  ${DEPLOYMENT_NAME}"

# ----------------------------------------------------------------------------
# 0. Stage the ml/ inference package into the scoring code dir.
#    score.py imports ml/infer.py + ml/features.py; AML only ships the code dir
#    (azure/), so vendor a copy of ml/ next to score.py. score.py finds it via
#    its `azure/ml` candidate path. The staged copy is git-ignored noise; it is
#    safe to delete after deploy.
# ----------------------------------------------------------------------------
echo ">> Staging ml/ into azure/ml for packaging..."
rm -rf "${SCRIPT_DIR}/ml"
mkdir -p "${SCRIPT_DIR}/ml/artifacts"
cp "${REPO_ROOT}/ml/features.py" "${SCRIPT_DIR}/ml/features.py"
cp "${REPO_ROOT}/ml/infer.py"    "${SCRIPT_DIR}/ml/infer.py"
cp "${MODEL_FILE}"               "${SCRIPT_DIR}/ml/artifacts/risk_model.json"

# ----------------------------------------------------------------------------
# 1. Register the model artifact (creates a new version each run).
# ----------------------------------------------------------------------------
echo ">> Registering model..."
MODEL_VERSION="$(
  az ml model create \
    "${AZ_ML_ARGS[@]}" \
    --name "${MODEL_NAME}" \
    --type custom_model \
    --path "${MODEL_FILE}" \
    --query version -o tsv
)"
echo ">> Registered ${MODEL_NAME}:${MODEL_VERSION}"

# ----------------------------------------------------------------------------
# 2. Create the managed online endpoint (skip if it already exists).
# ----------------------------------------------------------------------------
if az ml online-endpoint show "${AZ_ML_ARGS[@]}" --name "${ENDPOINT_NAME}" >/dev/null 2>&1; then
  echo ">> Endpoint ${ENDPOINT_NAME} already exists; reusing."
else
  echo ">> Creating endpoint..."
  az ml online-endpoint create \
    "${AZ_ML_ARGS[@]}" \
    --name "${ENDPOINT_NAME}" \
    --file "${SCRIPT_DIR}/endpoint.yml"
fi

# ----------------------------------------------------------------------------
# 3. Create the deployment, pinning the model version we just registered.
#    The environment is built inline from deployment.yml's conda_file + image.
# ----------------------------------------------------------------------------
echo ">> Creating deployment ${DEPLOYMENT_NAME}..."
az ml online-deployment create \
  "${AZ_ML_ARGS[@]}" \
  --file "${SCRIPT_DIR}/deployment.yml" \
  --name "${DEPLOYMENT_NAME}" \
  --endpoint-name "${ENDPOINT_NAME}" \
  --set model="azureml:${MODEL_NAME}:${MODEL_VERSION}" \
  --all-traffic

# (Equivalent explicit traffic shift, in case --all-traffic is not used:)
# az ml online-endpoint update "${AZ_ML_ARGS[@]}" \
#   --name "${ENDPOINT_NAME}" --traffic "${DEPLOYMENT_NAME}=100"

# ----------------------------------------------------------------------------
# 4. Smoke test: invoke the endpoint with a sample high-risk case.
# ----------------------------------------------------------------------------
echo ">> Smoke-testing the endpoint..."
SAMPLE_REQUEST="$(mktemp)"
cat >"${SAMPLE_REQUEST}" <<'JSON'
{
  "transcriptText": "legal lawsuit fraud chargeback angry complaint cancel breach",
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
JSON

az ml online-endpoint invoke \
  "${AZ_ML_ARGS[@]}" \
  --name "${ENDPOINT_NAME}" \
  --deployment-name "${DEPLOYMENT_NAME}" \
  --request-file "${SAMPLE_REQUEST}"

rm -f "${SAMPLE_REQUEST}"

echo ">> Done. Endpoint ${ENDPOINT_NAME} is live with ${MODEL_NAME}:${MODEL_VERSION}."
echo ">> Retrieve the scoring URI + key with:"
echo "     az ml online-endpoint show ${AZ_ML_ARGS[*]} --name ${ENDPOINT_NAME} --query scoring_uri -o tsv"
echo "     az ml online-endpoint get-credentials ${AZ_ML_ARGS[*]} --name ${ENDPOINT_NAME} -o tsv"
