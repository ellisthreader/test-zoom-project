"""Artifact-based inference, mirroring the TypeScript serving layer.

Evaluating the *exported artifact* (rather than the in-memory sklearn object)
proves that what we ship in `server/ai/risk-model.tsx` is what we measured.
"""

from __future__ import annotations

import json
import math
from typing import Dict, List

from features import CLASS_ORDER, FEATURE_ORDER, vectorize


def load_artifact(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _softmax(values: List[float]) -> List[float]:
    largest = max(values)
    exps = [math.exp(value - largest) for value in values]
    total = sum(exps) or 1.0
    return [value / total for value in exps]


def _temperature(artifact: Dict) -> float:
    calibration = artifact.get("calibration") or {}
    temperature = calibration.get("temperature", 1.0)
    return temperature if temperature and temperature > 0 else 1.0


def predict_proba(artifact: Dict, record: Dict) -> Dict[str, float]:
    raw = vectorize(record)
    mean = artifact["scaler"]["mean"]
    scale = artifact["scaler"]["scale"]
    scaled = [(raw[i] - mean[i]) / (scale[i] or 1.0) for i in range(len(FEATURE_ORDER))]

    logits: List[float] = []
    for class_index in range(len(CLASS_ORDER)):
        weights = artifact["coefficients"][class_index]
        intercept = artifact["intercepts"][class_index]
        logits.append(intercept + sum(scaled[i] * weights[i] for i in range(len(FEATURE_ORDER))))

    # Temperature scaling (post-hoc calibration); T=1.0 is a no-op for old artifacts.
    temperature = _temperature(artifact)
    probabilities = _softmax([value / temperature for value in logits])
    return {CLASS_ORDER[i]: probabilities[i] for i in range(len(CLASS_ORDER))}


def predict_label(artifact: Dict, record: Dict) -> str:
    proba = predict_proba(artifact, record)
    return max(proba, key=proba.get)
