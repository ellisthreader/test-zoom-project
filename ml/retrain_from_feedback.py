"""Close the field-to-model loop: retrain the risk model from human-reviewed feedback.

Consumes officer-confirmed feedback rows (the JSON produced by the TS endpoint
GET /api/monitoring/training-feedback), merges them with the synthetic training
set at a higher sample weight, retrains an artifact IDENTICAL in shape to the one
train.py exports, re-evaluates both the current live model and the candidate on
the held-out test set, and promotes the candidate ONLY if every quality gate
holds (no high-risk recall regression, no fairness regression).

Safe by default: dry-run. The live artifact (ml/artifacts/risk_model.json) is
never written unless --promote is passed AND all gates pass, and even then the
current artifact is first backed up to risk_model.prev.json.

This module reuses train.py (_fit_temperature, load_rows), evaluate.py (_metrics,
_fairness, GATES) and infer.py (load_artifact, predict_label) — nothing is copied.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from features import CLASS_ORDER, FEATURE_ORDER, MODEL_NAME, vectorize
from train import _fit_temperature, load_rows
from evaluate import GATES, _fairness, _metrics
from infer import load_artifact, predict_label

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_DIR = os.path.join(HERE, "data")
DEFAULT_ARTIFACTS_DIR = os.path.join(HERE, "artifacts")
CALIB_FRACTION = 0.15

# Allowed regressions relative to the current live model.
RECALL_REGRESSION_TOLERANCE = 0.02
FAIRNESS_REGRESSION_TOLERANCE = 0.02


# --------------------------------------------------------------------------- #
# Data loading / merging
# --------------------------------------------------------------------------- #

def load_feedback_rows(path: str) -> List[Dict]:
    """Load the feedback JSON array and map each row to a training record.

    A training record is the feedback row's own fields plus riskLevel taken from
    the officer-confirmed "label". Rows with no valid label are skipped.
    """
    with open(path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)
    if not isinstance(raw, list):
        raise ValueError("feedback file must contain a JSON array of rows")

    records: List[Dict] = []
    for row in raw:
        label = str(row.get("label") or "").strip().lower()
        if label not in CLASS_ORDER:
            continue
        record = dict(row)
        record["riskLevel"] = label
        records.append(record)
    return records


def build_training_matrix(
    synthetic_rows: List[Dict],
    feedback_rows: List[Dict],
    feedback_weight: float,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Vectorize synthetic + feedback rows into X, y, sample_weight arrays.

    Synthetic rows weight 1.0; feedback rows weight `feedback_weight` because
    they are real human-reviewed labels.
    """
    features: List[List[float]] = []
    labels: List[str] = []
    weights: List[float] = []

    for row in synthetic_rows:
        features.append(vectorize(row))
        labels.append(row["riskLevel"])
        weights.append(1.0)

    for row in feedback_rows:
        features.append(vectorize(row))
        labels.append(row["riskLevel"])
        weights.append(float(feedback_weight))

    X = np.array(features, dtype=float)
    y = np.array(labels)
    sample_weight = np.array(weights, dtype=float)
    return X, y, sample_weight


# --------------------------------------------------------------------------- #
# Candidate training (mirrors train.py exactly, with sample weights)
# --------------------------------------------------------------------------- #

def _bump_patch_version(current: Optional[str]) -> str:
    """Increment the patch (last) number of the current model version."""
    fallback = f"{MODEL_NAME}-1.0.1"
    if not current:
        return fallback
    head, _, version = current.rpartition("-")
    parts = version.split(".")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return fallback
    parts[-1] = str(int(parts[-1]) + 1)
    return f"{head}-{'.'.join(parts)}"


def train_candidate(
    X: np.ndarray,
    y: np.ndarray,
    sample_weight: np.ndarray,
    *,
    model_version: str,
    trained_at: str,
) -> Dict:
    """Fit scaler + LogisticRegression with sample weights and build an artifact
    dict identical in shape to the one train.py writes."""
    (
        fit_X,
        calib_X,
        fit_y,
        calib_y,
        fit_w,
        _calib_w,
    ) = train_test_split(
        X, y, sample_weight,
        test_size=CALIB_FRACTION, random_state=42, stratify=y,
    )

    scaler = StandardScaler().fit(fit_X)
    scaled = scaler.transform(fit_X)

    model = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
    model.fit(scaled, fit_y, sample_weight=fit_w)

    # Re-order sklearn's class axis to canonical CLASS_ORDER.
    class_index = {label: i for i, label in enumerate(model.classes_)}
    coefficients = [model.coef_[class_index[label]].tolist() for label in CLASS_ORDER]
    intercepts = [float(model.intercept_[class_index[label]]) for label in CLASS_ORDER]

    # Temperature scaling on the held-out calibration slice (reuse train._fit_temperature).
    calib_scaled = scaler.transform(calib_X)
    calib_logits = model.decision_function(calib_scaled)
    calib_indices = np.array([list(model.classes_).index(label) for label in calib_y])
    temperature = _fit_temperature(calib_logits, calib_indices)

    # Baseline class mix over the full merged label set (for drift monitoring).
    unique, counts = np.unique(y, return_counts=True)
    baseline = {label: 0.0 for label in CLASS_ORDER}
    for label, count in zip(unique, counts):
        baseline[label] = round(float(count) / len(y), 4)

    return {
        "modelName": MODEL_NAME,
        "modelVersion": model_version,
        "trainedAt": trained_at or "unset",
        "framework": "scikit-learn LogisticRegression (multinomial)",
        "featureOrder": FEATURE_ORDER,
        "classOrder": CLASS_ORDER,
        "scaler": {
            "mean": [float(value) for value in scaler.mean_],
            "scale": [float(value) for value in scaler.scale_],
        },
        "coefficients": coefficients,
        "intercepts": intercepts,
        "calibration": {"method": "temperature", "temperature": temperature},
        "trainingRows": len(fit_y),
        "calibrationRows": len(calib_y),
        "baselineDistribution": baseline,
        "reviewThreshold": 0.6,
        "scoreWeights": {"low": 0.0, "medium": 0.5, "high": 1.0},
    }


# --------------------------------------------------------------------------- #
# Evaluation + gates
# --------------------------------------------------------------------------- #

def evaluate_artifact(artifact: Dict, test_rows: List[Dict]) -> Dict:
    """Run the artifact through infer.predict_label and compute metrics + fairness."""
    preds = [predict_label(artifact, row) for row in test_rows]
    pairs = [(row["riskLevel"], pred) for row, pred in zip(test_rows, preds)]
    metrics = _metrics(pairs)
    fairness = _fairness(test_rows, preds, "customerTier")
    return {
        "modelVersion": artifact.get("modelVersion"),
        "accuracy": metrics["accuracy"],
        "macroF1": metrics["macroF1"],
        "highRecall": metrics["highRecall"],
        "fairnessDisparityGap": fairness["disparityGap"],
        "fairnessSlices": fairness["slices"],
    }


def evaluate_gates(current_eval: Dict, candidate_eval: Dict) -> Dict:
    """Apply the promotion gates. All must hold for promotion."""
    gates = {
        "accuracy": candidate_eval["accuracy"] >= GATES["accuracy"],
        "highRecall": candidate_eval["highRecall"] >= GATES["high_recall"],
        "macroF1": candidate_eval["macroF1"] >= GATES["macro_f1"],
        "noRecallRegression": (
            candidate_eval["highRecall"]
            >= current_eval["highRecall"] - RECALL_REGRESSION_TOLERANCE
        ),
        "noFairnessRegression": (
            candidate_eval["fairnessDisparityGap"]
            <= current_eval["fairnessDisparityGap"] + FAIRNESS_REGRESSION_TOLERANCE
        ),
    }
    return {"results": gates, "passed": all(gates.values())}


def build_report(
    current_eval: Dict,
    candidate_eval: Dict,
    gate_result: Dict,
    *,
    promote_requested: bool,
    promoted: bool,
    counts: Dict,
) -> Dict:
    return {
        "current": current_eval,
        "candidate": candidate_eval,
        "gateThresholds": {
            **GATES,
            "recallRegressionTolerance": RECALL_REGRESSION_TOLERANCE,
            "fairnessRegressionTolerance": FAIRNESS_REGRESSION_TOLERANCE,
        },
        "gates": gate_result["results"],
        "gatesPassed": gate_result["passed"],
        "promoteRequested": promote_requested,
        "promoted": promoted,
        "counts": counts,
    }


def format_report(report: Dict) -> str:
    current = report["current"]
    candidate = report["candidate"]
    lines: List[str] = []
    lines.append("=" * 64)
    lines.append("RETRAIN-FROM-FEEDBACK COMPARISON")
    lines.append("=" * 64)
    counts = report["counts"]
    lines.append(
        f"synthetic rows: {counts['synthetic']}  feedback rows: {counts['feedback']} "
        f"(weight {counts['feedbackWeight']})"
    )
    lines.append("")
    header = f"{'metric':<24}{'current':>12}{'candidate':>12}{'delta':>12}"
    lines.append(header)
    lines.append("-" * len(header))
    for key, label in (
        ("accuracy", "accuracy"),
        ("macroF1", "macroF1"),
        ("highRecall", "highRecall"),
        ("fairnessDisparityGap", "tier disparityGap"),
    ):
        cur = current[key]
        cand = candidate[key]
        delta = round(cand - cur, 4)
        lines.append(f"{label:<24}{cur:>12.4f}{cand:>12.4f}{delta:>+12.4f}")
    lines.append("")
    lines.append("GATES (all must pass to promote):")
    for name, passed in report["gates"].items():
        lines.append(f"  [{'PASS' if passed else 'FAIL'}] {name}")
    lines.append("")
    decision = "PROMOTE" if report["gatesPassed"] else "BLOCK (gates failed)"
    if report["promoteRequested"]:
        action = "PROMOTED (artifact written)" if report["promoted"] else "NOT promoted"
    else:
        action = "dry-run (no --promote; artifact untouched)"
    lines.append(f"DECISION: {decision}")
    lines.append(f"ACTION:   {action}")
    lines.append("=" * 64)
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def run_retrain(
    *,
    feedback_path: str,
    data_dir: str = DEFAULT_DATA_DIR,
    artifacts_dir: str = DEFAULT_ARTIFACTS_DIR,
    feedback_weight: float = 5.0,
    trained_at: str = "",
    promote: bool = False,
) -> Tuple[Dict, Dict]:
    """Run the full retrain-evaluate-(promote) cycle.

    Returns (candidate_artifact, report). Never writes the live artifact unless
    `promote` is True AND every gate passes.
    """
    synthetic_rows = load_rows(os.path.join(data_dir, "train.csv"))
    feedback_rows = load_feedback_rows(feedback_path)
    test_rows = load_rows(os.path.join(data_dir, "test.csv"))

    X, y, sample_weight = build_training_matrix(synthetic_rows, feedback_rows, feedback_weight)

    artifact_path = os.path.join(artifacts_dir, "risk_model.json")
    current_artifact = load_artifact(artifact_path)
    model_version = _bump_patch_version(current_artifact.get("modelVersion"))

    candidate = train_candidate(
        X, y, sample_weight,
        model_version=model_version,
        trained_at=trained_at,
    )

    current_eval = evaluate_artifact(current_artifact, test_rows)
    candidate_eval = evaluate_artifact(candidate, test_rows)
    gate_result = evaluate_gates(current_eval, candidate_eval)

    promoted = False
    if promote and gate_result["passed"]:
        prev_path = os.path.join(artifacts_dir, "risk_model.prev.json")
        shutil.copyfile(artifact_path, prev_path)
        with open(artifact_path, "w", encoding="utf-8") as handle:
            json.dump(candidate, handle, indent=2)
        promoted = True

    report = build_report(
        current_eval, candidate_eval, gate_result,
        promote_requested=promote,
        promoted=promoted,
        counts={
            "synthetic": len(synthetic_rows),
            "feedback": len(feedback_rows),
            "feedbackWeight": feedback_weight,
        },
    )
    return candidate, report


def write_report(report: Dict, artifacts_dir: str = DEFAULT_ARTIFACTS_DIR) -> str:
    os.makedirs(artifacts_dir, exist_ok=True)
    path = os.path.join(artifacts_dir, "retrain_report.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Retrain the risk model from human-reviewed feedback (safe by default)."
    )
    parser.add_argument("--feedback", required=True, help="Path to feedback JSON array")
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--artifacts-dir", default=DEFAULT_ARTIFACTS_DIR)
    parser.add_argument("--feedback-weight", type=float, default=5.0)
    parser.add_argument("--trained-at", default="", help="ISO timestamp for the candidate")
    parser.add_argument(
        "--promote", action="store_true",
        help="Overwrite the live artifact IF all gates pass (default: dry-run).",
    )
    args = parser.parse_args()

    _candidate, report = run_retrain(
        feedback_path=args.feedback,
        data_dir=args.data_dir,
        artifacts_dir=args.artifacts_dir,
        feedback_weight=args.feedback_weight,
        trained_at=args.trained_at,
        promote=args.promote,
    )

    report_path = write_report(report, args.artifacts_dir)
    print(format_report(report))
    print(f"\nReport written to {report_path}")

    # Non-zero exit when promotion was requested but blocked by gates.
    if args.promote and not report["gatesPassed"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
