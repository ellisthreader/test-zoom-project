"""Generate synthetic, labelled support cases for the risk model.

The data is fully synthetic. Labels come from a latent "ground-truth" rule with
gaussian noise so the learned model has a real signal to recover while still
making mistakes (which makes evaluation, fairness, and drift monitoring
meaningful). No real customer or resident data is used.
"""

from __future__ import annotations

import argparse
import csv
import os
from typing import Dict, List

import numpy as np

CHANNELS = ["chat", "email", "voice", "zoom_contact_center", "web_chat"]
CATEGORIES = [
    "general_support", "billing", "payment", "technical", "delivery",
    "policy", "fraud", "security", "account",
]
PRIORITIES = ["low", "normal", "high", "urgent"]
TIERS = ["standard", "standard", "standard", "premium", "vip"]
SENTIMENTS = ["positive", "neutral", "neutral", "negative"]
OUTCOMES = ["resolved", "ticket_created", "handoff", "review", "abandoned"]

HIGH_PHRASES = [
    "this is fraud and I will take legal action",
    "there has been a security breach on my account",
    "I am vulnerable and this is an emergency",
    "I want to cancel and raise a formal complaint",
    "unauthorised payment, this is a chargeback",
]
MED_PHRASES = [
    "my refund has not arrived and the invoice is wrong",
    "the delivery is broken, I want a manager",
    "billing failed and I cannot access my account",
    "payment issue, please get a human to call me",
]
LOW_PHRASES = [
    "what are your opening hours on Saturday",
    "can you confirm my appointment time",
    "thanks, that answer was helpful",
    "I just wanted to update my email address",
]


def _latent_score(features: Dict[str, float], rng: np.random.Generator) -> float:
    """Legitimate, fairness-aware ground truth: driven by case severity only."""
    score = 18.0
    score += 30 * features["priority_urgent"] + 16 * features["priority_high"]
    score -= 12 * features["priority_low"]
    score += 14 * features["tier_vip"]
    score += 16 * features["escalate"]
    score += 13 * features["sentiment_negative"]
    score += 12 * features["category_sensitive"] + 8 * features["category_operational"]
    score += 6 * features["prev_open_tickets"]
    score += 14 * features["low_confidence"]
    score += 11 * features["outcome_unresolved"]
    score += 5 * features["duration_long"]
    score += 9 * features["high_term_count"] + 4 * features["medium_term_count"]
    score += rng.normal(0, 9)  # label noise
    return score


def _label(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 42:
        return "medium"
    return "low"


def _sample(rng: np.random.Generator) -> Dict:
    priority = rng.choice(PRIORITIES, p=[0.30, 0.40, 0.20, 0.10])
    sentiment = rng.choice(SENTIMENTS)
    tier = rng.choice(TIERS)
    category = rng.choice(CATEGORIES)
    channel = rng.choice(CHANNELS)
    outcome = rng.choice(OUTCOMES)
    if sentiment == "negative" or priority in ("high", "urgent"):
        text = rng.choice(HIGH_PHRASES + MED_PHRASES)
    else:
        text = rng.choice(LOW_PHRASES + MED_PHRASES)
    return {
        "channel": channel,
        "category": category,
        "priority": str(priority),
        "sentiment": str(sentiment),
        "customerTier": str(tier),
        "previousOpenTickets": int(rng.integers(0, 5)),
        "confidence": round(float(rng.uniform(0.25, 0.98)), 3),
        "escalate": bool(rng.random() < 0.18),
        "transcriptText": str(text),
        "callOutcome": str(outcome),
        "durationSeconds": int(rng.integers(30, 900)),
    }


def generate(rows: int, seed: int) -> List[Dict]:
    from features import build_feature_vector  # local import keeps module standalone

    rng = np.random.default_rng(seed)
    out: List[Dict] = []
    for _ in range(rows):
        record = _sample(rng)
        features = build_feature_vector(record)
        record["riskLevel"] = _label(_latent_score(features, rng))
        out.append(record)
    return out


def write_csv(path: str, records: List[Dict]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fields = list(records[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic risk-model data")
    parser.add_argument("--rows", type=int, default=6000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "data"))
    args = parser.parse_args()

    records = generate(args.rows, args.seed)
    split = int(len(records) * 0.8)
    write_csv(os.path.join(args.out_dir, "train.csv"), records[:split])
    write_csv(os.path.join(args.out_dir, "test.csv"), records[split:])
    print(f"Wrote {split} train and {len(records) - split} test rows to {args.out_dir}")


if __name__ == "__main__":
    main()
