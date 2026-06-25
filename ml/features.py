"""Shared, explicit feature contract for the RelayClarity risk model.

This module is the single source of truth for how a raw case/ticket is turned
into a numeric feature vector. The TypeScript serving layer
(`server/ai/risk-features.tsx`) reimplements this exact logic so that training
and inference cannot drift apart. The keyword lists mirror the deterministic
heuristic in `server/ai/risk-scoring.tsx`.
"""

from __future__ import annotations

import re
from typing import Dict, List

MODEL_NAME = "risk-scoring-logreg"

# Mirrors HIGH_RISK_TERMS / MEDIUM_RISK_TERMS in server/ai/risk-scoring.tsx.
HIGH_RISK_TERMS = [
    "legal", "lawsuit", "fraud", "unsafe", "emergency", "chargeback", "angry",
    "complaint", "cancel", "cancellation", "vulnerable", "threat", "breach",
    "unauthorised", "unauthorized",
]
MEDIUM_RISK_TERMS = [
    "refund", "payment", "invoice", "billing", "not arrived", "broken",
    "failed", "cannot access", "manager", "human",
]

# Canonical feature order. Both training and serving rely on this exact order.
FEATURE_ORDER: List[str] = [
    "priority_urgent",
    "priority_high",
    "priority_low",
    "tier_vip",
    "escalate",
    "sentiment_negative",
    "category_sensitive",
    "category_operational",
    "prev_open_tickets",
    "confidence",
    "low_confidence",
    "outcome_unresolved",
    "duration_long",
    "high_term_count",
    "medium_term_count",
    "channel_voice",
]

CLASS_ORDER = ["low", "medium", "high"]


def _token(value) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def _truthy(value) -> bool:
    # CSV round-trips booleans to strings, so "False" must not read as truthy.
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "y", "t")
    return bool(value)


def _normalize_confidence(value) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.72
    if numeric > 1:
        numeric = numeric / 100.0
    return max(0.0, min(1.0, numeric))


def _count_terms(text: str, terms: List[str]) -> int:
    lowered = text.lower()
    return sum(1 for term in terms if term in lowered)


def build_feature_vector(record: Dict) -> Dict[str, float]:
    """Turn a raw case record into the canonical feature dict."""
    text = str(record.get("transcriptText") or record.get("summary") or "")
    category = _token(record.get("category"))
    priority = _token(record.get("priority"))
    sentiment = _token(record.get("sentiment"))
    tier = _token(record.get("customerTier"))
    outcome = _token(record.get("callOutcome"))
    channel = _token(record.get("channel"))
    confidence = _normalize_confidence(record.get("confidence"))
    prev_open = max(0, min(5, int(round(float(record.get("previousOpenTickets") or 0)))))
    duration = float(record.get("durationSeconds") or 0)

    return {
        "priority_urgent": 1.0 if priority == "urgent" else 0.0,
        "priority_high": 1.0 if priority == "high" else 0.0,
        "priority_low": 1.0 if priority == "low" else 0.0,
        "tier_vip": 1.0 if tier == "vip" else 0.0,
        "escalate": 1.0 if _truthy(record.get("escalate")) else 0.0,
        "sentiment_negative": 1.0 if re.search(r"negative|angry|frustrated|complaint", sentiment) else 0.0,
        "category_sensitive": 1.0 if re.search(r"billing|payment|policy|fraud|security", category) else 0.0,
        "category_operational": 1.0 if re.search(r"technical|delivery", category) else 0.0,
        "prev_open_tickets": float(prev_open),
        "confidence": confidence,
        "low_confidence": 1.0 if confidence < 0.6 else 0.0,
        "outcome_unresolved": 1.0 if re.search(r"handoff|review|abandoned|failed", outcome) else 0.0,
        "duration_long": 1.0 if duration >= 480 else 0.0,
        "high_term_count": float(min(5, _count_terms(text, HIGH_RISK_TERMS))),
        "medium_term_count": float(min(5, _count_terms(text, MEDIUM_RISK_TERMS))),
        "channel_voice": 1.0 if channel in ("voice", "zoom_contact_center", "phone") else 0.0,
    }


def vectorize(record: Dict) -> List[float]:
    features = build_feature_vector(record)
    return [features[name] for name in FEATURE_ORDER]
