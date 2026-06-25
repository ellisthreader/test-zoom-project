"""Tests for the FastAPI scoring service.

These assert the HTTP layer produces predictions IDENTICAL to ml/infer.py
(no skew between the wrapper and the underlying model code).

Run with the ml venv from the repo root:
    ml/.venv/bin/python -m pytest serving/test_app.py -q
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_REPO_ROOT = Path(__file__).resolve().parent.parent
_ML_DIR = _REPO_ROOT / "ml"
_MODEL_PATH = _ML_DIR / "artifacts" / "risk_model.json"

# Point the service at the canonical artifact before importing the app.
os.environ.setdefault("RISK_MODEL_PATH", str(_MODEL_PATH))

# Make ml/ importable for the direct infer comparison too.
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

# Make serving package importable.
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import infer  # noqa: E402
from serving.app import app  # noqa: E402

client = TestClient(app)
ARTIFACT = infer.load_artifact(str(_MODEL_PATH))

HIGH_RISK_CASE = {
    "transcriptText": "legal lawsuit fraud unsafe emergency chargeback angry complaint cancel breach",
    "summary": "Customer threatening legal action over a fraudulent charge",
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
    "summary": "Happy customer thanking the team",
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


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["modelLoaded"] is True
    assert body["status"] == "ok"
    assert body["modelVersion"] == ARTIFACT["modelVersion"]


def test_model_info():
    resp = client.get("/model")
    assert resp.status_code == 200
    body = resp.json()
    assert body["modelName"] == ARTIFACT["modelName"]
    assert body["modelVersion"] == ARTIFACT["modelVersion"]
    assert body["framework"] == ARTIFACT["framework"]
    assert body["features"] == len(ARTIFACT["featureOrder"])
    assert body["reviewThreshold"] == ARTIFACT["reviewThreshold"]
    assert body["calibration"] == ARTIFACT["calibration"]


def _assert_matches_infer(case):
    resp = client.post("/score", json=case)
    assert resp.status_code == 200
    body = resp.json()

    expected_label = infer.predict_label(ARTIFACT, case)
    expected_proba = infer.predict_proba(ARTIFACT, case)

    assert body["riskLevel"] == expected_label
    for cls, prob in expected_proba.items():
        assert body["classProbabilities"][cls] == pytest.approx(prob, rel=1e-9, abs=1e-12)
    assert body["confidence"] == pytest.approx(max(expected_proba.values()), rel=1e-9, abs=1e-12)
    assert body["modelVersion"] == ARTIFACT["modelVersion"]
    assert "scoredAt" in body and body["scoredAt"]
    return body


def test_score_high_risk():
    body = _assert_matches_infer(HIGH_RISK_CASE)
    assert body["riskLevel"] == "high"
    # high label OR escalate=True => human review required.
    assert body["humanReviewRequired"] is True
    assert body["riskScore"] > 50


def test_score_low_risk():
    body = _assert_matches_infer(LOW_RISK_CASE)
    assert body["riskLevel"] == "low"
    assert body["humanReviewRequired"] is False
    assert body["riskScore"] < 50
