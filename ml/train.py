"""Train the RelayClarity risk model and export a versioned JSON artifact.

Pipeline: load synthetic data -> standardize the shared feature contract ->
fit a multinomial LogisticRegression -> export coefficients, scaler stats,
metadata, and a feature contract that the TypeScript serving layer consumes.

A linear, fully transparent model is a deliberate choice: in a governed /
public-sector setting, auditability and per-feature explainability matter more
than squeezing out the last point of accuracy.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from typing import Dict, List

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from features import CLASS_ORDER, FEATURE_ORDER, MODEL_NAME, vectorize

MODEL_VERSION = f"{MODEL_NAME}-1.0.0"
HERE = os.path.dirname(__file__)
CALIB_FRACTION = 0.15


def load_rows(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def to_matrix(rows: List[Dict]):
    features = np.array([vectorize(row) for row in rows], dtype=float)
    labels = np.array([row["riskLevel"] for row in rows])
    return features, labels


def _fit_temperature(logits: np.ndarray, label_indices: np.ndarray) -> float:
    """Post-hoc temperature scaling: find T>0 minimising calibration NLL.

    Dividing the logits by a single scalar before softmax leaves the predicted
    class unchanged (so accuracy/recall are untouched) while making the
    confidence values trustworthy. Pure-numpy golden-section search keeps the
    pipeline dependency-light, and the same T is applied identically in
    ml/infer.py and server/ai/risk-model.tsx so train and serve cannot diverge.
    """
    rows = np.arange(len(label_indices))

    def nll(temperature: float) -> float:
        scaled = logits / temperature
        scaled = scaled - scaled.max(axis=1, keepdims=True)
        log_probs = scaled - np.log(np.exp(scaled).sum(axis=1, keepdims=True))
        return float(-log_probs[rows, label_indices].mean())

    # Coarse grid to bracket the minimum, then golden-section refine.
    grid = np.linspace(0.5, 5.0, 46)
    low = max(0.05, float(min(grid, key=nll)) - 0.15)
    high = low + 0.4
    for _ in range(60):
        third = (high - low) / 3.0
        left, right = low + third, high - third
        if nll(left) < nll(right):
            high = right
        else:
            low = left
    return round((low + high) / 2.0, 4)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the risk model")
    parser.add_argument("--data-dir", default=os.path.join(HERE, "data"))
    parser.add_argument("--out-dir", default=os.path.join(HERE, "artifacts"))
    parser.add_argument("--trained-at", default="", help="ISO timestamp (kept out of code for reproducibility)")
    args = parser.parse_args()

    train_rows = load_rows(os.path.join(args.data_dir, "train.csv"))
    features, labels = to_matrix(train_rows)

    # Hold out a calibration slice (unseen by the fit) to tune temperature.
    fit_features, calib_features, fit_labels, calib_labels = train_test_split(
        features, labels, test_size=CALIB_FRACTION, random_state=42, stratify=labels,
    )

    scaler = StandardScaler().fit(fit_features)
    scaled = scaler.transform(fit_features)

    model = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
    model.fit(scaled, fit_labels)

    # Re-order sklearn's class axis to our canonical CLASS_ORDER.
    class_index = {label: i for i, label in enumerate(model.classes_)}
    coefficients = [model.coef_[class_index[label]].tolist() for label in CLASS_ORDER]
    intercepts = [float(model.intercept_[class_index[label]]) for label in CLASS_ORDER]

    # Temperature scaling fitted on the held-out calibration slice.
    calib_scaled = scaler.transform(calib_features)
    calib_logits = model.decision_function(calib_scaled)
    calib_indices = np.array([list(model.classes_).index(label) for label in calib_labels])
    temperature = _fit_temperature(calib_logits, calib_indices)

    # Baseline class mix for drift monitoring (full training set).
    unique, counts = np.unique(labels, return_counts=True)
    baseline = {label: 0.0 for label in CLASS_ORDER}
    for label, count in zip(unique, counts):
        baseline[label] = round(float(count) / len(labels), 4)

    artifact = {
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "trainedAt": args.trained_at or "unset",
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
        "trainingRows": len(fit_labels),
        "calibrationRows": len(calib_labels),
        "baselineDistribution": baseline,
        "reviewThreshold": 0.6,
        "scoreWeights": {"low": 0.0, "medium": 0.5, "high": 1.0},
    }

    os.makedirs(args.out_dir, exist_ok=True)
    artifact_path = os.path.join(args.out_dir, "risk_model.json")
    with open(artifact_path, "w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2)

    contract_path = os.path.join(args.out_dir, "feature_contract.json")
    with open(contract_path, "w", encoding="utf-8") as handle:
        json.dump({"featureOrder": FEATURE_ORDER, "classOrder": CLASS_ORDER}, handle, indent=2)

    print(f"Trained {MODEL_VERSION} on {len(fit_labels)} rows "
          f"(calibration T={temperature} on {len(calib_labels)} rows) -> {artifact_path}")


if __name__ == "__main__":
    main()
