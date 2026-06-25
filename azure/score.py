"""Azure ML managed online endpoint scoring script.

Lifecycle (Azure ML inference server):
  - ``init()`` runs once when the deployment container starts. It loads the
    exported risk model artifact.
  - ``run(raw_data)`` runs per request. It parses the JSON payload and returns
    the scoring contract.

Reuse strategy (no model skew):
  When Azure ML packages a deployment it copies the *code directory* referenced
  by ``deployment.yml`` (here, this ``azure/`` folder) into the image, but it
  does NOT copy sibling folders like ``ml/``. To keep a single source of truth
  for the inference math we import the ``ml`` package if it is importable, and
  otherwise add it to ``sys.path`` from a few candidate locations:

    1. ``ML_DIR`` env var (explicit override).
    2. A ``ml/`` folder shipped alongside this script inside the code dir
       (recommended for AML: copy/symlink ml/ into azure/ before deploy, or set
       the code dir to the repo root).
    3. The repo-root ``ml/`` (works for local unit tests).

  The model file itself is loaded from ``AZUREML_MODEL_DIR`` (set by AML to the
  registered model's mount point) and falls back to ``RISK_MODEL_PATH`` for
  local testing. This means the exact same ``ml/infer.py`` logic backs the AML
  endpoint, the FastAPI service, and the TypeScript server.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

_THIS_DIR = Path(__file__).resolve().parent


def _candidate_ml_dirs() -> List[Path]:
    candidates: List[Path] = []
    env_dir = os.environ.get("ML_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    # ml/ vendored next to this script (recommended packaging for AML).
    candidates.append(_THIS_DIR / "ml")
    # repo-root ml/ (local dev / unit tests: azure/ -> repo root -> ml/).
    candidates.append(_THIS_DIR.parent / "ml")
    return candidates


def _ensure_ml_importable() -> None:
    """Make ``features``/``infer`` importable regardless of packaging layout."""
    for path in _candidate_ml_dirs():
        if path.is_dir() and str(path) not in sys.path:
            sys.path.insert(0, str(path))


_ensure_ml_importable()
import infer  # noqa: E402  (path set up above)


# Process-global state populated by init().
_MODEL: Dict[str, object] = {"artifact": None}


def _resolve_model_path() -> str:
    """Locate the artifact: AZUREML_MODEL_DIR (AML) or RISK_MODEL_PATH (local)."""
    model_dir = os.environ.get("AZUREML_MODEL_DIR")
    if model_dir:
        # AML mounts the registered model under this dir. We registered the
        # single JSON file, so search for it.
        for candidate in Path(model_dir).rglob("risk_model.json"):
            return str(candidate)
        # Fall back to any *.json under the model dir.
        for candidate in Path(model_dir).rglob("*.json"):
            return str(candidate)
    return os.environ.get(
        "RISK_MODEL_PATH",
        str(_THIS_DIR.parent / "ml" / "artifacts" / "risk_model.json"),
    )


def init() -> None:
    """Load the model once at container startup."""
    path = _resolve_model_path()
    _MODEL["artifact"] = infer.load_artifact(path)


def _score_record(artifact: Dict, record: Dict) -> Dict:
    proba = infer.predict_proba(artifact, record)
    label = max(proba, key=proba.get)
    weights = artifact.get("scoreWeights") or {"low": 0.0, "medium": 0.5, "high": 1.0}
    risk_score = sum(proba[cls] * float(weights.get(cls, 0.0)) for cls in proba) * 100.0
    confidence = max(proba.values())
    threshold = float(artifact.get("reviewThreshold", 0.6))
    human_review = (
        label == "high" or confidence < threshold or bool(record.get("escalate"))
    )
    return {
        "riskLevel": label,
        "riskScore": round(risk_score, 4),
        "confidence": confidence,
        "classProbabilities": proba,
        "humanReviewRequired": human_review,
        "modelVersion": str(artifact.get("modelVersion", "unknown")),
        "scoredAt": datetime.now(timezone.utc).isoformat(),
    }


def run(raw_data):
    """Score one or many records.

    ``raw_data`` may be a JSON string (AML default) or an already-parsed dict.
    Accepts either a single record object, ``{"data": <record|[records]>}``, or
    a list of records. Returns a single result or a list of results to mirror
    the input shape.
    """
    artifact = _MODEL.get("artifact")
    if artifact is None:
        # Lazy init for robustness (AML always calls init() first in practice).
        init()
        artifact = _MODEL["artifact"]

    payload = json.loads(raw_data) if isinstance(raw_data, (str, bytes, bytearray)) else raw_data
    if isinstance(payload, dict) and "data" in payload:
        payload = payload["data"]

    if isinstance(payload, list):
        return [_score_record(artifact, rec) for rec in payload]  # type: ignore[arg-type]
    return _score_record(artifact, payload)  # type: ignore[arg-type]
