"""Evaluate the exported risk-model artifact and write evaluation.json.

Produces the deployment-gate evidence: overall metrics, per-class report,
confusion matrix, fairness slices, and the baseline distribution used by drift
monitoring. Evaluation runs through `infer.predict_label`, i.e. the same maths
the TypeScript server uses, so the numbers describe the served model.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import time
from collections import defaultdict
from typing import Dict, List

from features import CLASS_ORDER
from infer import load_artifact, predict_label, predict_proba

HERE = os.path.dirname(__file__)

# Deployment gate: registration/rollout should be blocked below these.
GATES = {"accuracy": 0.70, "high_recall": 0.70, "macro_f1": 0.65}

# Indicative hosting cost for the cost-per-1k estimate. An Azure ML managed
# online endpoint on Standard_DS2_v2 is ~£0.11/hr at the time of writing; this
# is a planning figure for the model card, not a billed rate.
HOURLY_COMPUTE_GBP = 0.11


def load_rows(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _metrics(pairs: List[tuple]) -> Dict:
    classes = CLASS_ORDER
    confusion = {actual: {pred: 0 for pred in classes} for actual in classes}
    for actual, pred in pairs:
        confusion[actual][pred] += 1

    correct = sum(confusion[label][label] for label in classes)
    accuracy = correct / len(pairs) if pairs else 0.0

    per_class = {}
    f1s = []
    for label in classes:
        tp = confusion[label][label]
        fp = sum(confusion[other][label] for other in classes if other != label)
        fn = sum(confusion[label][other] for other in classes if other != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        per_class[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": tp + fn,
        }
        f1s.append(f1)

    return {
        "accuracy": round(accuracy, 4),
        "macroF1": round(sum(f1s) / len(f1s), 4),
        "highRecall": per_class["high"]["recall"],
        "perClass": per_class,
        "confusionMatrix": confusion,
    }


def _calibration(artifact: Dict, rows: List[Dict], bins: int = 10) -> Dict:
    """Expected Calibration Error: do predicted confidences match reality?

    Bins predictions by their top-class probability and compares the mean
    confidence in each bin to the observed accuracy. ECE near 0 means a stated
    confidence of e.g. 0.8 really does correspond to ~80% correct.
    """
    buckets = [{"conf": 0.0, "correct": 0, "n": 0} for _ in range(bins)]
    for row in rows:
        proba = predict_proba(artifact, row)
        pred = max(proba, key=proba.get)
        confidence = proba[pred]
        index = min(bins - 1, int(confidence * bins))
        buckets[index]["conf"] += confidence
        buckets[index]["correct"] += 1 if pred == row["riskLevel"] else 0
        buckets[index]["n"] += 1

    total = len(rows) or 1
    ece = 0.0
    reliability = []
    for bucket in buckets:
        if not bucket["n"]:
            continue
        avg_conf = bucket["conf"] / bucket["n"]
        accuracy = bucket["correct"] / bucket["n"]
        ece += (bucket["n"] / total) * abs(avg_conf - accuracy)
        reliability.append({
            "meanConfidence": round(avg_conf, 4),
            "accuracy": round(accuracy, 4),
            "count": bucket["n"],
        })
    return {"expectedCalibrationError": round(ece, 4), "reliability": reliability}


def _performance(artifact: Dict, rows: List[Dict]) -> Dict:
    """Inference latency and a derived hosting cost estimate."""
    durations = []
    for row in rows:
        start = time.perf_counter()
        predict_label(artifact, row)
        durations.append((time.perf_counter() - start) * 1000.0)
    durations.sort()
    mean_ms = sum(durations) / len(durations) if durations else 0.0
    p95_ms = durations[min(len(durations) - 1, int(len(durations) * 0.95))] if durations else 0.0
    throughput = (1000.0 / mean_ms) if mean_ms else 0.0
    cost_per_1k = (1000.0 / throughput / 3600.0 * HOURLY_COMPUTE_GBP) if throughput else 0.0
    return {
        "meanLatencyMs": round(mean_ms, 4),
        "p95LatencyMs": round(p95_ms, 4),
        "throughputPerSec": round(throughput, 1),
        "estimatedCostPer1kGbp": round(cost_per_1k, 6),
        "costNote": f"Derived from mean latency at £{HOURLY_COMPUTE_GBP}/hr single-instance compute.",
    }


def _fairness(rows: List[Dict], preds: List[str], attribute: str) -> Dict:
    groups = defaultdict(lambda: {"n": 0, "high": 0})
    for row, pred in zip(rows, preds):
        key = str(row.get(attribute) or "unknown")
        groups[key]["n"] += 1
        groups[key]["high"] += 1 if pred == "high" else 0

    rates = {key: round(value["high"] / value["n"], 4) for key, value in groups.items() if value["n"] >= 20}
    if not rates:
        return {"slices": {}, "disparityGap": 0.0}
    gap = round(max(rates.values()) - min(rates.values()), 4)
    return {"slices": rates, "disparityGap": gap}


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the risk model artifact")
    parser.add_argument("--data-dir", default=os.path.join(HERE, "data"))
    parser.add_argument("--artifacts-dir", default=os.path.join(HERE, "artifacts"))
    args = parser.parse_args()

    artifact = load_artifact(os.path.join(args.artifacts_dir, "risk_model.json"))
    rows = load_rows(os.path.join(args.data_dir, "test.csv"))
    preds = [predict_label(artifact, row) for row in rows]
    pairs = [(row["riskLevel"], pred) for row, pred in zip(rows, preds)]

    metrics = _metrics(pairs)
    gates = {
        "accuracy": metrics["accuracy"] >= GATES["accuracy"],
        "highRecall": metrics["highRecall"] >= GATES["high_recall"],
        "macroF1": metrics["macroF1"] >= GATES["macro_f1"],
    }

    report = {
        "modelVersion": artifact["modelVersion"],
        "testRows": len(rows),
        "metrics": metrics,
        "calibration": _calibration(artifact, rows),
        "performance": _performance(artifact, rows),
        "fairness": {
            "customerTier": _fairness(rows, preds, "customerTier"),
            "channel": _fairness(rows, preds, "channel"),
            "category": _fairness(rows, preds, "category"),
        },
        "baselineDistribution": artifact["baselineDistribution"],
        "deploymentGate": {"thresholds": GATES, "results": gates, "passed": all(gates.values())},
    }

    out_path = os.path.join(args.artifacts_dir, "evaluation.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    status = "PASS" if report["deploymentGate"]["passed"] else "FAIL"
    print(f"Evaluation {status}: acc={metrics['accuracy']} macroF1={metrics['macroF1']} "
          f"highRecall={metrics['highRecall']} -> {out_path}")


if __name__ == "__main__":
    main()
