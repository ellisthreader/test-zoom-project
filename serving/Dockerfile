# Production container for the RelayClarity FastAPI risk scoring service.
#
# Build (from the repo root, so the build context includes ml/):
#   docker build -f serving/Dockerfile -t relayclarity-scoring:latest .
# Run:
#   docker run -p 8080:8080 relayclarity-scoring:latest
#
# The image bundles the exact ml/ inference code + the exported artifact so the
# container produces predictions identical to ml/infer.py and the TS server.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Python deps first for layer caching.
COPY serving/requirements.txt /app/serving/requirements.txt
RUN pip install --no-cache-dir -r /app/serving/requirements.txt

# Copy the inference package and the serving wrapper.
COPY ml/ /app/ml/
COPY serving/ /app/serving/

# infer.py does a bare ``import features`` so ml/ must be on the path. app.py
# resolves this via ML_DIR; set it explicitly for the container layout.
ENV ML_DIR=/app/ml \
    RISK_MODEL_PATH=/app/ml/artifacts/risk_model.json \
    PYTHONPATH=/app

EXPOSE 8080

# Single worker keeps the in-memory artifact load simple; scale with replicas.
CMD ["uvicorn", "serving.app:app", "--host", "0.0.0.0", "--port", "8080"]
