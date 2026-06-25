"""Tests for the retrain-from-feedback loop.

Runs the retrain logic in-process (dry-run) and asserts the candidate artifact
has the right shape, a comparison report is produced, and the live artifact is
NOT modified.
"""

from __future__ import annotations

import json
import os

import pytest

import retrain_from_feedback as rt

HERE = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(HERE, "artifacts")
LIVE_ARTIFACT = os.path.join(ARTIFACTS_DIR, "risk_model.json")


def _sample_feedback():
    return [
        {
            "ticketId": "t1", "channel": "voice", "category": "billing",
            "priority": "urgent", "customerTier": "vip", "sentiment": "negative",
            "callOutcome": "handoff", "previousOpenTickets": 3, "confidence": 0.51,
            "escalate": True,
            "transcriptText": "this is fraud, I want to cancel and file a lawsuit",
            "durationSeconds": 600, "predictedLevel": "medium", "label": "high",
            "wasOverridden": True, "decidedAt": "2026-06-20T10:00:00Z",
        },
        {
            "ticketId": "t2", "channel": "web_chat", "category": "technical",
            "priority": "low", "customerTier": "standard", "sentiment": "neutral",
            "callOutcome": "resolved", "previousOpenTickets": 0, "confidence": 0.95,
            "escalate": False,
            "transcriptText": "quick question about my settings",
            "durationSeconds": 90, "predictedLevel": "low", "label": "low",
            "wasOverridden": False, "decidedAt": "2026-06-20T11:00:00Z",
        },
        {
            "ticketId": "t3", "channel": "email", "category": "account",
            "priority": "high", "customerTier": "standard", "sentiment": "negative",
            "callOutcome": "review", "previousOpenTickets": 2, "confidence": 0.7,
            "escalate": False,
            "transcriptText": "my refund has not arrived and the invoice is wrong",
            "durationSeconds": 200, "predictedLevel": "medium", "label": "medium",
            "wasOverridden": False, "decidedAt": "2026-06-20T12:00:00Z",
        },
        {
            "ticketId": "t4", "channel": "voice", "category": "billing",
            "priority": "urgent", "customerTier": "vip", "sentiment": "angry",
            "callOutcome": "abandoned", "previousOpenTickets": 4, "confidence": 0.4,
            "escalate": True,
            "transcriptText": "unsafe situation, emergency, this is a complaint",
            "durationSeconds": 700, "predictedLevel": "high", "label": "high",
            "wasOverridden": False, "decidedAt": "2026-06-20T13:00:00Z",
        },
        {
            "ticketId": "t5", "channel": "web_chat", "category": "general",
            "priority": "low", "customerTier": "standard", "sentiment": "positive",
            "callOutcome": "resolved", "previousOpenTickets": 0, "confidence": 0.9,
            "escalate": False, "transcriptText": "thanks for the help",
            "durationSeconds": 60, "predictedLevel": "low", "label": "low",
            "wasOverridden": False, "decidedAt": "2026-06-20T14:00:00Z",
            # invalid label below should be skipped
        },
        {"ticketId": "t6", "label": "", "transcriptText": "no label"},
    ]


@pytest.fixture()
def feedback_file(tmp_path):
    path = tmp_path / "fb.json"
    path.write_text(json.dumps(_sample_feedback()), encoding="utf-8")
    return str(path)


def test_load_feedback_skips_invalid_labels(feedback_file):
    rows = rt.load_feedback_rows(feedback_file)
    # 5 valid labelled rows; the empty-label row is skipped.
    assert len(rows) == 5
    assert all(row["riskLevel"] in ("low", "medium", "high") for row in rows)


def test_dry_run_candidate_shape_and_no_overwrite(feedback_file):
    before_mtime = os.path.getmtime(LIVE_ARTIFACT)
    with open(LIVE_ARTIFACT, "r", encoding="utf-8") as handle:
        before_content = handle.read()

    candidate, report = rt.run_retrain(
        feedback_path=feedback_file,
        feedback_weight=5.0,
        trained_at="2026-06-25T00:00:00Z",
        promote=False,
    )

    # Candidate artifact shape matches train.py's output.
    expected_keys = {
        "modelName", "modelVersion", "trainedAt", "framework", "featureOrder",
        "classOrder", "scaler", "coefficients", "intercepts", "calibration",
        "trainingRows", "calibrationRows", "baselineDistribution",
        "reviewThreshold", "scoreWeights",
    }
    assert expected_keys.issubset(candidate.keys())
    assert len(candidate["coefficients"]) == 3
    assert all(len(row) == 16 for row in candidate["coefficients"])
    assert len(candidate["intercepts"]) == 3
    assert candidate["calibration"]["temperature"] is not None
    assert candidate["calibration"]["temperature"] > 0
    assert len(candidate["scaler"]["mean"]) == 16
    assert len(candidate["scaler"]["scale"]) == 16

    # Comparison report produced with both sides and gate results.
    assert "current" in report and "candidate" in report
    for side in ("current", "candidate"):
        for metric in ("accuracy", "macroF1", "highRecall", "fairnessDisparityGap"):
            assert metric in report[side]
    assert set(report["gates"].keys()) == {
        "accuracy", "highRecall", "macroF1",
        "noRecallRegression", "noFairnessRegression",
    }
    assert report["promoteRequested"] is False
    assert report["promoted"] is False

    # The report is renderable.
    text = rt.format_report(report)
    assert "RETRAIN-FROM-FEEDBACK COMPARISON" in text

    # Dry-run MUST NOT modify the live artifact.
    assert os.path.getmtime(LIVE_ARTIFACT) == before_mtime
    with open(LIVE_ARTIFACT, "r", encoding="utf-8") as handle:
        assert handle.read() == before_content


def test_version_bump():
    assert rt._bump_patch_version("risk-scoring-logreg-1.0.0") == "risk-scoring-logreg-1.0.1"
    assert rt._bump_patch_version("risk-scoring-logreg-2.3.9") == "risk-scoring-logreg-2.3.10"
    assert rt._bump_patch_version(None).endswith("-1.0.1")
