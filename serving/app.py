"""Production FastAPI scoring service for the RelayClarity risk model.

This service is a thin HTTP wrapper. All inference math lives in the existing
``ml/`` package (``ml/features.py`` + ``ml/infer.py``) and is reused verbatim
here so that the FastAPI service, the Azure ML endpoint and the TypeScript
server (``server/ai/risk-model.tsx``) all evaluate the *same* exported artifact
with no model skew.

Run locally:
    RISK_MODEL_PATH=ml/artifacts/risk_model.json \
        uvicorn serving.app:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# --- Reuse the real inference code from ml/ (no duplicated math) -------------
# infer.py does ``from features import ...`` (a bare import), so the ml dir must
# be importable directly. We resolve it relative to the repo root and also honor
# an explicit ML_DIR override (used inside the Docker image where the layout
# differs).
_REPO_ROOT = Path(__file__).resolve().parent.parent
_ML_DIR = Path(os.environ.get("ML_DIR", _REPO_ROOT / "ml")).resolve()
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

import infer  # noqa: E402  (path must be set up first)

DEFAULT_MODEL_PATH = str(_ML_DIR / "artifacts" / "risk_model.json")
MODEL_PATH = os.environ.get("RISK_MODEL_PATH", DEFAULT_MODEL_PATH)


# --- Pydantic contracts -----------------------------------------------------
class CaseRecord(BaseModel):
    """One raw case/ticket record. Field names mirror the camelCase contract
    used by the TypeScript server and the ml/ training pipeline. All fields are
    optional because the feature builder is defensive about missing values."""

    transcriptText: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    sentiment: Optional[str] = None
    customerTier: Optional[str] = None
    callOutcome: Optional[str] = None
    channel: Optional[str] = None
    confidence: Optional[float] = None
    previousOpenTickets: Optional[float] = None
    escalate: Optional[bool] = None
    durationSeconds: Optional[float] = None

    model_config = {"extra": "allow"}


class ScoreResponse(BaseModel):
    riskLevel: str
    riskScore: float = Field(..., description="0-100, derived from scoreWeights")
    confidence: float = Field(..., description="max class probability")
    classProbabilities: Dict[str, float]
    humanReviewRequired: bool
    modelVersion: str
    scoredAt: str


class HealthResponse(BaseModel):
    status: str
    modelVersion: Optional[str] = None
    modelLoaded: bool


class ModelInfoResponse(BaseModel):
    modelName: str
    modelVersion: str
    framework: str
    trainedAt: str
    features: int
    calibration: Dict
    reviewThreshold: float


# --- App + model lifecycle --------------------------------------------------
# Loaded once at startup. Kept in a dict so handlers can detect failure.
_state: Dict[str, object] = {"artifact": None, "error": None}


def _load_model() -> None:
    try:
        _state["artifact"] = infer.load_artifact(MODEL_PATH)
        _state["error"] = None
    except Exception as exc:  # pragma: no cover - defensive
        _state["artifact"] = None
        _state["error"] = str(exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _load_model()
    yield


app = FastAPI(title="RelayClarity Risk Scoring", version="1.0.0", lifespan=lifespan)

# Also load eagerly at import time so a freshly imported module is usable even
# without the ASGI lifespan having run yet.
_load_model()


def _artifact() -> Dict:
    artifact = _state.get("artifact")
    if not artifact:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded: {_state.get('error') or 'unknown error'}",
        )
    return artifact  # type: ignore[return-value]


def _model_version() -> Optional[str]:
    artifact = _state.get("artifact")
    if isinstance(artifact, dict):
        return artifact.get("modelVersion")
    return None


def _score(artifact: Dict, record: Dict) -> ScoreResponse:
    proba = infer.predict_proba(artifact, record)
    label = max(proba, key=proba.get)
    weights = artifact.get("scoreWeights") or {"low": 0.0, "medium": 0.5, "high": 1.0}
    # Expected-value style score: weight each class probability, scale to 0-100.
    risk_score = sum(proba[cls] * float(weights.get(cls, 0.0)) for cls in proba) * 100.0
    confidence = max(proba.values())
    threshold = float(artifact.get("reviewThreshold", 0.6))
    human_review = (
        label == "high"
        or confidence < threshold
        or bool(record.get("escalate"))
    )
    return ScoreResponse(
        riskLevel=label,
        riskScore=round(risk_score, 4),
        confidence=confidence,
        classProbabilities=proba,
        humanReviewRequired=human_review,
        modelVersion=str(artifact.get("modelVersion", "unknown")),
        scoredAt=datetime.now(timezone.utc).isoformat(),
    )


# --- Endpoints --------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    loaded = isinstance(_state.get("artifact"), dict)
    return HealthResponse(
        status="ok" if loaded else "degraded",
        modelVersion=_model_version(),
        modelLoaded=loaded,
    )


@app.get("/model", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    artifact = _artifact()
    return ModelInfoResponse(
        modelName=str(artifact.get("modelName", "unknown")),
        modelVersion=str(artifact.get("modelVersion", "unknown")),
        framework=str(artifact.get("framework", "unknown")),
        trainedAt=str(artifact.get("trainedAt", "unknown")),
        features=len(artifact.get("featureOrder", [])),
        calibration=artifact.get("calibration") or {},
        reviewThreshold=float(artifact.get("reviewThreshold", 0.6)),
    )


@app.post("/score", response_model=ScoreResponse)
def score(record: CaseRecord) -> ScoreResponse:
    artifact = _artifact()
    return _score(artifact, record.model_dump(exclude_none=False))
