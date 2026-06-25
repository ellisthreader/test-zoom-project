"""Local unit tests for the Azure ML scoring script (azure/score.py).

These run without any Azure connectivity: they point RISK_MODEL_PATH at the
local artifact, call init()/run(), and assert the result matches ml/infer.py.

Run with the ml venv from the repo root:
    ml/.venv/bin/python -m pytest azure/test_score.py -q
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parent.parent
_ML_DIR = _REPO_ROOT / "ml"
_MODEL_PATH = _ML_DIR / "artifacts" / "risk_model.json"

# Point score.py at the canonical artifact before importing it.
os.environ["RISK_MODEL_PATH"] = str(_MODEL_PATH)
# Ensure no stale AML env var interferes with local resolution.
os.environ.pop("AZUREML_MODEL_DIR", None)

# Make ml/ importable for the direct comparison.
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))
# Make azure/ importable as a top-level module.
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

import infer  # noqa: E402
import score  # noqa: E402  (azure/score.py)

ARTIFACT = infer.load_artifact(str(_MODEL_PATH))

HIGH_RISK_CASE = {
    "transcriptText": "legal lawsuit fraud unsafe emergency chargeback angry complaint cancel breach",
    "category": "billing",
    "priority": "urgent",
    "sentiment": "negative",
    "customerTier": "vip",
    "callOutcome": "handoff",
    "channel": "voice",
    "confidence": 0.4,
    "previousOpenTickets": 5,
    "escalate": True,
    "durationSeconds": 900,
}

LOW_RISK_CASE = {
    "transcriptText": "thank you so much, great service, everything works perfectly",
    "category": "general",
    "priority": "low",
    "sentiment": "positive",
    "customerTier": "standard",
    "callOutcome": "resolved",
    "channel": "chat",
    "confidence": 0.95,
    "previousOpenTickets": 0,
    "escalate": False,
    "durationSeconds": 60,
}


@pytest.fixture(scope="module", autouse=True)
def _init_model():
    score.init()


def _check(case, expected_level):
    expected_label = infer.predict_label(ARTIFACT, case)
    expected_proba = infer.predict_proba(ARTIFACT, case)

    # run() accepts a JSON string (the AML default invocation form).
    result = score.run(json.dumps(case))

    assert result["riskLevel"] == expected_label == expected_level
    for cls, prob in expected_proba.items():
        assert result["classProbabilities"][cls] == pytest.approx(prob, rel=1e-9, abs=1e-12)
    assert result["modelVersion"] == ARTIFACT["modelVersion"]
    return result


def test_init_loads_model():
    assert score._MODEL["artifact"] is not None
    assert score._MODEL["artifact"]["modelVersion"] == ARTIFACT["modelVersion"]


def test_run_high_risk():
    result = _check(HIGH_RISK_CASE, "high")
    assert result["humanReviewRequired"] is True


def test_run_low_risk():
    result = _check(LOW_RISK_CASE, "low")
    assert result["humanReviewRequired"] is False


def test_run_accepts_dict_and_batch_and_data_envelope():
    # Already-parsed dict.
    single = score.run(LOW_RISK_CASE)
    assert single["riskLevel"] == "low"

    # {"data": [...]} envelope with a batch.
    batch = score.run({"data": [HIGH_RISK_CASE, LOW_RISK_CASE]})
    assert isinstance(batch, list) and len(batch) == 2
    assert batch[0]["riskLevel"] == "high"
    assert batch[1]["riskLevel"] == "low"
