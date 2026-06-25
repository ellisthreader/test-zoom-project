"""Export Python↔TypeScript parity fixtures.

Builds a diverse set of representative input records, runs each through the
exported artifact via ml/infer.py (load_artifact + predict_proba +
predict_label), and writes them to server/ai/__fixtures__/parity-fixtures.json
so the TypeScript serving layer can be asserted against the Python model and
prove there is no train-serve skew.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List

from infer import load_artifact, predict_label, predict_proba

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ARTIFACT_PATH = os.path.join(HERE, "artifacts", "risk_model.json")
OUTPUT_PATH = os.path.join(ROOT, "server", "ai", "__fixtures__", "parity-fixtures.json")


def _records() -> List[Dict]:
    return [
        # Clearly high-risk: fraud + legal + escalation + VIP.
        {
            "transcriptText": "The customer says this is fraud, threatens legal action and a lawsuit, and demands a manager.",
            "summary": "Fraud and legal threat",
            "category": "fraud",
            "priority": "urgent",
            "sentiment": "negative",
            "customerTier": "vip",
            "callOutcome": "handoff",
            "channel": "zoom_contact_center",
            "confidence": 0.28,
            "previousOpenTickets": 4,
            "escalate": True,
            "durationSeconds": 720,
        },
        # Clearly low-risk: routine resolved query.
        {
            "transcriptText": "Customer asked whether the office is open on Saturday and accepted the answer.",
            "summary": "Opening hours",
            "category": "general_support",
            "priority": "low",
            "sentiment": "neutral",
            "customerTier": "standard",
            "callOutcome": "resolved",
            "channel": "chat",
            "confidence": 0.95,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 75,
        },
        # Medium: billing question, mildly negative.
        {
            "transcriptText": "I have a question about my invoice and a refund that has not arrived yet.",
            "summary": "Invoice and refund query",
            "category": "billing",
            "priority": "normal",
            "sentiment": "frustrated",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "email",
            "confidence": 0.66,
            "previousOpenTickets": 1,
            "escalate": False,
            "durationSeconds": 240,
        },
        # VIP, otherwise calm.
        {
            "transcriptText": "Thanks for the quick help upgrading my plan.",
            "summary": "Plan upgrade",
            "category": "account",
            "priority": "normal",
            "sentiment": "positive",
            "customerTier": "vip",
            "callOutcome": "resolved",
            "channel": "chat",
            "confidence": 0.9,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 130,
        },
        # Voice channel specifically.
        {
            "transcriptText": "Caller wants to confirm the delivery date for their order.",
            "summary": "Delivery date",
            "category": "delivery",
            "priority": "normal",
            "sentiment": "neutral",
            "customerTier": "standard",
            "callOutcome": "resolved",
            "channel": "voice",
            "confidence": 0.81,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 200,
        },
        # escalate=true with otherwise mild context.
        {
            "transcriptText": "Please pass this to a human, I would like more help.",
            "summary": "Handoff requested",
            "category": "general_support",
            "priority": "normal",
            "sentiment": "neutral",
            "customerTier": "standard",
            "callOutcome": "handoff",
            "channel": "chat",
            "confidence": 0.7,
            "previousOpenTickets": 1,
            "escalate": True,
            "durationSeconds": 160,
        },
        # Empty / minimal input.
        {},
        # Minimal but with a transcript only.
        {"transcriptText": "hello"},
        # High previousOpenTickets.
        {
            "transcriptText": "Following up again on my still-open ticket.",
            "summary": "Repeat follow-up",
            "category": "general_support",
            "priority": "high",
            "sentiment": "frustrated",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "email",
            "confidence": 0.62,
            "previousOpenTickets": 5,
            "escalate": False,
            "durationSeconds": 300,
        },
        # Long duration.
        {
            "transcriptText": "We spent a long time going through the technical setup.",
            "summary": "Long technical session",
            "category": "technical",
            "priority": "normal",
            "sentiment": "neutral",
            "customerTier": "standard",
            "callOutcome": "resolved",
            "channel": "voice",
            "confidence": 0.77,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 900,
        },
        # Negative sentiment, no keywords.
        {
            "transcriptText": "I am really not happy with how this went.",
            "summary": "Dissatisfied",
            "category": "general_support",
            "priority": "normal",
            "sentiment": "negative",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "chat",
            "confidence": 0.6,
            "previousOpenTickets": 1,
            "escalate": False,
            "durationSeconds": 210,
        },
        # Sensitive category (security) without escalation.
        {
            "transcriptText": "I think there was unauthorized access to my account, possible breach.",
            "summary": "Possible account breach",
            "category": "security",
            "priority": "high",
            "sentiment": "negative",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "email",
            "confidence": 0.55,
            "previousOpenTickets": 2,
            "escalate": False,
            "durationSeconds": 360,
        },
        # Many risk keywords in transcriptText.
        {
            "transcriptText": "This is a fraud and a breach, I want to cancel, file a complaint, threaten legal action, chargeback now.",
            "summary": "Multiple risk terms",
            "category": "billing",
            "priority": "urgent",
            "sentiment": "angry",
            "customerTier": "vip",
            "callOutcome": "handoff",
            "channel": "voice",
            "confidence": 0.3,
            "previousOpenTickets": 3,
            "escalate": True,
            "durationSeconds": 540,
        },
        # Low confidence boundary.
        {
            "transcriptText": "Not sure what the customer wants exactly.",
            "summary": "Ambiguous",
            "category": "general_support",
            "priority": "normal",
            "sentiment": "neutral",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "chat",
            "confidence": 0.42,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 120,
        },
        # Operational/technical failure.
        {
            "transcriptText": "The app failed and I cannot access my dashboard, it is broken.",
            "summary": "Outage",
            "category": "technical",
            "priority": "high",
            "sentiment": "frustrated",
            "customerTier": "standard",
            "callOutcome": "failed",
            "channel": "chat",
            "confidence": 0.58,
            "previousOpenTickets": 2,
            "escalate": False,
            "durationSeconds": 480,
        },
        # Cancellation / churn risk.
        {
            "transcriptText": "I want to cancel my subscription and request a refund.",
            "summary": "Cancellation",
            "category": "billing",
            "priority": "high",
            "sentiment": "negative",
            "customerTier": "standard",
            "callOutcome": "review",
            "channel": "email",
            "confidence": 0.64,
            "previousOpenTickets": 1,
            "escalate": False,
            "durationSeconds": 280,
        },
        # Positive VIP resolved, voice.
        {
            "transcriptText": "Everything is resolved, thank you so much for the help.",
            "summary": "Resolved happily",
            "category": "account",
            "priority": "low",
            "sentiment": "positive",
            "customerTier": "vip",
            "callOutcome": "resolved",
            "channel": "voice",
            "confidence": 0.93,
            "previousOpenTickets": 0,
            "escalate": False,
            "durationSeconds": 95,
        },
        # Urgent emergency wording.
        {
            "transcriptText": "This is an emergency, the situation is unsafe and I feel vulnerable.",
            "summary": "Safety emergency",
            "category": "policy",
            "priority": "urgent",
            "sentiment": "negative",
            "customerTier": "standard",
            "callOutcome": "handoff",
            "channel": "voice",
            "confidence": 0.35,
            "previousOpenTickets": 1,
            "escalate": True,
            "durationSeconds": 410,
        },
    ]


def main() -> None:
    artifact = load_artifact(ARTIFACT_PATH)
    fixtures = []
    for record in _records():
        proba = predict_proba(artifact, record)
        label = predict_label(artifact, record)
        fixtures.append(
            {
                "input": record,
                "expected": {
                    "riskLevel": label,
                    "classProbabilities": proba,
                },
            }
        )

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(fixtures, handle, indent=2)
        handle.write("\n")

    print(f"Wrote {len(fixtures)} fixtures to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
