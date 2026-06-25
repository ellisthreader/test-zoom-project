import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { businessCategorySeeds } from "./business-category-data";
import MagicBento from "./MagicBento";
import {
  buildBusinessTaxonomy,
  formatBusinessSuggestionLabel,
  getBusinessMatchEntry,
  getBusinessSuggestionEntries,
  type BusinessTaxonomyEntry
} from "./business-type-matcher";
import relayclarityLogoUrl from "../assets/relayclarity-logo.svg";
import demoAgentAvatarUrl from "../assets/demo-agent-avatar.png";
import workflowConfigureCardUrl from "../assets/workflow-configure-card.png";
import workflowSimulateCardUrl from "../assets/workflow-simulate-card.png";
import workflowObserveCardUrl from "../assets/workflow-observe-card.png";
import workflowHandoffUrl from "../assets/workflow-handoff.png";
import launchPhotoTestUrl from "../assets/launch-photo-test.png";
import launchPhotoControlUrl from "../assets/launch-photo-control.png";
import launchPhotoObserveUrl from "../assets/launch-photo-observe.png";
import launchPhotoLaunchUrl from "../assets/launch-photo-launch.png";
import voiceAgentGeorgeUrl from "../assets/voice-agent-george.png";
import voiceAgentCharlieUrl from "../assets/voice-agent-charlie.png";
import voiceAgentEricUrl from "../assets/voice-agent-eric.png";
import voiceAgentSarahUrl from "../assets/voice-agent-sarah.png";
import voiceAgentAliceUrl from "../assets/voice-agent-alice.png";
import voiceAgentMatildaUrl from "../assets/voice-agent-matilda.png";
import customerBearLaneUrl from "../assets/customer-bear-lane.jpg";
import customerClearDbsUrl from "../assets/customer-cleardbs.jpg";
import customerHarbourFinancialUrl from "../assets/customer-harbour-financial.jpg";
import customerNorthlineUrl from "../assets/customer-northline.jpg";
import customerNorthstarDentalUrl from "../assets/customer-northstar-dental.jpg";
import bearLaneLogoUrl from "../assets/customer-logos/bear-lane-logo.png";
import clearDbsLogoUrl from "../assets/customer-logos/cleardbs-logo.svg";
import northernLineServicesLogoUrl from "../assets/customer-logos/northern-line-services-logo.svg";
import northstarDentalLogoUrl from "../assets/customer-logos/northstar-dental-logo.svg";
import "./styles.css";

type ScenarioKey = "billing" | "handoff" | "injection";

type Scenario = {
  title: string;
  label: string;
  score: number;
  result: string;
};

type TestRunState = "idle" | "running" | "complete";

type TestScenarioResult = {
  score: number;
  passed: boolean;
  result: string;
  checks: Array<{
    name: string;
    passed: boolean;
  }>;
};

type LaunchTestApiResult = TestScenarioResult & {
  mode: "real" | "simulated";
  metrics?: {
    groundedness: number;
    taskProgress: number;
    faithfulness: number;
    conciseness: number;
    escalationHandled: boolean;
    avgLatencyMs: number;
    turns: number;
  };
};

type Connector = {
  key: string;
  name: string;
  providerId: string;
  provider: string;
  logoUrl: string;
  connected: boolean;
  connectionMode?: "oauth" | "sandbox";
  connectionMessage?: string;
  scopes?: string[];
  testStatus?: string;
  testChecks?: IntegrationCheck[];
  lastCheckedAt?: string;
};

type ConnectorGroup = "core" | "operations" | "growth";

type IntegrationProvider = {
  id: string;
  name: string;
  category: string;
  logoUrl: string;
  authType: string;
  status: string;
  scopes: string[];
  description: string;
};

type IntegrationConnectResult = {
  providerId: string;
  name: string;
  category: string;
  logoUrl: string;
  status: "connected" | "oauth_redirect";
  authUrl?: string;
  mode: "oauth" | "sandbox";
  scopes: string[];
  message: string;
  connectedAt?: string;
};

type IntegrationCheck = {
  name: string;
  status: string;
};

type IntegrationTestResult = {
  ok: boolean;
  provider: string;
  mode: string;
  checkedAt: string;
  checks: IntegrationCheck[];
};

type IntegrationCatalogPayload = {
  providers: IntegrationProvider[];
  connected?: IntegrationConnectResult[];
};

type VoicePreset = {
  id: string;
  name: string;
  role: string;
  tone: string;
  voiceId: string;
  imageUrl: string;
  previewAudioUrl: string;
  sample: string;
};

type SpeechPayload = {
  mode: "audio" | "mock";
  provider: string;
  contentType?: string;
  audioBase64?: string;
  voiceId?: string;
  message?: string;
};

const SILENT_AUDIO_URL = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YQQAAAAAAA==";
const VOICE_GENERATION_LIMIT = 5;

const intelligenceReveal = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
};

type AuthPayload = {
  user: AuthUser | null;
  googleAuthAvailable: boolean;
  isNewUser?: boolean;
};

type AuthStatus = "checking" | "signed-out" | "signed-in";

type Project = {
  id: string;
  name: string;
  meta: string;
  businessType?: string;
  websiteUrl?: string;
  phoneContactNumber?: string;
  launchReport?: string;
};

type MetricCallRecord = {
  id: string;
  hourLabel: string;
  time: string;
  callerName: string;
  phone: string;
  intent: string;
  outcome: "Resolved" | "Handoff" | "Review" | "Abandoned";
  issueCategory: "Billing" | "Booking" | "Policy" | "Knowledge" | "Technical" | "General";
  duration: string;
  confidence: number;
  summary: string;
  aiAction: string;
  wentWrong: string;
  transcript: { speaker: "Customer" | "AI" | "System"; text: string }[];
};

type RiskLevel = "high" | "medium" | "low";

type RiskQueueItem = {
  id: string;
  sourceType: "ticket" | "call" | "transaction" | "account_security";
  title: string;
  customer: string;
  summary: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  due: string;
  owner: string;
  source: string;
  reasons: string[];
  signals: { label: string; value: string }[];
  nextAction: string;
  transcript?: MetricCallRecord["transcript"];
};

type RiskQueueApiState = {
  status: "idle" | "loading" | "ready" | "fallback";
  items: RiskQueueItem[];
  calls: MetricCallRecord[];
  error?: string;
};

type LiveRiskConversation = {
  id: string;
  channel: "chat" | "phone";
  customer: string;
  title: string;
  detail: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  status: string;
  action: string;
  transcript?: MetricCallRecord["transcript"];
};

type LiveWorkspaceMetrics = {
  tick: number;
  callsHandled: number;
  activeCalls: number;
  containedCalls: number;
  handoffs: number;
  openRisks: number;
  p95LatencyMs: number;
  csat: number;
  firstContactResolution: number;
  recontactRate: number;
  humanHoursSaved: number;
  asrConfidence: number;
  bargeInRecovery: number;
  silenceTimeoutRate: number;
  failedTurns: number;
  citationCoverage: number;
  retrievalMisses: number;
  staleSources: number;
  draftAnswers: number;
  policyViolations: number;
  unsupportedAttempts: number;
  lowConfidenceAnswers: number;
  sensitiveEscalations: number;
  ownerAccuracy: number;
  slaRisk: number;
  avgHandoffSeconds: number;
  crmLookupSuccess: number;
  ticketWriteSuccess: number;
  webhookErrors: number;
  knowledgeSyncMinutes: number;
  hourlyVolume: number[];
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function projectSeed(projectId: string) {
  return projectId.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

function createInitialLiveMetrics(project: Project): LiveWorkspaceMetrics {
  const seed = projectSeed(project.id);
  const isNewWorkspace = !project.launchReport && !["northstar-dental", "cleardbs", "harbour-financial"].includes(project.id);
  const baseCalls = isNewWorkspace ? 4 + (seed % 7) : 92 + (seed % 48);
  const handoffs = Math.max(1, Math.round(baseCalls * 0.07));

  return {
    tick: 0,
    callsHandled: baseCalls,
    activeCalls: isNewWorkspace ? 1 + (seed % 3) : 8 + (seed % 6),
    containedCalls: Math.round(baseCalls * 0.82),
    handoffs,
    openRisks: Math.max(1, Math.round(handoffs * 0.6)),
    p95LatencyMs: 1280 + (seed % 240),
    csat: 4.5 + ((seed % 4) / 10),
    firstContactResolution: 72 + (seed % 7),
    recontactRate: 3 + (seed % 4),
    humanHoursSaved: Number((baseCalls * 0.062).toFixed(1)),
    asrConfidence: 91 + (seed % 5),
    bargeInRecovery: 84 + (seed % 7),
    silenceTimeoutRate: 2 + (seed % 3),
    failedTurns: 2 + (seed % 4),
    citationCoverage: 86 + (seed % 7),
    retrievalMisses: 3 + (seed % 5),
    staleSources: seed % 2,
    draftAnswers: 1 + (seed % 3),
    policyViolations: 0,
    unsupportedAttempts: 1 + (seed % 3),
    lowConfidenceAnswers: 3 + (seed % 5),
    sensitiveEscalations: 1 + (seed % 2),
    ownerAccuracy: 94 + (seed % 5),
    slaRisk: Math.max(0, Math.round(handoffs * 0.25)),
    avgHandoffSeconds: 38 + (seed % 9),
    crmLookupSuccess: 96 + (seed % 4),
    ticketWriteSuccess: 99 + (seed % 2),
    webhookErrors: 0,
    knowledgeSyncMinutes: 4 + (seed % 8),
    hourlyVolume: [6, 14, 30, 24, 17, 22, 15, 10].map((value) => Math.max(1, value + (seed % 5) - 2))
  };
}

function createMetricCallRecords(project: Project, metrics: LiveWorkspaceMetrics, hourLabels: string[]): MetricCallRecord[] {
  const seed = projectSeed(project.id);
  const callers = [
    { name: "Amelia Carter", phone: "+44 7700 900111" },
    { name: "Noah Patel", phone: "+44 7700 900222" },
    { name: "Grace Morgan", phone: "+44 7700 900318" },
    { name: "Ethan Lewis", phone: "+44 7700 900427" },
    { name: "Maya Shah", phone: "+44 7700 900536" },
    { name: "Oliver Reed", phone: "+44 7700 900645" }
  ];
  const intents = [
    { intent: "Invoice copy requested", category: "Billing" as const, customer: "Can you send me a copy of the latest invoice?", ai: "I found the account and can send the invoice to the email on file." },
    { intent: "Appointment change", category: "Booking" as const, customer: "I need to move my booking to later this week.", ai: "I can collect your preferred time and send the change request to the team." },
    { intent: "Refund status", category: "Policy" as const, customer: "Where is my refund and can you guarantee it today?", ai: "I can check the policy, but I cannot promise a refund date without staff review." },
    { intent: "Missing delivery", category: "Knowledge" as const, customer: "My express delivery has not arrived.", ai: "I need the order number and postcode so I can create a high-priority follow-up." },
    { intent: "Account lookup failed", category: "Technical" as const, customer: "The system never recognizes my account number.", ai: "I am having trouble matching that account and will route this with your details." },
    { intent: "Opening hours", category: "General" as const, customer: "Are you open tomorrow morning?", ai: "I can answer from the approved opening-hours source." }
  ];

  return hourLabels.flatMap((hourLabel, hourIndex) => {
    const count = metrics.hourlyVolume[hourIndex] || 0;

    return Array.from({ length: count }, (_, callIndex) => {
      const intent = intents[(seed + hourIndex + callIndex) % intents.length];
      const caller = callers[(seed + callIndex + hourIndex * 2) % callers.length];
      const minute = String((callIndex * 7 + seed + hourIndex * 3) % 60).padStart(2, "0");
      const baseOutcome = (seed + hourIndex + callIndex) % 11 === 0
        ? "Review"
        : intent.category === "Policy" || intent.category === "Technical" || (seed + callIndex) % 9 === 0
          ? "Handoff"
          : (seed + callIndex) % 17 === 0
            ? "Abandoned"
            : "Resolved";
      const outcome = baseOutcome as MetricCallRecord["outcome"];
      const confidence = clampNumber(92 - (outcome === "Handoff" ? 10 : outcome === "Review" ? 15 : outcome === "Abandoned" ? 22 : 0) + ((seed + callIndex) % 5), 52, 98);
      const wentWrong = outcome === "Resolved"
        ? "Nothing material. The AI answered from approved context and completed the wrap-up."
        : outcome === "Handoff"
          ? intent.category === "Technical"
            ? "CRM lookup did not confidently match the caller, so the AI handed off with context."
            : "The request needed staff approval or a policy-safe human decision."
          : outcome === "Review"
            ? "Low answer confidence. The response should be reviewed before reuse."
            : "Caller dropped before identity and intent were complete.";

      return {
        id: `${project.id}-${hourLabel}-${callIndex}`,
        hourLabel,
        time: hourLabel === "Now" ? `13:${minute}` : `${hourLabel.slice(0, 2)}:${minute}`,
        callerName: caller.name,
        phone: caller.phone,
        intent: intent.intent,
        outcome,
        issueCategory: intent.category,
        duration: `${2 + ((seed + callIndex) % 5)}m ${String(8 + ((seed + hourIndex + callIndex) % 50)).padStart(2, "0")}s`,
        confidence,
        summary: outcome === "Resolved"
          ? `AI handled ${intent.intent.toLowerCase()} and completed the customer response.`
          : `AI identified ${intent.intent.toLowerCase()} and preserved context for follow-up.`,
        aiAction: outcome === "Resolved"
          ? "Answered customer, updated notes, and closed the interaction."
          : outcome === "Abandoned"
            ? "Captured partial transcript and marked the call incomplete."
            : "Prepared handoff summary, reason, and suggested owner.",
        wentWrong,
        transcript: [
          { speaker: "Customer", text: intent.customer },
          { speaker: "AI", text: intent.ai },
          {
            speaker: outcome === "Resolved" ? "AI" : "System",
            text: outcome === "Resolved"
              ? "I have completed that for you and added a note to the account."
              : outcome === "Abandoned"
                ? "Call ended before the AI could complete verification."
                : "Conversation routed for human review with transcript and customer context."
          }
        ]
      };
    });
  });
}

function createRiskQueueItems(project: Project, metrics: LiveWorkspaceMetrics, calls: MetricCallRecord[]): RiskQueueItem[] {
  const reviewCalls = calls
    .filter((call) => call.outcome !== "Resolved" || call.confidence < 82)
    .slice(0, 4)
    .map((call, index): RiskQueueItem => {
      const isHigh = call.outcome === "Handoff" && (call.issueCategory === "Billing" || call.issueCategory === "Policy");
      const isMedium = call.outcome === "Review" || call.confidence < 82;
      const riskLevel: RiskLevel = isHigh ? "high" : isMedium ? "medium" : "low";
      const riskScore = clampNumber(
        Math.round(58 + (call.outcome === "Handoff" ? 18 : 8) + (100 - call.confidence) * 0.5 + (call.issueCategory === "Billing" ? 8 : 0)),
        35,
        96
      );

      return {
        id: `risk-call-${call.id}`,
        sourceType: call.outcome === "Handoff" ? "ticket" : "call",
        title: call.intent,
        customer: call.callerName,
        summary: call.summary,
        riskLevel,
        riskScore,
        confidence: call.confidence,
        due: index === 0 ? "Due now" : index === 1 ? "Within 30 min" : "Today",
        owner: call.issueCategory === "Billing" ? "Finance support" : call.issueCategory === "Policy" ? "Policy owner" : "Support lead",
        source: `${call.outcome} · ${call.issueCategory}`,
        reasons: [
          call.outcome === "Handoff" ? "Human handoff required" : "Review outcome",
          call.confidence < 84 ? "Low confidence answer" : "Transcript needs owner check",
          call.issueCategory === "Billing" ? "Payment or billing topic" : `${call.issueCategory} workflow`,
        ],
        signals: [
          { label: "Channel", value: "Zoom call" },
          { label: "Confidence", value: `${call.confidence}%` },
          { label: "Duration", value: call.duration },
        ],
        nextAction: call.outcome === "Handoff" ? "Assign owner and contact customer" : "Review transcript and confirm next step",
        transcript: call.transcript,
      };
    });

  const seed = projectSeed(project.id);
  const transactionAlerts: RiskQueueItem[] = [
    {
      id: `risk-transaction-${project.id}`,
      sourceType: "transaction",
      title: "Unusual payment pattern",
      customer: "Harbour account ending 2841",
      summary: "High-value overseas payment from a new device after repeated failed sign-in attempts.",
      riskLevel: "high",
      riskScore: clampNumber(91 + (seed % 5), 88, 97),
      confidence: 87,
      due: "Within 15 min",
      owner: "Fraud analyst",
      source: "Payments risk feed",
      reasons: ["New device", "Unusual location", "High-value payment", "Failed-login velocity"],
      signals: [
        { label: "Amount band", value: "High" },
        { label: "Device", value: "New" },
        { label: "Location", value: "Unusual" },
      ],
      nextAction: "Review transaction before customer contact",
    },
    {
      id: `risk-security-${project.id}`,
      sourceType: "account_security",
      title: "Account takeover signal",
      customer: "Enterprise admin account",
      summary: "Password reset, new device, and account permission changes occurred in a short window.",
      riskLevel: metrics.sensitiveEscalations > 0 ? "high" : "medium",
      riskScore: clampNumber(78 + metrics.sensitiveEscalations * 6, 70, 94),
      confidence: 82,
      due: "Within 1 hour",
      owner: "Security operations",
      source: "Identity risk feed",
      reasons: ["Password reset", "Permission change", "New device", "Sensitive account"],
      signals: [
        { label: "Session", value: "New device" },
        { label: "Permissions", value: "Changed" },
        { label: "Review", value: "Manual" },
      ],
      nextAction: "Validate identity and check recent account activity",
    },
  ];

  return [...transactionAlerts, ...reviewCalls]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 7);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return fallback;
}

function readNumber(record: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return fallback;
}

function readStringList(record: Record<string, unknown>, keys: string[], fallback: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      const strings = value
        .map((item) => typeof item === "string" ? item.trim() : isRecord(item) ? readString(item, ["label", "reason", "name", "value"]) : "")
        .filter(Boolean);

      if (strings.length) {
        return strings;
      }
    }
  }

  return fallback;
}

function readArrayFromPayload(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeRiskLevel(value: string, score: number): RiskLevel {
  const normalized = value.toLowerCase();

  if (normalized === "high" || normalized === "critical" || score >= 80) {
    return "high";
  }

  if (normalized === "medium" || normalized === "med" || score >= 55) {
    return "medium";
  }

  return "low";
}

function normalizeSourceType(value: string): RiskQueueItem["sourceType"] {
  const normalized = value.toLowerCase().replace(/[-\s]/g, "_");

  if (normalized === "transaction" || normalized === "payment" || normalized === "payments") {
    return "transaction";
  }

  if (normalized === "account_security" || normalized === "security" || normalized === "identity") {
    return "account_security";
  }

  if (normalized === "ticket" || normalized === "case") {
    return "ticket";
  }

  return "call";
}

function normalizeOutcome(value: string): MetricCallRecord["outcome"] {
  const normalized = value.toLowerCase();

  if (normalized.includes("handoff") || normalized.includes("escalat") || normalized.includes("transfer")) {
    return "Handoff";
  }

  if (normalized.includes("review") || normalized.includes("flag")) {
    return "Review";
  }

  if (normalized.includes("abandon") || normalized.includes("drop") || normalized.includes("incomplete")) {
    return "Abandoned";
  }

  return "Resolved";
}

function normalizeIssueCategory(value: string): MetricCallRecord["issueCategory"] {
  const normalized = value.toLowerCase();

  if (normalized.includes("bill") || normalized.includes("payment") || normalized.includes("invoice")) return "Billing";
  if (normalized.includes("book") || normalized.includes("appoint") || normalized.includes("schedul")) return "Booking";
  if (normalized.includes("policy") || normalized.includes("refund") || normalized.includes("legal")) return "Policy";
  if (normalized.includes("knowledge") || normalized.includes("answer") || normalized.includes("source")) return "Knowledge";
  if (normalized.includes("tech") || normalized.includes("system") || normalized.includes("lookup")) return "Technical";

  return "General";
}

function normalizeTranscript(value: unknown): MetricCallRecord["transcript"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((turn) => {
      if (!isRecord(turn)) {
        return null;
      }

      const speaker = readString(turn, ["speaker", "role", "from"], "System").toLowerCase();
      const text = readString(turn, ["text", "content", "message", "utterance"]);

      if (!text) {
        return null;
      }

      return {
        speaker: speaker.includes("customer") || speaker.includes("caller") || speaker === "user"
          ? "Customer" as const
          : speaker.includes("ai") || speaker.includes("agent") || speaker.includes("assistant")
            ? "AI" as const
            : "System" as const,
        text
      };
    })
    .filter((turn): turn is MetricCallRecord["transcript"][number] => Boolean(turn));
}

function normalizeMetricCallRecord(raw: unknown, index: number, hourLabels: string[]): MetricCallRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const fallbackHour = hourLabels[index % hourLabels.length] || "Now";
  const outcome = normalizeOutcome(readString(raw, ["outcome", "status", "disposition"], "Resolved"));
  const issueCategory = normalizeIssueCategory(readString(raw, ["issueCategory", "issue_category", "category", "reason", "intent"], "General"));
  const confidence = clampNumber(Math.round(readNumber(raw, ["confidence", "confidenceScore", "confidence_score"], 86)), 0, 100);
  const transcript = normalizeTranscript(raw.transcript);
  const intent = readString(raw, ["intent", "title", "topic", "summary"], "Customer call");
  const hourLabel = readString(raw, ["hourLabel", "hour_label", "hour"], fallbackHour);

  return {
    id: readString(raw, ["id", "callId", "call_id", "conversationId", "conversation_id"], `api-call-${index}`),
    hourLabel,
    time: readString(raw, ["time", "startedAt", "started_at", "timestamp"], hourLabel),
    callerName: readString(raw, ["callerName", "caller_name", "customer", "customerName", "customer_name", "name"], "Customer"),
    phone: readString(raw, ["phone", "phoneNumber", "phone_number", "ani"], "Unknown"),
    intent,
    outcome,
    issueCategory,
    duration: readString(raw, ["duration", "durationLabel", "duration_label"], "Unknown"),
    confidence,
    summary: readString(raw, ["summary", "description"], `${intent} ended with ${outcome.toLowerCase()} outcome.`),
    aiAction: readString(raw, ["aiAction", "ai_action", "action", "nextAction", "next_action"], outcome === "Resolved" ? "Answered from approved context." : "Prepared handoff context."),
    wentWrong: readString(raw, ["wentWrong", "went_wrong", "failureReason", "failure_reason", "reviewReason", "review_reason"], outcome === "Resolved" ? "Nothing material." : "Needs staff review."),
    transcript
  };
}

function normalizeRiskSignals(raw: unknown, fallback: RiskQueueItem["signals"]) {
  if (Array.isArray(raw)) {
    const signals = raw
      .map((signal) => {
        if (isRecord(signal)) {
          const label = readString(signal, ["label", "name", "key"]);
          const value = readString(signal, ["value", "detail", "score"]);

          return label && value ? { label, value } : null;
        }

        return typeof signal === "string" && signal.trim()
          ? { label: "Signal", value: signal.trim() }
          : null;
      })
      .filter((signal): signal is RiskQueueItem["signals"][number] => Boolean(signal));

    if (signals.length) {
      return signals;
    }
  }

  if (isRecord(raw)) {
    const signals = Object.entries(raw)
      .map(([label, value]) => ({ label, value: typeof value === "string" || typeof value === "number" ? String(value) : "" }))
      .filter((signal) => signal.value);

    if (signals.length) {
      return signals;
    }
  }

  return fallback;
}

function normalizeRiskQueueItem(raw: unknown, index: number, callsById: Map<string, MetricCallRecord>): RiskQueueItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const linkedCallId = readString(raw, ["callId", "call_id", "sourceId", "source_id", "conversationId", "conversation_id"]);
  const linkedCall = linkedCallId ? callsById.get(linkedCallId) : undefined;
  const embeddedCall = normalizeMetricCallRecord(raw.call || raw.conversation, index, ["Now"]);
  const call = linkedCall || embeddedCall;
  const riskScore = clampNumber(Math.round(readNumber(raw, ["riskScore", "risk_score", "score", "mlScore", "ml_score", "priorityScore", "priority_score"], call ? 70 + (100 - call.confidence) * 0.2 : 72)), 0, 100);
  const riskLevel = normalizeRiskLevel(readString(raw, ["riskLevel", "risk_level", "level", "priority"]), riskScore);
  const sourceType = normalizeSourceType(readString(raw, ["sourceType", "source_type", "type", "sourceKind", "source_kind"], call ? "call" : "ticket"));
  const title = readString(raw, ["title", "intent", "name"], call?.intent || "Risk queue item");
  const customer = readString(raw, ["customer", "customerName", "customer_name", "callerName", "caller_name"], call?.callerName || "Customer");
  const confidence = clampNumber(Math.round(readNumber(raw, ["confidence", "confidenceScore", "confidence_score", "modelConfidence", "model_confidence"], call?.confidence || 80)), 0, 100);

  return {
    id: readString(raw, ["id", "riskId", "risk_id"], `api-risk-${index}`),
    sourceType,
    title,
    customer,
    summary: readString(raw, ["summary", "description", "explanation"], call?.summary || "Backend risk model flagged this item for review."),
    riskLevel,
    riskScore,
    confidence,
    due: readString(raw, ["due", "dueAt", "due_at", "sla", "slaLabel", "sla_label"], riskLevel === "high" ? "Due now" : "Today"),
    owner: readString(raw, ["owner", "assignee", "team"], riskLevel === "high" ? "Risk analyst" : "Support lead"),
    source: readString(raw, ["source", "sourceLabel", "source_label"], call ? `${call.outcome} · ${call.issueCategory}` : "Risk model"),
    reasons: readStringList(raw, ["reasons", "reasonCodes", "reason_codes", "explanations"], call ? [call.wentWrong] : ["Model score exceeded review threshold"]),
    signals: normalizeRiskSignals(raw.signals, [
      { label: "Source", value: sourceType.replace("_", " ") },
      { label: "Confidence", value: `${confidence}%` }
    ]),
    nextAction: readString(raw, ["nextAction", "next_action", "recommendedAction", "recommended_action"], riskLevel === "high" ? "Assign owner and review now" : "Review and confirm next step"),
    transcript: normalizeTranscript(raw.transcript).length ? normalizeTranscript(raw.transcript) : call?.transcript
  };
}

function normalizeRiskQueuePayload(payload: unknown, fallbackCalls: MetricCallRecord[]) {
  const rawCalls = Array.isArray(payload)
    ? []
    : readArrayFromPayload(payload, ["calls", "callRecords", "call_records", "metricCalls", "metric_calls", "conversations"]);
  const calls = rawCalls
    .map((call, index) => normalizeMetricCallRecord(call, index, ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "Now"]))
    .filter((call): call is MetricCallRecord => Boolean(call));
  const callsById = new Map([...fallbackCalls, ...calls].map((call) => [call.id, call]));
  const rawItems = Array.isArray(payload)
    ? payload
    : readArrayFromPayload(payload, ["items", "queue", "results", "riskQueue", "risk_queue", "alerts"]);
  const items = rawItems
    .map((item, index) => normalizeRiskQueueItem(item, index, callsById))
    .filter((item): item is RiskQueueItem => Boolean(item))
    .sort((a, b) => b.riskScore - a.riskScore);

  return { items, calls };
}

function parseMetricDurationSeconds(duration: string) {
  const minutes = duration.match(/(\d+(?:\.\d+)?)\s*m/i);
  const seconds = duration.match(/(\d+(?:\.\d+)?)\s*s/i);

  if (minutes || seconds) {
    return Math.round((minutes ? Number(minutes[1]) * 60 : 0) + (seconds ? Number(seconds[1]) : 0));
  }

  const numeric = Number(duration);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMetricDuration(seconds: number) {
  if (!seconds) {
    return "Unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  return minutes ? `${minutes}m ${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
}

function formatMetricCallTime(time: string) {
  const parsed = new Date(time);

  if (!Number.isNaN(parsed.getTime()) && time.includes("T")) {
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return time;
}

function initialsForName(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts.length ? parts.slice(0, 2).map((part) => part[0]).join("") : "AI").toUpperCase();
}

function avatarForName(name: string) {
  const avatarUrls = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80",
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=96&h=96&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80"
  ];
  const seed = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);

  if (seed % 3 === 0) {
    return avatarUrls[seed % avatarUrls.length];
  }

  return "";
}

function operationStatusLabel(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("handoff")) return "Needs agent";
  if (normalized.includes("review") || normalized.includes("watch")) return "Review";
  if (normalized.includes("no handoff")) return "AI active";

  return status || "AI active";
}

function priorityLabel(level: RiskLevel) {
  if (level === "high") return "Urgent";
  if (level === "medium") return "Watch";
  return "Normal";
}

function conversationFromRiskItem(item: RiskQueueItem, channel: LiveRiskConversation["channel"]): LiveRiskConversation {
  return {
    id: `${channel}-${item.id}`,
    channel,
    customer: item.customer,
    title: item.title,
    detail: item.summary,
    riskLevel: item.riskLevel,
    riskScore: item.riskScore,
    confidence: item.confidence,
    status: item.riskLevel === "high" ? "Needs agent" : item.riskLevel === "medium" ? "Review" : "AI active",
    action: item.nextAction,
    transcript: item.transcript
  };
}

function conversationFromCall(call: MetricCallRecord, index: number, channel: LiveRiskConversation["channel"] = "phone"): LiveRiskConversation {
  const riskScore = clampNumber(
    Math.round(
      36 +
        (call.outcome === "Handoff" ? 34 : call.outcome === "Review" ? 20 : call.outcome === "Abandoned" ? 24 : 0) +
        (100 - call.confidence) * 0.32 +
        (call.issueCategory === "Policy" || call.issueCategory === "Billing" ? 8 : 0)
    ),
    18,
    96
  );
  const riskLevel: RiskLevel = riskScore >= 76 ? "high" : riskScore >= 54 ? "medium" : "low";

  return {
    id: `${channel}-${call.id}-${index}`,
    channel,
    customer: call.callerName,
    title: call.intent,
    detail: call.summary,
    riskLevel,
    riskScore,
    confidence: call.confidence,
    status: call.outcome === "Handoff" ? "Needs agent" : call.outcome === "Review" ? "Review" : "AI active",
    action: call.outcome === "Resolved" ? "Continue AI handling" : call.aiAction,
    transcript: call.transcript
  };
}

function advanceLiveMetrics(previous: LiveWorkspaceMetrics): LiveWorkspaceMetrics {
  const nextTick = previous.tick + 1;
  const newCall = nextTick % 4 === 0 ? 1 : 0;
  const newHandoff = newCall && nextTick % 11 === 0 ? 1 : 0;
  const newContained = newCall && !newHandoff ? 1 : 0;
  const hourlyVolume = [...previous.hourlyVolume];
  hourlyVolume[hourlyVolume.length - 1] += newCall;

  return {
    ...previous,
    tick: nextTick,
    callsHandled: previous.callsHandled + newCall,
    activeCalls: clampNumber(previous.activeCalls + (nextTick % 5 === 0 ? 1 : nextTick % 7 === 0 ? -1 : 0), 0, 24),
    containedCalls: previous.containedCalls + newContained,
    handoffs: previous.handoffs + newHandoff,
    openRisks: clampNumber(previous.openRisks + (newHandoff ? 1 : nextTick % 17 === 0 ? -1 : 0), 0, 12),
    p95LatencyMs: Math.round(clampNumber(previous.p95LatencyMs + (nextTick % 2 === 0 ? 18 : -13), 980, 1900)),
    csat: Number(clampNumber(previous.csat + (nextTick % 6 === 0 ? 0.1 : nextTick % 9 === 0 ? -0.1 : 0), 3.8, 5).toFixed(1)),
    firstContactResolution: clampNumber(previous.firstContactResolution + (newContained && nextTick % 8 === 0 ? 1 : 0), 55, 94),
    recontactRate: clampNumber(previous.recontactRate + (nextTick % 19 === 0 ? 1 : nextTick % 23 === 0 ? -1 : 0), 1, 12),
    humanHoursSaved: Number((previous.humanHoursSaved + newContained * 0.08).toFixed(1)),
    asrConfidence: clampNumber(previous.asrConfidence + (nextTick % 10 === 0 ? 1 : nextTick % 13 === 0 ? -1 : 0), 86, 98),
    bargeInRecovery: clampNumber(previous.bargeInRecovery + (nextTick % 12 === 0 ? 1 : 0), 78, 96),
    silenceTimeoutRate: clampNumber(previous.silenceTimeoutRate + (nextTick % 21 === 0 ? 1 : nextTick % 15 === 0 ? -1 : 0), 1, 8),
    failedTurns: clampNumber(previous.failedTurns + (nextTick % 20 === 0 ? 1 : 0), 0, 14),
    citationCoverage: clampNumber(previous.citationCoverage + (nextTick % 14 === 0 ? 1 : 0), 78, 98),
    retrievalMisses: clampNumber(previous.retrievalMisses + (nextTick % 18 === 0 ? 1 : nextTick % 22 === 0 ? -1 : 0), 0, 14),
    staleSources: clampNumber(previous.staleSources + (nextTick % 45 === 0 ? 1 : 0), 0, 4),
    draftAnswers: clampNumber(previous.draftAnswers + (nextTick % 16 === 0 ? 1 : nextTick % 29 === 0 ? -1 : 0), 0, 8),
    unsupportedAttempts: previous.unsupportedAttempts + (nextTick % 31 === 0 ? 1 : 0),
    lowConfidenceAnswers: clampNumber(previous.lowConfidenceAnswers + (nextTick % 13 === 0 ? 1 : nextTick % 24 === 0 ? -1 : 0), 0, 16),
    sensitiveEscalations: previous.sensitiveEscalations + (nextTick % 37 === 0 ? 1 : 0),
    ownerAccuracy: clampNumber(previous.ownerAccuracy + (nextTick % 18 === 0 ? 1 : 0), 88, 99),
    slaRisk: clampNumber(previous.slaRisk + (newHandoff ? 1 : nextTick % 19 === 0 ? -1 : 0), 0, 8),
    avgHandoffSeconds: clampNumber(previous.avgHandoffSeconds + (nextTick % 6 === 0 ? 1 : -1), 30, 58),
    crmLookupSuccess: clampNumber(previous.crmLookupSuccess + (nextTick % 20 === 0 ? 1 : 0), 90, 100),
    ticketWriteSuccess: clampNumber(previous.ticketWriteSuccess + (nextTick % 33 === 0 ? -1 : nextTick % 17 === 0 ? 1 : 0), 94, 100),
    webhookErrors: previous.webhookErrors + (nextTick % 59 === 0 ? 1 : 0),
    knowledgeSyncMinutes: (previous.knowledgeSyncMinutes + 1) % 15,
    hourlyVolume
  };
}

type GoalOption = {
  title: string;
  detail: string;
  category?: string;
  categoryDetail?: string;
};

function simpleCapabilityBullets(goal?: GoalOption) {
  const fallback = [
    { title: "Start small", detail: "Choose the first customer moments this agent should handle." },
    { title: "Keep answers clear", detail: "Ground responses in approved business information." },
    { title: "Escalate when needed", detail: "Move complex or sensitive requests to the right person." }
  ];

  if (!goal) {
    return fallback;
  }

  const bulletMap: Record<string, Array<{ title: string; detail: string }>> = {
    "Virtual Agent": [
      { title: "Answers common questions", detail: "Handles repeat customer requests without making people wait." },
      { title: "Works in voice or chat", detail: "Keeps the same approved response style across channels." },
      { title: "Hands off when needed", detail: "Transfers the conversation with context when a person should step in." }
    ],
    "Intent Detection": [
      { title: "Finds the customer need", detail: "Understands whether the customer wants help, a change, a quote, or escalation." },
      { title: "Routes the conversation", detail: "Sends each request toward the right answer, workflow, or team." },
      { title: "Reduces wrong turns", detail: "Avoids forcing customers through the wrong script." }
    ],
    "Knowledge Answers": [
      { title: "Uses approved content", detail: "Pulls from policies, FAQs, service details, and business rules." },
      { title: "Keeps answers consistent", detail: "Gives customers the same clear information every time." },
      { title: "Avoids guessing", detail: "Escalates when the answer is missing or confidence is low." }
    ],
    "Eligibility Check": [
      { title: "Asks qualifying questions", detail: "Collects the details needed before giving help or routing." },
      { title: "Checks basic fit", detail: "Confirms whether the request matches your rules and services." },
      { title: "Routes complex cases", detail: "Moves edge cases to staff before the customer gets stuck." }
    ],
    "Task Automation": [
      { title: "Completes repeat tasks", detail: "Handles simple structured work after the customer confirms details." },
      { title: "Saves team time", detail: "Removes low-value admin from busy support and sales teams." },
      { title: "Keeps simple work moving", detail: "Finishes routine requests without waiting for a manual follow-up." }
    ],
    "System Workflows": [
      { title: "Uses connected tools", detail: "Reads and updates the systems your team already depends on." },
      { title: "Finds customer context", detail: "Looks up account, booking, order, or case details during the conversation." },
      { title: "Updates the right systems", detail: "Keeps records clean instead of leaving notes in chat history." }
    ],
    "Ticket Creation": [
      { title: "Captures the issue", detail: "Turns the customer problem into a structured support record." },
      { title: "Adds customer details", detail: "Includes contact information, urgency, summary, and useful context." },
      { title: "Creates a clean record", detail: "Gives the team a ready-to-work ticket instead of a raw transcript." }
    ],
    "Follow-Up Scheduling": [
      { title: "Books next steps", detail: "Schedules callbacks, reminders, or tasks after the request is captured." },
      { title: "Sets reminders", detail: "Keeps time-sensitive follow-up from slipping through." },
      { title: "Keeps customers updated", detail: "Confirms what happens next before the conversation ends." }
    ],
    "Live Agent Handoff": [
      { title: "Transfers to a person", detail: "Moves complex or urgent conversations out of automation quickly." },
      { title: "Includes conversation context", detail: "Shows the team what happened, what was asked, and what is needed." },
      { title: "Protects complex moments", detail: "Keeps sensitive cases from being handled by the wrong flow." }
    ],
    "Priority Routing": [
      { title: "Spots urgent needs", detail: "Recognizes high-value, at-risk, or time-sensitive requests." },
      { title: "Moves faster cases first", detail: "Prioritizes conversations that should not sit in a normal queue." },
      { title: "Sends customers to the right team", detail: "Routes by urgency, topic, account type, or business rules." }
    ],
    "Sensitive Topic Guardrails": [
      { title: "Recognizes risk", detail: "Detects complaints, payments, legal topics, policy exceptions, and other sensitive moments." },
      { title: "Stops unsafe answers", detail: "Prevents the agent from inventing promises or handling restricted requests." },
      { title: "Escalates sensitive cases", detail: "Brings in a person with the right context before risk builds." }
    ],
    "Fallback Handling": [
      { title: "Catches unclear requests", detail: "Detects when the customer intent or required answer is not clear enough." },
      { title: "Avoids bad answers", detail: "Stops low-confidence replies before they create more work." },
      { title: "Gets human help", detail: "Moves the conversation to staff with a concise summary." }
    ],
    "AI Expert Assist": [
      { title: "Suggests next actions", detail: "Gives staff useful prompts while they handle the customer." },
      { title: "Shows useful context", detail: "Surfaces relevant account, policy, and knowledge-base details." },
      { title: "Supports your team live", detail: "Helps people respond faster without replacing their judgment." }
    ],
    "Auto Wrap-Up": [
      { title: "Writes summaries", detail: "Creates a clean record of what happened in the conversation." },
      { title: "Adds dispositions", detail: "Labels outcomes so reporting and follow-up are easier." },
      { title: "Captures follow-ups", detail: "Turns promised next steps into tasks or notes." }
    ],
    "Quality Review": [
      { title: "Finds weak answers", detail: "Highlights responses that need better content or safer wording." },
      { title: "Flags missed intents", detail: "Shows where the agent misunderstood what customers wanted." },
      { title: "Shows improvement areas", detail: "Gives managers a focused list of what to fix next." }
    ],
    "Coaching Insights": [
      { title: "Finds patterns", detail: "Reveals the questions and friction points customers repeat most." },
      { title: "Highlights training needs", detail: "Shows where staff or agent guidance should improve." },
      { title: "Shows recurring questions", detail: "Turns live conversations into clearer coaching themes." }
    ]
  };

  return bulletMap[goal.title] || fallback;
}

function zoomAiCapabilitiesFor(playbook: BusinessPlaybook, businessType: string): GoalOption[] {
  const businessLabel = businessType.trim() || playbook.label.toLowerCase();
  const primaryChannel = playbook.channels[0] || "Zoom Contact Center";
  const primaryAction = playbook.actions[0] || "resolve customer requests";
  const primaryGoal = playbook.goals[0]?.title.toLowerCase() || "customer conversations";
  const secondaryGoal = playbook.goals[1]?.title.toLowerCase() || "routine questions";
  const systemOfRecord = playbook.connectorProviders.crm || "CRM";
  const ticketingSystem = playbook.connectorProviders.helpdesk || "helpdesk";
  const knowledgeSource = playbook.connectorProviders.knowledge || "approved knowledge base";

  return [
    {
      category: "Answers",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Virtual Agent",
      detail: `Answer ${businessLabel} conversations through ${primaryChannel} with consistent customer support.`
    },
    {
      category: "Answers",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Intent Detection",
      detail: `Classify whether callers need ${primaryGoal}, ${secondaryGoal}, or specialist support.`
    },
    {
      category: "Answers",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Knowledge Answers",
      detail: `Answer from ${knowledgeSource}, approved policies, service details, and company FAQs.`
    },
    {
      category: "Answers",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Eligibility Check",
      detail: "Ask the right qualifying questions before giving an answer or routing the customer."
    },
    {
      category: "Automation",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Task Automation",
      detail: `Complete approved FAQs, structured requests, and follow-up tasks automatically.`
    },
    {
      category: "Automation",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "System Workflows",
      detail: `Use ${systemOfRecord}, ${ticketingSystem}, billing, and service systems during the conversation.`
    },
    {
      category: "Automation",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Ticket Creation",
      detail: `Create, update, and tag ${ticketingSystem} records with the right customer context.`
    },
    {
      category: "Automation",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Follow-Up Scheduling",
      detail: "Book callbacks, reminders, or next-step tasks after the customer request is captured."
    },
    {
      category: "Safety",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Live Agent Handoff",
      detail: "Transfer complex or urgent conversations with customer context and conversation history."
    },
    {
      category: "Safety",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Priority Routing",
      detail: "Route high-value, urgent, or at-risk customers to the right team without delay."
    },
    {
      category: "Safety",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Sensitive Topic Guardrails",
      detail: "Escalate complaints, payments, legal issues, or policy exceptions before risk builds."
    },
    {
      category: "Safety",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Fallback Handling",
      detail: "Move unclear requests to a human when confidence is low or the customer pushes back."
    },
    {
      category: "Team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "AI Expert Assist",
      detail: `Surface relevant guidance, next best actions, and ${playbook.label.toLowerCase()} context for staff.`
    },
    {
      category: "Team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "Auto Wrap-Up",
      detail: "Generate summaries, dispositions, notes, and follow-up actions after every contact."
    },
    {
      category: "Team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "Quality Review",
      detail: "Flag missed intents, weak answers, and handoff patterns that need manager review."
    },
    {
      category: "Team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "Coaching Insights",
      detail: "Show recurring questions, process gaps, and training themes from real conversations."
    }
  ];
}

type DemoCallStatus = {
  tone: "idle" | "success" | "setup" | "error";
  message: string;
};

type DemoMode = "chat" | "call";

type ChatMessage = {
  role: "agent" | "user";
  content: string;
  charts?: WorkspaceAssistantChart[];
};

function renderInlineChatFormatting(content: string) {
  const tokenPattern = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;

  return content.split(tokenPattern).filter(Boolean).map((part, partIndex) => {
    const key = `${content}-${partIndex}`;

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("***") && part.endsWith("***")) {
      return <strong key={key}><em>{part.slice(3, -3)}</em></strong>;
    }

    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function renderChatMessageContent(content: string, trailingNode?: React.ReactNode) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletItems: React.ReactNode[] = [];
  let numberedItems: React.ReactNode[] = [];

  const flushBullets = () => {
    if (!bulletItems.length) {
      return;
    }

    blocks.push(<ul key={`list-${blocks.length}`}>{bulletItems}</ul>);
    bulletItems = [];
  };
  const flushNumberedItems = () => {
    if (!numberedItems.length) {
      return;
    }

    blocks.push(<ol key={`ordered-list-${blocks.length}`}>{numberedItems}</ol>);
    numberedItems = [];
  };
  const flushLists = () => {
    flushBullets();
    flushNumberedItems();
  };

  lines.forEach((line, lineIndex) => {
    const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (bulletMatch) {
      flushNumberedItems();
      bulletItems.push(<li key={`item-${lineIndex}`}>{renderInlineChatFormatting(bulletMatch[1])}</li>);
      return;
    }

    if (numberedMatch) {
      flushBullets();
      numberedItems.push(<li key={`ordered-item-${lineIndex}`}>{renderInlineChatFormatting(numberedMatch[1])}</li>);
      return;
    }

    flushLists();

    if (!line.trim()) {
      return;
    }

    blocks.push(<p key={`paragraph-${lineIndex}`}>{renderInlineChatFormatting(line)}</p>);
  });

  flushLists();

  if (trailingNode) {
    if (blocks.length && React.isValidElement(blocks[blocks.length - 1])) {
      const lastBlock = blocks[blocks.length - 1] as React.ReactElement<{ children?: React.ReactNode }>;

      if (lastBlock.type === "p") {
        blocks[blocks.length - 1] = React.cloneElement(lastBlock, undefined, lastBlock.props.children, trailingNode);
      } else {
        blocks.push(<p key="message-trailing-node">{trailingNode}</p>);
      }
    } else {
      blocks.push(<p key="message-trailing-node">{trailingNode}</p>);
    }
  }

  return blocks.length ? blocks : trailingNode ? <p>{trailingNode}</p> : null;
}

type DemoChatTurn = {
  reply: string;
  intent: string;
  confidence: number;
  nextAction: string;
  escalate: boolean;
};

type WorkspaceAssistantChart = {
  id: string;
  title: string;
  kind: "bar" | "progress";
  data: { label: string; value: number; display: string; percent?: number }[];
};

type ActiveMetricFocus = {
  tabId: string;
  chartId: string;
  chartTitle: string;
  label: string;
  value: string;
  pointValue: number;
  pointDisplay: string;
  pointPercent?: number;
  chartData: WorkspaceAssistantChart["data"];
};

type WorkspaceAssistantResponse = {
  reply: string;
  summary: string;
  nextActions: string[];
  focusArea: string;
  model: string;
  mode: "openai" | "mock";
  metrics: {
    callsHandled: number;
    activeCalls: number;
    containmentRate: number;
    handoffRate: number;
    handoffs: number;
    openRisks: number;
    latencySeconds: number;
    citationCoverage: number;
    policyViolations: number;
  };
  charts: WorkspaceAssistantChart[];
};

function buildChartPointTooltip(chart: WorkspaceAssistantChart, point: WorkspaceAssistantChart["data"][number]) {
  const value = point.display || point.value.toLocaleString();

  if (chart.kind === "bar") {
    return `${point.label}: ${value} calls`;
  }

  return `${point.label}: ${value}${typeof point.percent === "number" ? ` (${point.percent}%)` : ""}`;
}

function WorkspaceChatCharts({
  charts,
  onPointClick
}: {
  charts: WorkspaceAssistantChart[];
  onPointClick?: (chart: WorkspaceAssistantChart, point: WorkspaceAssistantChart["data"][number]) => void;
}) {
  if (!charts.length) {
    return null;
  }

  return (
    <div className="completed-chat-charts" aria-label="Assistant chart data">
      {charts.map((chart) => {
        const maxValue = Math.max(1, ...chart.data.map((point) => point.value));

        return (
          <section className={`completed-chat-chart is-${chart.kind}`} key={chart.id} aria-label={chart.title}>
            <div className="completed-chat-chart-heading">
              <span>{chart.title}</span>
              <strong>{chart.data.reduce((total, point) => total + point.value, 0).toLocaleString()}</strong>
            </div>
            {chart.kind === "bar" ? (
              <div className="completed-chat-bar-chart">
                {chart.data.map((point) => (
                  <button
                    type="button"
                    key={point.label}
                    data-tooltip={buildChartPointTooltip(chart, point)}
                    aria-label={`${buildChartPointTooltip(chart, point)}. Click to open this metric.`}
                    onClick={() => onPointClick?.(chart, point)}
                  >
                    <i style={{ height: `${Math.max(18, Math.round((point.value / maxValue) * 122))}px` }}></i>
                    <strong>{point.display || point.value}</strong>
                    <span>{point.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="completed-chat-progress-chart">
                {chart.data.map((point) => (
                  <button
                    type="button"
                    key={point.label}
                    data-tooltip={buildChartPointTooltip(chart, point)}
                    aria-label={`${buildChartPointTooltip(chart, point)}. Click to open this metric.`}
                    onClick={() => onPointClick?.(chart, point)}
                  >
                    <div>
                      <span>{point.label}</span>
                      <strong>{point.display || point.value}</strong>
                    </div>
                    <i><b style={{ width: `${Math.max(3, Math.min(100, point.percent ?? Math.round((point.value / maxValue) * 100)))}%` }}></b></i>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

type BusinessPlaybook = {
  id: string;
  label: string;
  workspaceName: string;
  summary: string;
  customerExamples: string[];
  missions: string[];
  channels: string[];
  goals: GoalOption[];
  offers: GoalOption[];
  actions: string[];
  guardrails: string[];
  connectorProviders: Record<string, string>;
  connectorDescriptions: Record<string, string>;
  tests: Scenario[];
  launchFocus: string;
};

type BusinessMatch = {
  playbook: BusinessPlaybook;
  entry?: BusinessTaxonomyEntry;
  matchedTerms: string[];
  confidence: number;
};

type BusinessSuggestion = BusinessMatch & {
  label: string;
  score: number;
};

const workflow = [
  {
    phase: "Build",
    title: "Build",
    example: "Create the first agent with answers, rules, and handoffs.",
    outcome: "Ready to test.",
    image: workflowConfigureCardUrl
  },
  {
    phase: "Test",
    title: "Test",
    example: "Run the difficult calls before customers do.",
    outcome: "Know what is safe to launch.",
    image: workflowSimulateCardUrl
  },
  {
    phase: "Launch",
    title: "Launch",
    example: "Go live with checks, owners, and early-call visibility.",
    outcome: "Production is under control.",
    image: workflowObserveCardUrl
  },
  {
    phase: "Escalate",
    title: "Pass urgent work to the team",
    example: "The right person gets the context, not a mystery call.",
    outcome: "No context gets lost.",
    image: workflowHandoffUrl
  }
];

function useScrollLineReveal(progress: MotionValue<number>, start: number, end: number, distance = 34) {
  return {
    opacity: useTransform(progress, [start, end], [0, 1]),
    y: useTransform(progress, [start, end], [distance, 0]),
    filter: useTransform(progress, [start, end], ["blur(14px)", "blur(0px)"])
  };
}

function useScrollWordReveal(progress: MotionValue<number>, start: number, end: number) {
  return {
    opacity: useTransform(progress, [start, end], [0, 1]),
    y: useTransform(progress, [start, end], [42, 0]),
    scale: useTransform(progress, [start, end], [0.9, 1]),
    rotateX: useTransform(progress, [start, end], [18, 0]),
    filter: useTransform(progress, [start, end], ["blur(16px)", "blur(0px)"])
  };
}

function useScrollViewportReveal(progress: MotionValue<number>, start: number, end: number) {
  return {
    opacity: useTransform(progress, [start, end], [0, 1]),
    y: useTransform(progress, [start, end], [54, 0]),
    scale: useTransform(progress, [start, end], [0.985, 1]),
    filter: useTransform(progress, [start, end], ["blur(12px)", "blur(0px)"])
  };
}

function useScrollCardReveal(progress: MotionValue<number>, start: number, end: number, xDistance: number, rotateDistance: number) {
  return {
    opacity: useTransform(progress, [start, end], [0, 1]),
    x: useTransform(progress, [start, end], [xDistance, 0]),
    y: useTransform(progress, [start, end], [92, 0]),
    scale: useTransform(progress, [start, end], [0.9, 1]),
    rotateX: useTransform(progress, [start, end], [10, 0]),
    rotateY: useTransform(progress, [start, end], [rotateDistance, 0]),
    filter: useTransform(progress, [start, end], ["blur(20px)", "blur(0px)"])
  };
}

function useScrollImageReveal(progress: MotionValue<number>, start: number, end: number) {
  return {
    clipPath: useTransform(progress, [start, end], ["inset(15% 10% 18% 10% round 18px)", "inset(0% 0% 0% 0% round 18px)"]),
    scale: useTransform(progress, [start, end], [0.96, 1])
  };
}

function useScrollPhotoReveal(progress: MotionValue<number>, start: number, end: number) {
  return {
    scale: useTransform(progress, [start, end], [1.12, 1]),
    filter: useTransform(progress, [start, end], ["saturate(0.86) contrast(0.95) brightness(1.06)", "saturate(1.02) contrast(1.02) brightness(1)"])
  };
}

function useScrollGlowReveal(progress: MotionValue<number>, start: number, peak: number, end: number) {
  return {
    opacity: useTransform(progress, [start, peak, end], [0, 0.72, 0]),
    x: useTransform(progress, [start, end], ["-135%", "135%"]),
    skewX: -18
  };
}

type WorkflowStep = (typeof workflow)[number];

function WorkflowScrollLine({ steps }: { steps: string[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: trackScrollProgress } = useScroll({
    target: trackRef,
    offset: ["start center", "end center"]
  });
  const lineProgress = useTransform(trackScrollProgress, [0, 1], [0, 1]);

  return (
    <div className="workflow-scroll-line" aria-hidden="true">
      <div className="workflow-scroll-line-track" ref={trackRef}>
        <motion.span style={{ scaleY: lineProgress }}></motion.span>
      </div>
      {steps.map((step, index) => (
        <div className="workflow-scroll-marker" style={{ top: `${12 + index * 38}%` }} key={step}>
          <i></i>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

function WorkflowPinnedImage({
  step,
  index,
  progress,
  total,
  shouldReduceMotion
}: {
  step: WorkflowStep;
  index: number;
  progress: MotionValue<number>;
  total: number;
  shouldReduceMotion: boolean | null;
}) {
  const segment = 1 / total;
  // Wide overlap so the outgoing and incoming images genuinely cross-fade instead of cutting.
  const start = Math.max(0, index * segment - segment * 0.5);
  const center = (index + 0.5) * segment;
  const end = Math.min(1, (index + 1) * segment + segment * 0.5);
  // Hold each image fully visible across a plateau around its center so it stays on longer.
  const holdStart = Math.max(start, center - segment * 0.42);
  const holdEnd = Math.min(end, center + segment * 0.42);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const stops = [start, holdStart, holdEnd, end];

  // The first image rests at the section top and the last at the bottom, so they stay settled there.
  const opacityStops = isFirst ? [1, 1, 1, 0] : isLast ? [0, 1, 1, 1] : [0, 1, 1, 0];
  const opacity = useTransform(progress, stops, opacityStops);
  const scaleStops = isFirst ? [1, 1, 1, 1.05] : isLast ? [1.06, 1, 1, 1] : [1.06, 1, 1, 1.05];
  const scale = useTransform(progress, stops, scaleStops);
  // Gentle vertical drift: incoming rises into place, outgoing lifts away.
  const yStops = isFirst ? [0, 0, 0, -34] : isLast ? [34, 0, 0, 0] : [34, 0, 0, -34];
  const y = useTransform(progress, stops, yStops);

  const sharpFilter = "blur(0px) saturate(1.05) contrast(1.02) brightness(1)";
  const softFilter = "blur(9px) saturate(0.94) contrast(0.98) brightness(1.04)";
  const filter = useTransform(progress, stops, [
    isFirst ? sharpFilter : softFilter,
    sharpFilter,
    sharpFilter,
    isLast ? sharpFilter : softFilter
  ]);

  return (
    <motion.img
      className="workflow-pinned-image"
      src={step.image}
      alt={`${step.phase} workflow preview`}
      loading={index === 0 ? "eager" : "lazy"}
      style={shouldReduceMotion ? { opacity: index === 0 ? 1 : 0 } : { opacity, scale, y, filter }}
    />
  );
}

function WorkflowTimelineChapter({
  step,
  index
}: {
  step: WorkflowStep;
  index: number;
}) {
  const chapterRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start 78%", "end 22%"]
  });
  const opacity = useTransform(scrollYProgress, [0, 0.22, 0.72, 1], [0.2, 1, 1, 0.28]);
  const y = useTransform(scrollYProgress, [0, 0.28, 0.78, 1], [48, 0, 0, -42]);
  const scale = useTransform(scrollYProgress, [0, 0.28, 0.78, 1], [0.975, 1, 1, 0.985]);
  const filter = useTransform(scrollYProgress, [0, 0.24, 0.78, 1], ["blur(10px)", "blur(0px)", "blur(0px)", "blur(8px)"]);

  return (
    <motion.article
      className="workflow-timeline-chapter"
      id={`workflow-${step.phase.toLowerCase()}`}
      ref={chapterRef}
      style={shouldReduceMotion ? undefined : { opacity, y, scale, filter }}
    >
      <span className="workflow-kicker">{String(index + 1).padStart(2, "0")}</span>
      <h2>{step.title}</h2>
      <p>{step.example}</p>
    </motion.article>
  );
}

function WorkflowPinnedTimeline({ steps }: { steps: WorkflowStep[] }) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start start", "end end"]
  });
  const glowOpacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [0.35, 0.72, 0.72, 0.28]);
  const glowX = useTransform(scrollYProgress, [0, 1], ["-32%", "32%"]);
  // Blue progress rail that follows the scroll down the chapters; the base rail stays grey.
  // Bound directly to scroll position (no spring) so the fill tracks the scroll instantly with no lag.
  const railProgress = scrollYProgress;

  return (
    <div className="workflow-pinned-timeline" ref={timelineRef}>
      <div className="workflow-pinned-visual" aria-hidden="true">
        <motion.div className="workflow-pinned-aura" style={shouldReduceMotion ? undefined : { opacity: glowOpacity, x: glowX }} />
        <figure className="workflow-pinned-figure">
          <div className="workflow-pinned-image-stack">
            {steps.map((step, index) => (
              <WorkflowPinnedImage
                step={step}
                index={index}
                progress={scrollYProgress}
                total={steps.length}
                shouldReduceMotion={shouldReduceMotion}
                key={step.phase}
              />
            ))}
          </div>
        </figure>
      </div>
      <div className="workflow-pinned-copy">
        <div className="workflow-copy-rail" aria-hidden="true">
          <motion.span
            className="workflow-copy-rail-fill"
            style={shouldReduceMotion ? { scaleY: 1 } : { scaleY: railProgress }}
          />
        </div>
        {steps.map((step, index) => (
          <WorkflowTimelineChapter step={step} index={index} key={step.phase} />
        ))}
      </div>
    </div>
  );
}
function WorkflowCinematicStep({ step, index, total }: { step: WorkflowStep; index: number; total: number }) {
  const panelRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start end", "end start"]
  });
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.16, 0.78, 1], [0, 1, 1, 0]);
  const sceneY = useTransform(scrollYProgress, [0, 0.2, 0.72, 1], [92, 0, -12, -86]);
  const copyY = useTransform(scrollYProgress, [0, 0.28, 0.78, 1], [46, 0, -18, -52]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.18, 0.72, 1], [0, 1, 1, 0.18]);
  const figureY = useTransform(scrollYProgress, [0, 0.24, 0.76, 1], [86, 0, -8, -58]);
  const figureScale = useTransform(scrollYProgress, [0, 0.22, 0.72, 1], [0.94, 1, 1.015, 0.98]);
  const figureRotateX = useTransform(scrollYProgress, [0, 0.32, 0.72, 1], [4, 0, 0, -2]);
  const figureRotateY = useTransform(scrollYProgress, [0, 0.32, 0.72, 1], [-5, 0, 0, 3]);
  const figureShadow = useTransform(
    scrollYProgress,
    [0, 0.28, 0.72, 1],
    [
      "0 22px 56px rgba(15, 23, 42, 0.10)",
      "0 38px 94px rgba(15, 23, 42, 0.18)",
      "0 44px 112px rgba(37, 99, 235, 0.16)",
      "0 24px 64px rgba(15, 23, 42, 0.10)"
    ]
  );
  const imageY = useTransform(scrollYProgress, [0, 1], [-34, 34]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.07, 1.02, 1.06]);
  const imageFilter = useTransform(
    scrollYProgress,
    [0, 0.22, 0.76, 1],
    ["saturate(0.9) contrast(0.96) brightness(1.05)", "saturate(1.04) contrast(1.03) brightness(1)", "saturate(1.04) contrast(1.03) brightness(1)", "saturate(0.95) contrast(0.98) brightness(1.03)"]
  );
  const imageClip = useTransform(scrollYProgress, [0, 0.24, 0.72, 1], ["inset(7% 8% 10% 8% round 18px)", "inset(0% 0% 0% 0% round 18px)", "inset(0% 0% 0% 0% round 18px)", "inset(4% 5% 8% 5% round 16px)"]);
  const sceneStyle = shouldReduceMotion ? undefined : { opacity: sceneOpacity, y: sceneY };
  const copyStyle = shouldReduceMotion ? undefined : { opacity: copyOpacity, y: copyY };
  const figureStyle = shouldReduceMotion ? undefined : {
    y: figureY,
    scale: figureScale,
    rotateX: figureRotateX,
    rotateY: figureRotateY,
    boxShadow: figureShadow
  };

  return (
    <section
      className={`workflow-cinematic-step ${index % 2 === 0 ? "is-left" : "is-right"}`}
      id={`workflow-${step.phase.toLowerCase()}`}
      aria-label={`${step.phase} workflow step`}
      ref={panelRef}
    >
      <motion.div className="workflow-cinematic-pin" style={sceneStyle}>
        <motion.div className="workflow-cinematic-copy" style={copyStyle}>
          <span className="workflow-kicker">{String(index + 1).padStart(2, "0")} / {step.phase}</span>
          <h2>{step.title}</h2>
          <p>{step.example}</p>
          <strong>{step.outcome}</strong>
        </motion.div>
        <motion.figure
          className="workflow-cinematic-figure"
          style={figureStyle}
        >
          <div className="workflow-figure-chrome" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <motion.img
            src={step.image}
            alt={`${step.phase} workflow preview`}
            loading="lazy"
            style={shouldReduceMotion ? undefined : { y: imageY, scale: imageScale, filter: imageFilter, clipPath: imageClip }}
          />
          <figcaption className="workflow-figure-caption">
            <span>{step.phase} view</span>
            <strong>{index + 1 === total ? "Ready for production review" : `Next: ${workflow[index + 1]?.phase}`}</strong>
          </figcaption>
        </motion.figure>
      </motion.div>
    </section>
  );
}

const footerColumns = [
  {
    title: "About",
    links: [
      { label: "Platform", href: "#platform" },
      { label: "Customer stories", href: "#testimonials" },
      { label: "Launch workflow", href: "#handoff" },
      { label: "FAQs", href: "#faqs" }
    ]
  },
  {
    title: "Downloads",
    links: [
      { label: "Launch checklist", href: "#demo" },
      { label: "Readiness report", href: "#handoff" },
      { label: "Demo workspace", href: "#demo" },
      { label: "Integration guide", href: "#platform" }
    ]
  },
  {
    title: "Sales",
    links: [
      { label: "Book a demo", href: "#demo" },
      { label: "Contact sales", href: "#demo" },
      { label: "Plans and pricing", href: "#demo" },
      { label: "Pilot program", href: "#demo" }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "#faqs" },
      { label: "Status", href: "#home" },
      { label: "Guidelines", href: "#faqs" },
      { label: "Accessibility", href: "#home" }
    ]
  }
];

const footerLegalLinks = [
  { label: "Terms", href: "#home" },
  { label: "Privacy", href: "#home" },
  { label: "Security", href: "#home" },
  { label: "Legal", href: "#home" }
];

const footerSocialLinks = [
  { label: "LinkedIn", icon: "linkedin", href: "#home" },
  { label: "X", icon: "x", href: "#home" },
  { label: "YouTube", icon: "youtube", href: "#home" }
];

const testimonials = [
  {
    storyTitle: "ClearDBS keeps sensitive checks moving",
    quote: "RelayClarity helped us handle DBS check questions faster while keeping sensitive cases routed to the right team.",
    name: "Taylor Threader",
    role: "Operations Lead",
    company: "ClearDBS",
    rating: 5,
    metric: "64%",
    metricLabel: "faster routine answer handling",
    image: customerClearDbsUrl,
    logo: clearDbsLogoUrl
  },
  {
    storyTitle: "Bear Lane answers store questions without queue pressure",
    quote: "Our store can now answer sizing, delivery, and returns questions without slowing down the support team.",
    name: "Mikela Sulce",
    role: "E-commerce Manager",
    company: "Bear Lane",
    rating: 5,
    metric: "41%",
    metricLabel: "fewer repetitive support tickets",
    image: customerBearLaneUrl,
    logo: bearLaneLogoUrl
  },
  {
    storyTitle: "Northern Line tests every handoff before launch",
    quote: "The launch process was simple, and we could test every handoff before putting the agent in front of customers.",
    name: "Jordan Blake",
    role: "Customer Support Director",
    company: "Northern Line Services",
    rating: 5,
    metric: "3x",
    metricLabel: "more launch checks completed",
    image: customerNorthlineUrl,
    logo: northernLineServicesLogoUrl
  },
  {
    storyTitle: "Northstar Dental protects urgent appointment calls",
    quote: "Patients get clear answers while urgent requests are routed to reception with context.",
    name: "Amelia Carter",
    role: "Practice Manager",
    company: "Northstar Dental",
    rating: 5,
    metric: "82%",
    metricLabel: "routine questions contained",
    image: customerNorthstarDentalUrl,
    logo: northstarDentalLogoUrl
  },
  {
    storyTitle: "Harbour Financial keeps regulated handoffs clean",
    quote: "The agent answers approved questions and escalates sensitive account moments before risk builds.",
    name: "Noah Patel",
    role: "Client Services Lead",
    company: "Harbour Financial",
    rating: 5,
    metric: "91%",
    metricLabel: "launch readiness score",
    image: customerHarbourFinancialUrl,
    logo: ""
  }
];

const faqItems = [
  {
    question: "What is RelayClarity?",
    answer: "RelayClarity is a launch platform for AI phone and chat agents. It helps you shape the agent, test real customer moments, connect the right systems, and hand off conversations cleanly when a person should take over."
  },
  {
    question: "How does RelayClarity improve customer service efficiency?",
    answer: "It handles repetitive questions, gathers useful context before a handoff, creates concise summaries, and keeps routine support moving so your team can focus on complex or sensitive customer work."
  },
  {
    question: "What can RelayClarity automate for my business?",
    answer: "RelayClarity can answer approved FAQs, qualify requests, capture caller details, create follow-up tasks, route urgent issues, and support workflows across voice, chat, CRM, helpdesk, and knowledge tools."
  },
  {
    question: "How does RelayClarity work with our existing support stack?",
    answer: "It is designed to sit alongside the tools your team already uses, including contact center software, CRM, helpdesk, knowledge base, billing, calendar, and team messaging systems."
  },
  {
    question: "How is RelayClarity different from a traditional chatbot?",
    answer: "Traditional chatbots usually follow fixed scripts. RelayClarity focuses on tested AI agents that understand customer intent, use approved business context, and escalate with a clear summary when automation is not the right answer."
  }
];

const scenarios: Record<ScenarioKey, Scenario> = {
  billing: {
    title: "Duplicate billing charge",
    label: "Billing guardrail",
    score: 92,
    result: "Passed with approval workflow and audit trail."
  },
  handoff: {
    title: "Angry cancellation caller",
    label: "Handoff timing",
    score: 78,
    result: "Needs supervised rollout; transfer one turn earlier."
  },
  injection: {
    title: "Prompt-injection refund attempt",
    label: "Adversarial test",
    score: 96,
    result: "Blocked override and opened a security review."
  }
};

const simpleIcon = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
const faviconLogo = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const providerLogoDomains: Record<string, string> = {
  auth0: "auth0.com",
  cliniko: "cliniko.com",
  confluence: "atlassian.com",
  "confluence policy hub": "atlassian.com",
  fixflo: "fixflo.com",
  front: "front.com",
  gorgias: "gorgias.com",
  hubspot: "hubspot.com",
  intercom: "intercom.com",
  "intercom articles": "intercom.com",
  linear: "linear.app",
  notion: "notion.so",
  onfido: "onfido.com",
  pabau: "pabau.com",
  reapit: "reapit.com",
  salesforce: "salesforce.com",
  "salesforce financial services cloud": "salesforce.com",
  servicenow: "servicenow.com",
  sevenrooms: "sevenrooms.com",
  shopify: "shopify.com",
  "shopify customers": "shopify.com",
  "shopify payments": "shopify.com",
  square: "squareup.com",
  stripe: "stripe.com",
  "stripe api": "stripe.com",
  xero: "xero.com",
  zendesk: "zendesk.com",
  "zendesk support": "zendesk.com",
  zoom: "zoom.us",
  "zoom contact center": "zoom.us",
  "zoom phone": "zoom.us"
};

const providerLogoFallbacks: Record<string, string> = {
  hubspot: simpleIcon("hubspot"),
  salesforce: simpleIcon("salesforce"),
  notion: simpleIcon("notion"),
  "zoom contact center": simpleIcon("zoom"),
  "zoom phone": simpleIcon("zoom"),
  zoom: simpleIcon("zoom"),
  "zendesk guide": simpleIcon("zendesk"),
  "zendesk support": simpleIcon("zendesk"),
  zendesk: simpleIcon("zendesk"),
  stripe: simpleIcon("stripe"),
  "stripe api": simpleIcon("stripe"),
  okta: simpleIcon("okta"),
  googlecalendar: simpleIcon("googlecalendar"),
  "google calendar": simpleIcon("googlecalendar"),
  slack: simpleIcon("slack"),
  "microsoft teams": simpleIcon("microsoftteams"),
  microsoftteams: simpleIcon("microsoftteams"),
  intercom: simpleIcon("intercom"),
  linear: simpleIcon("linear"),
  servicenow: simpleIcon("servicenow"),
  shopify: simpleIcon("shopify"),
  "shopify customers": simpleIcon("shopify"),
  "shopify payments": simpleIcon("shopify"),
  gorgias: simpleIcon("gorgias"),
  front: simpleIcon("front"),
  square: simpleIcon("square"),
  auth0: simpleIcon("auth0"),
  xero: simpleIcon("xero"),
  snowflake: simpleIcon("snowflake"),
  gmail: simpleIcon("gmail"),
  "google analytics": simpleIcon("googleanalytics"),
  googleanalytics: simpleIcon("googleanalytics"),
  confluence: simpleIcon("confluence"),
  "confluence policy hub": simpleIcon("confluence"),
  "intercom articles": simpleIcon("intercom")
};

const initialConnectors: Connector[] = [
  { key: "crm", name: "CRM", providerId: "hubspot", provider: "HubSpot", logoUrl: providerLogoFallbacks.hubspot, connected: false },
  { key: "telephony", name: "Telephony", providerId: "zoom", provider: "Zoom Contact Center", logoUrl: providerLogoFallbacks.zoom, connected: false },
  { key: "knowledge", name: "Knowledge", providerId: "notion", provider: "Notion", logoUrl: providerLogoFallbacks.notion, connected: false },
  { key: "helpdesk", name: "Helpdesk", providerId: "zendesk", provider: "Zendesk Support", logoUrl: providerLogoFallbacks["zendesk support"], connected: false },
  { key: "billing", name: "Billing", providerId: "stripe", provider: "Stripe API", logoUrl: providerLogoFallbacks["stripe api"], connected: false },
  { key: "identity", name: "Identity", providerId: "okta", provider: "Okta", logoUrl: providerLogoFallbacks.okta, connected: false },
  { key: "calendar", name: "Calendar", providerId: "google-calendar", provider: "Google Calendar", logoUrl: providerLogoFallbacks["google calendar"], connected: false },
  { key: "messaging", name: "Team alerts", providerId: "slack", provider: "Slack", logoUrl: providerLogoFallbacks.slack, connected: false },
  { key: "commerce", name: "Commerce", providerId: "shopify", provider: "Shopify", logoUrl: providerLogoFallbacks.shopify, connected: false },
  { key: "analytics", name: "Analytics", providerId: "google-analytics", provider: "Google Analytics", logoUrl: providerLogoFallbacks["google analytics"], connected: false },
  { key: "data", name: "Data warehouse", providerId: "snowflake", provider: "Snowflake", logoUrl: providerLogoFallbacks.snowflake, connected: false },
  { key: "email", name: "Email", providerId: "gmail", provider: "Gmail", logoUrl: providerLogoFallbacks.gmail, connected: false }
];

const connectorDescriptions: Record<string, string> = {
  crm: "Find customer profiles and account history.",
  telephony: "Receive call events and route warm transfers.",
  knowledge: "Answer from approved help articles.",
  helpdesk: "Create tickets and attach call summaries.",
  billing: "Check invoices and billing status.",
  identity: "Verify callers before sensitive actions.",
  calendar: "Check availability and prepare booking requests.",
  messaging: "Notify internal teams about urgent handoffs.",
  commerce: "Read orders, products, returns, and fulfilment state.",
  analytics: "Connect caller demand to product and campaign signals.",
  data: "Read approved warehouse tables for enterprise deployments.",
  email: "Create follow-up emails and inspect approved mailbox context."
};

const requiredConnectorKeys = ["crm", "telephony", "knowledge", "helpdesk"];

function isRequiredConnector(key: string) {
  return requiredConnectorKeys.includes(key);
}

const fallbackPlaybook: BusinessPlaybook = {
  id: "service",
  label: "Service business",
  workspaceName: "Customer Operations",
  summary: "A customer-facing operation that needs a voice agent tuned around its actual callers, policies, and handoff moments.",
  customerExamples: ["A new customer asks what happens next", "An existing customer needs status", "An urgent caller needs the right team"],
  missions: ["Front-line customer support", "Lead capture and qualification", "After-hours call handling"],
  channels: ["Zoom Contact Center production voice queue", "Zoom Phone support line", "Main website callback flow"],
  goals: [
    { title: "Capture every caller intent", detail: "Classify common requests and collect the details your team needs before handoff." },
    { title: "Reduce repetitive calls", detail: "Answer approved FAQs and route only the conversations that need a person." },
    { title: "Protect sensitive requests", detail: "Detect risky topics and escalate with transcript context instead of guessing." },
    { title: "Improve follow-up quality", detail: "Create clean summaries, tasks, and next actions for the right owner." }
  ],
  offers: [
    { title: "Call intake setup", detail: "Capture caller intent, contact details, urgency, and next steps before routing to the right person." },
    { title: "FAQ and policy handling", detail: "Answer common service questions from approved content and escalate edge cases cleanly." },
    { title: "Handoff summaries", detail: "Create concise call summaries, tasks, and follow-up notes for the responsible team." }
  ],
  actions: ["Answer approved FAQs", "Capture caller details", "Create follow-up tasks", "Warm transfer to the right team"],
  guardrails: ["Use only approved business answers", "Escalate urgent or sensitive requests", "Confirm contact details before creating tasks"],
  connectorProviders: {
    crm: "HubSpot",
    telephony: "Zoom Contact Center",
    knowledge: "Notion",
    helpdesk: "Zendesk Support",
    billing: "Stripe API",
    identity: "Okta"
  },
  connectorDescriptions: {
    crm: "Find contacts, lead source, lifecycle stage, and previous conversations.",
    telephony: "Receive call events, route transfers, and attach call recordings.",
    knowledge: "Answer from approved company policies, FAQs, and service details.",
    helpdesk: "Create follow-up tickets with intent, urgency, and transcript summary.",
    billing: "Check invoices, payment status, or subscription state when relevant.",
    identity: "Verify callers before discussing sensitive account details."
  },
  tests: [
    { title: "New caller qualification", label: "Lead capture", score: 90, result: "Captured contact details, intent, urgency, and next step without overpromising." },
    { title: "Policy-heavy question", label: "Knowledge answer", score: 88, result: "Answered from approved content and escalated the unclear edge case." },
    { title: "Urgent complaint", label: "Escalation", score: 83, result: "Transferred with concise context and preserved the caller's stated concern." }
  ],
  launchFocus: "complete the highest-volume call paths, connect the system of record, and test urgent handoffs."
};

// Generic actions an AI phone/chat agent can run, grouped by the job they do.
// Shown in the workflow "Add an action" modal alongside the business-specific recommendations.
const WORKFLOW_ACTION_LIBRARY: Array<{ category: string; actions: Array<{ name: string; detail: string }> }> = [
  {
    category: "Answer & inform",
    actions: [
      { name: "Answer approved FAQs", detail: "Respond using only approved company knowledge." },
      { name: "Explain pricing and plans", detail: "Walk callers through current pricing and options." },
      { name: "Share hours and location", detail: "Give opening hours, address, and directions." },
      { name: "Explain a policy", detail: "Cover returns, cancellations, or terms from approved content." },
      { name: "Check a status", detail: "Look up an order, appointment, or ticket status." }
    ]
  },
  {
    category: "Capture & qualify",
    actions: [
      { name: "Capture caller details", detail: "Collect name, contact, and reason for the call." },
      { name: "Qualify a lead", detail: "Score fit and intent before routing to sales." },
      { name: "Collect callback details", detail: "Record the best time and number to call back." },
      { name: "Capture consent", detail: "Log opt-in for follow-ups and call recording." },
      { name: "Record the call reason", detail: "Tag the intent for reporting and routing." }
    ]
  },
  {
    category: "Schedule & book",
    actions: [
      { name: "Book an appointment", detail: "Create a booking in the connected calendar." },
      { name: "Reschedule or cancel", detail: "Update an existing booking on request." },
      { name: "Check availability", detail: "Offer open slots from the calendar." },
      { name: "Confirm a booking", detail: "Send a confirmation with the details." }
    ]
  },
  {
    category: "Create records",
    actions: [
      { name: "Create a follow-up task", detail: "Assign a next action to the right owner." },
      { name: "Open a support ticket", detail: "Log an issue with summary and priority." },
      { name: "Log to CRM", detail: "Write the contact and conversation to the CRM." },
      { name: "Create a callback request", detail: "Queue a callback for the team." },
      { name: "Attach a call summary", detail: "Save a concise transcript summary to the record." }
    ]
  },
  {
    category: "Route & escalate",
    actions: [
      { name: "Warm transfer to a team", detail: "Hand off live with full context." },
      { name: "Escalate an urgent request", detail: "Flag and fast-track high-priority calls." },
      { name: "Route by topic", detail: "Send the conversation to the right queue." },
      { name: "Hand off to a human", detail: "Pass the conversation with a summary." }
    ]
  },
  {
    category: "Notify & follow up",
    actions: [
      { name: "Send a follow-up SMS", detail: "Text the caller a summary or link." },
      { name: "Send a follow-up email", detail: "Email next steps or documents." },
      { name: "Notify a channel", detail: "Post an alert to Slack or Teams." },
      { name: "Trigger a webhook", detail: "Send the event to an external system." }
    ]
  },
  {
    category: "Verify & protect",
    actions: [
      { name: "Verify caller identity", detail: "Confirm identity before sensitive actions." },
      { name: "Flag a sensitive topic", detail: "Detect risk and escalate with context." },
      { name: "Confirm details", detail: "Read details back before acting." },
      { name: "Take a payment", detail: "Securely collect a payment via the billing connector." }
    ]
  }
];

const businessPlaybooks: BusinessPlaybook[] = [
  {
    id: "healthcare",
    label: "Healthcare or clinic",
    workspaceName: "Patient Access",
    summary: "A patient-facing clinic workflow for appointment demand, triage routing, billing questions, and privacy-sensitive handoffs.",
    customerExamples: ["I need an emergency appointment today", "Can I move my appointment?", "I have a question about my invoice"],
    missions: ["Appointment booking and triage", "Patient billing support", "After-hours patient call handling"],
    channels: ["Zoom Contact Center patient access queue", "Zoom Phone reception line", "Website appointment callback flow"],
    goals: [
      { title: "Book and triage appointments", detail: "Capture symptoms, preferred times, and urgency before routing to reception." },
      { title: "Reduce reception pressure", detail: "Answer hours, location, preparation, and policy questions from approved content." },
      { title: "Protect patient privacy", detail: "Avoid clinical advice and transfer sensitive requests with a clean summary." },
      { title: "Recover missed calls", detail: "Create callback tasks when reception is busy or the practice is closed." }
    ],
    offers: [
      { title: "Appointment triage", detail: "Collect symptoms, urgency, preferred times, and callback details without giving clinical advice." },
      { title: "Reception load reduction", detail: "Handle hours, preparation, location, billing, and policy questions from approved clinic content." },
      { title: "Privacy-safe escalation", detail: "Verify identity before sensitive details and transfer urgent or clinical requests to staff." }
    ],
    actions: ["Book or change appointment requests", "Capture patient callback details", "Answer clinic FAQs", "Transfer urgent callers to reception"],
    guardrails: ["Never provide diagnosis or clinical advice", "Verify patient identity before account details", "Escalate urgent symptoms immediately"],
    connectorProviders: {
      crm: "Pabau",
      telephony: "Zoom Contact Center",
      knowledge: "Cliniko knowledge base",
      helpdesk: "Zendesk Support",
      billing: "Stripe API",
      identity: "Patient verification"
    },
    connectorDescriptions: {
      crm: "Find patient profile, appointment history, preferred practitioner, and consent notes.",
      telephony: "Route urgent callers to reception and attach call context to the patient record.",
      knowledge: "Answer from approved clinic hours, prep instructions, service pages, and policies.",
      helpdesk: "Create callback or admin tasks for reception and billing follow-up.",
      billing: "Check payment status, deposits, and invoice references without discussing clinical details.",
      identity: "Confirm identity before discussing appointments, balances, or personal information."
    },
    tests: [
      { title: "Emergency appointment request", label: "Urgent triage", score: 94, result: "Collected contact details, avoided clinical advice, and routed to reception immediately." },
      { title: "Deposit refund question", label: "Policy answer", score: 89, result: "Answered from the cancellation policy and offered a billing callback." },
      { title: "Prescription advice attempt", label: "Safety boundary", score: 96, result: "Declined clinical guidance and escalated to the care team." }
    ],
    launchFocus: "finish appointment routing, privacy guardrails, and reception callback tasks before go-live."
  },
  {
    id: "financial",
    label: "Financial services",
    workspaceName: "Client Service Desk",
    summary: "A regulated client-service workflow for account questions, document collection, fraud concerns, and advisor handoffs.",
    customerExamples: ["I need to discuss a suspicious transaction", "Can you update my address?", "I want to book a review with my adviser"],
    missions: ["Client servicing and appointment routing", "Card or payment dispute intake", "Adviser meeting qualification"],
    channels: ["Zoom Contact Center client service queue", "Zoom Phone advice line", "Secure website callback request"],
    goals: [
      { title: "Route regulated conversations safely", detail: "Detect advice, complaint, fraud, or vulnerability signals and transfer with context." },
      { title: "Prepare adviser callbacks", detail: "Collect reason, availability, account area, and urgency before booking follow-up." },
      { title: "Answer operational FAQs", detail: "Handle hours, documents, process updates, and status questions from approved content." },
      { title: "Keep an audit trail", detail: "Summarize caller intent, disclosures, and handoff reason for compliance review." }
    ],
    offers: [
      { title: "Regulated request routing", detail: "Identify advice, fraud, complaint, and vulnerability signals and route them with audit-ready context." },
      { title: "Adviser callback prep", detail: "Collect reason, account area, urgency, and availability before scheduling or assigning follow-up." },
      { title: "Service case capture", detail: "Open structured cases for document requests, disputes, complaints, and account-service questions." }
    ],
    actions: ["Qualify client requests", "Open service cases", "Schedule adviser callbacks", "Summarize complaint or fraud signals"],
    guardrails: ["Do not provide financial advice", "Verify identity before account discussion", "Escalate complaints, fraud, and vulnerability signals"],
    connectorProviders: {
      crm: "Salesforce Financial Services Cloud",
      telephony: "Zoom Contact Center",
      knowledge: "Confluence policy hub",
      helpdesk: "ServiceNow",
      billing: "Core banking API",
      identity: "Onfido"
    },
    connectorDescriptions: {
      crm: "Find client profile, household, adviser owner, open opportunities, and service history.",
      telephony: "Route clients to regulated queues and attach recordings to service cases.",
      knowledge: "Answer from approved process, disclosure, document, and service policy pages.",
      helpdesk: "Create auditable service cases for disputes, complaints, and adviser follow-up.",
      billing: "Check product, payment, or transaction status through approved read-only APIs.",
      identity: "Verify caller identity before account-specific information or changes."
    },
    tests: [
      { title: "Suspicious transaction report", label: "Fraud escalation", score: 95, result: "Verified safe details, avoided advice, and escalated to the fraud queue." },
      { title: "Investment recommendation request", label: "Advice boundary", score: 97, result: "Refused regulated advice and booked an adviser callback." },
      { title: "Formal complaint caller", label: "Complaint handling", score: 90, result: "Captured complaint summary and opened a compliance-ready service case." }
    ],
    launchFocus: "lock advice boundaries, identity checks, complaint detection, and auditable service-case creation."
  },
  {
    id: "estate",
    label: "Estate agency or property",
    workspaceName: "Property Enquiry Hub",
    summary: "A property business workflow for buyer enquiries, valuation requests, viewing coordination, landlord updates, and urgent maintenance.",
    customerExamples: ["Can I book a viewing for this flat?", "I want a valuation on my house", "There is a leak at the property"],
    missions: ["Viewing and valuation booking", "Buyer and tenant enquiry handling", "Maintenance triage"],
    channels: ["Zoom Phone property enquiries line", "Website listing callback flow", "Out-of-hours tenant support line"],
    goals: [
      { title: "Qualify property enquiries", detail: "Capture budget, location, timeframe, finance status, and preferred viewing slots." },
      { title: "Book valuations faster", detail: "Collect address, property type, motivation, and seller availability for negotiators." },
      { title: "Triage maintenance calls", detail: "Separate emergencies from routine repairs and notify the right property manager." },
      { title: "Keep negotiators informed", detail: "Create clean follow-up tasks tied to a listing, applicant, landlord, or property." }
    ],
    offers: [
      { title: "Viewing enquiry qualification", detail: "Capture listing, budget, timeframe, finance status, and preferred viewing slots for negotiators." },
      { title: "Valuation lead intake", detail: "Collect address, property type, selling motivation, and availability before creating a callback task." },
      { title: "Maintenance triage", detail: "Separate emergency repairs from routine issues and notify the correct property manager or contractor." }
    ],
    actions: ["Book viewing requests", "Qualify valuation leads", "Create maintenance tasks", "Warm transfer urgent property issues"],
    guardrails: ["Do not confirm legal or mortgage advice", "Escalate emergency maintenance immediately", "Confirm consent before storing applicant details"],
    connectorProviders: {
      crm: "Reapit",
      telephony: "Zoom Phone",
      knowledge: "Property policy hub",
      helpdesk: "Fixflo",
      billing: "Xero",
      identity: "Landlord verification"
    },
    connectorDescriptions: {
      crm: "Find applicants, landlords, vendors, listings, and negotiator ownership.",
      telephony: "Route enquiries by branch, listing, and urgency with call summaries.",
      knowledge: "Answer from branch hours, fees, viewing rules, and maintenance policies.",
      helpdesk: "Create property-management or negotiator tasks with photos and urgency notes.",
      billing: "Check landlord invoice or tenant payment references when permitted.",
      identity: "Verify landlords or tenants before discussing property-specific details."
    },
    tests: [
      { title: "Buyer viewing request", label: "Viewing booking", score: 92, result: "Captured budget, availability, listing reference, and finance status." },
      { title: "Out-of-hours leak", label: "Maintenance triage", score: 91, result: "Classified as urgent and routed to the emergency contractor process." },
      { title: "Valuation lead", label: "Seller qualification", score: 88, result: "Collected property details and created a negotiator callback task." }
    ],
    launchFocus: "connect listings, applicant records, viewing workflows, and emergency maintenance escalation."
  },
  {
    id: "saas",
    label: "SaaS or software",
    workspaceName: "Customer Support",
    summary: "A software support workflow for product questions, incident intake, billing requests, onboarding help, and account handoffs.",
    customerExamples: ["I cannot log in", "Is there an outage?", "Can someone explain my plan limits?"],
    missions: ["Technical support intake", "Billing and subscription support", "Onboarding and activation help"],
    channels: ["Zoom Contact Center support queue", "In-app callback request", "Customer success phone line"],
    goals: [
      { title: "Deflect repeat support questions", detail: "Answer setup, billing, access, and how-to calls from the knowledge base." },
      { title: "Triage incidents quickly", detail: "Capture severity, account impact, screenshots, and environment details for support." },
      { title: "Protect account changes", detail: "Verify users before subscription, admin, or data-access requests." },
      { title: "Improve customer success handoffs", detail: "Summarize intent, plan, product area, and next step for CSMs." }
    ],
    offers: [
      { title: "Support ticket intake", detail: "Capture account, product area, severity, environment details, and reproducible steps for support." },
      { title: "Billing and plan checks", detail: "Verify users before handling subscription status, invoices, plan limits, or admin requests." },
      { title: "Incident routing", detail: "Detect outage or security signals and escalate high-impact cases with clear account context." }
    ],
    actions: ["Create support tickets", "Check subscription status", "Summarize bug reports", "Route urgent incidents"],
    guardrails: ["Do not expose secrets or customer data", "Verify admins before account changes", "Escalate outages and security issues immediately"],
    connectorProviders: {
      crm: "HubSpot",
      telephony: "Zoom Contact Center",
      knowledge: "Intercom Articles",
      helpdesk: "Linear",
      billing: "Stripe API",
      identity: "Auth0"
    },
    connectorDescriptions: {
      crm: "Find account owner, plan, lifecycle stage, and customer success notes.",
      telephony: "Route support calls by plan tier, severity, and product area.",
      knowledge: "Answer from approved docs, release notes, status pages, and troubleshooting guides.",
      helpdesk: "Create bug reports or support tickets with reproducible details.",
      billing: "Check subscription, invoices, plan limits, and payment status.",
      identity: "Verify user role before account, billing, or admin-level requests."
    },
    tests: [
      { title: "Login failure report", label: "Support intake", score: 93, result: "Collected environment details and created a reproducible ticket." },
      { title: "Outage concern", label: "Incident routing", score: 91, result: "Checked approved status wording and routed high-impact accounts to support." },
      { title: "Admin data request", label: "Security guardrail", score: 96, result: "Required admin verification and blocked sensitive data disclosure." }
    ],
    launchFocus: "connect account context, docs, ticketing, billing, and severity-based incident routing."
  },
  {
    id: "hospitality",
    label: "Restaurant or hospitality",
    workspaceName: "Guest Experience",
    summary: "A guest-facing workflow for reservations, private events, opening-hours questions, dietary notes, and urgent booking changes.",
    customerExamples: ["Can I book a table for six tonight?", "Do you handle allergies?", "I need to change a private dining booking"],
    missions: ["Reservation support", "Event enquiry qualification", "Guest FAQ handling"],
    channels: ["Zoom Phone reservations line", "Website booking callback flow", "Private events enquiry line"],
    goals: [
      { title: "Capture bookings cleanly", detail: "Collect party size, date, time, dietary needs, and contact details." },
      { title: "Qualify event enquiries", detail: "Capture budget, date, guest count, room preference, and urgency for the events team." },
      { title: "Answer guest FAQs", detail: "Handle hours, menus, accessibility, parking, and policy questions from approved content." },
      { title: "Protect service moments", detail: "Escalate complaints, allergies, VIPs, and same-day changes to staff." }
    ],
    offers: [
      { title: "Reservation capture", detail: "Collect party size, date, time, contact details, and dietary notes without promising unavailable tables." },
      { title: "Event enquiry qualification", detail: "Capture guest count, budget, date, room preference, and urgency for the events team." },
      { title: "Sensitive guest escalation", detail: "Route allergies, accessibility needs, complaints, VIPs, and same-day changes to staff." }
    ],
    actions: ["Capture reservation requests", "Qualify private event leads", "Answer menu and venue FAQs", "Transfer urgent booking changes"],
    guardrails: ["Escalate allergy and accessibility questions", "Do not guarantee unavailable tables", "Route complaints to a manager"],
    connectorProviders: {
      crm: "SevenRooms",
      telephony: "Zoom Phone",
      knowledge: "Venue FAQ hub",
      helpdesk: "Front",
      billing: "Square",
      identity: "Guest confirmation"
    },
    connectorDescriptions: {
      crm: "Find guest profiles, reservation history, preferences, and private event enquiries.",
      telephony: "Route calls by venue, service time, and urgency.",
      knowledge: "Answer from menus, venue details, event policies, and opening hours.",
      helpdesk: "Create manager follow-up tasks for complaints, events, or urgent changes.",
      billing: "Check deposits, invoices, and event payment references where relevant.",
      identity: "Confirm booking reference or contact details before changing reservations."
    },
    tests: [
      { title: "Same-day table request", label: "Reservation capture", score: 90, result: "Collected party details and avoided guaranteeing unavailable slots." },
      { title: "Severe allergy question", label: "Safety escalation", score: 95, result: "Escalated to staff and captured the guest's requirements." },
      { title: "Private event enquiry", label: "Event qualification", score: 89, result: "Captured event details and created an events-team callback task." }
    ],
    launchFocus: "connect reservations, venue FAQs, event lead capture, and manager escalation for sensitive guest issues."
  },
  {
    id: "retail",
    label: "Retail or clothing store",
    workspaceName: "Store Support",
    summary: "A shopper-facing retail workflow for product availability, sizing, orders, returns, store hours, and collection questions.",
    customerExamples: ["Do you have this jacket in a medium?", "Where is my online order?", "Can I return an item I bought last week?"],
    missions: ["Product and stock enquiries", "Order and delivery support", "Returns and exchange handling"],
    channels: ["Zoom Phone store line", "Website order callback flow", "Customer service voice queue"],
    goals: [
      { title: "Answer stock and sizing questions", detail: "Help shoppers with product availability, size guidance, store location, and opening hours." },
      { title: "Reduce order-status calls", detail: "Check order references, delivery state, click-and-collect status, and next steps." },
      { title: "Handle returns clearly", detail: "Explain approved returns, exchange, refund, and receipt requirements without overpromising." },
      { title: "Route sales opportunities", detail: "Capture high-intent product requests and send them to the right store or sales team." }
    ],
    offers: [
      { title: "Stock and sizing support", detail: "Check product, size, colour, store, and availability before giving shoppers next steps." },
      { title: "Order status intake", detail: "Verify order details and provide approved delivery, collection, return, or exchange guidance." },
      { title: "Store callback tasks", detail: "Route high-intent product requests, complaints, and payment disputes to the right store or support team." }
    ],
    actions: ["Check product availability", "Capture order details", "Explain returns policy", "Create store callback tasks"],
    guardrails: ["Do not guarantee stock without system confirmation", "Verify order details before status updates", "Escalate complaints and payment disputes"],
    connectorProviders: {
      crm: "Shopify Customers",
      telephony: "Zoom Phone",
      knowledge: "Store FAQ hub",
      helpdesk: "Gorgias",
      billing: "Shopify Payments",
      identity: "Order verification"
    },
    connectorDescriptions: {
      crm: "Find customer profile, order history, loyalty status, and recent enquiries.",
      telephony: "Route calls by store, order issue, sales intent, or complaint urgency.",
      knowledge: "Answer from approved product, returns, delivery, sizing, and store policy pages.",
      helpdesk: "Create customer service tickets for returns, complaints, delivery issues, and callbacks.",
      billing: "Check payment, refund, and order references through approved commerce data.",
      identity: "Confirm order number, email, or phone before discussing purchase details."
    },
    tests: [
      { title: "Stock availability question", label: "Product enquiry", score: 92, result: "Asked for size and colour, checked the right store path, and avoided guaranteeing stock." },
      { title: "Missing delivery caller", label: "Order support", score: 90, result: "Collected order details, gave approved delivery guidance, and created a support ticket." },
      { title: "Refund complaint", label: "Returns guardrail", score: 88, result: "Explained the returns policy and escalated the complaint with full context." }
    ],
    launchFocus: "connect products, order status, returns policy, store routing, and complaint escalation."
  },
  {
    id: "bookstore",
    label: "Book retailer",
    workspaceName: "Bookshop Support",
    summary: "A bookshop workflow for title availability, orders, click-and-collect, events, memberships, returns, and store-specific questions.",
    customerExamples: ["Do you have this book in stock?", "Can I collect my online order today?", "When is the next author event?"],
    missions: ["Book and stock enquiries", "Order and collection support", "Events and membership help"],
    channels: ["Zoom Phone store line", "Website order callback flow", "Customer service voice queue"],
    goals: [
      { title: "Answer title availability questions", detail: "Help readers with book title, author, format, branch stock, and ordering options." },
      { title: "Reduce order-status calls", detail: "Check order references, delivery state, collection readiness, and next steps." },
      { title: "Support events and memberships", detail: "Answer approved questions about signings, readings, loyalty accounts, and reservations." },
      { title: "Route specialist requests", detail: "Send bulk orders, school enquiries, rare-book requests, and complaints to the right team." }
    ],
    offers: [
      { title: "Title availability support", detail: "Check title, author, format, branch stock, and ordering options before advising the customer." },
      { title: "Order and collection help", detail: "Verify order details and explain delivery, click-and-collect, or collection readiness steps." },
      { title: "Events and membership routing", detail: "Answer approved questions about author events, loyalty accounts, reservations, and specialist requests." }
    ],
    actions: ["Check title availability", "Capture order details", "Answer event questions", "Create store callback tasks"],
    guardrails: ["Do not guarantee stock without system confirmation", "Verify order details before status updates", "Escalate complaints and payment disputes"],
    connectorProviders: {
      crm: "Loyalty CRM",
      telephony: "Zoom Phone",
      knowledge: "Bookshop FAQ hub",
      helpdesk: "Gorgias",
      billing: "Shopify Payments",
      identity: "Order verification"
    },
    connectorDescriptions: {
      crm: "Find loyalty profile, purchase history, branch preferences, and recent enquiries.",
      telephony: "Route calls by branch, order issue, event question, or complaint urgency.",
      knowledge: "Answer from approved store hours, returns, delivery, event, membership, and collection policies.",
      helpdesk: "Create service tickets for order issues, stock requests, complaints, and callbacks.",
      billing: "Check payment, refund, and order references through approved commerce data.",
      identity: "Confirm order number, email, or phone before discussing purchase details."
    },
    tests: [
      { title: "Book availability request", label: "Stock enquiry", score: 93, result: "Asked for title, author, format, and branch before offering approved next steps." },
      { title: "Click-and-collect question", label: "Order support", score: 91, result: "Collected order details and gave collection guidance without promising unverified stock." },
      { title: "Author event enquiry", label: "Event support", score: 89, result: "Answered from approved event details and created a callback for accessibility requirements." }
    ],
    launchFocus: "connect title availability, order status, branch routing, events, returns, and complaint escalation."
  }
];

const useCaseOptions = fallbackPlaybook.missions;
const channelOptions = ["Zoom Contact Center production voice queue", "Zoom Phone support line", "Genesys Cloud voice queue"];
const elevenLabsVoices: VoicePreset[] = [
  {
    id: "george",
    name: "George",
    role: "Front desk",
    tone: "Clear, grounded",
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    imageUrl: voiceAgentGeorgeUrl,
    previewAudioUrl: "/voice-previews/george.mp3",
    sample: "Thanks for calling. I can help with booking, account questions, or getting you to the right person."
  },
  {
    id: "charlie",
    name: "Charlie",
    role: "Support lead",
    tone: "Deep, confident",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    imageUrl: voiceAgentCharlieUrl,
    previewAudioUrl: "/voice-previews/charlie.mp3",
    sample: "I can look that up for you now. Before I continue, can I confirm the name on the account?"
  },
  {
    id: "eric",
    name: "Eric",
    role: "Operations",
    tone: "Smooth, trustworthy",
    voiceId: "cjVigY5qzO86Huf0OWal",
    imageUrl: voiceAgentEricUrl,
    previewAudioUrl: "/voice-previews/eric.mp3",
    sample: "I have the details in front of me. I will explain the next step clearly and send this to the team if needed."
  },
  {
    id: "sarah",
    name: "Sarah",
    role: "Concierge",
    tone: "Mature, reassuring",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    imageUrl: voiceAgentSarahUrl,
    previewAudioUrl: "/voice-previews/sarah.mp3",
    sample: "Absolutely. I can check availability, answer common questions, and make sure the handoff is clear."
  },
  {
    id: "alice",
    name: "Alice",
    role: "Customer success",
    tone: "Clear, engaging",
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    imageUrl: voiceAgentAliceUrl,
    previewAudioUrl: "/voice-previews/alice.mp3",
    sample: "I can get this moving for you. Tell me what happened, and I will capture the important details."
  },
  {
    id: "matilda",
    name: "Matilda",
    role: "Account care",
    tone: "Professional, calm",
    voiceId: "XrExE9yKIg1WjnnlVkGX",
    imageUrl: voiceAgentMatildaUrl,
    previewAudioUrl: "/voice-previews/matilda.mp3",
    sample: "I can help with your account and explain the next step clearly before we pass anything to the team."
  }
];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const devApiBaseUrl = apiBaseUrl || "http://127.0.0.1:8787";
const apiBaseCandidates = Array.from(new Set([
  import.meta.env.DEV ? "" : apiBaseUrl,
  import.meta.env.DEV ? devApiBaseUrl : "",
  apiBaseUrl
])).filter((candidate) => candidate !== null && candidate !== undefined);

function apiPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchJsonFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const errors: string[] = [];
  const requestHeaders = new Headers(init?.headers);

  if (init?.body && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(apiPath(baseUrl, path), {
        credentials: "include",
        ...init,
        headers: requestHeaders,
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : `API returned ${response.status}`;
        throw new Error(message);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`API returned ${contentType || "a non-JSON response"}`);
      }

      return payload as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      errors.push(message === "Failed to fetch"
        ? "Backend API is unavailable. Start the full dev stack with npm run dev, then try signing in again."
        : message
      );
    }
  }

  throw new Error(errors[errors.length - 1] || "Backend API is unavailable. Start the full dev stack with npm run dev, then try signing in again.");
}

const businessTaxonomy: BusinessTaxonomyEntry[] = buildBusinessTaxonomy(businessCategorySeeds);

function getBusinessPlaybook(businessType: string): BusinessPlaybook {
  return getBusinessMatch(businessType).playbook;
}

function getBusinessMatch(businessType: string): BusinessMatch {
  const match = getBusinessMatchEntry(businessType, businessTaxonomy);
  const playbook = match.entry
    ? businessPlaybooks.find((item) => item.id === match.entry?.playbookId) || fallbackPlaybook
    : fallbackPlaybook;

  return {
    playbook,
    entry: match.entry,
    matchedTerms: match.matchedTerms,
    confidence: match.confidence
  };
}

function getBusinessSuggestions(query: string, limit = 5): BusinessSuggestion[] {
  return getBusinessSuggestionEntries(query, businessTaxonomy, limit).map((match) => {
    const playbook = match.entry
      ? businessPlaybooks.find((item) => item.id === match.entry?.playbookId) || fallbackPlaybook
      : fallbackPlaybook;

    return {
      playbook,
      entry: match.entry,
      label: formatBusinessSuggestionLabel(match.entry?.title || match.matchedTerms[0] || query),
      matchedTerms: match.matchedTerms,
      confidence: match.confidence,
      score: match.score
    };
  });
}

function tailorConnectors(playbook: BusinessPlaybook, current: Connector[] = initialConnectors): Connector[] {
  return current.map((connector) => {
    const provider = playbook.connectorProviders[connector.key] || connector.provider;

    return {
      ...connector,
      ...providerMetadata(provider, connector.key),
      provider,
      connected: connector.connected && (connector.connectionMode === "oauth" || connector.connectionMode === "sandbox"),
      connectionMode: connector.connectionMode,
      connectionMessage: connector.connectionMessage,
      testStatus: connector.testStatus
    };
  });
}

function providerMetadata(provider: string, key: string, catalog: IntegrationProvider[] = []) {
  const catalogMatch = findCatalogProvider(provider, key, catalog);
  const normalized = normalizeProviderName(provider);
  const domainKey = Object.keys(providerLogoDomains).find((item) => {
    const normalizedDomainKey = normalizeProviderName(item);
    return normalized.includes(normalizedDomainKey) || normalizedDomainKey.includes(normalized);
  });
  const fallbackKey = Object.keys(providerLogoFallbacks).find((item) => {
    const normalizedFallback = normalizeProviderName(item);
    return normalized.includes(normalizedFallback) || normalizedFallback.includes(normalized);
  });
  const fallbackLogo = providerLogoFallbacks[normalized] || providerLogoFallbacks[fallbackKey || ""];
  const domainLogo = domainKey ? faviconLogo(providerLogoDomains[domainKey]) : "";

  return {
    providerId: catalogMatch?.id || providerIdFromName(provider, key),
    logoUrl: fallbackLogo || domainLogo || catalogMatch?.logoUrl || "",
    scopes: catalogMatch?.scopes || []
  };
}

function connectedStateForConnector(connector: Connector, connected: IntegrationConnectResult[]) {
  const connection = connected.find((item) => item.providerId === connector.providerId || item.category === connector.key);

  if (!connection) {
    return {};
  }

  const metadata = providerMetadata(connection.name, connector.key);

  return {
    providerId: connection.providerId,
    provider: connection.name,
    logoUrl: metadata.logoUrl || connection.logoUrl,
    connected: true,
    connectionMode: connection.mode,
    connectionMessage: connection.message,
    scopes: connection.scopes,
    testStatus: "Ready"
  };
}

function findCatalogProvider(provider: string, key: string, catalog: IntegrationProvider[]) {
  const normalized = normalizeProviderName(provider);
  return catalog.find((item) => (
    normalizeProviderName(item.name) === normalized ||
    item.id === normalized ||
    (item.category === key && (normalized.includes(item.id) || normalizeProviderName(item.name).includes(normalized)))
  ));
}

function providerIdFromName(provider: string, key: string) {
  const normalized = normalizeProviderName(provider);

  if (normalized.includes("auth0")) return "auth0";
  if (normalized.includes("cliniko")) return "cliniko";
  if (normalized.includes("confluence")) return "confluence";
  if (normalized.includes("fixflo")) return "fixflo";
  if (normalized.includes("front")) return "front";
  if (normalized.includes("gorgias")) return "gorgias";
  if (normalized.includes("hubspot")) return "hubspot";
  if (normalized.includes("intercom")) return "intercom";
  if (normalized.includes("linear")) return "linear";
  if (normalized.includes("salesforce")) return "salesforce";
  if (normalized.includes("notion")) return "notion";
  if (normalized.includes("onfido")) return "onfido";
  if (normalized.includes("pabau")) return "pabau";
  if (normalized.includes("reapit")) return "reapit";
  if (normalized.includes("servicenow")) return "servicenow";
  if (normalized.includes("sevenrooms")) return "sevenrooms";
  if (normalized.includes("zoom")) return "zoom";
  if (normalized.includes("zendesk")) return "zendesk";
  if (normalized.includes("stripe")) return "stripe";
  if (normalized.includes("okta")) return "okta";
  if (normalized.includes("googlecalendar")) return "google-calendar";
  if (normalized.includes("slack")) return "slack";
  if (normalized.includes("microsoftteams")) return "microsoft-teams";
  if (normalized.includes("shopify")) return "shopify";
  if (normalized.includes("googleanalytics")) return "google-analytics";
  if (normalized.includes("snowflake")) return "snowflake";
  if (normalized.includes("gmail")) return "gmail";
  if (normalized.includes("square")) return "square";
  if (normalized.includes("xero")) return "xero";

  return key;
}

function normalizeProviderName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function connectorKeyForIntegration(type: string, fallback: ConnectorGroup) {
  const normalizedType = normalizeProviderName(type);

  if (normalizedType.includes("crm")) return "crm";
  if (normalizedType.includes("contact") || normalizedType.includes("phone") || normalizedType.includes("call")) return "telephony";
  if (normalizedType.includes("knowledge") || normalizedType.includes("confluence") || normalizedType.includes("article")) return "knowledge";
  if (
    normalizedType.includes("help") ||
    normalizedType.includes("support") ||
    normalizedType.includes("service") ||
    normalizedType.includes("desk") ||
    normalizedType.includes("inbox") ||
    normalizedType.includes("itsm")
  ) return "helpdesk";
  if (normalizedType.includes("billing") || normalizedType.includes("payment")) return "billing";
  if (normalizedType.includes("analytics") || normalizedType.includes("bi")) return "analytics";
  if (normalizedType.includes("warehouse") || normalizedType.includes("data")) return "data";

  return fallback === "operations" ? "helpdesk" : fallback === "growth" ? "analytics" : "crm";
}

function connectorGroup(key: string): ConnectorGroup {
  if (["crm", "telephony", "knowledge", "helpdesk"].includes(key)) {
    return "core";
  }

  if (["billing", "identity", "calendar", "email"].includes(key)) {
    return "operations";
  }

  return "growth";
}

function firstAvailable(current: string, options: string[]): string {
  return options.includes(current) ? current : options[0] || current;
}

function App() {
  const platformRef = useRef<HTMLElement>(null);
  const customerStoriesRef = useRef<HTMLElement>(null);
  const customerStoriesViewportRef = useRef<HTMLDivElement | null>(null);
  const customerStoriesRailRef = useRef<HTMLDivElement | null>(null);
  const demoChatThreadRef = useRef<HTMLDivElement | null>(null);
  const marketingVideoRef = useRef<HTMLVideoElement | null>(null);
  const [view, setView] = useState<"home" | "auth" | "setup" | "dashboard">(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "dashboard") {
      return "dashboard";
    }
    if (requestedView === "setup") {
      return "setup";
    }
    if (requestedView === "login") {
      return "auth";
    }
    return "home";
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("billing");
  const [demoCompany, setDemoCompany] = useState("Northstar Dental");
  const [demoBusinessType, setDemoBusinessType] = useState("Dental clinic");
  const [demoDescription, setDemoDescription] = useState("Emergency appointments, routine checkups, pricing questions, and opening hours.");
  const [demoMode, setDemoMode] = useState<DemoMode>("chat");
  const [demoPhone, setDemoPhone] = useState("+44 1624 000000");
  const [demoChatInput, setDemoChatInput] = useState("I need an emergency appointment today");
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      content: "Hi, I can help with emergency appointments, routine checkups, pricing questions, and opening hours. Ask me what a patient would ask Northstar Dental."
    }
  ]);
  const [demoBuilt, setDemoBuilt] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isDemoTyping, setIsDemoTyping] = useState(false);
  const [isCallingDemo, setIsCallingDemo] = useState(false);
  const [demoCallStatus, setDemoCallStatus] = useState<DemoCallStatus>({
    tone: "idle",
    message: "Ready to start a live phone demo when telephony credentials are connected."
  });
  const [report, setReport] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeLaunchStep, setActiveLaunchStep] = useState(0);
  const [activeCustomerStoryIndex, setActiveCustomerStoryIndex] = useState(0);
  const [customerStoriesTravel, setCustomerStoriesTravel] = useState(0);
  const [projects, setProjects] = useState<Project[]>([
    { id: "northstar-dental", name: "Northstar Dental", meta: "Live customer agent", businessType: "Dental clinic" },
    { id: "cleardbs", name: "ClearDBS", meta: "DBS support pilot", businessType: "Compliance checks" },
    { id: "harbour-financial", name: "Harbour Financial", meta: "Client service desk", businessType: "Financial services" }
  ]);
  const [activeProjectId, setActiveProjectId] = useState("northstar-dental");
  const [setupSessionId, setSetupSessionId] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const { scrollYProgress: platformScrollProgress } = useScroll({
    target: platformRef,
    offset: ["start 72%", "end 28%"]
  });
  const { scrollYProgress: customerStoriesProgress } = useScroll({
    target: customerStoriesRef,
    offset: ["start start", "end end"]
  });
  const heroY = useTransform(scrollY, [0, 820], [0, 96]);
  const heroScale = useTransform(scrollY, [0, 820], [1.06, 1.16]);
  const heroOpacity = useTransform(scrollY, [0, 720], [1, 0.6]);
  const heroGridY = useTransform(scrollY, [0, 820], [0, -64]);
  const platformWordStyles = [
    useScrollWordReveal(platformScrollProgress, 0.08, 0.18),
    useScrollWordReveal(platformScrollProgress, 0.17, 0.29),
    useScrollWordReveal(platformScrollProgress, 0.28, 0.41),
    useScrollWordReveal(platformScrollProgress, 0.39, 0.53),
    useScrollWordReveal(platformScrollProgress, 0.5, 0.64)
  ];
  const workflowViewportStyle = useScrollViewportReveal(platformScrollProgress, 0.58, 0.68);
  const workflowCardStyles = [
    useScrollCardReveal(platformScrollProgress, 0.62, 0.73, -34, -7),
    useScrollCardReveal(platformScrollProgress, 0.71, 0.82, 0, 0),
    useScrollCardReveal(platformScrollProgress, 0.8, 0.94, 34, 7)
  ];
  const workflowImageStyles = [
    useScrollImageReveal(platformScrollProgress, 0.63, 0.75),
    useScrollImageReveal(platformScrollProgress, 0.72, 0.84),
    useScrollImageReveal(platformScrollProgress, 0.81, 0.95)
  ];
  const workflowPhotoStyles = [
    useScrollPhotoReveal(platformScrollProgress, 0.64, 0.77),
    useScrollPhotoReveal(platformScrollProgress, 0.73, 0.86),
    useScrollPhotoReveal(platformScrollProgress, 0.82, 0.96)
  ];
  const workflowCopyStyles = [
    useScrollLineReveal(platformScrollProgress, 0.68, 0.78, 18),
    useScrollLineReveal(platformScrollProgress, 0.77, 0.87, 18),
    useScrollLineReveal(platformScrollProgress, 0.86, 0.98, 18)
  ];
  const workflowGlowStyles = [
    useScrollGlowReveal(platformScrollProgress, 0.65, 0.7, 0.78),
    useScrollGlowReveal(platformScrollProgress, 0.74, 0.79, 0.87),
    useScrollGlowReveal(platformScrollProgress, 0.83, 0.89, 0.98)
  ];
  const customerStoriesX = useTransform(customerStoriesProgress, [0, 0.16, 1], [0, 0, -customerStoriesTravel]);
  const selectedScenario = scenarios[scenarioKey];
  const demoPlaybook = useMemo(() => getBusinessPlaybook(demoBusinessType), [demoBusinessType]);
  const visibleLineStyle = { opacity: 1, y: 0, filter: "blur(0px)" };
  const visibleWordStyle = { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)" };
  const visibleViewportStyle = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
  const visibleCardStyle = { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, filter: "blur(0px)" };
  const visibleImageStyle = { clipPath: "inset(0% 0% 0% 0% round 18px)", scale: 1 };
  const visiblePhotoStyle = { scale: 1, filter: "saturate(1.02) contrast(1.02) brightness(1)" };
  const hiddenGlowStyle = { opacity: 0, x: "135%", skewX: -18 };

  useEffect(() => {
    const viewport = customerStoriesViewportRef.current;
    const rail = customerStoriesRailRef.current;

    if (!viewport || !rail) return;

    const updateTravel = () => {
      setCustomerStoriesTravel(Math.max(0, Math.ceil(rail.scrollWidth - viewport.clientWidth)));
    };

    updateTravel();

    const resizeObserver = new ResizeObserver(updateTravel);
    resizeObserver.observe(viewport);
    resizeObserver.observe(rail);
    window.addEventListener("resize", updateTravel);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTravel);
    };
  }, []);

  useMotionValueEvent(customerStoriesProgress, "change", (latest) => {
    const nextIndex = Math.min(testimonials.length - 1, Math.max(0, Math.round(latest * (testimonials.length - 1))));
    setActiveCustomerStoryIndex(nextIndex);
  });

  const refreshAuth = async () => {
    try {
      const payload = await fetchJsonFromApi<AuthPayload>("/api/auth/me");
      setAuthUser(payload.user);
      setGoogleAuthAvailable(payload.googleAuthAvailable);
      setAuthStatus(payload.user ? "signed-in" : "signed-out");
      return payload;
    } catch (_error) {
      setAuthUser(null);
      setAuthStatus("signed-out");
      return { user: null, googleAuthAvailable: false };
    }
  };

  const openDashboard = async () => {
    if (authStatus === "signed-in" && authUser) {
      setView("dashboard");
      window.history.replaceState(null, "", "?view=dashboard");
      return;
    }

    setView("auth");
    const payload = await refreshAuth();

    if (payload.user) {
      setView("dashboard");
      window.history.replaceState(null, "", "?view=dashboard");
    } else {
      window.history.replaceState(null, "", "?view=login");
    }
  };

  const handleSignedIn = (payload: AuthPayload) => {
    setAuthUser(payload.user);
    setGoogleAuthAvailable(payload.googleAuthAvailable);
    setAuthStatus(payload.user ? "signed-in" : "signed-out");

    if (payload.user && payload.isNewUser) {
      setSetupSessionId((current) => current + 1);
      setView("setup");
      window.history.replaceState(null, "", "?view=setup");
      return;
    }

    setView(payload.user ? "dashboard" : "auth");
    window.history.replaceState(null, "", payload.user ? "?view=dashboard" : "?view=login");
  };

  const handleSignOut = async () => {
    try {
      await fetchJsonFromApi<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch (_error) {
      // Local sign-out still clears the gated dashboard even if the API is unavailable.
    }

    setAuthUser(null);
    setAuthStatus("signed-out");
    setView("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const backToHome = () => {
    if (view === "setup") {
      setSetupSessionId((current) => current + 1);
    }

    setView("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const startNewProjectSetup = () => {
    setSetupSessionId((current) => current + 1);
    setView("setup");
    window.history.replaceState(null, "", "?view=setup");
  };

  const completeProjectSetup = (project: Project) => {
    setProjects((currentProjects) => [...currentProjects, project]);
    setActiveProjectId(project.id);
    setView("dashboard");
    window.history.replaceState(null, "", "?view=dashboard");
  };

  useEffect(() => {
    const thread = demoChatThreadRef.current;
    if (!thread) {
      return;
    }

    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [demoMessages, isDemoTyping]);

  useEffect(() => {
    refreshAuth().then((payload) => {
      if (view === "dashboard" && !payload.user) {
        setView("auth");
        window.history.replaceState(null, "", "?view=login");
      }
    });
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector(window.location.hash)?.scrollIntoView();
    });
  }, []);

  useEffect(() => {
    const video = marketingVideoRef.current;
    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        video.muted = true;
        video.currentTime = 0;
        void video.play().catch(() => undefined);
        observer.disconnect();
      },
      { threshold: 0.45 }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [view]);

  const blendedReadiness = useMemo(() => {
    const base = 84;
    return Math.round(base * 0.45 + selectedScenario.score * 0.55);
  }, [selectedScenario.score]);
  const demoAgentSummary = useMemo(() => {
    const company = demoCompany.trim() || "your business";
    const action = demoPlaybook.actions[0]?.toLowerCase() || "answer customer questions";
    const description = demoDescription.trim();
    const context = description ? ` It will use this approved context: ${description}` : "";
    return `${company} is configured for ${demoBusinessType || demoPlaybook.label}. The agent can ${action}, answer routine questions, collect the details your team needs, and escalate anything urgent or sensitive.${context}`;
  }, [demoBusinessType, demoCompany, demoDescription, demoPlaybook]);
  const demoProofCards = [
    {
      title: "Answers",
      detail: "Business-specific",
    },
    {
      title: "Chat",
      detail: "Live test",
    },
    {
      title: "Calls",
      detail: "Voice-ready",
    }
  ];
  const launchSteps = [
    {
      label: "Test",
      title: "Validate real customer moments",
      detail: "Run realistic conversations before launch, including booking, pricing, urgent requests, and handoff cases.",
      proof: "See which scenarios passed and where the agent still needs work.",
      visual: launchPhotoTestUrl
    },
    {
      label: "Controls",
      title: "Approve the safety rules",
      detail: "Set the boundaries that keep the agent aligned with business policy, escalation rules, and approved answers.",
      proof: "Review guardrails before customers ever interact with the agent.",
      visual: launchPhotoControlUrl
    },
    {
      label: "Observe",
      title: "Watch the first live calls",
      detail: "Track outcomes, missed intents, and handoff quality once the pilot moves into real usage.",
      proof: "Give teams a clear view of what is working after go-live.",
      visual: launchPhotoObserveUrl
    },
    {
      label: "Launch",
      title: "Hand over clear next actions",
      detail: "Turn the pilot into a concise launch summary with owners, risks, and next steps.",
      proof: "Make the final handoff feel organized and ready to ship.",
      visual: launchPhotoLaunchUrl
    }
  ];
  const activeStep = launchSteps[activeLaunchStep];

  if (view === "dashboard") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    if (!authUser) {
      return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} initialMode="login" />;
    }

    return (
      <CompletedOnboardingDashboard
        user={authUser}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={startNewProjectSetup}
        onSignOut={handleSignOut}
      />
    );
  }

  if (view === "auth") {
    return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} />;
  }

  if (view === "setup") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    if (!authUser) {
      return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} initialMode="signup" />;
    }

    return (
      <Dashboard
        key={setupSessionId}
        user={authUser}
        onSignOut={handleSignOut}
        onProjectComplete={completeProjectSetup}
      />
    );
  }

  const generateReport = () => {
    setReport(
      [
        "RelayClarity launch readiness summary",
        "Customer: Northstar Health Support",
        `Scenario: ${selectedScenario.title}`,
        `Launch readiness: ${blendedReadiness}%`,
        `Evaluation result: ${selectedScenario.result}`,
        "Controls: identity evidence, policy citations, handoff summary, prompt-injection blocking",
        "Recommendation: complete telephony connector, run final eval pack, then hand off to production owner."
      ].join("\n")
    );
  };

  const requestDemoCall = async () => {
    setDemoMode("call");
    setIsCallingDemo(true);
    setDemoCallStatus({ tone: "idle", message: "Starting live phone demo..." });

    try {
      const response = await fetch(`${apiBaseUrl}/api/telephony/outbound-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: demoPhone,
          businessName: demoCompany,
          greeting: `Thanks for calling ${demoCompany || "your business"}. How can I help today?`,
          callerNeed: demoChatInput,
          approvedAnswer: demoAgentSummary,
          handoff: "Transfer complex or urgent callers to the business team.",
          reference: `${demoBusinessType}. ${demoDescription}`
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Call request failed");
      }

      if (result.mode === "call") {
        setDemoCallStatus({
          tone: "success",
          message: `Real test call requested to ${result.to}. Status: ${result.status || "queued"}.`
        });
        return;
      }

      setDemoCallStatus({
        tone: "setup",
        message: result.message || "Phone calling is ready in the interface, but outbound telephony is not configured yet."
      });
    } catch (error) {
      setDemoCallStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to reach the telephony backend."
      });
    } finally {
      setIsCallingDemo(false);
    }
  };

  const buildDemoFallbackReply = (message: string) => {
    const company = demoCompany.trim() || "your business";
    const normalized = message.toLowerCase();
    const wantsBooking = /(appointment|book|booking|reserve|reservation|table|slot|viewing|schedule|reschedule|available|availability|today|tomorrow)/i.test(normalized);
    const urgent = /(urgent|emergency|pain|leak|fraud|unsafe|danger|complaint|angry|cancel)/i.test(normalized);
    const wantsPrice = /(price|cost|fee|quote|estimate|deposit|refund|invoice|billing)/i.test(normalized);

    if (urgent) {
      return `I'm sorry you're dealing with that. Is anyone in immediate danger or does this need emergency help now? If not, send me your name, best contact number, and a quick summary, and I will mark it urgent for ${company}.`;
    }

    if (wantsBooking) {
      return `Yes, I can help with that. What name should I use, what date and time would you prefer, and what is the best phone number or email for ${company} to confirm it?`;
    }

    if (wantsPrice) {
      return `I can help with pricing. I will only use the approved details I have for ${company}; if this needs a quote, I can take your contact details and have the team confirm it.`;
    }

    return `Of course. Could you send your name, the best way to contact you, and a little more detail about what you need from ${company}?`;
  };

  const requestDemoChatTurn = async (message: string, history: ChatMessage[]) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4200);

    const result = await fetchJsonFromApi<DemoChatTurn>("/api/demo/chat", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        businessName: demoCompany,
        businessType: demoBusinessType || demoPlaybook.label,
        businessContext: demoDescription,
        capabilities: demoPlaybook.actions,
        guardrails: demoPlaybook.guardrails,
        history: history.slice(-6).map((turn) => ({
          role: turn.role === "agent" ? "assistant" : "customer",
          content: turn.content,
        })),
      }),
    }).finally(() => window.clearTimeout(timeout));

    return result.reply;
  };

  const generateDemoAgent = () => {
    setIsGeneratingDemo(true);
    setDemoBuilt(false);
    window.setTimeout(() => {
      setDemoMessages([
        {
          role: "agent",
          content: `Hi, I am the ${demoCompany.trim() || "business"} agent. I can help with ${demoPlaybook.actions.slice(0, 2).map((action) => action.toLowerCase()).join(" and ")}. Ask me a real customer question.`
        }
      ]);
      setDemoChatInput(demoPlaybook.customerExamples[0] || "");
      setDemoCallStatus({
        tone: "idle",
        message: "Your phone demo is ready. Add or confirm your number, then start a test call."
      });
      setDemoMode("chat");
      setDemoBuilt(true);
      setIsGeneratingDemo(false);
    }, 1850);
  };

  const sendDemoChat = async () => {
    const message = demoChatInput.trim();

    if (!message || !demoBuilt || isDemoTyping) {
      return;
    }

    setDemoMode("chat");
    const nextHistory: ChatMessage[] = [...demoMessages, { role: "user", content: message }];
    setDemoMessages(nextHistory);
    setDemoChatInput("");
    setIsDemoTyping(true);

    try {
      const [reply] = await Promise.all([
        requestDemoChatTurn(message, nextHistory),
        new Promise((resolve) => window.setTimeout(resolve, 260)),
      ]);
      setDemoMessages((current) => [...current, { role: "agent", content: reply }]);
    } catch (_error) {
      setDemoMessages((current) => [
        ...current,
        { role: "agent", content: buildDemoFallbackReply(message) },
      ]);
    } finally {
      setIsDemoTyping(false);
    }
  };

  return (
    <div className="site-shell">
      <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <header className="marketing-nav">
        <a className="brand" href="#home" aria-label="RelayClarity home">
          <img src={relayclarityLogoUrl} alt="RelayClarity" />
        </a>
        <nav className="marketing-links" aria-label="Primary navigation">
          <a href="#home">Home</a>
          <a href="#platform">Platform</a>
          <a href="#demo">Demo</a>
          <a href="#handoff">Launch</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#testimonials">Reviews</a>
        </nav>
        <div className="nav-actions">
          <a className="secondary-button" href="#demo">View demo</a>
          <button className="primary-button" type="button" onClick={openDashboard}>
            Open dashboard
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <motion.div className="hero-media" style={{ y: heroY, scale: heroScale, opacity: heroOpacity }} aria-hidden="true" />
          <motion.div className="hero-grid" style={{ y: heroGridY }} aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow">AI voice agent deployment</p>
            <h1><span>Relay</span><span>Clarity</span></h1>
            <p className="hero-lede">
              Launch AI phone and chat agents with clear answers, qualified requests, and clean human handoffs.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={openDashboard}>
                Open dashboard
              </button>
              <a className="secondary-button light" href="#platform">See workflow</a>
            </div>
          </div>
        </section>

        <section className="section platform-section workflow-scroll-story" id="platform" ref={platformRef} aria-label="Build, test, and launch workflow">
          <WorkflowScrollLine steps={workflow.slice(0, 3).map((step) => step.phase)} />
          <WorkflowPinnedTimeline steps={workflow.slice(0, 3)} />
        </section>

        <section className="section marketing-video-section" aria-label="RelayClarity launch confidence video">
          <Reveal className="marketing-video-shell">
            <video
              ref={marketingVideoRef}
              className="marketing-video"
              src="/relayclarity-launch-video.mp4"
              aria-label="RelayClarity launch confidence marketing video"
              disablePictureInPicture
              muted
              playsInline
              preload="metadata"
            />
          </Reveal>
        </section>

        <section className="section demo-section" id="demo">
          <div className="demo-lab-frame">
            <Reveal className="demo-copy">
              <p className="eyebrow">Try it yourself</p>
              <h2>Live agent preview.</h2>
              <p>
                Add a few details and test the first conversation.
              </p>
              <div className="demo-proof-row" aria-label="What the live preview demonstrates">
                {demoProofCards.map((card, index) => (
                  <article className="demo-proof-card" key={card.title}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{card.title}</strong>
                      <small>{card.detail}</small>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>

            <div className={`demo-lab ${isGeneratingDemo ? "is-loading" : demoBuilt ? "is-generated" : "is-configuring"}`}>
            <AnimatePresence mode="wait">
              {!demoBuilt && !isGeneratingDemo ? (
                <motion.div
                  className="demo-builder"
                  key="demo-setup"
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.96, filter: "blur(8px)" }}
                  transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                >
	                  <div className="builder-topline">
	                    <div>
	                      <strong>Business details</strong>
                        <p>Add the basics and generate a quick live preview.</p>
	                    </div>
	                  </div>

                  <div className="demo-form-grid">
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={demoCompany}
                        onChange={(event) => {
                          setDemoCompany(event.target.value);
                          setDemoBuilt(false);
                        }}
                        placeholder="Northstar Dental"
                      />
                    </label>

                    <label>
                      <span>Type</span>
                      <input
                        type="text"
                        value={demoBusinessType}
                        onChange={(event) => {
                          setDemoBusinessType(event.target.value);
                          setDemoBuilt(false);
                        }}
                        placeholder="Dental clinic"
                      />
                    </label>

                    <label className="is-wide">
                      <span>Agent context</span>
                      <textarea
                        value={demoDescription}
                        onChange={(event) => {
                          setDemoDescription(event.target.value);
                          setDemoBuilt(false);
                        }}
                        placeholder="Opening hours, services, pricing, policies, and common customer questions."
                      />
                    </label>
                  </div>

                  <div className="demo-builder-footer">
                    <button className="demo-generate-button" type="button" onClick={generateDemoAgent}>
                      Generate preview
                    </button>
                  </div>
                </motion.div>
              ) : isGeneratingDemo ? (
                <motion.div
                  className="demo-loading-panel"
                  key="demo-loading"
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  aria-live="polite"
                >
                  <div className="demo-loading-copy">
                    <span>Tailoring demo</span>
                    <strong>Building for {demoCompany || "your business"}</strong>
                    <p>
                      Reading the {demoBusinessType || demoPlaybook.label} profile, shaping approved answers, preparing customer prompts, and tuning the phone test.
                    </p>
                  </div>

                  <div className="demo-loading-visual" aria-hidden="true">
                    <div className="demo-loading-scan">
                      <i />
                      <b />
                      <b />
                      <b />
                    </div>
                    <div className="demo-loading-stream">
                      <span>Business context</span>
                      <span>{demoPlaybook.label}</span>
                      <span>{demoPlaybook.actions[0]}</span>
                      <span>Live chat preview</span>
                      <span>Phone call test</span>
                    </div>
                  </div>

                  <div className="demo-loading-bar" aria-hidden="true"><b /></div>
                </motion.div>
	              ) : (
                <motion.div
                  className="demo-showcase"
                  key="demo-workspace"
                  initial={{ opacity: 0, y: 34, scale: 0.965, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -22, scale: 0.98, filter: "blur(8px)" }}
                  transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="demo-generated-header">
                    <div>
                      <span>Preview workspace</span>
                      <strong>{demoCompany || "Your business"}</strong>
                    </div>
                    <div className="demo-generated-actions">
                      <b>{demoPlaybook.label}</b>
                      <button type="button" onClick={() => setDemoBuilt(false)}>
                        Edit setup
                      </button>
                    </div>
                  </div>

                  <motion.div
                    className="demo-preview-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.32, delay: 0.12 }}
                  >
                    <div className="demo-mode-tabs" role="tablist" aria-label="Demo mode">
                      <button className={demoMode === "chat" ? "is-active" : ""} type="button" onClick={() => setDemoMode("chat")}>
                        Live chat
                      </button>
                      <button className={demoMode === "call" ? "is-active" : ""} type="button" onClick={() => setDemoMode("call")}>
                        Phone call
                      </button>
                    </div>

                    {demoMode === "chat" ? (
                      <div className="demo-chat-panel">
                        <div className="chat-demo">
                          <div className="chat-app-header">
                            <div className="chat-agent-profile">
                              <img src={demoAgentAvatarUrl} alt="" />
                              <div>
                                <span>Live chat</span>
                                <strong>{demoCompany || "AI"} agent</strong>
                              </div>
                            </div>
                            <b>{isDemoTyping ? "Typing" : "Online"}</b>
                          </div>

                          <div className="chat-thread" ref={demoChatThreadRef} aria-live="polite">
                            {demoMessages.map((message, index) => (
                              <article className={`chat-bubble is-${message.role}`} key={`${message.role}-${index}`}>
                                {message.role === "agent" ? <img src={demoAgentAvatarUrl} alt="" /> : null}
                                <div>
                                  <span>{message.role === "agent" ? `${demoCompany || "AI"} agent` : "You"}</span>
                                  <p>{message.content}</p>
                                </div>
                              </article>
                            ))}
                            {isDemoTyping ? (
                              <article className="chat-bubble is-agent is-typing">
                                <img src={demoAgentAvatarUrl} alt="" />
                                <div>
                                  <span>{demoCompany || "AI"} agent</span>
                                  <p><i /><i /><i /></p>
                                </div>
                              </article>
                            ) : null}
                          </div>

                          <div className="demo-prompt-panel">
                            {demoPlaybook.customerExamples.slice(0, 3).map((example) => (
                              <button
                                type="button"
                                key={example}
                                onClick={() => setDemoChatInput(example)}
                              >
                                {example}
                              </button>
                            ))}
                          </div>

                          <div className="chat-composer">
                            <input
                              type="text"
                              value={demoChatInput}
                              onChange={(event) => setDemoChatInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  sendDemoChat();
                                }
                              }}
                              placeholder={demoBuilt ? "Ask the agent a customer question" : "Generate the agent first"}
                            />
                            <button type="button" onClick={sendDemoChat} disabled={!demoBuilt || isDemoTyping}>
                              {isDemoTyping ? "Thinking" : "Send"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="demo-phone-panel">
                        <div className="phone-demo">
                          <div className="phone-call-hero">
                            <span>Phone call</span>
                            <strong>{demoCompany || "AI"} voice agent</strong>
                            <p>{demoPlaybook.actions[0]}</p>
                            <div className="micro-wave" aria-hidden="true"><b /><b /><b /><b /></div>
                          </div>

                          <label className="demo-phone-input">
                            <span>Test phone number</span>
                            <input
                              type="tel"
                              value={demoPhone}
                              onChange={(event) => setDemoPhone(event.target.value)}
                              placeholder="+44 1624 000000"
                            />
                          </label>
                          <p className={`call-result is-${demoCallStatus.tone}`}>{demoCallStatus.message}</p>
                          <button className="primary-button" type="button" onClick={requestDemoCall} disabled={isCallingDemo || !demoBuilt}>
                            {isCallingDemo ? "Calling..." : "Start test call"}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="handoff-section" id="handoff">
          <Reveal className="handoff-showcase">
            <div className="handoff-heading">
              <p className="eyebrow">Pilot to production</p>
              <h2>Move from demo to launch with a clear deployment workflow.</h2>
              <p>
                Each step shows the team what has been tested, approved, monitored, and handed over.
              </p>
            </div>

            <div className="handoff-tabs" role="tablist" aria-label="Launch workflow steps">
              {launchSteps.map((step, index) => (
                <button
                  key={step.label}
                  className={index === activeLaunchStep ? "is-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={index === activeLaunchStep}
                  onClick={() => setActiveLaunchStep(index)}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <div className="handoff-tab-content">
              <div className="handoff-tab-copy">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep.label}
                    className="handoff-step-copy"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <h3>{activeStep.title}</h3>
                    <p>{activeStep.detail}</p>
                    <div className="handoff-step-proof">
                      <span>Why it matters</span>
                      <strong>{activeStep.proof}</strong>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="handoff-actions">
                  <button className="primary-button" type="button" onClick={generateReport}>
                    Generate launch summary
                  </button>
                  <button className="secondary-button" type="button" onClick={openDashboard}>
                    Open dashboard
                  </button>
                </div>

                {report ? (
                  <pre className="report-output">{report}</pre>
                ) : null}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.visual}
                  className="handoff-visual"
                  initial={{ opacity: 0, x: 18, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -14, scale: 0.985 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <img src={activeStep.visual} alt={`${activeStep.label} workflow preview`} />
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </section>

        <section className="section intelligence-section" id="intelligence" aria-label="Dashboard and machine learning">
          <div className="intelligence-glow" aria-hidden="true" />
          <div className="intelligence-shell">
            <motion.div
              className="intelligence-heading"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
            >
              <motion.p className="eyebrow" variants={intelligenceReveal}>Under the hood</motion.p>
              <motion.h2 variants={intelligenceReveal}>Powered by real machine learning.</motion.h2>
              <motion.p variants={intelligenceReveal}>
                Every call is scored and ranked by risk. Scroll to see how the model decides &mdash; and
                how a person always stays in the loop.
              </motion.p>
            </motion.div>

            <MagicBento
              items={[
                {
                  size: "featured",
                  label: "Live queue",
                  title: "Live risk queue",
                  body: "Calls and tickets are scored the moment they happen and ranked by risk, so urgent and sensitive cases rise to the top instead of getting buried.",
                },
                {
                  size: "tall",
                  label: "Transparency",
                  title: "A transparent model",
                  body: "A logistic-regression classifier chosen for auditability. Every prediction returns its class probabilities and the features that drove it.",
                },
                {
                  label: "Explainability",
                  title: "Explained in plain English",
                  body: "No black box. Each score comes with readable reasons and the exact signals it matched, so a human can trust or challenge it.",
                },
                {
                  label: "Oversight",
                  title: "Humans stay in control",
                  body: "The model is advisory — it never auto-closes or auto-routes. Owners review and override every call, and overrides feed the next training round.",
                },
                {
                  label: "Governance",
                  title: "Monitored and governed",
                  body: "Drift detection, fairness checks, and a deployment gate guard every release. A new model only ships once it clears the bar.",
                },
              ]}
            />
          </div>
        </section>

        <section className="section testimonials-section" id="testimonials" ref={customerStoriesRef}>
          <div className="customer-stories-sticky">
            <Reveal className="testimonials-heading">
              <p className="eyebrow">Customer stories</p>
              <h2>What customers are saying about RelayClarity</h2>
            </Reveal>

            <div className="customer-stories-viewport" ref={customerStoriesViewportRef}>
              <motion.div className="customer-stories-rail" ref={customerStoriesRailRef} style={{ x: customerStoriesX }} aria-label="Customer stories">
                {testimonials.map((testimonial, index) => (
                  <motion.article
                    className={`customer-story-card ${testimonial.logo ? "has-logo" : ""} ${index === activeCustomerStoryIndex ? "is-active" : ""}`}
                    key={testimonial.name}
                    initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.62, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                  >
                    <img className="customer-story-image" src={testimonial.image} alt="" loading="lazy" />
                    {testimonial.logo ? (
                      <div className="customer-story-logo-badge">
                        <img src={testimonial.logo} alt={`${testimonial.company} logo`} loading="lazy" />
                      </div>
                    ) : null}
                    <div className="customer-story-scrim" aria-hidden="true" />
                    <div className="customer-story-content">
                      <div className="customer-story-brand" aria-label={testimonial.company}>
                        <span className="customer-story-brand-mark" aria-hidden="true">{testimonial.company.slice(0, 1)}</span>
                        <span className="customer-story-company">{testimonial.company}</span>
                      </div>
                      <h3>{testimonial.storyTitle}</h3>
                      <div className="customer-story-quote">
                        <p>&ldquo;{testimonial.quote}&rdquo;</p>
                        <cite>- {testimonial.name}, {testimonial.role}</cite>
                      </div>
                    </div>
                    <span className="customer-story-action" aria-hidden="true">↗</span>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faqs">
          <div className="faq-shell">
            <Reveal className="faq-stage">
              <p className="eyebrow">FAQs</p>
              <h2>Got questions? We&rsquo;ve got answers.</h2>
            </Reveal>

            <div className="faq-list" aria-label="Frequently asked questions">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;

                return (
                  <motion.article
                    className={`faq-item ${isOpen ? "is-open" : ""}`}
                    key={item.question}
                    initial={{ opacity: 0, y: 26, scale: 0.985, filter: "blur(10px)" }}
                    whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-12% 0px" }}
                    transition={{ duration: 0.68, delay: index * 0.075, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2 }}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaqIndex((current) => current === index ? null : index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.question}</strong>
                      <i aria-hidden="true" />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          id={`faq-answer-${index}`}
                          className="faq-answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <p>{item.answer}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="site-footer" id="footer" aria-label="RelayClarity footer">
          <div className="footer-shell">
            <div className="footer-main">
              <div className="footer-contact">
                <a className="footer-brand" href="#home" aria-label="RelayClarity home">
                  <img src={relayclarityLogoUrl} alt="RelayClarity" />
                </a>
                <div className="footer-contact-bottom">
                  <span>Get in touch</span>
                  <a href="tel:+441624000000">+44 1624 000000</a>
                  <div className="footer-social" aria-label="Social links">
                    {footerSocialLinks.map((link) => (
                      <a href={link.href} key={link.label} aria-label={link.label}>
                        <span className={"footer-social-icon is-" + link.icon} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <nav className="footer-column-grid" aria-label="Footer navigation">
                {footerColumns.map((column) => (
                  <div className="footer-column" key={column.title}>
                    <h3>{column.title}</h3>
                    {column.links.map((link) => (
                      <a href={link.href} key={link.label}>{link.label}</a>
                    ))}
                  </div>
                ))}
              </nav>
            </div>

            <div className="footer-bottom">
              <p>&copy; 2026 RelayClarity. All rights reserved.</p>
              <div className="footer-meta-links" aria-label="Legal links">
                {footerLegalLinks.map((link) => (
                  <a href={link.href} key={link.label}>{link.label}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function AuthLoading() {
  return (
    <main className="auth-shell">
      <section className="auth-card is-loading" aria-label="Checking account session">
        <img src={relayclarityLogoUrl} alt="RelayClarity" />
        <div className="auth-spinner" aria-hidden="true" />
        <p>Checking your account session.</p>
      </section>
    </main>
  );
}

function AuthScreen({
  googleAuthAvailable,
  onBack,
  onSignedIn,
  initialMode = "login",
}: {
  googleAuthAvailable: boolean;
  onBack: () => void;
  onSignedIn: (payload: AuthPayload) => void;
  initialMode?: "login" | "signup";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    setMode(initialMode);
    setStatus("");
  }, [initialMode]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const payload = await fetchJsonFromApi<AuthPayload>("/api/auth/email", {
        method: "POST",
        body: JSON.stringify({ email, password, mode }),
      });
      onSignedIn(payload);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogleLogin = () => {
    if (!googleAuthAvailable) {
      setStatus("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.");
      return;
    }

    window.location.assign(apiPath(apiBaseCandidates[0] || "", "/api/auth/google/start"));
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-label="Sign in to RelayClarity">
        <div className="auth-panel">
          <div className="auth-copy">
            <p className="eyebrow">Workspace access</p>
            <h1>{isSignup ? "Create your workspace." : "Welcome back."}</h1>
            <p>
              {isSignup
                ? "Create a new account, then complete the setup flow before anything is saved to the dashboard."
                : "Sign in to continue building and launching your AI agent workspace."}
            </p>
          </div>

        </div>

        <div className="auth-form-panel">
          <button className="quiet-button auth-back" type="button" onClick={onBack}>
            Back to site
          </button>
          <img className="auth-logo" src={relayclarityLogoUrl} alt="RelayClarity" />
          <div className="auth-form-heading">
            <span className="auth-kicker">{isSignup ? "Sign up" : "Sign in"}</span>
            <h2>{isSignup ? "Start setup" : "Open dashboard"}</h2>
            <p>{isSignup ? "Use Google or create a new email account." : "Use Google or continue with your email and password."}</p>
          </div>

          <button className="google-button" type="button" onClick={startGoogleLogin}>
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.53 5.53 0 0 1-2.39 3.63v2.96h3.87c2.26-2.08 3.55-5.15 3.55-8.69Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-2.96c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.05A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.25 14.31a7.21 7.21 0 0 1 0-4.62V6.64H1.26a12 12 0 0 0 0 10.72l3.99-3.05Z" />
              <path fill="#EA4335" d="M12 4.72c1.76 0 3.34.61 4.59 1.79l3.43-3.43A11.51 11.51 0 0 0 12 0 12 12 0 0 0 1.26 6.64l3.99 3.05C6.2 6.84 8.86 4.72 12 4.72Z" />
            </svg>
            {isSignup ? "Continue with Google" : "Continue with Google"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form className="auth-form" onSubmit={handleEmailSubmit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
            </label>
            <button className="dark-button auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isSignup ? "Creating account..." : "Opening dashboard..."
                : isSignup ? "Create account and start setup" : "Continue with email and password"}
            </button>
          </form>

          <button
            className="quiet-button"
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setStatus("");
            }}
          >
            {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>

          {status ? <p className="auth-status">{status}</p> : null}
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  user,
  onSignOut,
  onProjectComplete
}: {
  user: AuthUser;
  onSignOut: () => void;
  onProjectComplete: (project: Project) => void;
}) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [businessTypeDraft, setBusinessTypeDraft] = useState("");
  const [confirmedBusinessType, setConfirmedBusinessType] = useState("");
  const hasBusinessType = confirmedBusinessType.trim().length > 0;
  const businessSuggestionQuery = businessTypeDraft.trim();
  const businessSuggestions = useMemo(() => getBusinessSuggestions(businessSuggestionQuery), [businessSuggestionQuery]);
  const confirmedMatch = useMemo(() => hasBusinessType ? getBusinessMatch(confirmedBusinessType) : null, [confirmedBusinessType, hasBusinessType]);
  const playbook = confirmedMatch?.playbook || fallbackPlaybook;
  const [connectors, setConnectors] = useState(() => tailorConnectors(fallbackPlaybook));
  const connectorsRef = useRef(connectors);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [latency, setLatency] = useState(720);
  const [bargeIn, setBargeIn] = useState(true);
  const [step, setStep] = useState(() => {
    const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
    return Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= 5 ? requestedStep : 0;
  });
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [activeCapabilityCategory, setActiveCapabilityCategory] = useState("");
  const [focusedCapabilityTitle, setFocusedCapabilityTitle] = useState("");
  const [useCase, setUseCase] = useState(playbook.missions[0]);
  const [agentName, setAgentName] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [agentKnowledge, setAgentKnowledge] = useState("");
  const [agentHandoff, setAgentHandoff] = useState("");
  const [workflowLayout, setWorkflowLayout] = useState<Record<string, { x: number; y: number }>>({
    trigger: { x: 32, y: 300 },
    agentIntake: { x: 250, y: 132 },
    agentAnswer: { x: 250, y: 300 },
    agentHandoff: { x: 250, y: 468 },
    condition: { x: 560, y: 300 },
    actionTeam: { x: 836, y: 168 },
    actionRecord: { x: 836, y: 432 }
  });
  const [customAgents, setCustomAgents] = useState<{ id: string; name: string; job: string }[]>([]);
  const [customApps, setCustomApps] = useState<{ id: string; agentId: string; name: string; detail: string }[]>([]);
  const [customActions, setCustomActions] = useState<{ id: string; agentId: string; name: string; detail: string }[]>([]);
  const [selectedWorkflowAgentId, setSelectedWorkflowAgentId] = useState("agentIntake");
  const [hiddenWorkflowAgentIds, setHiddenWorkflowAgentIds] = useState<string[]>([]);
  const [workflowAgentNameEdits, setWorkflowAgentNameEdits] = useState<Record<string, string>>({});
  const [workflowNodeEdits, setWorkflowNodeEdits] = useState<Record<string, { title?: string; detail?: string }>>({});
  const [workflowNodeOffsets, setWorkflowNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedWorkflowNodeIds, setSelectedWorkflowNodeIds] = useState<string[]>([]);
  const [inspectedWorkflowNodeId, setInspectedWorkflowNodeId] = useState<string | null>(null);
  const [workflowMarquee, setWorkflowMarquee] = useState<{
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [workflowContextMenu, setWorkflowContextMenu] = useState<{
    x: number;
    y: number;
    target: "board" | "node" | "agent";
    nodeId?: string;
    agentId?: string;
  } | null>(null);
  const [workflowCopyToast, setWorkflowCopyToast] = useState(false);
  const workflowCopyToastTimer = useRef<number | null>(null);
  const [extraWorkflowConnectorKeys, setExtraWorkflowConnectorKeys] = useState<Record<string, string[]>>({});
  const [isWorkflowAddDrawerOpen, setIsWorkflowAddDrawerOpen] = useState(false);
  const [workflowBoardSize, setWorkflowBoardSize] = useState({ width: 1100, height: 700 });
  const [workflowNodeRects, setWorkflowNodeRects] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const [activeWorkflowNodeDrag, setActiveWorkflowNodeDrag] = useState<{
    nodeId: string;
    ids: string[];
    startX: number;
    startY: number;
    origins: Record<string, { x: number; y: number }>;
    moved: boolean;
  } | null>(null);
  const [workflowAddPicker, setWorkflowAddPicker] = useState<"app" | "action" | null>(null);
  const [workflowAddTab, setWorkflowAddTab] = useState(0);
  const [workflowClipboard, setWorkflowClipboard] = useState<{ kind: "app" | "action"; name: string; detail: string; x: number; y: number }[]>([]);
  const [workflowDrag, setWorkflowDrag] = useState<{ id: string; width: number } | null>(null);
  const workflowCanvasRef = useRef<HTMLDivElement | null>(null);
  const [launchChannel, setLaunchChannel] = useState(playbook.channels[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [confirmedVoiceId, setConfirmedVoiceId] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceStability, setVoiceStability] = useState(58);
  const [voiceSimilarity, setVoiceSimilarity] = useState(75);
  const [voiceStyle, setVoiceStyle] = useState(16);
  const [voiceSpeakerBoost, setVoiceSpeakerBoost] = useState(true);
  const [voicePreviewStatus, setVoicePreviewStatus] = useState("Ready to preview with ElevenLabs.");
  const [voicePreviewCompleted, setVoicePreviewCompleted] = useState(false);
  const [realVoicePreviewKey, setRealVoicePreviewKey] = useState("");
  const [voiceGenerationCount, setVoiceGenerationCount] = useState(0);
  const [isRegeneratingVoice, setIsRegeneratingVoice] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedAudioUrlRef = useRef("");
  const generatedVoiceSettingsKeyRef = useRef("");
  const [connectorCategory, setConnectorCategory] = useState<ConnectorGroup>("core");
  const [activeConnectorKey, setActiveConnectorKey] = useState("crm");
  const [report, setReport] = useState("Prepare the launch pack when setup, connectors, voice tuning, and evaluation evidence are ready.");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneContactNumber, setPhoneContactNumber] = useState("");
  const [otherPlatformNote, setOtherPlatformNote] = useState("");
  const [setupIntegrationCategory, setSetupIntegrationCategory] = useState<ConnectorGroup>("core");
  const [isSetupIntegrationModalOpen, setIsSetupIntegrationModalOpen] = useState(false);
  const [setupLoginIntegration, setSetupLoginIntegration] = useState<{ company: string; type: string; logoUrl: string } | null>(null);
  const [setupLoginIntegrationStage, setSetupLoginIntegrationStage] = useState<"credentials" | "connecting" | "success" | "blocked">("credentials");
  const [setupLoginIntegrationEmail, setSetupLoginIntegrationEmail] = useState("");
  const [setupLoginIntegrationPassword, setSetupLoginIntegrationPassword] = useState("");
  const setupIntegrationLoginTimers = useRef<number[]>([]);
  const [launchRequestSubmitted, setLaunchRequestSubmitted] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [integrationCatalog, setIntegrationCatalog] = useState<IntegrationProvider[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [demoAuthConnector, setDemoAuthConnector] = useState<Connector | null>(null);
  const [demoAuthEmail, setDemoAuthEmail] = useState("");
  const [demoApprovalCode, setDemoApprovalCode] = useState("");
  const [testRunState, setTestRunState] = useState<TestRunState>("idle");
  const [activeRunIndex, setActiveRunIndex] = useState(0);
  const [completedRunCount, setCompletedRunCount] = useState(0);
  const [runningChecks, setRunningChecks] = useState<TestScenarioResult["checks"] | null>(null);
  const [revealedCheckCount, setRevealedCheckCount] = useState(0);
  const [realResults, setRealResults] = useState<(TestScenarioResult | null)[]>([]);
  const [testMode, setTestMode] = useState<"real" | "simulated" | null>(null);
  const testRunTokenRef = useRef(0);
  const [reviewedAgentIds, setReviewedAgentIds] = useState<string[]>(["agentIntake"]);
  const [agentBuildComplete, setAgentBuildComplete] = useState(false);
  const [agentBuildStage, setAgentBuildStage] = useState(0);
  const [lastBuiltAgentKey, setLastBuiltAgentKey] = useState("");
  const testRunTimers = useRef<number[]>([]);
  const autoStartedTestKeyRef = useRef("");
  const setupIntegrationCategories = [
    { id: "core", label: "Core" },
    { id: "operations", label: "Operations" },
    { id: "growth", label: "Growth" }
  ] as const;
  const setupAddIntegrationCatalog: Record<ConnectorGroup, Array<{ company: string; type: string; logoUrl: string }>> = {
    core: [
      { company: "Salesforce", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=salesforce.com&sz=128" },
      { company: "Pipedrive", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=pipedrive.com&sz=128" },
      { company: "Zoho CRM", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=zoho.com&sz=128" },
      { company: "Freshsales", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" },
      { company: "Genesys Cloud CX", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=genesys.com&sz=128" },
      { company: "Five9", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=five9.com&sz=128" },
      { company: "NICE CXone", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=nice.com&sz=128" },
      { company: "Talkdesk", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=talkdesk.com&sz=128" },
      { company: "Twilio Flex", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=twilio.com&sz=128" },
      { company: "Confluence", type: "Knowledge", logoUrl: "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128" }
    ],
    operations: [
      { company: "Zendesk", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=zendesk.com&sz=128" },
      { company: "Freshdesk", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" },
      { company: "Intercom", type: "Support", logoUrl: "https://www.google.com/s2/favicons?domain=intercom.com&sz=128" },
      { company: "ServiceNow", type: "Service management", logoUrl: "https://www.google.com/s2/favicons?domain=servicenow.com&sz=128" },
      { company: "Jira Service Management", type: "Service desk", logoUrl: "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128" },
      { company: "Help Scout", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=helpscout.com&sz=128" },
      { company: "Front", type: "Shared inbox", logoUrl: "https://www.google.com/s2/favicons?domain=front.com&sz=128" },
      { company: "Freshservice", type: "ITSM", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" }
    ],
    growth: [
      { company: "Segment", type: "Customer data", logoUrl: "https://www.google.com/s2/favicons?domain=segment.com&sz=128" },
      { company: "Amplitude", type: "Product analytics", logoUrl: "https://www.google.com/s2/favicons?domain=amplitude.com&sz=128" },
      { company: "Mixpanel", type: "Product analytics", logoUrl: "https://www.google.com/s2/favicons?domain=mixpanel.com&sz=128" },
      { company: "Looker", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=looker.com&sz=128" },
      { company: "Tableau", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=tableau.com&sz=128" },
      { company: "Power BI", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=powerbi.microsoft.com&sz=128" },
      { company: "Domo", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=domo.com&sz=128" },
      { company: "Snowflake", type: "Warehouse", logoUrl: "https://www.google.com/s2/favicons?domain=snowflake.com&sz=128" }
    ]
  };
  const visibleSetupAddIntegrationCatalog = setupAddIntegrationCatalog[setupIntegrationCategory];
  const clearSetupIntegrationLoginTimers = () => {
    setupIntegrationLoginTimers.current.forEach((timer) => window.clearTimeout(timer));
    setupIntegrationLoginTimers.current = [];
  };
  const closeSetupIntegrationModal = () => {
    clearSetupIntegrationLoginTimers();
    setIsSetupIntegrationModalOpen(false);
    setSetupLoginIntegration(null);
    setSetupLoginIntegrationStage("credentials");
    setSetupLoginIntegrationEmail("");
    setSetupLoginIntegrationPassword("");
  };
  const startSetupIntegrationLogin = (integration: { company: string; type: string; logoUrl: string }) => {
    clearSetupIntegrationLoginTimers();
    setSetupLoginIntegration(integration);
    setSetupLoginIntegrationStage("credentials");
    setSetupLoginIntegrationEmail("");
    setSetupLoginIntegrationPassword("");
  };
  const submitSetupIntegrationLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!setupLoginIntegration || !setupLoginIntegrationEmail.trim()) {
      return;
    }

    clearSetupIntegrationLoginTimers();
    setSetupLoginIntegrationStage("connecting");

    try {
      const connectorKey = connectorKeyForIntegration(setupLoginIntegration.type, setupIntegrationCategory);
      const connection = await fetchJsonFromApi<IntegrationConnectResult>("/api/integrations/connect", {
        method: "POST",
        body: JSON.stringify({
          providerId: providerIdFromName(setupLoginIntegration.company, connectorKey),
          providerName: setupLoginIntegration.company,
          category: connectorKey,
          workspaceName,
          mode: "sandbox"
        })
      });

      setConnectors((current) => current.map((connector) =>
        connector.key === connectorKey ? {
          ...connector,
          providerId: connection.providerId,
          provider: connection.name,
          logoUrl: setupLoginIntegration.logoUrl || connection.logoUrl || connector.logoUrl,
          connected: true,
          connectionMode: connection.mode,
          connectionMessage: connection.message,
          scopes: connection.scopes,
          testStatus: "Passed",
          testChecks: [
            { name: "Authentication", status: "passed" },
            { name: "Scopes", status: "passed" },
            { name: "Provider account", status: "passed" },
            { name: "Dashboard handoff", status: "passed" }
          ],
          lastCheckedAt: connection.connectedAt
        } : connector
      ));
      setActiveConnectorKey(connectorKey);
      setOtherPlatformNote(setupLoginIntegration.company + " (" + setupLoginIntegration.type + ")");
      setConnectionStatus(`${connection.name} connected in ${connection.mode} mode.`);
      setSetupLoginIntegrationStage("success");

      const closeTimer = window.setTimeout(closeSetupIntegrationModal, 900);
      setupIntegrationLoginTimers.current = [closeTimer];
    } catch (error) {
      setSetupLoginIntegrationStage("blocked");
      setConnectionStatus(error instanceof Error ? error.message : "Unable to connect integration.");
    }
  };
  const confirmedBusinessLabel = confirmedBusinessType.trim().length > 2 ? confirmedBusinessType.trim() : "business";
  const confirmedWorkspaceName = workspaceName.trim() || confirmedBusinessLabel;
  const zoomAiCapabilities = useMemo(
    () => zoomAiCapabilitiesFor(playbook, confirmedBusinessType),
    [playbook, confirmedBusinessType]
  );
  const groupedZoomAiCapabilities = useMemo(() => {
    const groups: { title: string; items: GoalOption[] }[] = [];

    zoomAiCapabilities.forEach((capability) => {
      const title = capability.category || "Zoom AI capabilities";
      const existingGroup = groups.find((group) => group.title === title);

      if (existingGroup) {
        existingGroup.items.push(capability);
        return;
      }

      groups.push({ title, items: [capability] });
    });

    return groups;
  }, [zoomAiCapabilities]);
  const activeCapabilityGroup = useMemo(() => {
    return groupedZoomAiCapabilities.find((group) => group.title === activeCapabilityCategory) || groupedZoomAiCapabilities[0];
  }, [activeCapabilityCategory, groupedZoomAiCapabilities]);
  const focusedCapability = useMemo(() => {
    return (
      activeCapabilityGroup?.items.find((capability) => capability.title === focusedCapabilityTitle) ||
      activeCapabilityGroup?.items[0] ||
      zoomAiCapabilities[0]
    );
  }, [activeCapabilityGroup, focusedCapabilityTitle, zoomAiCapabilities]);
  const setupSteps = ["Workspace", "Systems", "Voice", "Agent", "Tests", "Confirm"];
  const selectedZoomCapabilityCount = selectedCapabilities.length;
  const trimmedWebsite = websiteUrl.trim();
  const trimmedPhone = phoneContactNumber.trim();
  const isValidWebsite = ((): boolean => {
    if (!trimmedWebsite) return false;
    if (/\s/.test(trimmedWebsite)) return false;
    const candidate = /^https?:\/\//i.test(trimmedWebsite) ? trimmedWebsite : `https://${trimmedWebsite}`;
    try {
      const host = new URL(candidate).hostname;
      return host.length <= 253 && /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host);
    } catch {
      return false;
    }
  })();
  const phoneDigits = trimmedPhone.replace(/\D/g, "");
  const isValidPhone =
    trimmedPhone.length > 0 &&
    /^[+0-9()\-.\s]+$/.test(trimmedPhone) &&
    phoneDigits.length >= 7 &&
    phoneDigits.length <= 15;
  const websiteError = trimmedWebsite.length > 0 && !isValidWebsite;
  const phoneError = trimmedPhone.length > 0 && !isValidPhone;
  const hasLaunchRequestDetails = isValidWebsite && isValidPhone;

  const realConnectedConnectors = connectors.filter((connector) => connector.connected && (connector.connectionMode === "oauth" || connector.connectionMode === "sandbox"));
  const connectedCount = realConnectedConnectors.length;
  const systemsComplete = connectedCount > 0;
  const selectedVoice = elevenLabsVoices.find((voice) => voice.id === selectedVoiceId) || null;
  const voiceSettingsKey = selectedVoice ? [
    selectedVoice.id,
    voiceSpeed,
    voiceStability,
    voiceSimilarity,
    voiceStyle,
    voiceSpeakerBoost ? "speaker-boost" : "no-speaker-boost"
  ].join("::") : "";
  const realVoiceReady = Boolean(selectedVoice && realVoicePreviewKey === voiceSettingsKey);
  const voiceConfirmed = Boolean(selectedVoice && confirmedVoiceId === selectedVoice.id);
  const productionVoiceReady = voiceConfirmed;
  const agentBuildKey = [
    confirmedWorkspaceName,
    confirmedBusinessType,
    selectedCapabilities.join("|"),
    realConnectedConnectors.map((connector) => `${connector.key}:${connector.provider}`).join("|"),
    selectedVoiceId,
    voiceSpeed,
    voiceStability,
    voiceSimilarity,
    voiceStyle,
    voiceSpeakerBoost ? "speaker-boost" : "no-speaker-boost",
    latency,
    bargeIn ? "barge" : "no-barge"
  ].join("::");
  const agentsComplete = agentBuildComplete && lastBuiltAgentKey === agentBuildKey;
  const agentBuildStepClass = (index: number) => {
    if (agentBuildStage > index) {
      return "is-complete";
    }

    if (agentBuildStage === index) {
      return "is-active";
    }

    return "";
  };
  const previewResults = useMemo<TestScenarioResult[]>(() => {
    const hasRequiredSystem = realConnectedConnectors.length > 0;
    const hasKnowledgeSystem = realConnectedConnectors.some((connector) => connector.key === "knowledge");
    const hasHandoffSystem = realConnectedConnectors.some((connector) => ["crm", "helpdesk", "telephony"].includes(connector.key));
    const hasSafetyCoverage = selectedCapabilities.some((capability) => /fallback|quality|assist|routing|wrap/i.test(capability));
    const hasAgentInstructions = Boolean(agentName.trim() && agentPurpose.trim() && agentKnowledge.trim() && agentHandoff.trim());

    return playbook.tests.map((scenario, index) => {
      const checks = [
        { name: "Connected production system", passed: hasRequiredSystem },
        { name: "Confirmed caller voice", passed: productionVoiceReady },
        { name: "Generated agent workspace", passed: agentsComplete },
        {
          name: index === 0 ? "Handoff path available" : index === 1 ? "Knowledge path available" : "Guardrail path available",
          passed: index === 0 ? hasHandoffSystem : index === 1 ? hasKnowledgeSystem || hasRequiredSystem : hasSafetyCoverage || Boolean(agentHandoff.trim())
        },
        { name: "Agent instructions complete", passed: hasAgentInstructions }
      ];
      const passedChecks = checks.filter((check) => check.passed).length;
      const setupScore = Math.round((passedChecks / checks.length) * 100);
      const score = Math.min(99, Math.round((scenario.score * 0.58) + (setupScore * 0.42)));
      const passed = score >= 84 && checks.every((check) => check.passed);
      const failedCheck = checks.find((check) => !check.passed)?.name;

      return {
        score,
        passed,
        checks,
        result: passed
          ? scenario.result
          : `${failedCheck || "Launch gate"} needs setup before this scenario can pass.`
      };
    });
  }, [
    agentHandoff,
    agentKnowledge,
    agentName,
    agentPurpose,
    agentsComplete,
    playbook.tests,
    productionVoiceReady,
    realConnectedConnectors,
    selectedCapabilities
  ]);
  const scenarioResults = useMemo<TestScenarioResult[]>(
    () => playbook.tests.map((_, index) => realResults[index] ?? previewResults[index]),
    [playbook.tests, previewResults, realResults]
  );
  const testsPassed = scenarioResults.length > 0 && scenarioResults.every((result) => result.passed);
  const testsComplete = testRunState === "complete" && completedRunCount >= playbook.tests.length && testsPassed;
  const stepCompletion = [
    hasBusinessType && selectedZoomCapabilityCount > 0,
    systemsComplete,
    productionVoiceReady,
    agentsComplete,
    testsComplete,
    hasLaunchRequestDetails
  ];
  const canContinue = stepCompletion[step] ?? false;
  const firstIncompleteStep = stepCompletion.findIndex((isComplete) => !isComplete);
  const furthestAvailableStep = firstIncompleteStep === -1 ? setupSteps.length - 1 : firstIncompleteStep;
  const canOpenStep = (index: number) => index <= furthestAvailableStep;
  const continueRequirement = [
    "Confirm the business type and select at least one Zoom AI capability.",
    `Connect at least one system (${connectedCount} connected).`,
    "Choose and confirm a voice. Playing a preview is optional.",
    "Wait for RelayClarity to generate the agent workspace.",
    "Run the launch tests before continuing.",
    "Enter a valid website URL and phone number."
  ][step];
  const readiness = Math.min(98, 28 + Math.round((connectedCount / connectors.length) * 48) + (latency <= 800 && bargeIn ? 18 : 10));
  const selectedScenario = playbook.tests[scenarioIndex] || playbook.tests[0] || fallbackPlaybook.tests[0];
  const selectedScenarioResult = scenarioResults[scenarioIndex] || scenarioResults[0] || {
    score: selectedScenario.score,
    passed: false,
    result: selectedScenario.result,
    checks: []
  };
  const isActiveRunningScenario = testRunState === "running" && scenarioIndex === activeRunIndex && runningChecks !== null;
  const detailChecks = isActiveRunningScenario
    ? (runningChecks || []).slice(0, revealedCheckCount)
    : selectedScenarioResult.checks || [];
  const detailScoreLabel = `${selectedScenarioResult.score}%`;
  const detailStatusLabel = selectedScenarioResult.passed ? "Scenario passed" : "Needs setup";
  const launchGateScore = useMemo(() => {
    const scenarioScores = playbook.tests.length
      ? scenarioResults.reduce((total, result) => total + result.score, 0) / playbook.tests.length
      : selectedScenarioResult.score;

    return Math.round(scenarioScores * 0.74 + readiness * 0.26);
  }, [playbook.tests.length, readiness, scenarioResults, selectedScenarioResult.score]);
  const visibleConnectors = connectors.filter((connector) => connectorGroup(connector.key) === connectorCategory);
  const activeConnector = connectors.find((connector) => connector.key === activeConnectorKey) || connectors[0];
  useEffect(() => {
    connectorsRef.current = connectors;
  }, [connectors]);

  useEffect(() => {
    if (!canOpenStep(step)) {
      setStep(furthestAvailableStep);
    }
  }, [furthestAvailableStep, step]);

  useEffect(() => {
    setConnectors((current) => tailorConnectors(playbook, current));
    setUseCase((current) => firstAvailable(current, playbook.missions));
    setLaunchChannel((current) => firstAvailable(current, playbook.channels));
    setAgentName((current) => current || `${playbook.label} assistant`);
    setAgentPurpose((current) => current || playbook.missions[0] || "");
    setAgentKnowledge((current) => current || `Use ${playbook.connectorProviders.knowledge || "the knowledge base"}, policies, FAQs, and customer records for ${confirmedBusinessType || playbook.label}.`);
    setAgentHandoff((current) => current || playbook.guardrails[0] || "Escalate urgent, sensitive, or unclear requests to the team.");
    setSelectedGoals((current) => {
      const validGoals = current.filter((goal) => playbook.goals.some((option) => option.title === goal));
      return validGoals.length > 0 ? validGoals : playbook.goals.slice(0, 2).map((goal) => goal.title);
    });
    setSelectedCapabilities([]);
    setScenarioIndex(0);
    setTestRunState("idle");
    setActiveRunIndex(0);
    setCompletedRunCount(0);
    setRealResults([]);
    setTestMode(null);
    testRunTokenRef.current += 1;
    setSelectedWorkflowAgentId("agentIntake");
    setReviewedAgentIds(["agentIntake"]);
    setHiddenWorkflowAgentIds([]);
    setWorkflowNodeEdits({});
    setWorkflowNodeOffsets({});
    setAgentBuildComplete(false);
    setAgentBuildStage(0);
    setLastBuiltAgentKey("");
  }, [playbook]);

  useEffect(() => {
    if (lastBuiltAgentKey && lastBuiltAgentKey !== agentBuildKey) {
      setAgentBuildComplete(false);
      setAgentBuildStage(0);
    }
  }, [agentBuildKey, lastBuiltAgentKey]);

  useEffect(() => {
    if (step !== 3 || !productionVoiceReady || !systemsComplete || !hasBusinessType) {
      return;
    }

    if (agentBuildComplete && lastBuiltAgentKey === agentBuildKey) {
      return;
    }

    setAgentBuildComplete(false);
    setAgentBuildStage(0);

    const stageTimers = [
      window.setTimeout(() => setAgentBuildStage(1), 900),
      window.setTimeout(() => setAgentBuildStage(2), 1900),
      window.setTimeout(() => setAgentBuildStage(3), 3000),
      window.setTimeout(() => setAgentBuildStage(4), 4100)
    ];
    const buildTimer = window.setTimeout(() => {
      setLastBuiltAgentKey(agentBuildKey);
      setAgentBuildComplete(true);
      setReviewedAgentIds((current) => current.includes("agentIntake") ? current : ["agentIntake", ...current]);
    }, 5000);

    return () => {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(buildTimer);
    };
  }, [agentBuildComplete, agentBuildKey, hasBusinessType, lastBuiltAgentKey, productionVoiceReady, step, systemsComplete]);

  const clearTestRunTimers = () => {
    testRunTimers.current.forEach((timer) => window.clearTimeout(timer));
    testRunTimers.current = [];
  };

  useEffect(() => clearTestRunTimers, []);

  useEffect(() => {
    let cancelled = false;

    fetchJsonFromApi<IntegrationCatalogPayload>("/api/integrations/catalog")
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const providers = payload.providers || [];
        const connected = payload.connected || [];

        setIntegrationCatalog(payload.providers || []);
        setConnectors((current) => current.map((connector) => ({
          ...connector,
          ...providerMetadata(connector.provider, connector.key, providers),
          ...connectedStateForConnector(connector, connected)
        })));
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionStatus("Integration API is offline. Start the backend to connect and test systems.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!integrationCatalog.length) {
      return;
    }

    setConnectors((current) => current.map((connector) => ({
      ...connector,
      ...providerMetadata(connector.provider, connector.key, integrationCatalog)
    })));
  }, [integrationCatalog, playbook]);

  useEffect(() => {
    const handleIntegrationMessage = async (event: MessageEvent<{ type?: string; provider?: string; status?: string }>) => {
      if (event.data?.type !== "relayclarity.integration.connected" || !event.data.provider) {
        return;
      }

      if (event.data.status !== "connected") {
        setConnectionStatus(`${event.data.provider} authorization returned without a completed connection.`);
        return;
      }

      const connector = connectorsRef.current.find((item) => item.providerId === event.data.provider);

      if (!connector) {
        setConnectionStatus(`${event.data.provider} authorization completed, but the dashboard could not match it to a connector.`);
        return;
      }

      setConnectionStatus(`${connector.provider} authorization completed. Verifying account access...`);

      try {
        const testResult = await testConnectorLink(event.data.provider, connector.key);

        if (!testResult.ok) {
          setConnectionStatus(`${testResult.provider} authorization completed, but account verification failed.`);
          return;
        }

        setConnectors((current) => current.map((item) =>
          item.providerId === event.data.provider ? {
            ...item,
            connected: true,
            connectionMode: "oauth",
            connectionMessage: `${item.provider} OAuth authorization completed and account access verified.`,
            testStatus: "Passed"
          } : item
        ));
        setConnectionStatus(`${testResult.provider} connected and verified.`);
      } catch (error) {
        setConnectionStatus(error instanceof Error ? error.message : `${connector.provider} verification failed.`);
      }
    };

    window.addEventListener("message", handleIntegrationMessage);
    return () => window.removeEventListener("message", handleIntegrationMessage);
  }, []);

  useEffect(() => {
    if (!hasBusinessType) {
      setIsTailoring(false);
      return;
    }
    setIsTailoring(true);
    const tailoringTimer = window.setTimeout(() => setIsTailoring(false), 520);
    return () => window.clearTimeout(tailoringTimer);
  }, [confirmedBusinessType, hasBusinessType]);

  const selectBusinessSuggestion = (suggestion: BusinessSuggestion) => {
    const nextBusinessType = suggestion.label || suggestion.entry?.title || suggestion.playbook.label;

    setBusinessTypeDraft(nextBusinessType);
    setConfirmedBusinessType(nextBusinessType);
  };

  const connectActiveConnector = async () => {
    setIsConnecting(true);
    setConnectionStatus(`Connecting ${activeConnector.provider}...`);
    setConnectors((current) =>
      current.map((connector) =>
        connector.key === activeConnector.key ? {
          ...connector,
          connectionMessage: `Checking real connection support for ${connector.provider}...`,
          testStatus: "Checking"
        } : connector
      )
    );

    try {
      const connection = await fetchJsonFromApi<IntegrationConnectResult>("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: activeConnector.providerId,
          providerName: activeConnector.provider,
          category: activeConnector.key,
          workspaceName
        })
      });

      if (connection.authUrl) {
        window.open(connection.authUrl, "relayclarity-integration-oauth", "width=720,height=760");
        setConnectionStatus(`${connection.name} authorization opened. Finish approval in the popup to complete the connection.`);
        setConnectors((current) =>
          current.map((connector) =>
            connector.key === activeConnector.key ? {
              ...connector,
              providerId: connection.providerId,
              provider: connection.name,
              logoUrl: connection.logoUrl,
              connectionMode: connection.mode,
              connectionMessage: connection.message,
              scopes: connection.scopes,
              testStatus: "Awaiting OAuth"
            } : connector
          )
        );
        return;
      }

      setConnectors((current) =>
        current.map((connector) =>
          connector.key === activeConnector.key ? {
            ...connector,
            providerId: connection.providerId,
            provider: connection.name,
            logoUrl: connection.logoUrl || connector.logoUrl,
            connected: true,
            connectionMode: connection.mode,
            connectionMessage: connection.message,
            scopes: connection.scopes,
            testStatus: "Passed",
            testChecks: [
              { name: "Authentication", status: "passed" },
              { name: "Scopes", status: "passed" },
              { name: "Provider account", status: "passed" },
              { name: "Dashboard handoff", status: "passed" }
            ],
            lastCheckedAt: connection.connectedAt
          } : connector
        )
      );
      setConnectionStatus(`${connection.name} connected in ${connection.mode} mode.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect integration.";
      setConnectionStatus(`${activeConnector.provider} was not linked. ${message}`);
      setConnectors((current) =>
        current.map((connector) =>
          connector.key === activeConnector.key ? {
            ...connector,
            connected: false,
            connectionMode: undefined,
            connectionMessage: message,
            scopes: [],
            testStatus: "Setup required",
            testChecks: [
              { name: "Authentication", status: "missing" },
              { name: "Provider account", status: "blocked" },
              { name: "Agent workflow", status: "blocked" }
            ]
          } : connector
        )
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const closeDemoAuth = () => {
    setDemoAuthConnector(null);
    setDemoAuthEmail("");
    setDemoApprovalCode("");
  };

  const authorizeDemoConnector = () => {
    if (!demoAuthConnector || !demoAuthEmail.trim() || !demoApprovalCode.trim()) {
      return;
    }

    setConnectors((current) =>
      current.map((connector) =>
        connector.key === demoAuthConnector.key ? {
          ...connector,
          connected: false,
          connectionMode: undefined,
          connectionMessage: "Demo authorization is disabled. Configure a real provider connector before launch.",
          scopes: [],
          testStatus: "Setup required",
          testChecks: [
            { name: "Authentication", status: "missing" },
            { name: "Provider account", status: "blocked" },
            { name: "Agent workflow", status: "blocked" }
          ]
        } : connector
      )
    );
    setConnectionStatus(`${demoAuthConnector.provider} was not connected. Demo authorization is disabled for the agent workflow.`);
    closeDemoAuth();
  };

  const testConnectorLink = async (providerId: string, connectorKey: string) => {
    const result = await fetchJsonFromApi<IntegrationTestResult>(
      `/api/integrations/${encodeURIComponent(providerId)}/test`,
      { method: "POST" }
    );

    setConnectors((current) =>
      current.map((connector) =>
        connector.key === connectorKey ? {
          ...connector,
          testStatus: result.ok ? "Passed" : "Missing auth",
          testChecks: result.checks,
          lastCheckedAt: result.checkedAt
        } : connector
      )
    );

    return result;
  };

  const testActiveConnector = async () => {
    setConnectionStatus(`Testing ${activeConnector.provider}...`);

    try {
      const result = await testConnectorLink(activeConnector.providerId, activeConnector.key);
      setConnectionStatus(`${result.provider} test ${result.ok ? "passed" : "needs authentication"}.`);
    } catch (error) {
      setConnectionStatus(error instanceof Error ? error.message : "Unable to test integration.");
    }
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((current) =>
      current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]
    );
  };

  const toggleCapability = (capability: string) => {
    setSelectedCapabilities((current) =>
      current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]
    );
  };

  const generateLaunchPack = () => {
    const systems = realConnectedConnectors
      .map((connector) => connector.name)
      .join(", ");
    const website = websiteUrl.trim() || "Not provided";
    const phone = phoneContactNumber.trim() || "Not provided";
    const projectName = workspaceName.trim() || confirmedBusinessType.trim() || `${playbook.label} workspace`;
    const projectBusinessType = confirmedBusinessType.trim() || playbook.label;
    const reportText = [
      "RelayClarity engineer setup request",
      `Customer: ${projectName}`,
      `Business type: ${projectBusinessType}`,
      `Website URL: ${website}`,
      `Phone contact: ${phone}`,
      `Other platform notes: ${otherPlatformNote.trim() || "None"}`,
      `Matched playbook: ${playbook.label}`,
      `Agent name: ${agentName.trim() || `${playbook.label} assistant`}`,
      `Agent mission: ${useCase}`,
      `Agent instructions: ${agentPurpose.trim() || useCase}`,
      `Agent knowledge: ${agentKnowledge.trim() || primaryKnowledgeSource}`,
      `Handoff rule: ${agentHandoff.trim() || "Escalate with summary and next step"}`,
      `First channel: ${launchChannel}`,
      `Selected AI capabilities: ${selectedCapabilities.join(", ") || "None selected"}`,
      `Selected goals: ${selectedGoals.join(", ") || "None selected"}`,
      `Readiness: ${readiness}%`,
      `Connected systems: ${systems || "None connected"}`,
      `Voice: ${latency}ms response start, ${bargeIn ? "barge-in enabled" : "barge-in disabled"}`,
      `Evaluation: ${selectedScenario.title}`,
      `Result: ${selectedScenario.result}`,
      "Engineer follow-up: within 48 hours",
      `Next action: ${playbook.launchFocus}`
    ].join("\n");

    setReport(reportText);
    setLaunchRequestSubmitted(true);
    onProjectComplete({
      id: `project-${Date.now()}`,
      name: projectName,
      meta: `${projectBusinessType} workspace`,
      businessType: projectBusinessType,
      websiteUrl: websiteUrl.trim(),
      phoneContactNumber: phoneContactNumber.trim(),
      launchReport: reportText
    });
  };

  const runLaunchTests = async () => {
    clearTestRunTimers();
    const scenarios = playbook.tests;
    if (scenarios.length === 0) {
      return;
    }

    const runToken = testRunTokenRef.current + 1;
    testRunTokenRef.current = runToken;

    setTestRunState("running");
    setActiveRunIndex(0);
    setCompletedRunCount(0);
    setScenarioIndex(0);
    setRunningChecks(null);
    setRevealedCheckCount(0);
    setRealResults(new Array(scenarios.length).fill(null));
    setTestMode(null);

    const business = {
      name: confirmedBusinessType.trim() || playbook.label,
      type: confirmedBusinessType.trim() || playbook.label,
      context: [playbook.summary, agentKnowledge, ...playbook.customerExamples].filter(Boolean).join("\n"),
      capabilities: selectedCapabilities,
      guardrails: playbook.guardrails
    };
    const agent = { name: agentName, purpose: agentPurpose, knowledge: agentKnowledge, handoff: agentHandoff };
    const connectors = realConnectedConnectors.map((connector) => connector.key);

    let resolvedMode: "real" | "simulated" = "simulated";

    for (let index = 0; index < scenarios.length; index += 1) {
      if (testRunTokenRef.current !== runToken) {
        return;
      }

      setActiveRunIndex(index);
      setScenarioIndex(index);

      const scenario = scenarios[index];
      const scenarioStartedAt = Date.now();
      let result: TestScenarioResult;

      try {
        const apiResult = await fetchJsonFromApi<LaunchTestApiResult>("/api/launch/test", {
          method: "POST",
          body: JSON.stringify({
            scenario: { title: scenario.title, label: scenario.label, result: scenario.result },
            business,
            agent,
            connectors,
            voiceReady: productionVoiceReady
          })
        });

        if (testRunTokenRef.current !== runToken) {
          return;
        }

        resolvedMode = apiResult.mode === "real" ? "real" : resolvedMode;
        result = {
          score: apiResult.score,
          passed: apiResult.passed,
          result: apiResult.result,
          checks: apiResult.checks || []
        };
      } catch {
        if (testRunTokenRef.current !== runToken) {
          return;
        }
        result = previewResults[index];
      }

      const checks = result.checks || [];
      setRunningChecks(checks);
      setRevealedCheckCount(0);

      const minScenarioDuration = 5200;
      const elapsed = Date.now() - scenarioStartedAt;
      const remaining = Math.max(0, minScenarioDuration - elapsed);

      if (checks.length > 0) {
        const perCheck = Math.max(700, Math.floor(Math.max(remaining, 2800) / checks.length));
        for (let checkIndex = 0; checkIndex < checks.length; checkIndex += 1) {
          setRevealedCheckCount(checkIndex + 1);
          await new Promise((resolve) => window.setTimeout(resolve, perCheck));
          if (testRunTokenRef.current !== runToken) {
            return;
          }
        }
      } else if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
        if (testRunTokenRef.current !== runToken) {
          return;
        }
      }

      setRealResults((current) => {
        const next = [...current];
        next[index] = result;
        return next;
      });
      setCompletedRunCount(index + 1);
      setRunningChecks(null);
      setRevealedCheckCount(0);
    }

    if (testRunTokenRef.current !== runToken) {
      return;
    }

    setTestMode(resolvedMode);
    setTestRunState("complete");
  };

  useEffect(() => {
    if (step !== 4 || testRunState !== "idle" || !agentsComplete || !productionVoiceReady || !systemsComplete) {
      return;
    }

    const autoRunKey = `${playbook.id}::${agentBuildKey}`;

    if (autoStartedTestKeyRef.current === autoRunKey) {
      return;
    }

    autoStartedTestKeyRef.current = autoRunKey;
    const autoRunTimer = window.setTimeout(runLaunchTests, 450);

    return () => window.clearTimeout(autoRunTimer);
  }, [agentBuildKey, agentsComplete, playbook.id, productionVoiceReady, step, systemsComplete, testRunState]);

  const nextStep = () => {
    if (!canContinue) {
      return;
    }

    if (step === setupSteps.length - 1) {
      generateLaunchPack();
      return;
    }
    setStep((current) => Math.min(setupSteps.length - 1, current + 1));
  };

  const activeStatusMessage = activeConnector.connected
    ? activeConnector.connectionMessage || activeConnector.provider + " connected."
    : activeConnector.connectionMessage || connectionStatus || connectorDescriptions[activeConnector.key];
  const activeConnectionLabel = activeConnector.connected ? "Connected" : "Not linked";
  const activeTestLabel = activeConnector.connected
    ? "Connected"
    : activeConnector.testStatus
      ? activeConnector.testStatus === "Setup required" || activeConnector.testStatus === "Awaiting OAuth" || activeConnector.testStatus === "Checking"
        ? activeConnector.testStatus
        : `Test ${activeConnector.testStatus}`
      : "Ready to link";
  const activeTestChecks = activeConnector.connected ? [] : activeConnector.testChecks || [];
  const primaryKnowledgeSource = playbook.connectorProviders.knowledge || "Knowledge base";
  const crmSystem = playbook.connectorProviders.crm || "CRM";
  const helpdeskSystem = playbook.connectorProviders.helpdesk || "Helpdesk";
  const testProgress = testRunState === "complete" ? 100 : Math.round((completedRunCount / Math.max(1, playbook.tests.length)) * 100);
  const agentDisplayName = agentName.trim() || `${playbook.label} assistant`;
  const connectedWorkflowConnectors = realConnectedConnectors;
  const workflowIntegrations = connectors
    .filter((connector) => connector.connected && (connector.connectionMode === "oauth" || connector.connectionMode === "sandbox") && ["crm", "knowledge", "helpdesk", "telephony"].includes(connector.key))
    .slice(0, 4);
  const selectedWorkflowSuggestions = selectedCapabilities.slice(0, 5);
  const selectedVoiceSummary = voiceConfirmed && selectedVoice
    ? `${selectedVoice.name}, ${selectedVoice.tone.toLowerCase()}`
    : "Selected caller voice";
  const connectedSystemSummary = connectedWorkflowConnectors.length
    ? connectedWorkflowConnectors.map((connector) => connector.provider).join(", ")
    : "the connected systems";
  const launchReviewProjectName = workspaceName.trim() || confirmedBusinessType.trim() || `${playbook.label} workspace`;
  const launchReviewBusinessType = confirmedBusinessType.trim() || playbook.label;
  const launchReviewScenariosPassed = scenarioResults.filter((result) => result.passed).length;
  const launchSummaryRows: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Workspace", value: launchReviewProjectName, hint: launchReviewBusinessType },
    { label: "Voice", value: voiceConfirmed && selectedVoice ? selectedVoice.name : "Not confirmed", hint: voiceConfirmed && selectedVoice ? selectedVoice.tone : "" },
    { label: "Connected systems", value: realConnectedConnectors.length ? `${realConnectedConnectors.length} connected` : "None yet", hint: realConnectedConnectors.map((connector) => connector.provider).join(", ") },
    { label: "Capabilities & goals", value: `${selectedCapabilities.length} capabilities, ${selectedGoals.length} goals` },
    { label: "Readiness", value: `${readiness}%` },
    { label: "Launch tests", value: `${launchGateScore}% · ${launchReviewScenariosPassed}/${playbook.tests.length} scenarios` }
  ];
  const workflowAgents = [
    {
      id: "agentIntake",
      label: "Intake agent",
      name: workflowAgentNameEdits.agentIntake || agentDisplayName,
      trigger: "New customer request",
      job: `${agentPurpose.trim() || playbook.missions[0]} Answers with ${selectedVoiceSummary} and uses ${connectedSystemSummary}.`,
      connectorKeys: ["crm", "telephony"],
      outcome: `Captures the request, verifies context, and confirms the next step in ${confirmedWorkspaceName}.`
    },
    {
      id: "agentAnswer",
      label: "Knowledge agent",
      name: workflowAgentNameEdits.agentAnswer || "Answer agent",
      trigger: "Routine question",
      job: `Checks ${primaryKnowledgeSource}, selected workspace capabilities, and customer context before answering.`,
      connectorKeys: ["knowledge", "crm"],
      outcome: "Answers from approved information with source-aware guardrails."
    },
    {
      id: "agentHandoff",
      label: "Handoff agent",
      name: workflowAgentNameEdits.agentHandoff || "Escalation agent",
      trigger: "Sensitive or urgent case",
      job: `${agentHandoff.trim() || "Summarises urgent or sensitive requests for the team."} Uses ${selectedVoiceSummary} until transfer.`,
      connectorKeys: ["helpdesk", "messaging", "crm"],
      outcome: "Routes the case with summary and context."
    }
  ];
  const workspaceAgents = [
    ...workflowAgents,
    ...customAgents.map((agent) => ({
      id: agent.id,
      label: "Added agent",
      name: agent.name,
      trigger: "New workflow",
      job: agent.job,
      connectorKeys: ["crm", "helpdesk", "knowledge"],
      outcome: "Runs the configured workflow path."
    }))
  ].filter((agent) => !hiddenWorkflowAgentIds.includes(agent.id));
  const activeWorkspaceAgent = workspaceAgents.find((agent) => agent.id === selectedWorkflowAgentId) || workspaceAgents[0] || workflowAgents[0];
  const voiceIntroLine = `Hello, I am your virtual agent for ${confirmedWorkspaceName}. I can help answer questions and get you to the right person.`;
  const activeWorkspaceConnectorKeys = Array.from(new Set([
    ...activeWorkspaceAgent.connectorKeys,
    ...(extraWorkflowConnectorKeys[activeWorkspaceAgent.id] || [])
  ]));
  const activeWorkspaceConnectors = activeWorkspaceConnectorKeys
    .map((key) => connectors.find((connector) => connector.key === key))
    .filter((connector): connector is Connector => Boolean(connector));
  const activeWorkspaceConnectorNames = activeWorkspaceConnectors.map((connector) => connector.provider).join(", ");
  const activeWorkspaceOutcomeDetail = activeWorkspaceConnectorNames
    ? `Uses ${activeWorkspaceConnectorNames}.`
    : "Connect the required systems before launch.";
  const activeCustomApps = customApps.filter((app) => app.agentId === activeWorkspaceAgent.id);
  const activeCustomActions = customActions.filter((action) => action.agentId === activeWorkspaceAgent.id);
  const workflowNodeKey = (nodeId: string) => `${activeWorkspaceAgent.id}:${nodeId}`;
  const workflowNodeContent = {
    trigger: {
      title: workflowNodeEdits[workflowNodeKey("trigger")]?.title || activeWorkspaceAgent.trigger,
      detail: workflowNodeEdits[workflowNodeKey("trigger")]?.detail || `${confirmedBusinessType || playbook.label} request enters this agent.`
    },
    instructions: {
      title: workflowNodeEdits[workflowNodeKey("instructions")]?.title || activeWorkspaceAgent.name,
      detail: workflowNodeEdits[workflowNodeKey("instructions")]?.detail || activeWorkspaceAgent.job
    },
    outcome: {
      title: workflowNodeEdits[workflowNodeKey("outcome")]?.title || activeWorkspaceAgent.outcome,
      detail: workflowNodeEdits[workflowNodeKey("outcome")]?.detail || activeWorkspaceOutcomeDetail
    }
  };

  const workflowNodeInspector = (nodeId: string): {
    kind: string;
    title: string;
    detail: string;
    facts: { label: string; value: string; tone?: "ok" | "warn" }[];
  } | null => {
    if (nodeId === "systems") {
      return {
        kind: "Connected systems",
        title: "Connected systems",
        detail: activeWorkspaceConnectors.length
          ? "The systems this agent can read from and act in while it works."
          : "No systems connected yet. Connect systems in the previous step to give this agent tools.",
        facts: activeWorkspaceConnectors.map((connector) => ({
          label: connector.provider,
          value: connector.connected ? "Connected" : "Needs connection",
          tone: connector.connected ? "ok" : "warn"
        }))
      };
    }

    const builtin = (workflowNodeContent as Record<string, { title: string; detail: string }>)[nodeId];
    if (builtin) {
      const kind = nodeId === "trigger" ? "Trigger" : nodeId === "instructions" ? "Instructions" : "Outcome";
      return {
        kind,
        title: builtin.title,
        detail: builtin.detail,
        facts: [
          { label: "Agent", value: activeWorkspaceAgent.name },
          { label: "Role", value: activeWorkspaceAgent.label }
        ]
      };
    }

    const app = activeCustomApps.find((item) => item.id === nodeId);
    if (app) {
      return {
        kind: "App",
        title: app.name,
        detail: app.detail,
        facts: [{ label: "Agent", value: activeWorkspaceAgent.name }]
      };
    }

    const action = activeCustomActions.find((item) => item.id === nodeId);
    if (action) {
      return {
        kind: "Action",
        title: action.name,
        detail: action.detail,
        facts: [{ label: "Agent", value: activeWorkspaceAgent.name }]
      };
    }

    return null;
  };

  const inspectedWorkflowNode = inspectedWorkflowNodeId ? workflowNodeInspector(inspectedWorkflowNodeId) : null;

  useEffect(() => {
    if (!workspaceAgents.some((agent) => agent.id === selectedWorkflowAgentId)) {
      setSelectedWorkflowAgentId(workspaceAgents[0]?.id || "agentIntake");
    }
  }, [selectedWorkflowAgentId, workspaceAgents]);

  useLayoutEffect(() => {
    const board = workflowCanvasRef.current;

    if (!board) {
      return;
    }

    const updateWorkflowMeasurements = () => {
      const rect = board.getBoundingClientRect();
      setWorkflowBoardSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height))
      });

      const nextNodeRects = Array.from(board.querySelectorAll<HTMLElement>("[data-workflow-node-id]")).reduce<Record<string, { x: number; y: number; width: number; height: number }>>((rects, node) => {
        const nodeRect = node.getBoundingClientRect();
        const nodeId = node.dataset.workflowNodeId;

        if (!nodeId) {
          return rects;
        }

        rects[nodeId] = {
          x: Math.round(nodeRect.left - rect.left),
          y: Math.round(nodeRect.top - rect.top),
          width: Math.round(nodeRect.width),
          height: Math.round(nodeRect.height)
        };

        return rects;
      }, {});

      setWorkflowNodeRects(nextNodeRects);
    };

    updateWorkflowMeasurements();
    const frame = window.requestAnimationFrame(updateWorkflowMeasurements);
    const observer = new ResizeObserver(updateWorkflowMeasurements);
    observer.observe(board);
    Array.from(board.querySelectorAll<HTMLElement>("[data-workflow-node-id]")).forEach((node) => observer.observe(node));
    window.addEventListener("resize", updateWorkflowMeasurements);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateWorkflowMeasurements);
    };
  }, [step, agentsComplete, selectedWorkflowAgentId, activeCustomApps.length, activeCustomActions.length, activeWorkspaceConnectors.length, workflowNodeEdits]);

  useEffect(() => {
    if (!workflowContextMenu) {
      return;
    }

    const closeMenu = () => setWorkflowContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workflowContextMenu]);

  useEffect(() => {
    if (!workflowAddPicker) {
      return;
    }

    setWorkflowAddTab(0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkflowAddPicker(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workflowAddPicker]);

  useEffect(() => () => {
    if (workflowCopyToastTimer.current) {
      window.clearTimeout(workflowCopyToastTimer.current);
    }
  }, []);

  const boardNodeSize = { width: 224, height: 142 };
  const workflowNodeSize = (nodeId: string) => {
    if (nodeId === "systems") {
      return { width: 252, height: 142 };
    }

    if (nodeId.startsWith("app-") || nodeId.startsWith("action-")) {
      return { width: 204, height: 124 };
    }

    return boardNodeSize;
  };
  const workflowDefaultPosition = (nodeId: string) => {
    const boardWidth = Math.max(720, workflowBoardSize.width || 960);
    const boardHeight = Math.max(520, workflowBoardSize.height || 620);
    const laneY = Math.max(108, Math.round(boardHeight * 0.34));
    const laneMargin = 24;
    const triggerSize = workflowNodeSize("trigger");
    const instructionsSize = workflowNodeSize("instructions");
    const systemsSize = workflowNodeSize("systems");
    const outcomeSize = workflowNodeSize("outcome");
    const totalNodeWidth = triggerSize.width + instructionsSize.width + systemsSize.width + outcomeSize.width;
    const laneGap = Math.max(10, Math.min(180, (boardWidth - laneMargin * 2 - totalNodeWidth) / 3));
    const laneWidth = totalNodeWidth + laneGap * 3;
    const laneStartX = Math.max(laneMargin, Math.round((boardWidth - laneWidth) / 2));
    const instructionsX = Math.round(laneStartX + triggerSize.width + laneGap);
    const systemsX = Math.round(instructionsX + instructionsSize.width + laneGap);
    const outcomeX = Math.min(
      Math.round(systemsX + systemsSize.width + laneGap),
      Math.max(laneMargin, boardWidth - outcomeSize.width - laneMargin)
    );
    const positions: Record<string, { x: number; y: number }> = {
      trigger: { x: laneStartX, y: laneY },
      instructions: { x: instructionsX, y: laneY },
      systems: { x: systemsX, y: laneY },
      outcome: { x: outcomeX, y: laneY }
    };

    return positions[nodeId] || { x: 34, y: Math.max(236, Math.round(boardHeight * 0.58)) };
  };
  const workflowNodePosition = (nodeId: string) => workflowNodeOffsets[workflowNodeKey(nodeId)] || workflowDefaultPosition(nodeId);
  const workflowNodeBox = (nodeId: string) => {
    const position = workflowNodePosition(nodeId);
    const measuredRect = workflowNodeRects[nodeId];

    if (measuredRect) {
      return {
        x: position.x,
        y: position.y,
        width: measuredRect.width,
        height: measuredRect.height
      };
    }

    const size = workflowNodeSize(nodeId);

    return { ...position, ...size };
  };
  const workflowConnectionPairs = [
    ["trigger", "instructions"],
    ["instructions", "systems"],
    ["systems", "outcome"],
    ...activeCustomApps.map((app) => ["systems", app.id]),
    ...activeCustomActions.map((action) => ["systems", action.id]),
    ...activeCustomApps.map((app) => [app.id, "outcome"]),
    ...activeCustomActions.map((action) => [action.id, "outcome"])
  ];
  const workflowConnections = workflowConnectionPairs.map(([from, to]) => {
    const fromBox = workflowNodeBox(from);
    const toBox = workflowNodeBox(to);
    const fromCenterX = fromBox.x + fromBox.width / 2;
    const toCenterX = toBox.x + toBox.width / 2;
    const flowsRight = toCenterX >= fromCenterX;
    const fromX = flowsRight ? fromBox.x + fromBox.width : fromBox.x;
    const fromY = fromBox.y + fromBox.height / 2;
    const toX = flowsRight ? toBox.x : toBox.x + toBox.width;
    const toY = toBox.y + toBox.height / 2;
    const bend = Math.max(54, Math.min(170, Math.abs(toX - fromX) * 0.42));

    return {
      from,
      to,
      connected: true,
      path: `M ${fromX} ${fromY} C ${fromX + (flowsRight ? bend : -bend)} ${fromY}, ${toX - (flowsRight ? bend : -bend)} ${toY}, ${toX} ${toY}`
    };
  });
  const gridSize = 16;
  const workflowPositionStyle = (id: string): React.CSSProperties => ({
    transform: `translate(${workflowLayout[id]?.x ?? 24}px, ${workflowLayout[id]?.y ?? 24}px)`
  });

  const moveWorkflowNode = (id: string, clientX: number, clientY: number, width = 170) => {
    const rect = workflowCanvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const maxX = Math.max(gridSize, rect.width - width - gridSize);
    const maxY = Math.max(gridSize, rect.height - 120);
    const x = Math.min(maxX, Math.max(gridSize, Math.round((clientX - rect.left - width / 2) / gridSize) * gridSize));
    const y = Math.min(maxY, Math.max(gridSize, Math.round((clientY - rect.top - 38) / gridSize) * gridSize));
    setWorkflowLayout((current) => ({ ...current, [id]: { x, y } }));
  };

  const startWorkflowDrag = (id: string, event: React.PointerEvent<HTMLElement>, width = 170) => {
    if ((event.target as HTMLElement).closest("button, input")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    moveWorkflowNode(id, event.clientX, event.clientY, width);
  };

  const continueWorkflowDrag = (id: string, event: React.PointerEvent<HTMLElement>, width = 170) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    moveWorkflowNode(id, event.clientX, event.clientY, width);
  };

  const startWorkflowMouseDrag = (id: string, event: React.MouseEvent<HTMLElement>, width = 170) => {
    if ((event.target as HTMLElement).closest("button, input")) {
      return;
    }

    event.preventDefault();
    setWorkflowDrag({ id, width });
    moveWorkflowNode(id, event.clientX, event.clientY, width);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveWorkflowNode(id, moveEvent.clientX, moveEvent.clientY, width);
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setWorkflowDrag(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  const continueWorkflowMouseDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!workflowDrag) {
      return;
    }

    moveWorkflowNode(workflowDrag.id, event.clientX, event.clientY, workflowDrag.width);
  };

  const stopWorkflowMouseDrag = () => {
    setWorkflowDrag(null);
  };

  const editWorkflowNode = (nodeId: "trigger" | "instructions" | "outcome") => {
    if (activeWorkflowNodeDrag?.moved) {
      return;
    }

    const current = workflowNodeContent[nodeId];
    const nextTitle = window.prompt("Edit title", current.title);

    if (nextTitle === null) {
      return;
    }

    const nextDetail = window.prompt("Edit detail", current.detail);

    if (nextDetail === null) {
      return;
    }

    setWorkflowNodeEdits((currentEdits) => ({
      ...currentEdits,
      [workflowNodeKey(nodeId)]: {
        title: nextTitle.trim() || current.title,
        detail: nextDetail.trim() || current.detail
      }
    }));
  };

  const startWorkspaceNodeDrag = (nodeId: string, event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    // Drag the whole marquee selection together when the grabbed node is part of it.
    const ids = selectedWorkflowNodeIds.includes(nodeId) && selectedWorkflowNodeIds.length > 1
      ? selectedWorkflowNodeIds
      : [nodeId];

    if (!selectedWorkflowNodeIds.includes(nodeId)) {
      setSelectedWorkflowNodeIds([nodeId]);
    }

    const origins = ids.reduce<Record<string, { x: number; y: number }>>((map, id) => {
      map[id] = workflowNodePosition(id);
      return map;
    }, {});

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveWorkflowNodeDrag({
      nodeId,
      ids,
      startX: event.clientX,
      startY: event.clientY,
      origins,
      moved: false
    });
  };

  const moveWorkspaceNodeDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!activeWorkflowNodeDrag || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const rect = workflowCanvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const drag = activeWorkflowNodeDrag;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const moved = drag.moved || Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;

    setWorkflowNodeOffsets((current) => {
      const next = { ...current };

      drag.ids.forEach((id) => {
        const origin = drag.origins[id];

        if (!origin) {
          return;
        }

        const nodeSize = workflowNodeSize(id);
        const maxX = Math.max(24, rect.width - nodeSize.width - 24);
        const maxY = Math.max(24, rect.height - nodeSize.height - 24);
        const x = Math.max(24, Math.min(maxX, Math.round((origin.x + deltaX) / gridSize) * gridSize));
        const y = Math.max(24, Math.min(maxY, Math.round((origin.y + deltaY) / gridSize) * gridSize));
        next[workflowNodeKey(id)] = { x, y };
      });

      return next;
    });
    setActiveWorkflowNodeDrag((current) => current ? { ...current, moved } : current);
  };

  const stopWorkspaceNodeDrag = (event: React.PointerEvent<HTMLElement>, nodeId: string) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasMoved = activeWorkflowNodeDrag?.moved;
    setActiveWorkflowNodeDrag(null);

    if (!wasMoved) {
      setSelectedWorkflowNodeIds([nodeId]);
      setInspectedWorkflowNodeId(nodeId);
    }
  };

  const workflowNodeOffsetStyle = (nodeId: string): React.CSSProperties => {
    const offset = workflowNodePosition(nodeId);
    return {
      left: offset.x,
      top: offset.y
    };
  };

  const workflowBoardPoint = (clientX: number, clientY: number) => {
    const rect = workflowCanvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top))
    };
  };

  const marqueeRect = workflowMarquee ? {
    x: Math.min(workflowMarquee.startX, workflowMarquee.currentX),
    y: Math.min(workflowMarquee.startY, workflowMarquee.currentY),
    width: Math.abs(workflowMarquee.currentX - workflowMarquee.startX),
    height: Math.abs(workflowMarquee.currentY - workflowMarquee.startY)
  } : null;

  const marqueeStyle = marqueeRect ? {
    left: marqueeRect.x,
    top: marqueeRect.y,
    width: marqueeRect.width,
    height: marqueeRect.height
  } : undefined;

  const nodeIntersectsRect = (
    nodeRect: { x: number; y: number; width: number; height: number },
    selectionRect: { x: number; y: number; width: number; height: number }
  ) => (
    nodeRect.x < selectionRect.x + selectionRect.width &&
    nodeRect.x + nodeRect.width > selectionRect.x &&
    nodeRect.y < selectionRect.y + selectionRect.height &&
    nodeRect.y + nodeRect.height > selectionRect.y
  );

  const updateMarqueeSelection = (selectionRect: { x: number; y: number; width: number; height: number }) => {
    if (selectionRect.width < 8 && selectionRect.height < 8) {
      setSelectedWorkflowNodeIds([]);
      return;
    }

    setSelectedWorkflowNodeIds(Object.entries(workflowNodeRects)
      .filter(([, nodeRect]) => nodeIntersectsRect(nodeRect, selectionRect))
      .map(([nodeId]) => nodeId));
  };

  const startWorkflowMarquee = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, textarea, [data-workflow-node-id], .workflow-context-menu, .workflow-inspector")) {
      return;
    }

    const point = workflowBoardPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setWorkflowContextMenu(null);
    setWorkflowMarquee({
      active: true,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y
    });
    setSelectedWorkflowNodeIds([]);
    setInspectedWorkflowNodeId(null);
  };

  const moveWorkflowMarquee = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!workflowMarquee?.active || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const point = workflowBoardPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    const nextMarquee = { ...workflowMarquee, currentX: point.x, currentY: point.y };
    const nextRect = {
      x: Math.min(nextMarquee.startX, nextMarquee.currentX),
      y: Math.min(nextMarquee.startY, nextMarquee.currentY),
      width: Math.abs(nextMarquee.currentX - nextMarquee.startX),
      height: Math.abs(nextMarquee.currentY - nextMarquee.startY)
    };

    setWorkflowMarquee(nextMarquee);
    updateMarqueeSelection(nextRect);
  };

  const stopWorkflowMarquee = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setWorkflowMarquee(null);
  };

  const addWorkflowConnector = (connectorKey: string) => {
    setExtraWorkflowConnectorKeys((current) => {
      const keys = current[activeWorkspaceAgent.id] || [];
      return keys.includes(connectorKey)
        ? current
        : { ...current, [activeWorkspaceAgent.id]: [...keys, connectorKey] };
    });
  };

  const boardDropPosition = (clientX: number, clientY: number) => {
    const rect = workflowCanvasRef.current?.getBoundingClientRect();
    const fallback = { x: 560, y: 240 };

    if (!rect) {
      return fallback;
    }

    const rawX = clientX - rect.left - boardNodeSize.width / 2;
    const rawY = clientY - rect.top - boardNodeSize.height / 2;
    const maxX = Math.max(24, rect.width - boardNodeSize.width - 24);
    const maxY = Math.max(24, rect.height - boardNodeSize.height - 24);

    return {
      x: Math.max(24, Math.min(maxX, Math.round(rawX / gridSize) * gridSize)),
      y: Math.max(24, Math.min(maxY, Math.round(rawY / gridSize) * gridSize))
    };
  };

  const cancelWorkspaceNodeDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setActiveWorkflowNodeDrag(null);
  };

  const dropWorkflowDrawerItem = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rawPayload = event.dataTransfer.getData("application/x-relay-workflow");

    if (!rawPayload) {
      return;
    }

    const position = boardDropPosition(event.clientX, event.clientY);

    try {
      const payload = JSON.parse(rawPayload) as { type?: string; connectorKey?: string; label?: string };

      if (payload.type === "app" && payload.connectorKey) {
        addWorkflowConnector(payload.connectorKey);
        addWorkflowApp(payload.connectorKey, position);
      }

      if (payload.type === "action") {
        addWorkflowAction(position);
      }

      if (payload.type === "agent") {
        addWorkflowAgent();
      }
    } catch {
      return;
    }
  };

  const openWorkflowContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    target: "board" | "node" | "agent",
    detail: { nodeId?: string; agentId?: string } = {}
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Right-clicking a node that is not already part of the marquee selection narrows to just it,
    // so the menu's copy/duplicate/delete act on what the user is pointing at.
    if (target === "node" && detail.nodeId && !selectedWorkflowNodeIds.includes(detail.nodeId)) {
      setSelectedWorkflowNodeIds([detail.nodeId]);
    }

    setWorkflowContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 236),
      y: Math.min(event.clientY, window.innerHeight - 260),
      target,
      ...detail
    });
  };

  const workflowNodeTitle = (nodeId: string) => {
    if (nodeId === "trigger" || nodeId === "instructions" || nodeId === "outcome") {
      return workflowNodeContent[nodeId].title;
    }

    if (nodeId === "systems") {
      return "Connected systems";
    }

    return activeCustomApps.find((app) => app.id === nodeId)?.name ||
      activeCustomActions.find((action) => action.id === nodeId)?.name ||
      "Workflow node";
  };

  const showWorkflowCopyToast = () => {
    setWorkflowCopyToast(true);
    if (workflowCopyToastTimer.current) {
      window.clearTimeout(workflowCopyToastTimer.current);
    }
    workflowCopyToastTimer.current = window.setTimeout(() => setWorkflowCopyToast(false), 1600);
  };

  const copyWorkflowText = async (text: string) => {
    const value = text.trim();

    if (!value) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        document.body.removeChild(helper);
      }
    } catch {
      return;
    }

    showWorkflowCopyToast();
  };

  const workflowAgentClipboardText = (agentId: string) => {
    const agent = workspaceAgents.find((item) => item.id === agentId);

    if (!agent) {
      return "";
    }

    const systems = Array.from(new Set([
      ...agent.connectorKeys,
      ...(extraWorkflowConnectorKeys[agent.id] || [])
    ]))
      .map((key) => connectors.find((connector) => connector.key === key)?.provider)
      .filter(Boolean)
      .join(", ");

    return [
      agent.name,
      "",
      agent.job,
      "",
      `Trigger: ${agent.trigger}`,
      `Outcome: ${agent.outcome}`,
      `Connected systems: ${systems || "None connected yet"}`
    ].join("\n");
  };

  const workflowNodeClipboardText = (nodeId: string) => {
    const builtin = (workflowNodeContent as Record<string, { title: string; detail: string }>)[nodeId];

    if (builtin) {
      return `${builtin.title}\n\n${builtin.detail}`;
    }

    if (nodeId === "systems") {
      return `Connected systems\n\n${activeWorkspaceConnectorNames || "No systems connected yet."}`;
    }

    const app = activeCustomApps.find((item) => item.id === nodeId);

    if (app) {
      return `${app.name}\n\n${app.detail}`;
    }

    const action = activeCustomActions.find((item) => item.id === nodeId);

    if (action) {
      return `${action.name}\n\n${action.detail}`;
    }

    return workflowNodeTitle(nodeId);
  };

  const renameWorkflowAgent = (agentId: string) => {
    const agent = workspaceAgents.find((item) => item.id === agentId);

    if (!agent) {
      return;
    }

    const nextName = window.prompt("Rename agent", agent.name);

    if (nextName === null) {
      return;
    }

    const trimmedName = nextName.trim();

    if (!trimmedName) {
      return;
    }

    setWorkflowAgentNameEdits((current) => ({ ...current, [agentId]: trimmedName }));
    setCustomAgents((current) => current.map((item) => item.id === agentId ? { ...item, name: trimmedName } : item));
  };

  const renameWorkflowDynamicNode = (nodeId: string) => {
    const app = activeCustomApps.find((item) => item.id === nodeId);
    const action = activeCustomActions.find((item) => item.id === nodeId);
    const current = app || action;

    if (!current) {
      return;
    }

    const nextTitle = window.prompt("Rename node", current.name);

    if (nextTitle === null) {
      return;
    }

    const nextDetail = window.prompt("Edit detail", current.detail);

    if (nextDetail === null) {
      return;
    }

    if (app) {
      setCustomApps((items) => items.map((item) => item.id === nodeId ? {
        ...item,
        name: nextTitle.trim() || item.name,
        detail: nextDetail.trim() || item.detail
      } : item));
      return;
    }

    setCustomActions((items) => items.map((item) => item.id === nodeId ? {
      ...item,
      name: nextTitle.trim() || item.name,
      detail: nextDetail.trim() || item.detail
    } : item));
  };

  const renameWorkflowNode = (nodeId: string) => {
    if (nodeId === "trigger" || nodeId === "instructions" || nodeId === "outcome") {
      editWorkflowNode(nodeId);
      return;
    }

    renameWorkflowDynamicNode(nodeId);
  };

  const deleteWorkflowNode = (nodeId: string) => {
    setCustomApps((items) => items.filter((item) => item.id !== nodeId));
    setCustomActions((items) => items.filter((item) => item.id !== nodeId));
    setWorkflowNodeOffsets((items) => {
      const next = { ...items };
      delete next[workflowNodeKey(nodeId)];
      return next;
    });
    setSelectedWorkflowNodeIds((items) => items.filter((item) => item !== nodeId));
    setInspectedWorkflowNodeId((current) => (current === nodeId ? null : current));
  };

  const duplicateWorkflowNode = (nodeId: string) => {
    const offset = workflowNodePosition(nodeId);
    const position = { x: offset.x + 32, y: offset.y + 32 };
    const app = activeCustomApps.find((item) => item.id === nodeId);
    const action = activeCustomActions.find((item) => item.id === nodeId);

    if (app) {
      const id = `app-${Date.now()}`;
      setCustomApps((items) => [...items, { ...app, id }]);
      setWorkflowNodeOffsets((items) => ({ ...items, [workflowNodeKey(id)]: position }));
      setSelectedWorkflowNodeIds([id]);
      return;
    }

    if (action) {
      const id = `action-${Date.now()}`;
      setCustomActions((items) => [...items, { ...action, id }]);
      setWorkflowNodeOffsets((items) => ({ ...items, [workflowNodeKey(id)]: position }));
      setSelectedWorkflowNodeIds([id]);
      return;
    }

    copyWorkflowText(workflowNodeTitle(nodeId));
  };

  // Custom (app/action) nodes are the only ones that can be removed, copied, or pasted.
  const selectedCustomNodeIds = selectedWorkflowNodeIds.filter((id) => id.startsWith("app-") || id.startsWith("action-"));

  const deleteWorkflowSelection = () => {
    if (!selectedCustomNodeIds.length) {
      return;
    }

    const removing = new Set(selectedCustomNodeIds);
    setCustomApps((items) => items.filter((item) => !removing.has(item.id)));
    setCustomActions((items) => items.filter((item) => !removing.has(item.id)));
    setWorkflowNodeOffsets((items) => {
      const next = { ...items };
      removing.forEach((id) => delete next[workflowNodeKey(id)]);
      return next;
    });
    setSelectedWorkflowNodeIds((items) => items.filter((id) => !removing.has(id)));
    setInspectedWorkflowNodeId((current) => (current && removing.has(current) ? null : current));
  };

  const copyWorkflowSelection = () => {
    if (!selectedWorkflowNodeIds.length) {
      return;
    }

    const clipboard = selectedWorkflowNodeIds.reduce<typeof workflowClipboard>((items, id) => {
      const position = workflowNodePosition(id);
      const app = activeCustomApps.find((item) => item.id === id);

      if (app) {
        items.push({ kind: "app", name: app.name, detail: app.detail, x: position.x, y: position.y });
        return items;
      }

      const action = activeCustomActions.find((item) => item.id === id);

      if (action) {
        items.push({ kind: "action", name: action.name, detail: action.detail, x: position.x, y: position.y });
      }

      return items;
    }, []);

    setWorkflowClipboard(clipboard);
    const text = selectedWorkflowNodeIds
      .map((id) => workflowNodeClipboardText(id))
      .filter(Boolean)
      .join("\n\n———\n\n");
    copyWorkflowText(text);
  };

  const duplicateWorkflowSelection = () => {
    if (!selectedCustomNodeIds.length) {
      duplicateWorkflowNode(selectedWorkflowNodeIds[0] || "");
      return;
    }

    const stamp = Date.now();
    const appsToAdd: typeof customApps = [];
    const actionsToAdd: typeof customActions = [];
    const offsetsToAdd: Record<string, { x: number; y: number }> = {};
    const newIds: string[] = [];

    selectedCustomNodeIds.forEach((nodeId, index) => {
      const offset = workflowNodePosition(nodeId);
      const position = { x: offset.x + 32, y: offset.y + 32 };
      const app = activeCustomApps.find((item) => item.id === nodeId);

      if (app) {
        const id = `app-${stamp}-${index}`;
        appsToAdd.push({ ...app, id });
        offsetsToAdd[workflowNodeKey(id)] = position;
        newIds.push(id);
        return;
      }

      const action = activeCustomActions.find((item) => item.id === nodeId);

      if (action) {
        const id = `action-${stamp}-${index}`;
        actionsToAdd.push({ ...action, id });
        offsetsToAdd[workflowNodeKey(id)] = position;
        newIds.push(id);
      }
    });

    if (appsToAdd.length) {
      setCustomApps((items) => [...items, ...appsToAdd]);
    }
    if (actionsToAdd.length) {
      setCustomActions((items) => [...items, ...actionsToAdd]);
    }
    setWorkflowNodeOffsets((items) => ({ ...items, ...offsetsToAdd }));
    setSelectedWorkflowNodeIds(newIds);
  };

  const pasteWorkflowClipboard = () => {
    if (!workflowClipboard.length) {
      return;
    }

    const stamp = Date.now();
    const appsToAdd: typeof customApps = [];
    const actionsToAdd: typeof customActions = [];
    const offsetsToAdd: Record<string, { x: number; y: number }> = {};
    const newIds: string[] = [];

    workflowClipboard.forEach((item, index) => {
      const position = { x: item.x + 32, y: item.y + 32 };

      if (item.kind === "app") {
        const id = `app-${stamp}-${index}`;
        appsToAdd.push({ id, agentId: activeWorkspaceAgent.id, name: item.name, detail: item.detail });
        offsetsToAdd[workflowNodeKey(id)] = position;
        newIds.push(id);
        return;
      }

      const id = `action-${stamp}-${index}`;
      actionsToAdd.push({ id, agentId: activeWorkspaceAgent.id, name: item.name, detail: item.detail });
      offsetsToAdd[workflowNodeKey(id)] = position;
      newIds.push(id);
    });

    if (appsToAdd.length) {
      setCustomApps((items) => [...items, ...appsToAdd]);
    }
    if (actionsToAdd.length) {
      setCustomActions((items) => [...items, ...actionsToAdd]);
    }
    setWorkflowNodeOffsets((items) => ({ ...items, ...offsetsToAdd }));
    // Cascade the clipboard so a repeated paste keeps drifting instead of stacking.
    setWorkflowClipboard((items) => items.map((item) => ({ ...item, x: item.x + 32, y: item.y + 32 })));
    setSelectedWorkflowNodeIds(newIds);
  };

  const duplicateWorkflowAgent = (agentId: string) => {
    const agent = workspaceAgents.find((item) => item.id === agentId);

    if (!agent) {
      return;
    }

    const id = `agent-${Date.now()}`;
    setCustomAgents((items) => [...items, {
      id,
      name: `${agent.name} copy`,
      job: agent.job
    }]);
    setSelectedWorkflowAgentId(id);
  };

  const resetWorkflowLayout = () => {
    setWorkflowNodeOffsets((current) => {
      const prefix = `${activeWorkspaceAgent.id}:`;
      return Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(prefix)));
    });
    setSelectedWorkflowNodeIds([]);
  };

  const deleteWorkflowAgent = (agentId: string) => {
    const remainingAgents = workspaceAgents.filter((agent) => agent.id !== agentId);

    if (!remainingAgents.length) {
      return;
    }

    setCustomAgents((current) => current.filter((agent) => agent.id !== agentId));
    setHiddenWorkflowAgentIds((current) => (
      customAgents.some((agent) => agent.id === agentId) || current.includes(agentId)
        ? current
        : [...current, agentId]
    ));

    if (selectedWorkflowAgentId === agentId) {
      setSelectedWorkflowAgentId(remainingAgents[0].id);
    }
  };

  const addWorkflowAgent = () => {
    const index = customAgents.length + 4;
    const id = `agent-${Date.now()}`;
    const x = 48 + (customAgents.length % 4) * 208;
    const y = 644 + Math.floor(customAgents.length / 4) * 132;
    setCustomAgents((current) => [...current, {
      id,
      name: `Agent ${index}`,
      job: selectedWorkflowSuggestions[customAgents.length % Math.max(1, selectedWorkflowSuggestions.length)] || playbook.goals[0]?.title || "Handle a new workflow"
    }]);
    setSelectedWorkflowAgentId(id);
    setWorkflowLayout((current) => ({ ...current, [id]: { x, y } }));
  };

  const addWorkflowApp = (connectorKey?: string, position?: { x: number; y: number }) => {
    const availableConnectors = connectedWorkflowConnectors.length ? connectedWorkflowConnectors : workflowIntegrations;
    const nextConnector = connectorKey
      ? availableConnectors.find((connector) => connector.key === connectorKey)
      : availableConnectors[(activeCustomApps.length + workflowIntegrations.length) % Math.max(1, availableConnectors.length)];

    if (!nextConnector) {
      return;
    }

    const id = `app-${Date.now()}`;
    const defaultPosition = { x: 554 + (activeCustomApps.length % 2) * 104, y: 272 + Math.floor(activeCustomApps.length / 2) * 72 };
    setCustomApps((current) => [...current, {
      id,
      agentId: activeWorkspaceAgent.id,
      name: nextConnector.provider,
      detail: nextConnector.name
    }]);
    setWorkflowNodeOffsets((current) => ({ ...current, [workflowNodeKey(id)]: position || defaultPosition }));
  };

  const addCustomWorkflowApp = (name: string, detail = "Configure this app", position?: { x: number; y: number }) => {
    const appName = name.trim();

    if (!appName) {
      return;
    }

    const id = `app-${Date.now()}`;
    const defaultPosition = { x: 554 + (activeCustomApps.length % 2) * 104, y: 272 + Math.floor(activeCustomApps.length / 2) * 72 };
    setCustomApps((current) => [...current, { id, agentId: activeWorkspaceAgent.id, name: appName, detail }]);
    setWorkflowNodeOffsets((current) => ({ ...current, [workflowNodeKey(id)]: position || defaultPosition }));
  };

  const addWorkflowAction = (position?: { x: number; y: number }, actionName?: string, actionDetail?: string) => {
    const id = `action-${Date.now()}`;
    const action = actionName?.trim() || playbook.actions[(activeCustomActions.length + 1) % playbook.actions.length] || "New workflow action";
    const detail = actionDetail?.trim() || "Configure this action";
    const defaultPosition = { x: 794, y: 272 + activeCustomActions.length * 72 };
    setCustomActions((current) => [...current, { id, agentId: activeWorkspaceAgent.id, name: action, detail }]);
    setWorkflowNodeOffsets((current) => ({ ...current, [workflowNodeKey(id)]: position || defaultPosition }));
  };

  // Apps the "Add an app" modal offers: connected systems first, then the full integration catalog.
  const connectedWorkflowAppList = connectedWorkflowConnectors.length ? connectedWorkflowConnectors : workflowIntegrations;
  const workflowAppCatalog = setupIntegrationCategories.map((category) => ({
    label: category.label,
    apps: setupAddIntegrationCatalog[category.id]
  }));
  // Actions the "Add an action" modal offers: business recommendations first, then the full library.
  const workflowActionGroups = [
    {
      category: `Recommended for ${confirmedBusinessType || playbook.label}`,
      actions: playbook.actions.map((name) => ({ name, detail: "Recommended for your business." }))
    },
    ...WORKFLOW_ACTION_LIBRARY
  ];
  // Tabbed panels so the modal never has to scroll: one category per tab.
  const workflowAppPanels = [
    ...(connectedWorkflowAppList.length ? [{ tab: "Connected", title: "Connected systems", connected: true, apps: connectedWorkflowAppList }] : []),
    ...workflowAppCatalog.map((group) => ({ tab: group.label, title: group.label, connected: false, apps: group.apps }))
  ];
  const workflowActionPanels = [
    ...workflowActionGroups.map((group, index) => ({
      tab: index === 0 ? "Recommended" : group.category.split(" ")[0],
      title: group.category,
      actions: group.actions
    })),
    { tab: "Custom", title: "Custom action", actions: null as null | Array<{ name: string; detail: string }> }
  ];
  const workflowAddPanelCount = workflowAddPicker === "app" ? workflowAppPanels.length : workflowActionPanels.length;
  const safeWorkflowAddTab = Math.min(workflowAddTab, Math.max(0, workflowAddPanelCount - 1));

  const playVoicePreview = (voice: VoicePreset) => {
    setVoicePreviewCompleted(true);
    setPlayingVoiceId(voice.id);
    setActiveAudioUrl(voice.previewAudioUrl);
    setVoicePreviewStatus(`${voice.name} preview is playing.`);
    window.setTimeout(() => {
      const audio = audioRef.current;

      if (!audio) {
        setPlayingVoiceId("");
        setVoicePreviewStatus("Preview audio is not ready yet.");
        return;
      }

      audio.src = voice.previewAudioUrl;
      audio.load();
      audio.play().catch(() => {
        setPlayingVoiceId("");
        setVoicePreviewStatus("Preview is ready. Press play in the audio control.");
      });
    }, 0);
  };

  const primeVoicePlayback = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.muted = true;
    audio.loop = true;
    audio.src = SILENT_AUDIO_URL;
    audio.load();
    audio.play().catch(() => undefined);
  };

  const playGeneratedVoiceAudio = async (audioUrl: string, voice: VoicePreset) => {
    const audio = audioRef.current;

    if (!audio) {
      setPlayingVoiceId("");
      setVoicePreviewStatus("Preview audio is not ready yet.");
      return;
    }

    audio.loop = false;
    audio.muted = false;
    audio.src = audioUrl;
    audio.load();
    setActiveAudioUrl(audioUrl);
    setPlayingVoiceId(voice.id);

    try {
      await audio.play();
      setVoicePreviewStatus(`${voice.name} preview is playing.`);
    } catch {
      setPlayingVoiceId("");
      setVoicePreviewStatus("Voice is ready. Press Play.");
    }
  };

  const stopVoicePrime = () => {
    const audio = audioRef.current;

    if (!audio || !audio.muted) {
      return;
    }

    audio.pause();
    audio.loop = false;
    audio.muted = false;
  };

  const updateVoicePreview = async () => {
    if (!selectedVoice) {
      setVoicePreviewStatus("Choose a voice before previewing settings.");
      return;
    }

    if (isRegeneratingVoice) {
      return;
    }

    setIsRegeneratingVoice(true);
    setVoicePreviewStatus(`Playing ${selectedVoice.name} with the current settings.`);

    if (generatedAudioUrlRef.current && generatedVoiceSettingsKeyRef.current === voiceSettingsKey) {
      const audio = audioRef.current;

      if (!audio) {
        setPlayingVoiceId("");
        setVoicePreviewStatus("Preview audio is not ready yet.");
        setIsRegeneratingVoice(false);
        return;
      }

      audio.muted = false;
      await playGeneratedVoiceAudio(generatedAudioUrlRef.current, selectedVoice);
      setIsRegeneratingVoice(false);
      return;
    }

    if (voiceGenerationCount >= VOICE_GENERATION_LIMIT) {
      setIsRegeneratingVoice(false);
      setVoicePreviewStatus("Voice preview limit reached for this setup.");
      return;
    }

    primeVoicePlayback();

    try {
      const payload = await fetchJsonFromApi<SpeechPayload>("/api/voice/speech", {
        method: "POST",
        body: JSON.stringify({
          text: voiceIntroLine,
          voiceId: selectedVoice.voiceId,
          speed: voiceSpeed,
          stability: voiceStability / 100,
          similarityBoost: voiceSimilarity / 100,
          style: voiceStyle / 100,
          useSpeakerBoost: voiceSpeakerBoost,
        }),
      });

      if (payload.mode === "audio" && payload.audioBase64) {
        if (generatedAudioUrlRef.current) {
          URL.revokeObjectURL(generatedAudioUrlRef.current);
        }

        const bytes = Uint8Array.from(atob(payload.audioBase64), (character) => character.charCodeAt(0));
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: payload.contentType || "audio/mpeg" }));
        generatedAudioUrlRef.current = audioUrl;
        generatedVoiceSettingsKeyRef.current = voiceSettingsKey;
        setRealVoicePreviewKey(voiceSettingsKey);
        setVoiceGenerationCount((current) => current + 1);
        setVoicePreviewCompleted(true);
        await playGeneratedVoiceAudio(audioUrl, selectedVoice);
      } else {
        setPlayingVoiceId("");
        stopVoicePrime();
        generatedVoiceSettingsKeyRef.current = "";
        setRealVoicePreviewKey("");
        setVoicePreviewStatus(payload.message || "Connect ElevenLabs to play this voice with the current settings.");
      }
    } catch (error) {
      stopVoicePrime();
      setVoicePreviewStatus(error instanceof Error ? error.message : "Unable to preview these voice settings.");
    } finally {
      setIsRegeneratingVoice(false);
    }
  };

  const selectVoice = (voice: VoicePreset) => {
    if (voiceConfirmed) {
      return;
    }

    setSelectedVoiceId(voice.id);
    setConfirmedVoiceId((current) => current === voice.id ? current : "");
    setVoiceGenerationCount(0);
    setRealVoicePreviewKey("");
    setPlayingVoiceId("");
    setVoicePreviewCompleted(false);
    setActiveAudioUrl("");
    setVoicePreviewStatus(`${voice.name} is selected. Confirm this voice or play a preview if you want to hear it first.`);
  };

  const confirmVoice = (voice?: VoicePreset) => {
    const voiceToConfirm = voice || selectedVoice;

    if (!voiceToConfirm) {
      setVoicePreviewStatus("Choose a voice before confirming.");
      return;
    }

    setSelectedVoiceId(voiceToConfirm.id);
    setConfirmedVoiceId(voiceToConfirm.id);
    setVoicePreviewCompleted(true);
    setVoicePreviewStatus(`${voiceToConfirm.name} is selected. You can tune the settings or play a preview if needed.`);
  };

  useEffect(() => {
    return () => {
      if (generatedAudioUrlRef.current) {
        URL.revokeObjectURL(generatedAudioUrlRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts for the workflow board: delete / copy / paste / duplicate the current selection.
  useEffect(() => {
    if (step !== 3) {
      return;
    }

    const handleWorkflowKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target && (target.closest("input, textarea, select, [contenteditable='true']") || target.isContentEditable)) {
        return;
      }

      const accel = event.metaKey || event.ctrlKey;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedCustomNodeIds.length) {
        event.preventDefault();
        deleteWorkflowSelection();
        return;
      }

      if (accel && (event.key === "c" || event.key === "C") && selectedWorkflowNodeIds.length) {
        event.preventDefault();
        copyWorkflowSelection();
        return;
      }

      if (accel && (event.key === "v" || event.key === "V") && workflowClipboard.length) {
        event.preventDefault();
        pasteWorkflowClipboard();
        return;
      }

      if (accel && (event.key === "d" || event.key === "D") && selectedCustomNodeIds.length) {
        event.preventDefault();
        duplicateWorkflowSelection();
        return;
      }

      if (event.key === "Escape" && selectedWorkflowNodeIds.length) {
        setSelectedWorkflowNodeIds([]);
        setInspectedWorkflowNodeId(null);
      }
    };

    window.addEventListener("keydown", handleWorkflowKey);

    return () => window.removeEventListener("keydown", handleWorkflowKey);
  }, [step, selectedWorkflowNodeIds, selectedCustomNodeIds, workflowClipboard, activeCustomApps, activeCustomActions, activeWorkspaceAgent.id]);

  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <a className="brand" href="/" aria-label="RelayClarity home">
          <img src={relayclarityLogoUrl} alt="RelayClarity" />
        </a>
        <div className="onboarding-progress" aria-label="Setup progress">
          {setupSteps.map((item, index) => (
            <button
              className={[
                index === step ? "is-active" : "",
                stepCompletion[index] ? "is-complete" : "",
                !canOpenStep(index) ? "is-locked" : ""
              ].filter(Boolean).join(" ")}
              type="button"
              onClick={() => {
                if (canOpenStep(index)) {
                  setStep(index);
                }
              }}
              disabled={!canOpenStep(index)}
              key={item}
            >
              <span>{index + 1}</span>
              <b>{item}</b>
            </button>
          ))}
        </div>
        <div className="onboarding-topbar-actions">
          <div className="account-chip" aria-label={`Signed in as ${user.email}`}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.name.slice(0, 1).toUpperCase()}</span>}
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button className="quiet-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="onboarding-card" aria-label="Account setup wizard">
        <div className="onboarding-main">
          <motion.section className="onboarding-step-card" layout>
              <AnimatePresence mode="wait">
                <motion.div
                  className="onboarding-step"
                  key={step}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.985 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 ? (
                    <div className="workspace-step">
	                      {!hasBusinessType ? (
	                        <div className="workspace-start-panel">
	                          <div className="simple-workspace-form">
	                            <label className="workspace-field">
	                              <span>Business name</span>
		                              <input
		                                type="text"
		                                value={workspaceName}
	                                  onChange={(event) => setWorkspaceName(event.target.value)}
		                                placeholder="Enter business name"
		                              />
	                            </label>
		                            <label className="workspace-field">
		                              <span>Business type</span>
	                              <input
	                                type="text"
	                                value={businessTypeDraft}
	                                onChange={(event) => setBusinessTypeDraft(event.target.value)}
	                                onKeyDown={(event) => {
	                                  if (event.key === "Enter" && businessSuggestions[0]) {
	                                    event.preventDefault();
	                                    selectBusinessSuggestion(businessSuggestions[0]);
		                                  }
		                                }}
			                                placeholder="Describe your business"
			                                />
		                            </label>
                          </div>
                          {businessSuggestions.length > 0 ? (
                            <motion.div
                              className="business-suggestion-list"
                              aria-label="Suggested business types"
                              initial="hidden"
                              animate="visible"
                              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                            >
                              {businessSuggestions.map((suggestion) => (
                                <motion.button
                                  type="button"
                                  onClick={() => selectBusinessSuggestion(suggestion)}
                                  variants={{
                                    hidden: { opacity: 0, y: 14, scale: 0.98 },
                                    visible: { opacity: 1, y: 0, scale: 1 }
                                  }}
                                  transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                                  key={`${suggestion.entry?.code || suggestion.label}-${suggestion.label}`}
                                >
                                  <span>{suggestion.label}</span>
                                </motion.button>
                              ))}
                            </motion.div>
                          ) : null}
                        </div>
	                      ) : null}
	                      {hasBusinessType ? (
	                        <motion.div
	                          className={`workspace-confirmation-panel ${isTailoring ? "is-loading" : ""}`}
	                          key={`${playbook.id}-${confirmedBusinessType}`}
	                          initial={{ opacity: 0, y: 24, scale: 0.98 }}
	                          animate={{ opacity: 1, y: 0, scale: 1 }}
	                          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
	                        >
	                          <div className="workspace-capability-builder" aria-label="Select Zoom AI capabilities">
	                            <nav className="workspace-capability-rail" aria-label="Capability categories">
	                              {groupedZoomAiCapabilities.map((group) => {
	                                const selectedInGroup = group.items.filter((goal) => selectedCapabilities.includes(goal.title)).length;
	                                const isActiveGroup = group.title === activeCapabilityGroup?.title;

	                                return (
	                                  <button
	                                    className={isActiveGroup ? "is-active" : ""}
	                                    type="button"
	                                    aria-current={isActiveGroup ? "step" : undefined}
	                                    onClick={() => {
	                                      setActiveCapabilityCategory(group.title);
	                                      setFocusedCapabilityTitle(group.items[0]?.title || "");
	                                    }}
	                                    key={group.title}
	                                  >
	                                    <span>{group.title}</span>
	                                    <strong>{selectedInGroup ? `${selectedInGroup} selected` : `${group.items.length} choices`}</strong>
	                                  </button>
	                                );
	                              })}
	                            </nav>

	                            <section className="workspace-capability-stage" aria-label={activeCapabilityGroup?.title || "Capabilities"}>
	                              <AnimatePresence mode="wait">
	                                <motion.div
	                                  className="workspace-capability-stage-inner"
	                                  key={activeCapabilityGroup?.title || "capabilities"}
	                                  initial={{ opacity: 0, x: 18, filter: "blur(8px)" }}
	                                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
	                                  exit={{ opacity: 0, x: -14, filter: "blur(6px)" }}
	                                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
	                                >
	                                  <div className="workspace-capability-choice-list">
	                                    {activeCapabilityGroup?.items.map((goal, itemIndex) => {
	                                      const isCapabilitySelected = selectedCapabilities.includes(goal.title);
	                                      const isCapabilityFocused = focusedCapability?.title === goal.title;

	                                      return (
	                                        <motion.button
	                                          className={[
	                                            "workspace-capability-choice",
	                                            isCapabilitySelected ? "is-selected" : "",
	                                            isCapabilityFocused ? "is-focused" : ""
	                                          ].filter(Boolean).join(" ")}
	                                          type="button"
	                                          aria-pressed={isCapabilitySelected}
	                                          onMouseEnter={() => setFocusedCapabilityTitle(goal.title)}
	                                          onFocus={() => setFocusedCapabilityTitle(goal.title)}
	                                          onClick={() => {
	                                            setFocusedCapabilityTitle(goal.title);
	                                            toggleCapability(goal.title);
	                                          }}
	                                          initial={{ opacity: 0, y: 16 }}
	                                          animate={{ opacity: 1, y: 0 }}
	                                          transition={{ delay: itemIndex * 0.035, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
	                                          key={goal.title}
	                                        >
	                                          <span className="workspace-capability-choice-mark" aria-hidden="true" />
	                                          <div className="workspace-capability-choice-text">
	                                            <strong>{goal.title}</strong>
	                                            <small>{goal.detail}</small>
	                                          </div>
	                                        </motion.button>
	                                      );
	                                    })}
	                                  </div>
	                                </motion.div>
	                              </AnimatePresence>
	                            </section>

	                            <aside className="workspace-capability-preview" aria-label="Capability preview and selected scope">
	                              <div className="workspace-capability-preview-main">
	                                <header className="workspace-capability-preview-head">
	                                  <span>What this does</span>
	                                  <strong>{focusedCapability?.title || "Pick a capability"}</strong>
	                                  <p>{focusedCapability?.detail || "Hover any capability to see what it does before you add it."}</p>
	                                </header>
	                                <div className="workspace-capability-preview-bullets">
	                                  <span>How it helps</span>
	                                  <ul>
	                                    {simpleCapabilityBullets(focusedCapability).map((bullet) => (
	                                      <li key={bullet.title}>
	                                        <strong>{bullet.title}</strong>
	                                        <span>{bullet.detail}</span>
	                                      </li>
	                                    ))}
	                                  </ul>
	                                </div>
	                              </div>
	                            </aside>
	                          </div>
	                        </motion.div>
	                      ) : null}
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="connector-step">
                      <div className="connector-picker">
	                        <div className="connector-tabs" role="tablist" aria-label="Connector group">
	                          <button className={connectorCategory === "core" ? "is-active" : ""} type="button" onClick={() => setConnectorCategory("core")}>
	                            Core
	                          </button>
	                          <button className={connectorCategory === "operations" ? "is-active" : ""} type="button" onClick={() => setConnectorCategory("operations")}>
	                            Operations
	                          </button>
                            <button className={connectorCategory === "growth" ? "is-active" : ""} type="button" onClick={() => setConnectorCategory("growth")}>
                              Growth
                            </button>
	                        </div>
                        <div className="connector-list">
                          {visibleConnectors.map((connector, index) => (
                            <motion.article
                              className={`${connector.connected ? "is-connected" : ""} ${connector.key === activeConnector.key ? "is-active" : ""}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.035 }}
                              key={connector.key}
                            >
                              <button type="button" onClick={() => setActiveConnectorKey(connector.key)}>
                                <ProviderLogo connector={connector} />
                                <span>{connector.provider}</span>
                                <strong>{connector.name}</strong>
                                <small>{connector.connected ? "Connected" : isRequiredConnector(connector.key) ? "Required" : "Optional"}</small>
                              </button>
                            </motion.article>
                          ))}
                        </div>
                        <div className="other-platform-note">
                          <span>Other platform</span>
                          <button
                            className="setup-integration-add-button"
                            type="button"
                            onClick={() => {
                              setSetupIntegrationCategory(connectorCategory);
                              setSetupLoginIntegration(null);
                              setIsSetupIntegrationModalOpen(true);
                            }}
                          >
                            <span aria-hidden="true">+</span>
                            <strong>Add integration</strong>
                            <small>CRM, booking, phone, or internal tool</small>
                          </button>
                        </div>
                      </div>
	                      <div className="connection-preview">
	                        <div className="connection-hero">
	                          <ProviderLogo connector={activeConnector} large />
	                          <div className="connection-hero-copy">
	                            <span>Selected system</span>
	                            <strong>{activeConnector.provider}</strong>
                              <p>{activeConnector.connected ? "Connected" : isRequiredConnector(activeConnector.key) ? "Required" : "Optional"}</p>
	                          </div>
	                        </div>
                        {!activeConnector.connected ? (
                          <div className="connection-actions">
                            <button className="dark-button" type="button" onClick={connectActiveConnector} disabled={isConnecting}>
                              {isConnecting ? "Connecting..." : `Connect ${activeConnector.provider}`}
                            </button>
                          </div>
                        ) : null}
                        <div className={`connection-status-panel ${activeConnector.connected ? "is-linked" : ""}`} aria-live="polite">
	                          <div>
	                            <span>{activeConnectionLabel}</span>
	                            <strong>{activeTestLabel}</strong>
	                          </div>
                          <p>{activeStatusMessage}</p>
                          {activeTestChecks.length ? (
                            <div className="connection-check-list" aria-label={`${activeConnector.provider} test checks`}>
                              {activeTestChecks.map((check) => (
                                <span className={check.status === "passed" ? "is-passed" : ""} key={check.name}>
                                  <b>{check.name}</b>
                                  <small>{check.status}</small>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <AnimatePresence>
                    {demoAuthConnector ? (
                      <motion.div
                        className="demo-auth-overlay"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="demo-auth-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          className="demo-auth-modal"
                          initial={{ opacity: 0, y: 24, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 16, scale: 0.98 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="demo-auth-brand">
	                            <ProviderLogo connector={demoAuthConnector!} large />
                            <div>
                              <span>Sandbox authorization</span>
	                              <strong id="demo-auth-title">{demoAuthConnector!.provider}</strong>
                            </div>
                          </div>
                          <p>
	                            This creates a dashboard-only demo connection for testing the setup flow. It does not sign in to {demoAuthConnector!.provider} or access live account data.
                          </p>
	                          <label className="demo-auth-field">
	                            Work email
	                            <input
                              type="email"
                              value={demoAuthEmail}
                              onChange={(event) => setDemoAuthEmail(event.target.value)}
                              placeholder="name@company.com"
	                              autoFocus
	                            />
	                          </label>
	                          <label className="demo-auth-field">
	                            Demo approval code
	                            <input
	                              type="text"
	                              value={demoApprovalCode}
	                              onChange={(event) => setDemoApprovalCode(event.target.value)}
	                              placeholder="Enter any demo code"
	                              autoComplete="off"
	                            />
	                          </label>
	                          <div className="demo-auth-actions">
                            <button className="quiet-button" type="button" onClick={closeDemoAuth}>
                              Cancel
                            </button>
	                            <button className="dark-button" type="button" onClick={authorizeDemoConnector} disabled={!demoAuthEmail.trim() || !demoApprovalCode.trim()}>
	                              Authorize demo access
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {step === 3 ? (
                    <div className="agent-step">
                      {!agentsComplete ? (
                        <motion.section
                          className="agent-build-panel"
                          aria-live="polite"
                          initial={{ opacity: 0, y: 18, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -12, scale: 0.98 }}
                          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="agent-build-visual" aria-hidden="true">
                            <div className="agent-build-core">
                              <span className="agent-build-orbit"></span>
                              <span className="agent-build-orbit agent-build-orbit-inner"></span>
                              <b className="agent-build-logo"></b>
                            </div>
                          </div>
                          <div className="agent-build-copy">
                            <span>Building agent workspace</span>
                            <strong>Preparing {confirmedWorkspaceName}.</strong>
                            <p>Bringing your capabilities, systems, and {selectedVoice?.name || "chosen"} voice together into your first workflow.</p>
                          </div>
                          <div className="agent-build-checks" aria-label="Agent build progress">
                            <span className={agentBuildStepClass(0)}><b>Workspace</b><small>{confirmedBusinessType || playbook.label}</small></span>
                            <span className={agentBuildStepClass(1)}><b>Systems</b><small>{connectedCount} connected</small></span>
                            <span className={agentBuildStepClass(2)}><b>Voice</b><small>{selectedVoice?.name || "Selected voice"}</small></span>
                            <span className={agentBuildStepClass(3)}><b>Workflow</b><small>{selectedZoomCapabilityCount} capabilities</small></span>
                          </div>
                        </motion.section>
                      ) : (
                      <motion.section
                        className="agent-workflow-panel"
                        aria-label="Agent workflow builder"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="agent-workflow-canvas">
                          <div className="workflow-ide-shell">
                            <aside className="workflow-agent-sidebar" aria-label="Agents">
                              <div className="workflow-sidebar-title">
                                <div>
                                  <span>Agents</span>
                                  <strong>{workspaceAgents.length}</strong>
                                </div>
                                <button type="button" className="workflow-sidebar-add" onClick={addWorkflowAgent}><span aria-hidden="true">+</span> Add</button>
                              </div>
                              <div className="workflow-agent-nav">
                                {workspaceAgents.map((agent) => (
                                  <div
                                    className={[
                                      "workflow-agent-item",
                                      activeWorkspaceAgent.id === agent.id ? "is-active" : "",
                                      reviewedAgentIds.includes(agent.id) ? "is-reviewed" : ""
                                    ].filter(Boolean).join(" ")}
                                    onContextMenu={(event) => openWorkflowContextMenu(event, "agent", { agentId: agent.id })}
                                    key={agent.id}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWorkflowAgentId(agent.id);
                                        setInspectedWorkflowNodeId(null);
                                        setReviewedAgentIds((current) => current.includes(agent.id) ? current : [...current, agent.id]);
                                      }}
                                    >
                                      <span>{agent.label}</span>
                                      <strong>{agent.name}</strong>
                                      <small>{agent.job}</small>
                                    </button>
                                    <button
                                      className="workflow-agent-delete"
                                      type="button"
                                      aria-label={`Delete ${agent.name}`}
                                      onClick={() => deleteWorkflowAgent(agent.id)}
                                      disabled={workspaceAgents.length <= 1}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </aside>
                            <section className="workflow-workspace" aria-label={`${activeWorkspaceAgent.name} workspace`}>
                              <div className="workflow-workspace-topbar">
                                <div>
                                  <span>{activeWorkspaceAgent.label}</span>
                                  <strong>{activeWorkspaceAgent.name}</strong>
                                </div>
                                <div className="workflow-toolbar" aria-label="Workspace tools">
                                  <button
                                    type="button"
                                    className="workflow-toolbar-button"
                                    onClick={() => setWorkflowAddPicker("app")}
                                    disabled={!connectedWorkflowConnectors.length && !workflowIntegrations.length}
                                  >
                                    <span aria-hidden="true">+</span> App
                                  </button>
                                  <button
                                    type="button"
                                    className="workflow-toolbar-button"
                                    onClick={() => setWorkflowAddPicker("action")}
                                  >
                                    <span aria-hidden="true">+</span> Action
                                  </button>
                                  <button type="button" className="workflow-toolbar-button is-primary" onClick={addWorkflowAgent}>
                                    <span aria-hidden="true">+</span> Agent
                                  </button>
                                </div>
                              </div>
                              <div
                                className="workflow-workspace-board"
                                ref={workflowCanvasRef}
                                onContextMenu={(event) => openWorkflowContextMenu(event, "board")}
                                onPointerDown={startWorkflowMarquee}
                                onPointerMove={moveWorkflowMarquee}
                                onPointerUp={stopWorkflowMarquee}
                                onPointerCancel={stopWorkflowMarquee}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "copy";
                                }}
                                onDrop={dropWorkflowDrawerItem}
                              >
                                <div className="workflow-board-hint" aria-hidden="true">Drag the cards to arrange your flow · right-click for more</div>
                                {workflowContextMenu ? createPortal(
                                  <div
                                    className="workflow-context-menu"
                                    style={{ left: workflowContextMenu.x, top: workflowContextMenu.y }}
                                    role="menu"
                                    aria-label="Workspace editor menu"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    onContextMenu={(event) => event.preventDefault()}
                                  >
                                    <span>
                                      {workflowContextMenu.target === "agent"
                                        ? "Agent"
                                        : workflowContextMenu.target === "node"
                                          ? workflowNodeTitle(workflowContextMenu.nodeId || "")
                                          : "Workspace"}
                                    </span>
                                    {workflowContextMenu.target === "board" ? (
                                      <>
                                        <button type="button" role="menuitem" onClick={() => { addWorkflowAction(boardDropPosition(workflowContextMenu.x, workflowContextMenu.y)); setWorkflowContextMenu(null); }}>Add action</button>
                                        <button type="button" role="menuitem" onClick={() => { addWorkflowAgent(); setWorkflowContextMenu(null); }}>Add agent</button>
                                        <button type="button" role="menuitem" onClick={() => { if (connectedWorkflowConnectors[0]) { addWorkflowConnector(connectedWorkflowConnectors[0].key); addWorkflowApp(connectedWorkflowConnectors[0].key, boardDropPosition(workflowContextMenu.x, workflowContextMenu.y)); } setWorkflowContextMenu(null); }} disabled={!connectedWorkflowConnectors.length}>Add app</button>
                                        <button type="button" role="menuitem" onClick={() => { pasteWorkflowClipboard(); setWorkflowContextMenu(null); }} disabled={!workflowClipboard.length}>Paste<small>⌘V</small></button>
                                        <button type="button" role="menuitem" onClick={() => { resetWorkflowLayout(); setWorkflowContextMenu(null); }}>Reset layout</button>
                                      </>
                                    ) : null}
                                    {workflowContextMenu.target === "agent" && workflowContextMenu.agentId ? (
                                      <>
                                        <button type="button" role="menuitem" onClick={() => { setSelectedWorkflowAgentId(workflowContextMenu.agentId!); setWorkflowContextMenu(null); }}>Open<small>↵</small></button>
                                        <button type="button" role="menuitem" onClick={() => { renameWorkflowAgent(workflowContextMenu.agentId!); setWorkflowContextMenu(null); }}>Rename<small>F2</small></button>
                                        <button type="button" role="menuitem" onClick={() => { copyWorkflowText(workflowAgentClipboardText(workflowContextMenu.agentId!)); setWorkflowContextMenu(null); }}>Copy<small>⌘C</small></button>
                                        <button type="button" role="menuitem" onClick={() => { duplicateWorkflowAgent(workflowContextMenu.agentId!); setWorkflowContextMenu(null); }}>Duplicate<small>⌘D</small></button>
                                        <button type="button" role="menuitem" onClick={() => { deleteWorkflowAgent(workflowContextMenu.agentId!); setWorkflowContextMenu(null); }} disabled={workspaceAgents.length <= 1}>Delete<small>⌫</small></button>
                                      </>
                                    ) : null}
                                    {workflowContextMenu.target === "node" && workflowContextMenu.nodeId ? (
                                      <>
                                        {selectedWorkflowNodeIds.length > 1 ? (
                                          <small className="workflow-context-count">{selectedWorkflowNodeIds.length} selected</small>
                                        ) : null}
                                        <button type="button" role="menuitem" onClick={() => { setSelectedWorkflowNodeIds([workflowContextMenu.nodeId!]); setInspectedWorkflowNodeId(workflowContextMenu.nodeId!); setWorkflowContextMenu(null); }}>Details<small>↵</small></button>
                                        <button type="button" role="menuitem" onClick={() => { renameWorkflowNode(workflowContextMenu.nodeId!); setWorkflowContextMenu(null); }} disabled={workflowContextMenu.nodeId === "systems" || selectedWorkflowNodeIds.length > 1}>Rename<small>F2</small></button>
                                        <button type="button" role="menuitem" onClick={() => { copyWorkflowSelection(); setWorkflowContextMenu(null); }}>Copy<small>⌘C</small></button>
                                        <button type="button" role="menuitem" onClick={() => { pasteWorkflowClipboard(); setWorkflowContextMenu(null); }} disabled={!workflowClipboard.length}>Paste<small>⌘V</small></button>
                                        <button type="button" role="menuitem" onClick={() => { duplicateWorkflowSelection(); setWorkflowContextMenu(null); }} disabled={!selectedCustomNodeIds.length}>Duplicate<small>⌘D</small></button>
                                        <button type="button" role="menuitem" onClick={() => { deleteWorkflowSelection(); setWorkflowContextMenu(null); }} disabled={!selectedCustomNodeIds.length}>Delete<small>⌫</small></button>
                                      </>
                                    ) : null}
                                  </div>,
                                  document.getElementById("root") || document.body
                                ) : null}
                                {workflowCopyToast ? createPortal(
                                  <div className="workflow-copy-toast" role="status">Copied to clipboard</div>,
                                  document.getElementById("root") || document.body
                                ) : null}
                                {marqueeStyle ? <div className="workflow-selection-marquee" style={marqueeStyle} aria-hidden="true" /> : null}
                                <svg
                                  className="workflow-connection-layer"
                                  viewBox={`0 0 ${workflowBoardSize.width} ${workflowBoardSize.height}`}
                                  aria-hidden="true"
                                >
                                  {workflowConnections.map((connection) => (
                                    <path
                                      className={connection.connected ? "is-connected" : "is-disconnected"}
                                      d={connection.path}
                                      key={`${connection.from}-${connection.to}`}
                                    />
                                  ))}
                                </svg>
                                <article
                                  className={`workflow-node workflow-trigger ${selectedWorkflowNodeIds.includes("trigger") ? "is-selected" : ""}`}
                                  data-workflow-node-id="trigger"
                                  style={workflowNodeOffsetStyle("trigger")}
                                  onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: "trigger" })}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("trigger", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "trigger")}
                                  onPointerCancel={cancelWorkspaceNodeDrag}
                                  onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                  tabIndex={0}
                                >
                                  <b>Trigger</b>
                                  <strong>{workflowNodeContent.trigger.title}</strong>
                                  <p>{workflowNodeContent.trigger.detail}</p>
                                </article>
                                <article
                                  className={`workflow-node workflow-agent ${selectedWorkflowNodeIds.includes("instructions") ? "is-selected" : ""}`}
                                  data-workflow-node-id="instructions"
                                  style={workflowNodeOffsetStyle("instructions")}
                                  onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: "instructions" })}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("instructions", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "instructions")}
                                  onPointerCancel={cancelWorkspaceNodeDrag}
                                  onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                  tabIndex={0}
                                >
                                  <b>Instructions</b>
                                  <strong>{workflowNodeContent.instructions.title}</strong>
                                  <p>{workflowNodeContent.instructions.detail}</p>
                                </article>
                                <div
                                  className={`workflow-tool-panel ${selectedWorkflowNodeIds.includes("systems") ? "is-selected" : ""}`}
                                  data-workflow-node-id="systems"
                                  aria-label={`${activeWorkspaceAgent.label} connected systems`}
                                  style={workflowNodeOffsetStyle("systems")}
                                  onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: "systems" })}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("systems", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "systems")}
                                  onPointerCancel={cancelWorkspaceNodeDrag}
                                  onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                >
                                  <b>Connected systems</b>
                                  <div>
                                    {activeWorkspaceConnectors.map((connector) => (
                                      <span className={`workflow-system-chip ${connector.connected ? "is-connected" : "is-required"}`} title={connector.provider} key={connector.key}>
                                        <ProviderLogo connector={connector} />
                                        <em>{connector.provider}</em>
                                      </span>
                                    ))}
                                    {!activeWorkspaceConnectors.length ? (
                                      <span className="workflow-system-chip is-empty">
                                        <em>Connect systems first</em>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <article
                                  className={`workflow-node workflow-action-a ${selectedWorkflowNodeIds.includes("outcome") ? "is-selected" : ""}`}
                                  data-workflow-node-id="outcome"
                                  style={workflowNodeOffsetStyle("outcome")}
                                  onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: "outcome" })}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("outcome", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "outcome")}
                                  onPointerCancel={cancelWorkspaceNodeDrag}
                                  onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                  tabIndex={0}
                                >
                                  <b>Outcome</b>
                                  <strong>{workflowNodeContent.outcome.title}</strong>
                                  <p>{workflowNodeContent.outcome.detail}</p>
                                </article>
                                {activeCustomApps.map((app) => (
                                  <article
                                    className={`workflow-node workflow-board-app ${selectedWorkflowNodeIds.includes(app.id) ? "is-selected" : ""}`}
                                    data-workflow-node-id={app.id}
                                    style={workflowNodeOffsetStyle(app.id)}
                                    onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: app.id })}
                                    onPointerDown={(event) => startWorkspaceNodeDrag(app.id, event)}
                                    onPointerMove={moveWorkspaceNodeDrag}
                                    onPointerUp={(event) => stopWorkspaceNodeDrag(event, app.id)}
                                    onPointerCancel={cancelWorkspaceNodeDrag}
                                    onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                    key={app.id}
                                  >
                                    <b>App</b>
                                    <strong>{app.name}</strong>
                                    <p>{app.detail}</p>
                                  </article>
                                ))}
                                {activeCustomActions.map((action) => (
                                  <article
                                    className={`workflow-node workflow-board-action ${selectedWorkflowNodeIds.includes(action.id) ? "is-selected" : ""}`}
                                    data-workflow-node-id={action.id}
                                    style={workflowNodeOffsetStyle(action.id)}
                                    onContextMenu={(event) => openWorkflowContextMenu(event, "node", { nodeId: action.id })}
                                    onPointerDown={(event) => startWorkspaceNodeDrag(action.id, event)}
                                    onPointerMove={moveWorkspaceNodeDrag}
                                    onPointerUp={(event) => stopWorkspaceNodeDrag(event, action.id)}
                                    onPointerCancel={cancelWorkspaceNodeDrag}
                                    onLostPointerCapture={() => setActiveWorkflowNodeDrag(null)}
                                    key={action.id}
                                  >
                                    <b>Action</b>
                                    <strong>{action.name}</strong>
                                    <p>{action.detail}</p>
                                  </article>
                                ))}
                                {inspectedWorkflowNode ? (
                                  <aside
                                    className="workflow-inspector"
                                    aria-label={`${inspectedWorkflowNode.title} details`}
                                    onPointerDown={(event) => event.stopPropagation()}
                                  >
                                    <header className="workflow-inspector-head">
                                      <div>
                                        <span>{inspectedWorkflowNode.kind}</span>
                                        <strong>{inspectedWorkflowNode.title}</strong>
                                      </div>
                                      <button
                                        type="button"
                                        className="workflow-inspector-close"
                                        aria-label="Close details"
                                        onClick={() => {
                                          setInspectedWorkflowNodeId(null);
                                          setSelectedWorkflowNodeIds([]);
                                        }}
                                      >
                                        ×
                                      </button>
                                    </header>
                                    <p className="workflow-inspector-detail">{inspectedWorkflowNode.detail}</p>
                                    {inspectedWorkflowNode.facts.length ? (
                                      <dl className="workflow-inspector-facts">
                                        {inspectedWorkflowNode.facts.map((fact) => (
                                          <div key={`${fact.label}-${fact.value}`} data-tone={fact.tone || "neutral"}>
                                            <dt>{fact.label}</dt>
                                            <dd>{fact.value}</dd>
                                          </div>
                                        ))}
                                      </dl>
                                    ) : null}
                                  </aside>
                                ) : null}
                              </div>
                            </section>
                          </div>
                        </div>
                      </motion.section>
                      )}
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className={`voice-step ${voiceConfirmed ? "is-confirmed-layout" : ""}`}>
                      <motion.section
                        className="voice-lab"
                        initial={{ opacity: 0, y: 18, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="voice-face-stage">
                          <section className="voice-face-grid" aria-label="Choose a voice agent">
                            <AnimatePresence mode="popLayout">
                            {(voiceConfirmed && selectedVoice ? [selectedVoice] : elevenLabsVoices).map((voice, index) => (
                              <motion.article
                                className={[
                                  "voice-face-card",
                                  selectedVoiceId === voice.id ? "is-active" : "",
                                  playingVoiceId === voice.id ? "is-playing" : "",
                                  confirmedVoiceId === voice.id ? "is-confirmed" : ""
                                ].filter(Boolean).join(" ")}
                                role={voiceConfirmed ? "img" : "button"}
                                tabIndex={voiceConfirmed ? -1 : 0}
                                onClick={() => {
                                  if (!voiceConfirmed) {
                                    selectVoice(voice);
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (!voiceConfirmed) {
                                    confirmVoice(voice);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (voiceConfirmed) {
                                    return;
                                  }

                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectVoice(voice);
                                  }
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 24, scale: 0.92 }}
                                layout
                                transition={{ duration: voiceConfirmed ? 0.48 : 0.28, delay: voiceConfirmed ? 0 : index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                key={voice.id}
                              >
                                <img src={voice.imageUrl} alt={`${voice.name}, ${voice.role} voice agent`} />
                                <span className="voice-face-play" aria-hidden="true">
                                  <i></i>
                                  <i></i>
                                  <i></i>
                                </span>
                                <div className="voice-face-copy">
                                  <strong>{voice.name}</strong>
                                  <small>{voice.tone}</small>
                                </div>
                                <AnimatePresence initial={false}>
                                  {!voiceConfirmed && selectedVoiceId === voice.id ? (
                                    <motion.span
                                      className="voice-confirm-overlay"
                                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          confirmVoice(voice);
                                        }}
                                      >
                                        <span>{confirmedVoiceId === voice.id ? "Selected voice" : "Double-click or press"}</span>
                                        <strong>{confirmedVoiceId === voice.id ? `${voice.name} confirmed` : `Confirm ${voice.name}`}</strong>
                                      </button>
                                    </motion.span>
                                  ) : null}
                                </AnimatePresence>
                              </motion.article>
                            ))}
                            </AnimatePresence>
                          </section>

                          <AnimatePresence>
                            {voiceConfirmed && selectedVoice ? (
                              <motion.section
                                className="voice-settings-drop"
                                aria-label={`${selectedVoice.name} voice settings`}
                                initial={{ opacity: 0, y: -28, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -18, height: 0 }}
                                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <div className="voice-settings-heading">
                                  <span>Voice setup</span>
                                  <strong>{selectedVoice.name} is ready for tuning.</strong>
                                  <p>{voicePreviewStatus}</p>
                                </div>
                                <div className="voice-settings-grid">
                                  <label>
                                    <span>Speed</span>
                                    <strong>{voiceSpeed.toFixed(2)}x</strong>
                                    <input
                                      type="range"
                                      min="0.7"
                                      max="1.2"
                                      step="0.01"
                                      value={voiceSpeed}
                                      onChange={(event) => setVoiceSpeed(Number(event.target.value))}
                                    />
                                  </label>
                                  <label>
                                    <span>Stability</span>
                                    <strong>{voiceStability}%</strong>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={voiceStability}
                                      onChange={(event) => setVoiceStability(Number(event.target.value))}
                                    />
                                  </label>
                                  <label>
                                    <span>Clarity</span>
                                    <strong>{voiceSimilarity}%</strong>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={voiceSimilarity}
                                      onChange={(event) => setVoiceSimilarity(Number(event.target.value))}
                                    />
                                  </label>
                                  <label>
                                    <span>Style</span>
                                    <strong>{voiceStyle}%</strong>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={voiceStyle}
                                      onChange={(event) => setVoiceStyle(Number(event.target.value))}
                                    />
                                  </label>
                                  <label className="voice-toggle-setting">
                                    <span>Speaker boost</span>
                                    <strong>{voiceSpeakerBoost ? "On" : "Off"}</strong>
                                    <input
                                      type="checkbox"
                                      checked={voiceSpeakerBoost}
                                      onChange={(event) => setVoiceSpeakerBoost(event.target.checked)}
                                    />
                                  </label>
                                </div>
                                <div className="voice-settings-summary">
                                  <div>
                                    <span>Preview</span>
                                    <strong>Hear this voice</strong>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={updateVoicePreview}
                                    disabled={isRegeneratingVoice}
                                  >
                                    {isRegeneratingVoice
                                      ? "Playing..."
                                      : "Play"}
                                  </button>
                                </div>
                              </motion.section>
                            ) : null}
                          </AnimatePresence>

                          <audio
                            ref={audioRef}
                            src={activeAudioUrl || undefined}
                            preload="auto"
                            onPlay={() => setPlayingVoiceId(selectedVoiceId)}
                            onPause={() => setPlayingVoiceId("")}
                            onEnded={() => setPlayingVoiceId("")}
                            hidden
                          />

                        </div>
                      </motion.section>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="test-step">
                      <motion.section
                        className="launch-tests"
                        data-state={testRunState}
                        aria-live="polite"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <header className="launch-tests-head">
                          <div className="launch-tests-heading">
                            <span>
                              Launch tests
                              {testMode === "simulated" ? " · Simulated (no AI key)" : testMode === "real" ? " · Live agent eval" : ""}
                            </span>
                            <strong>
                              {testRunState === "complete"
                                ? testsPassed ? "Ready to launch" : "Needs setup"
                                : testRunState === "running" ? "Testing in progress" : "Auto-starting"}
                            </strong>
                            <p>
                              {testRunState === "complete"
                                ? testsPassed
                                  ? "Every caller scenario passed. You're clear to launch."
                                  : "Some scenarios need setup before this agent can launch."
                                : testRunState === "running"
                                  ? `Running scenario ${Math.min(completedRunCount + 1, playbook.tests.length)} of ${playbook.tests.length}.`
                                  : "Tests start automatically and check the agent against real caller scenarios."}
                            </p>
                          </div>
                          <button className="launch-tests-run" type="button" onClick={runLaunchTests} disabled={testRunState === "running"}>
                            {testRunState === "running" ? "Running…" : testRunState === "complete" ? "Run again" : "Run tests"}
                          </button>
                        </header>

                        <div className="launch-tests-stats">
                          <article data-tone={launchGateScore >= 90 ? "pass" : "idle"}>
                            <span>Launch score</span>
                            <strong>{launchGateScore}%</strong>
                            <small>{launchGateScore >= 90 ? "Meets launch threshold" : "90% required to launch"}</small>
                          </article>
                          <article>
                            <span>Scenarios passed</span>
                            <strong>
                              {scenarioResults.slice(0, completedRunCount).filter((result) => result.passed).length}
                              <i>/ {playbook.tests.length}</i>
                            </strong>
                            <small>{testRunState === "complete" ? "Run complete" : testRunState === "running" ? "Evaluating…" : "Not started"}</small>
                          </article>
                          <article data-tone={testRunState === "complete" ? (testsPassed ? "pass" : "warn") : "idle"}>
                            <span>Status</span>
                            <strong>{testRunState === "complete" ? (testsPassed ? "Passed" : "Action needed") : testRunState === "running" ? "Testing" : "Queued"}</strong>
                            <small>{testRunState === "running" ? `${testProgress}% complete` : `${playbook.tests.length} caller scenarios`}</small>
                          </article>
                        </div>

                        <div
                          className="launch-tests-bar"
                          role="progressbar"
                          aria-valuenow={testProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Launch test progress"
                        >
                          <i style={{ width: `${testProgress}%` }} />
                        </div>

                        <div className="launch-tests-body">
                          <ol className="launch-tests-list" aria-label="Caller scenarios">
                            {playbook.tests.map((scenario, index) => {
                              const isCurrent = testRunState === "running" && activeRunIndex === index;
                              const isDone = completedRunCount > index;
                              const result = scenarioResults[index];
                              const status = isDone ? (result?.passed ? "pass" : "warn") : isCurrent ? "running" : "queued";
                              const statusLabel = isDone ? (result?.passed ? "Passed" : "Needs setup") : isCurrent ? "Running" : "Queued";

                              return (
                                <li key={scenario.title}>
                                  <button
                                    className={scenarioIndex === index ? "is-active" : ""}
                                    data-status={status}
                                    type="button"
                                    aria-pressed={scenarioIndex === index}
                                    onClick={() => {
                                      setScenarioIndex(index);
                                      if (testRunState !== "running") {
                                        setActiveRunIndex(index);
                                      }
                                    }}
                                  >
                                    <span className="launch-tests-index">{index + 1}</span>
                                    <span className="launch-tests-meta">
                                      <strong>{scenario.title}</strong>
                                      <small>{scenario.label}</small>
                                    </span>
                                    <span className="launch-tests-status" data-status={status}>
                                      {isCurrent ? <i className="launch-tests-spinner" aria-hidden="true" /> : null}
                                      {statusLabel}
                                    </span>
                                    <b className="launch-tests-score">
                                      {isDone || testRunState === "complete" ? `${result?.score ?? scenario.score}%` : "—"}
                                    </b>
                                  </button>
                                </li>
                              );
                            })}
                          </ol>

                          <aside
                            className="launch-tests-detail"
                            data-status={completedRunCount > scenarioIndex ? (selectedScenarioResult.passed ? "pass" : "warn") : "idle"}
                            aria-label="Scenario detail"
                          >
                            <header>
                              <span>{selectedScenario.label}</span>
                              <strong>{selectedScenario.title}</strong>
                            </header>
                            <div className="launch-tests-detail-score">
                              <b>{detailScoreLabel}</b>
                              <span>{detailStatusLabel}</span>
                            </div>
                            <p>{selectedScenarioResult.result}</p>
                            <ul className="launch-tests-checks">
                              {detailChecks.map((check, checkIndex) => {
                                const isDoing = isActiveRunningScenario && checkIndex === detailChecks.length - 1;
                                return (
                                  <li
                                    key={check.name}
                                    data-pass={check.passed ? "true" : "false"}
                                    data-state={isDoing ? "doing" : "done"}
                                  >
                                    {isDoing ? (
                                      <i className="launch-tests-check-spinner" aria-hidden="true" />
                                    ) : (
                                      <i aria-hidden="true">{check.passed ? "✓" : "!"}</i>
                                    )}
                                    <span className="launch-tests-check-name">{check.name}</span>
                                    {isDoing ? <b className="launch-tests-check-doing">Checking…</b> : null}
                                  </li>
                                );
                              })}
                            </ul>
                          </aside>
                        </div>
                      </motion.section>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <section className={`launch-final ${launchRequestSubmitted ? "is-submitted" : ""}`}>
                      <header className="launch-final-head">
                        <span>Confirm</span>
                        <strong>{launchRequestSubmitted ? "Request sent" : "Confirm your details"}</strong>
                        <p>
                          {launchRequestSubmitted
                            ? "An engineer will be in touch within 48 hours to take this live."
                            : "Review your setup, add your live details, then send it over."}
                        </p>
                      </header>

                      <div className="launch-final-block-head">
                        <span>Setup</span>
                        <button type="button" className="launch-final-edit" onClick={() => setStep(0)}>Edit</button>
                      </div>
                      <dl className="launch-final-summary">
                        {launchSummaryRows.map((row) => (
                          <div key={row.label}>
                            <dt>{row.label}</dt>
                            <dd>
                              <strong>{row.value}</strong>
                              {row.hint ? <span>{row.hint}</span> : null}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="launch-final-agents">
                        <header>
                          <span>Agents</span>
                          <strong>{workspaceAgents.length}</strong>
                          <button type="button" className="launch-final-edit" onClick={() => setStep(3)}>Edit</button>
                        </header>
                        <ul>
                          {workspaceAgents.map((agent) => (
                            <li key={agent.id}>
                              <div>
                                <strong>{agent.name}</strong>
                                <span>{agent.label}</span>
                              </div>
                              <small>{agent.trigger}</small>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="launch-final-block-head">
                        <span>Live details</span>
                      </div>
                      <div className="launch-final-details">
                        <label data-state={websiteError ? "invalid" : isValidWebsite ? "valid" : "idle"}>
                          <span>Website</span>
                          <input
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            value={websiteUrl}
                            onChange={(event) => {
                              setWebsiteUrl(event.target.value);
                              setLaunchRequestSubmitted(false);
                            }}
                            placeholder="https://yourcompany.com"
                            aria-invalid={websiteError}
                          />
                          {websiteError ? (
                            <small className="launch-final-error">Enter a full website, e.g. https://yourcompany.com</small>
                          ) : null}
                        </label>
                        <label data-state={phoneError ? "invalid" : isValidPhone ? "valid" : "idle"}>
                          <span>Phone contact</span>
                          <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phoneContactNumber}
                            onChange={(event) => {
                              setPhoneContactNumber(event.target.value);
                              setLaunchRequestSubmitted(false);
                            }}
                            placeholder="+1 555 010 1234"
                            aria-invalid={phoneError}
                          />
                          {phoneError ? (
                            <small className="launch-final-error">Enter a valid phone number (7\u201315 digits, with country code)</small>
                          ) : null}
                        </label>
                        <label className="launch-final-notes">
                          <span>Notes <i>Optional</i></span>
                          <textarea
                            value={otherPlatformNote}
                            onChange={(event) => {
                              setOtherPlatformNote(event.target.value);
                              setLaunchRequestSubmitted(false);
                            }}
                            placeholder="Anything else an engineer should know."
                            rows={2}
                          />
                        </label>
                      </div>

                      {launchRequestSubmitted ? (
                        <div className="launch-final-confirmation">
                          <span>Next step</span>
                          <strong>Engineer follow-up within 48 hours</strong>
                        </div>
                      ) : null}

                      {launchRequestSubmitted ? <pre className="premium-report">{report}</pre> : null}
                    </section>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="onboarding-actions">
                {!canContinue ? <span className="continue-requirement">{continueRequirement}</span> : null}
                <button className="quiet-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
                  Back
                </button>
                <button className="dark-button" type="button" onClick={nextStep} disabled={!canContinue}>
                  {step === setupSteps.length - 1 ? "Request engineer setup" : "Continue"}
                </button>
              </div>
          </motion.section>
        </div>
      </section>
      <AnimatePresence>
        {isSetupIntegrationModalOpen ? (
          <motion.div
            className="completed-integration-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-integration-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="completed-integration-modal"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <header>
                <div>
                  <span>{setupIntegrationCategories.find((category) => category.id === setupIntegrationCategory)?.label}</span>
                  <h2 id="setup-integration-modal-title">
                    {setupLoginIntegration
                      ? setupLoginIntegrationStage === "credentials"
                        ? "Connect " + setupLoginIntegration.company
                        : setupLoginIntegrationStage === "success"
                          ? setupLoginIntegration.company + " connected"
                        : setupLoginIntegrationStage === "blocked"
                          ? setupLoginIntegration.company + " needs setup"
                          : "Checking " + setupLoginIntegration.company
                      : "Add integration"}
                  </h2>
                </div>
                <button type="button" onClick={closeSetupIntegrationModal} aria-label="Close add integration modal">
                  ×
                </button>
              </header>
              <AnimatePresence mode="wait">
                {setupLoginIntegration ? (
                  <motion.div
                    className="completed-integration-login-state"
                    key={"setup-login-state-" + setupLoginIntegrationStage}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.img
                      src={setupLoginIntegration.logoUrl}
                      alt={setupLoginIntegration.company}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.08, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {setupLoginIntegrationStage === "credentials" ? (
                      <form className="completed-integration-login-form" onSubmit={submitSetupIntegrationLogin}>
                        <label>
                          Work email
                          <input
                            type="email"
                            value={setupLoginIntegrationEmail}
                            onChange={(event) => setSetupLoginIntegrationEmail(event.target.value)}
                            placeholder="name@company.com"
                            autoFocus
                          />
                        </label>
                        <label>
                          Required access notes
                          <input
                            type="text"
                            value={setupLoginIntegrationPassword}
                            onChange={(event) => setSetupLoginIntegrationPassword(event.target.value)}
                            placeholder="OAuth app, API key owner, webhook owner"
                          />
                        </label>
                        <button type="submit" disabled={!setupLoginIntegrationEmail.trim()}>
                          Connect integration
                        </button>
                        <button type="button" onClick={() => setSetupLoginIntegration(null)}>
                          Choose another integration
                        </button>
                      </form>
                    ) : (
                      <>
                        <div>
                          <span>{setupLoginIntegration.type}</span>
                          <strong>
                            {setupLoginIntegrationStage === "success"
                              ? setupLoginIntegration.company + " is connected"
                              : setupLoginIntegrationStage === "blocked"
                              ? setupLoginIntegration.company + " is not connected yet"
                              : "Checking " + setupLoginIntegration.company}
                          </strong>
                          <small>
                            {setupLoginIntegrationStage === "success"
                              ? "Connection complete. Updating your setup."
                              : setupLoginIntegrationStage === "blocked"
                              ? "A real OAuth, API key, or webhook connector is required before the agent can use this system."
                              : "Checking whether a real provider connector is available."}
                          </small>
                        </div>
                        <div className={"completed-integration-login-progress " + (setupLoginIntegrationStage === "success" ? "is-complete" : "")} aria-hidden="true">
                          <i></i>
                        </div>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="completed-integration-picker"
                    key="setup-picker-state"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {visibleSetupAddIntegrationCatalog.map((integration, index) => (
                      <motion.button
                        type="button"
                        aria-label={"Add " + integration.company + " " + integration.type + " integration"}
                        title={integration.company + " · " + integration.type}
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.035, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -3, scale: 1.025 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startSetupIntegrationLogin(integration)}
                        key={integration.company + "-" + integration.type}
                      >
                        <img
                          src={integration.logoUrl}
                          alt={integration.company}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                        <strong>{integration.company}</strong>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </motion.div>
        ) : null}
        {workflowAddPicker ? (
          <motion.div
            className="completed-integration-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-add-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setWorkflowAddPicker(null);
              }
            }}
          >
            <motion.section
              className="completed-integration-modal workflow-add-modal"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <header>
                <div>
                  <span>{activeWorkspaceAgent.name}</span>
                  <h2 id="workflow-add-modal-title">{workflowAddPicker === "app" ? "Add an app" : "Add an action"}</h2>
                  <p className="workflow-add-modal-subtitle">
                    {workflowAddPicker === "app"
                      ? "Drop a connected system into this agent's workflow."
                      : "Add a step you want this agent to carry out."}
                  </p>
                </div>
                <button type="button" onClick={() => setWorkflowAddPicker(null)} aria-label="Close add modal">
                  ×
                </button>
              </header>
              <div className="workflow-add-tabs" role="tablist" aria-label={workflowAddPicker === "app" ? "App categories" : "Action categories"}>
                {(workflowAddPicker === "app" ? workflowAppPanels : workflowActionPanels).map((panel, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={safeWorkflowAddTab === index}
                    className={`workflow-add-tab ${safeWorkflowAddTab === index ? "is-active" : ""}`}
                    key={panel.tab}
                    onClick={() => setWorkflowAddTab(index)}
                  >
                    {panel.tab}
                  </button>
                ))}
              </div>
              {workflowAddPicker === "app" ? (
                <div className="workflow-add-panel">
                  {workflowAppPanels[safeWorkflowAddTab] ? (
                    <div className="completed-integration-picker workflow-add-picker is-apps">
                      {workflowAppPanels[safeWorkflowAddTab].connected
                        ? (workflowAppPanels[safeWorkflowAddTab].apps as Connector[]).map((connector, index) => (
                            <motion.button
                              type="button"
                              key={connector.key}
                              aria-label={`Add ${connector.provider}`}
                              title={`${connector.provider} · ${connector.name}`}
                              initial={{ opacity: 0, y: 12, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.025, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              whileHover={{ y: -3, scale: 1.025 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                addWorkflowConnector(connector.key);
                                addWorkflowApp(connector.key);
                                setWorkflowAddPicker(null);
                              }}
                            >
                              <ProviderLogo connector={connector} large />
                              <strong>{connector.provider}</strong>
                              <small>{connector.name}</small>
                            </motion.button>
                          ))
                        : (workflowAppPanels[safeWorkflowAddTab].apps as Array<{ company: string; type: string; logoUrl: string }>).map((app, index) => (
                            <motion.button
                              type="button"
                              key={`${app.company}-${app.type}`}
                              aria-label={`Add ${app.company}`}
                              title={`${app.company} · ${app.type}`}
                              initial={{ opacity: 0, y: 12, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.025, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              whileHover={{ y: -3, scale: 1.025 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                addCustomWorkflowApp(app.company, app.type);
                                setWorkflowAddPicker(null);
                              }}
                            >
                              <img
                                src={app.logoUrl}
                                alt=""
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                              <strong>{app.company}</strong>
                              <small>{app.type}</small>
                            </motion.button>
                          ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="workflow-add-panel">
                  {workflowActionPanels[safeWorkflowAddTab] && workflowActionPanels[safeWorkflowAddTab].actions ? (
                    <div className="completed-integration-picker workflow-add-picker is-actions">
                      {workflowActionPanels[safeWorkflowAddTab].actions!.map((action, index) => (
                        <motion.button
                          type="button"
                          key={`${action.name}-${index}`}
                          aria-label={`Add ${action.name}`}
                          title={action.detail || action.name}
                          initial={{ opacity: 0, y: 12, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.025, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -3, scale: 1.025 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            addWorkflowAction(undefined, action.name, action.detail);
                            setWorkflowAddPicker(null);
                          }}
                        >
                          <span className="workflow-action-picker-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="img" focusable="false">
                              <path d="M13 2 4.5 13.2c-.4.5 0 1.3.7 1.3H11l-1 7.5 8.5-11.2c.4-.5 0-1.3-.7-1.3H12l1-7.5Z" />
                            </svg>
                          </span>
                          <span className="workflow-action-picker-copy">
                            <strong>{action.name}</strong>
                            {action.detail ? <small>{action.detail}</small> : null}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="completed-integration-picker workflow-add-picker is-actions">
                      <motion.button
                        type="button"
                        className="workflow-add-picker-custom"
                        aria-label="Add a custom action"
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -3, scale: 1.025 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const name = window.prompt("Name this action");
                          if (name && name.trim()) {
                            addWorkflowAction(undefined, name.trim());
                          }
                          setWorkflowAddPicker(null);
                        }}
                      >
                        <span className="workflow-add-picker-plus" aria-hidden="true">+</span>
                        <strong>Custom action</strong>
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function CompletedOnboardingDashboard({
  user,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onSignOut
}: {
  user: AuthUser;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onSignOut: () => void;
}) {
  const [activeRoute, setActiveRoute] = useState("ai");
  const [settingsTab, setSettingsTab] = useState("workspace");
  const [helpTab, setHelpTab] = useState("start");
  const [assistantInput, setAssistantInput] = useState("");
  const [introStage, setIntroStage] = useState<"title" | "chat">("title");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [showAgentInsights, setShowAgentInsights] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [workspaceAssistantStatus, setWorkspaceAssistantStatus] = useState<"idle" | "loading" | "error">("idle");
  const [workspaceAssistantError, setWorkspaceAssistantError] = useState("");
  const [workspaceAssistantCharts, setWorkspaceAssistantCharts] = useState<WorkspaceAssistantChart[]>([]);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const [activeMetricsTab, setActiveMetricsTab] = useState("overview");
  const [activeMetricFocus, setActiveMetricFocus] = useState<ActiveMetricFocus | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [openedLiveQueueId, setOpenedLiveQueueId] = useState<string | null>(null);
  const [joinedLiveChatIds, setJoinedLiveChatIds] = useState<string[]>([]);
  const [liveChatComposerText, setLiveChatComposerText] = useState("");
  const [adminLiveChatMessages, setAdminLiveChatMessages] = useState<Record<string, { id: string; text: string }[]>>({});
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [showAllHandoffs, setShowAllHandoffs] = useState(false);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const [launchGateRunState, setLaunchGateRunState] = useState<"idle" | "running" | "complete">("idle");
  const [launchTestActiveIndex, setLaunchTestActiveIndex] = useState(0);
  const [launchTestCompletedCount, setLaunchTestCompletedCount] = useState(0);
  const [launchTestSelectedIndex, setLaunchTestSelectedIndex] = useState(0);
  const [launchFixState, setLaunchFixState] = useState<"idle" | "fixing" | "fixed">("idle");
  const [launchFixSteps, setLaunchFixSteps] = useState<{ label: string; status: "queued" | "fixing" | "done" }[]>([]);
  const launchGateTestTimers = useRef<number[]>([]);
  const launchFixTimers = useRef<number[]>([]);
  const assistantScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const assistantReplyTimers = useRef<number[]>([]);
  const [isLaunchDeployed, setIsLaunchDeployed] = useState(false);
  const isOperationalDashboardLive = isLaunchDeployed;
  const isOperationalRoute = (routeId: string) => routeId === "metrics" || routeId === "risk";
  const workspaceInitial = user.name?.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase();
  const routes = [
    { id: "ai", title: "AI workspace", meta: isOperationalDashboardLive ? "Ask anything" : "Launch prep" },
    { id: "metrics", title: "Metrics", meta: isOperationalDashboardLive ? "Today and trends" : "Locked until live" },
    { id: "risk", title: "Live Queue", meta: isOperationalDashboardLive ? "Active operations" : "Locked until live" },
    { id: "integrations", title: "Integrations", meta: "Connected stack" }
  ];
  const activeRouteData = routes.find((route) => route.id === activeRoute) || routes[0];
  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0] || {
    id: "project",
    name: "Project",
    meta: "Workspace"
  };
  const [liveMetrics, setLiveMetrics] = useState<LiveWorkspaceMetrics>(() => createInitialLiveMetrics(activeProject));
  const [riskApiState, setRiskApiState] = useState<RiskQueueApiState>({ status: "idle", items: [], calls: [] });
  const [modelHealth, setModelHealth] = useState<{ model: any; evaluation: any; drift: any; feedback: any }>({ model: null, evaluation: null, drift: null, feedback: null });
  const openingMetrics = useMemo(() => createInitialLiveMetrics(activeProject), [activeProject.id, activeProject.name]);
  const containmentRate = Math.round((liveMetrics.containedCalls / Math.max(1, liveMetrics.callsHandled)) * 100);
  const handoffRate = Math.round((liveMetrics.handoffs / Math.max(1, liveMetrics.callsHandled)) * 100);
  const openingContainmentRate = Math.round((openingMetrics.containedCalls / Math.max(1, openingMetrics.callsHandled)) * 100);
  const openingLatencySeconds = (openingMetrics.p95LatencyMs / 1000).toFixed(1);
  const readinessScore = clampNumber(
    Math.round(
      72 +
        containmentRate * 0.16 +
        liveMetrics.citationCoverage * 0.07 +
        liveMetrics.asrConfidence * 0.05 -
        liveMetrics.openRisks * 1.2 -
        liveMetrics.policyViolations * 4
    ),
    0,
    99
  );
  const latencySeconds = (liveMetrics.p95LatencyMs / 1000).toFixed(1);
  const liveStatus = readinessScore >= 90 ? "Ready" : readinessScore >= 78 ? "Watching" : "Needs review";
  const openingAssistantMessage = isOperationalDashboardLive
    ? `I loaded the ${activeProject.name} workspace snapshot. The preview currently shows ${openingMetrics.callsHandled} calls, ${openingContainmentRate}% solved without a human handoff, and ${openingLatencySeconds}s typical voice response time. There are ${openingMetrics.openRisks} item${openingMetrics.openRisks === 1 ? "" : "s"} needing attention across handoffs, knowledge, and safety checks. I can walk you through the numbers, show the calls behind them, or draft the next action plan.`
    : `I loaded the ${activeProject.name} launch workspace. Live metrics, calls, and chats stay locked until the Launch Gate is passed and the agent is launched. I can help you run the gate, review blockers, connect systems, or prepare the launch plan.`;
  const agentInsightMetrics = isOperationalDashboardLive
    ? [
      { label: "Calls handled", value: String(liveMetrics.callsHandled), detail: `${liveMetrics.activeCalls} active now` },
      { label: "Resolved by AI", value: `${containmentRate}%`, detail: `${liveMetrics.containedCalls} calls contained` },
      { label: "Reply time", value: `${latencySeconds}s`, detail: "Live voice turn" },
      { label: "Review needed", value: String(liveMetrics.openRisks), detail: `${liveMetrics.handoffs} handoffs today` }
    ]
    : [
      { label: "Launch state", value: "Not live", detail: "Operational data locked" },
      { label: "Gate score", value: "Pending", detail: "Run launch checks" },
      { label: "Access", value: "Locked", detail: "Metrics, calls, chats" },
      { label: "Next", value: "Gate", detail: "Pass and launch" }
    ];
  const liveHourLabels = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "Now"];
  const workspaceHourlyChart = workspaceAssistantCharts.find((chart) => chart.id === "hourly-volume");
  const workspaceHandoffChart = workspaceAssistantCharts.find((chart) => chart.id === "handoff-reasons");
  const agentHourlyVolume = workspaceHourlyChart
    ? workspaceHourlyChart.data.slice(-5).map((hour) => ({ label: hour.label, value: hour.value }))
    : liveHourLabels.slice(-5).map((label, index) => ({
      label,
      value: liveMetrics.hourlyVolume.slice(-5)[index] || 0
    }));
  const metricsHourlyVolume = liveHourLabels.map((label, index) => ({
    label,
    value: liveMetrics.hourlyVolume[index] || 0
  }));
  const demoMetricCallRecords = useMemo(
    () => createMetricCallRecords(activeProject, liveMetrics, liveHourLabels),
    [activeProject.id, liveMetrics.hourlyVolume, liveMetrics.callsHandled]
  );
  const metricCallRecords = riskApiState.calls.length ? riskApiState.calls : demoMetricCallRecords;
  const demoRiskQueueItems = useMemo(
    () => createRiskQueueItems(activeProject, liveMetrics, demoMetricCallRecords),
    [activeProject.id, liveMetrics.sensitiveEscalations, demoMetricCallRecords]
  );
  const riskQueueItems = riskApiState.items.length ? riskApiState.items : demoRiskQueueItems;
  const resolvedCallCount = metricCallRecords.filter((call) => call.outcome === "Resolved").length;
  const followUpCallCount = metricCallRecords.filter((call) => call.outcome === "Handoff" || call.outcome === "Review").length;
  const averageCallDurationSeconds = Math.round(
    metricCallRecords.reduce((total, call) => total + parseMetricDurationSeconds(call.duration), 0) / Math.max(1, metricCallRecords.length)
  );
  const recentCallTimeline = metricCallRecords.slice(-4).reverse().map((call) => ({
    time: formatMetricCallTime(call.time),
    title: call.intent,
    detail: call.summary,
    tag: call.outcome
  }));
  const livePhoneConversations = metricCallRecords
    .filter((call) => call.hourLabel === "Now" || call.outcome === "Handoff" || call.outcome === "Review")
    .slice(-Math.max(4, Math.min(8, liveMetrics.activeCalls || 4)))
    .reverse()
    .map((call, index) => conversationFromCall(call, index, "phone"));
  const liveChatConversations = [
    ...riskQueueItems
      .filter((item) => item.sourceType === "ticket")
      .slice(0, 4)
      .map((item) => conversationFromRiskItem(item, "chat")),
    ...metricCallRecords
      .filter((call, index) => index % 5 === 0 && call.outcome !== "Abandoned")
      .slice(-4)
      .reverse()
      .map((call, index) => conversationFromCall(call, index, "chat"))
  ].slice(0, 6);
  const humanHandoffConversations = [
    ...riskQueueItems
      .filter((item) => item.riskLevel === "high")
      .map((item) => conversationFromRiskItem(item, item.sourceType === "call" ? "phone" : "chat")),
    ...metricCallRecords
      .filter((call) => call.outcome === "Handoff")
      .slice(-4)
      .map((call, index) => conversationFromCall(call, index, "phone"))
  ]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 7);
  const highPriorityConversations = Array.from(
    new Map(
      [...humanHandoffConversations, ...livePhoneConversations, ...liveChatConversations]
        .filter((item) => item.riskLevel === "high" || item.riskScore >= 76)
        .sort((a, b) => b.riskScore - a.riskScore)
        .map((item) => [item.id, item])
    ).values()
  ).slice(0, 7);
  const liveRiskSections = [
    { id: "active-chats", label: "Active chats", count: liveChatConversations.length, items: liveChatConversations },
    { id: "active-phone", label: "Active phone calls", count: livePhoneConversations.length, items: livePhoneConversations },
    { id: "human-handoff", label: "Agent needed", count: humanHandoffConversations.length, items: humanHandoffConversations },
    { id: "high-priority", label: "Urgent queue", count: highPriorityConversations.length, items: highPriorityConversations }
  ];
  const liveQueueItems = liveRiskSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      lane: section.label
    }))
  );
  const allActiveConversationRows = Array.from(new Map(liveQueueItems.map((item) => [item.id, item])).values());
  const activeConversationRows = showAllConversations ? allActiveConversationRows : allActiveConversationRows.slice(0, 6);
  const allLiveCallRows = metricCallRecords
    .filter((call) => call.hourLabel === "Now" || call.outcome === "Handoff" || call.outcome === "Review" || call.outcome === "Resolved")
    .reverse();
  // Build conversation rows once over the full list so each row's id (which embeds
  // its index) stays stable whether or not the list is expanded.
  const allLiveCallConversationRows = allLiveCallRows.map((call, index) => conversationFromCall(call, index, "phone"));
  const liveCallRows = showAllCalls ? allLiveCallRows : allLiveCallRows.slice(0, 4);
  const liveCallConversationRows = showAllCalls ? allLiveCallConversationRows : allLiveCallConversationRows.slice(0, 4);
  const openedLiveQueueItem = liveQueueItems.find((item) => item.id === openedLiveQueueId)
    || allLiveCallConversationRows.find((item) => item.id === openedLiveQueueId)
    || null;
  const allHandoffQueueRows = humanHandoffConversations;
  const handoffQueueRows = showAllHandoffs ? allHandoffQueueRows : allHandoffQueueRows.slice(0, 5);
  const durationForConversation = (item: LiveRiskConversation, index: number) => {
    const baseSeconds = Math.max(70, Math.round(75 + item.riskScore * 1.6 + index * 37 + (item.channel === "phone" ? 58 : 0)));
    const minutes = Math.floor(baseSeconds / 60);
    const seconds = baseSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };
  const openedLiveQueueIndex = Math.max(0, activeConversationRows.findIndex((item) => item.id === openedLiveQueueId));
  const openedLiveQueueDuration = openedLiveQueueItem ? durationForConversation(openedLiveQueueItem, openedLiveQueueIndex) : "00:00";
  const openedLiveQueueTranscript: MetricCallRecord["transcript"] = openedLiveQueueItem
    ? (openedLiveQueueItem.transcript && openedLiveQueueItem.transcript.length
      ? openedLiveQueueItem.transcript
      : [
        { speaker: "Customer", text: openedLiveQueueItem.detail },
        { speaker: "AI", text: openedLiveQueueItem.channel === "phone" ? "I have your account context open. I am checking the approved policy before I answer." : "I can help with that. I am checking your account and the approved answer path now." },
        { speaker: "System", text: `${operationStatusLabel(openedLiveQueueItem.status)}. ${openedLiveQueueItem.action}` }
      ])
    : [];
  const openedLiveQueueIsJoined = openedLiveQueueItem ? joinedLiveChatIds.includes(openedLiveQueueItem.id) : false;
  const openedLiveQueueAdminMessages = openedLiveQueueItem ? (adminLiveChatMessages[openedLiveQueueItem.id] || []) : [];
  const agentDisplayName = user.name?.trim() || user.email.split("@")[0] || "Agent";
  const openedLiveQueueThread = openedLiveQueueItem
    ? [
      ...openedLiveQueueTranscript.map((turn, index) => ({
        key: `turn-${index}`,
        role: turn.speaker as "Customer" | "AI" | "System" | "Admin",
        name: turn.speaker === "Customer" ? openedLiveQueueItem.customer : turn.speaker === "System" ? "System" : "RelayClarity AI",
        text: turn.text
      })),
      ...(openedLiveQueueIsJoined
        ? [{
          key: "join-event",
          role: "System" as const,
          name: "System",
          text: `${agentDisplayName} joined the conversation. The customer can see a human agent is now connected.`
        }]
        : []),
      ...openedLiveQueueAdminMessages.map((message) => ({
        key: message.id,
        role: "Admin" as const,
        name: `${agentDisplayName} (you)`,
        text: message.text
      }))
    ]
    : [];
  const handleJoinLiveChat = (conversationId: string) => {
    setJoinedLiveChatIds((previous) => (previous.includes(conversationId) ? previous : [...previous, conversationId]));
  };
  const handleLeaveLiveChat = (conversationId: string) => {
    setJoinedLiveChatIds((previous) => previous.filter((value) => value !== conversationId));
  };
  const handleSendLiveChatReply = (conversationId: string) => {
    const text = liveChatComposerText.trim();
    if (!text) {
      return;
    }

    setJoinedLiveChatIds((previous) => (previous.includes(conversationId) ? previous : [...previous, conversationId]));
    setAdminLiveChatMessages((previous) => {
      const existing = previous[conversationId] || [];

      return {
        ...previous,
        [conversationId]: [...existing, { id: `admin-${conversationId}-${existing.length}`, text }]
      };
    });
    setLiveChatComposerText("");
  };
  const handoffReasons = workspaceHandoffChart
    ? workspaceHandoffChart.data.map((reason) => ({
      label: reason.label,
      value: reason.value,
      percent: reason.percent || 0
    }))
    : [
      { label: "Billing exception", value: Math.max(0, liveMetrics.handoffs - liveMetrics.sensitiveEscalations - Math.min(liveMetrics.retrievalMisses, liveMetrics.handoffs)), percent: Math.round((Math.max(0, liveMetrics.handoffs - liveMetrics.sensitiveEscalations - Math.min(liveMetrics.retrievalMisses, liveMetrics.handoffs)) / Math.max(1, liveMetrics.handoffs)) * 100) },
      { label: "Sensitive policy", value: Math.min(liveMetrics.sensitiveEscalations, liveMetrics.handoffs), percent: Math.round((Math.min(liveMetrics.sensitiveEscalations, liveMetrics.handoffs) / Math.max(1, liveMetrics.handoffs)) * 100) },
      { label: "Knowledge gap", value: Math.min(liveMetrics.retrievalMisses, liveMetrics.handoffs), percent: Math.round((Math.min(liveMetrics.retrievalMisses, liveMetrics.handoffs) / Math.max(1, liveMetrics.handoffs)) * 100) }
    ];
  const [selectedCompletedIntegrationId, setSelectedCompletedIntegrationId] = useState("hubspot");
  const [selectedCompletedIntegrationCategory, setSelectedCompletedIntegrationCategory] = useState<"core" | "operations" | "growth">("core");
  const [isAddIntegrationModalOpen, setIsAddIntegrationModalOpen] = useState(false);
  const [loginIntegration, setLoginIntegration] = useState<{ company: string; type: string; logoUrl: string } | null>(null);
  const [loginIntegrationStage, setLoginIntegrationStage] = useState<"credentials" | "connecting" | "success" | "blocked">("credentials");
  const [loginIntegrationEmail, setLoginIntegrationEmail] = useState("");
  const [loginIntegrationPassword, setLoginIntegrationPassword] = useState("");
  const integrationLoginTimers = useRef<number[]>([]);
  const [connectedCompletedIntegrationIds, setConnectedCompletedIntegrationIds] = useState<string[]>([]);
  const completedIntegrationCategories = [
    { id: "core", label: "Core" },
    { id: "operations", label: "Operations" },
    { id: "growth", label: "Growth" }
  ] as const;
  const addIntegrationCatalog = {
    core: [
      { company: "Salesforce", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=salesforce.com&sz=128" },
      { company: "Pipedrive", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=pipedrive.com&sz=128" },
      { company: "Zoho CRM", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=zoho.com&sz=128" },
      { company: "Freshsales", type: "CRM", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" },
      { company: "Genesys Cloud CX", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=genesys.com&sz=128" },
      { company: "Five9", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=five9.com&sz=128" },
      { company: "NICE CXone", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=nice.com&sz=128" },
      { company: "Talkdesk", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=talkdesk.com&sz=128" },
      { company: "Twilio Flex", type: "Contact center", logoUrl: "https://www.google.com/s2/favicons?domain=twilio.com&sz=128" },
      { company: "Confluence", type: "Knowledge", logoUrl: "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128" }
    ],
    operations: [
      { company: "Zendesk", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=zendesk.com&sz=128" },
      { company: "Freshdesk", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" },
      { company: "Intercom", type: "Support", logoUrl: "https://www.google.com/s2/favicons?domain=intercom.com&sz=128" },
      { company: "ServiceNow", type: "Service management", logoUrl: "https://www.google.com/s2/favicons?domain=servicenow.com&sz=128" },
      { company: "Jira Service Management", type: "Service desk", logoUrl: "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128" },
      { company: "Help Scout", type: "Helpdesk", logoUrl: "https://www.google.com/s2/favicons?domain=helpscout.com&sz=128" },
      { company: "Front", type: "Shared inbox", logoUrl: "https://www.google.com/s2/favicons?domain=front.com&sz=128" },
      { company: "Freshservice", type: "ITSM", logoUrl: "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128" }
    ],
    growth: [
      { company: "Segment", type: "Customer data", logoUrl: "https://www.google.com/s2/favicons?domain=segment.com&sz=128" },
      { company: "Amplitude", type: "Product analytics", logoUrl: "https://www.google.com/s2/favicons?domain=amplitude.com&sz=128" },
      { company: "Mixpanel", type: "Product analytics", logoUrl: "https://www.google.com/s2/favicons?domain=mixpanel.com&sz=128" },
      { company: "Looker", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=looker.com&sz=128" },
      { company: "Tableau", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=tableau.com&sz=128" },
      { company: "Power BI", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=powerbi.microsoft.com&sz=128" },
      { company: "Domo", type: "BI", logoUrl: "https://www.google.com/s2/favicons?domain=domo.com&sz=128" },
      { company: "Snowflake", type: "Warehouse", logoUrl: "https://www.google.com/s2/favicons?domain=snowflake.com&sz=128" }
    ]
  };
  const completedIntegrationSystems = [
    {
      id: "hubspot",
      category: "core",
      key: "crm",
      name: "CRM",
      providerId: "hubspot",
      provider: "HubSpot",
      logoUrl: providerLogoFallbacks.hubspot,
      status: "Connected",
      health: "Passing",
      lastSync: "4m ago",
      description: "Reads account, contact, owner, lifecycle, and recent activity before the agent answers.",
      scopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.notes.write"],
      access: [
        { label: "Contacts read", detail: "Find caller and account records" },
        { label: "Companies read", detail: "Match caller to company context" },
        { label: "Notes write", detail: "Save follow-up summaries" }
      ],
      checks: ["OAuth token valid", "Contact lookup", "Follow-up note write"],
      actions: ["Verify contact fields", "Map owners", "Run write test"]
    },
    {
      id: "zoom",
      category: "core",
      key: "telephony",
      name: "Telephony",
      providerId: "zoom",
      provider: "Zoom Contact Center",
      logoUrl: providerLogoFallbacks.zoom,
      status: "Connected",
      health: "Passing",
      lastSync: "Live",
      description: "Receives conversation events, transcript turns, caller metadata, and deployment status from Zoom.",
      scopes: ["contact_center:read:engagement", "phone:read:call", "webhook:event"],
      access: [
        { label: "Engagement read", detail: "Read active contact center events" },
        { label: "Call read", detail: "Inspect call metadata and state" },
        { label: "Webhook events", detail: "Receive transcript and routing updates" }
      ],
      checks: ["Webhook signature", "Transcript ingest", "Virtual agent event"],
      actions: ["Confirm webhook URL", "Test sample call", "Review routing queue"]
    },
    {
      id: "notion",
      category: "core",
      key: "knowledge",
      name: "Knowledge",
      providerId: "notion",
      provider: "Notion",
      logoUrl: providerLogoFallbacks.notion,
      status: "Connected",
      health: "Passing",
      lastSync: "9m ago",
      description: "Syncs approved policies, FAQs, service details, and answer sources into the agent knowledge layer.",
      scopes: ["search", "read_content", "read_user"],
      access: [
        { label: "Search workspace", detail: "Find approved answer sources" },
        { label: "Read content", detail: "Sync policies and help articles" },
        { label: "Read user", detail: "Track source ownership" }
      ],
      checks: ["Source search", "Article retrieval", "Answer citation"],
      actions: ["Pick approved pages", "Refresh embeddings", "Retest top intents"]
    },
    {
      id: "zendesk",
      category: "operations",
      key: "helpdesk",
      name: "Helpdesk",
      providerId: "zendesk",
      provider: "Zendesk Support",
      logoUrl: providerLogoFallbacks["zendesk support"],
      status: "Connected",
      health: "Passing",
      lastSync: "6m ago",
      description: "Creates escalation tickets with intent, urgency, customer context, transcript summary, and owner hints.",
      scopes: ["tickets:read", "tickets:write", "users:read"],
      access: [
        { label: "Tickets read", detail: "Check existing support context" },
        { label: "Tickets write", detail: "Create escalation cases" },
        { label: "Users read", detail: "Route to the right owner" }
      ],
      checks: ["Ticket create", "Priority mapping", "Transcript attachment"],
      actions: ["Map priorities", "Assign owners", "Test handoff case"]
    },
    {
      id: "analytics",
      category: "growth",
      key: "analytics",
      name: "Analytics export",
      providerId: "warehouse",
      provider: "Warehouse",
      logoUrl: "",
      status: "Setup needed",
      health: "Needs destination",
      lastSync: "Not started",
      description: "Exports launch metrics, containment, handoffs, answer quality, and conversation outcomes for reporting.",
      scopes: ["events.write", "reports.write", "dashboards.read"],
      access: [
        { label: "Events write", detail: "Send conversation outcomes" },
        { label: "Reports write", detail: "Publish launch metrics" },
        { label: "Dashboards read", detail: "Confirm reporting destination" }
      ],
      checks: ["Destination selected", "Schema mapped", "Sample export"],
      actions: ["Choose warehouse", "Map report schema", "Run sample export"]
    }
  ];
  const [addedCompletedIntegrations, setAddedCompletedIntegrations] = useState<Array<(typeof completedIntegrationSystems)[number]>>([]);
  const allCompletedIntegrationSystems = [...completedIntegrationSystems, ...addedCompletedIntegrations].map((system) =>
    connectedCompletedIntegrationIds.includes(system.id) ? {
      ...system,
      status: "Connected",
      health: "Passing",
      lastSync: "Just now",
      checks: system.checks.length ? system.checks : ["Sandbox authorization", "Scope check", "Dashboard handoff"]
    } : system
  );
  const selectedCompletedIntegration = allCompletedIntegrationSystems.find((system) => system.id === selectedCompletedIntegrationId) || allCompletedIntegrationSystems[0];
  const visibleCompletedIntegrationSystems = allCompletedIntegrationSystems.filter((system) => system.category === selectedCompletedIntegrationCategory);
  const visibleAddIntegrationCatalog = addIntegrationCatalog[selectedCompletedIntegrationCategory];
  const completedConnectedCount = allCompletedIntegrationSystems.filter((system) => system.status === "Connected").length;
  const completedCheckCount = allCompletedIntegrationSystems
    .filter((system) => system.status === "Connected")
    .reduce((total, system) => total + system.checks.length, 0);
  const launchGateRequiredConnections = allCompletedIntegrationSystems.filter((system) => ["hubspot", "zoom", "notion", "zendesk"].includes(system.id));
  const launchGateRequiredConnectionsPassed = launchGateRequiredConnections.every((system) => system.status === "Connected" && system.health === "Passing");
  const launchGateScenarioPassRate = Math.round(
    containmentRate * 0.26 +
      liveMetrics.firstContactResolution * 0.24 +
      liveMetrics.citationCoverage * 0.18 +
      liveMetrics.asrConfidence * 0.14 +
      Math.max(0, 100 - liveMetrics.recontactRate * 5) * 0.1 +
      Math.max(0, 100 - liveMetrics.lowConfidenceAnswers * 7) * 0.08
  );
  const launchGateRuntimeScore = Math.max(86, Math.min(99, Math.round(
    98 -
      liveMetrics.webhookErrors * 6 -
      Math.max(0, liveMetrics.p95LatencyMs - 1500) / 120 -
      liveMetrics.failedTurns * 1.5
  )));
  const launchGateConnectionScore = launchGateRequiredConnectionsPassed
    ? 100
    : Math.round((launchGateRequiredConnections.filter((system) => system.status === "Connected" && system.health === "Passing").length / Math.max(1, launchGateRequiredConnections.length)) * 100);
  const launchGateSafetyScore = liveMetrics.policyViolations === 0
    ? Math.max(90, 100 - liveMetrics.lowConfidenceAnswers * 3 - liveMetrics.sensitiveEscalations)
    : Math.max(0, 78 - liveMetrics.policyViolations * 12);
  const launchGateScore = Math.round(
    launchGateScenarioPassRate * 0.38 +
      launchGateConnectionScore * 0.24 +
      launchGateRuntimeScore * 0.22 +
      launchGateSafetyScore * 0.16
  );
  const launchGateThreshold = 90;
  const launchGateCriticalFailures = [
    liveMetrics.policyViolations > 0 ? "Critical safety rule break" : "",
    !launchGateRequiredConnectionsPassed ? "Required connection failed" : "",
    launchGateRuntimeScore < launchGateThreshold ? "Runtime needs review" : "",
    launchGateScenarioPassRate < launchGateThreshold ? "Scenarios need review" : "",
    launchGateSafetyScore < launchGateThreshold ? "Safety needs review" : ""
  ].filter(Boolean);
	  const launchGateAllowed = launchGateScore >= launchGateThreshold && launchGateCriticalFailures.length === 0;
	  const launchGateAttention = !launchGateAllowed;
	  const launchGateCriticalAttention = liveMetrics.policyViolations > 0 || !launchGateRequiredConnectionsPassed || launchGateSafetyScore < launchGateThreshold;
	  const launchGateToneColor = launchGateAllowed ? "#059669" : launchGateCriticalAttention ? "#dc2626" : "#f59e0b";
	  const launchGateStatus = launchGateAllowed ? "Ready to launch" : "Needs review";
	  const launchGateSignalLines = [
	    {
	      label: "Scenarios",
	      value: `${launchGateScenarioPassRate}%`,
	      status: launchGateScenarioPassRate >= launchGateThreshold ? "Passing" : "Needs work"
	    },
	    {
	      label: "Runtime",
	      value: `${launchGateRuntimeScore}%`,
	      status: launchGateRuntimeScore >= launchGateThreshold ? "Stable" : "Attention"
	    },
	    {
	      label: "Connections",
	      value: `${launchGateConnectionScore}%`,
	      status: launchGateRequiredConnectionsPassed ? "Connected" : "Missing"
	    },
	    {
	      label: "Safety",
	      value: `${launchGateSafetyScore}%`,
	      status: launchGateSafetyScore >= launchGateThreshold && liveMetrics.policyViolations === 0 ? "Clear" : "Review"
	    }
  ];
	  const launchGateActivity = [
	    {
	      label: "Container readiness",
	      detail: launchGateRuntimeScore >= launchGateThreshold ? "Readiness, liveness, latency, and error signals are inside the launch band." : "Re-run runtime diagnostics before sending production traffic.",
	      state: launchGateRuntimeScore >= launchGateThreshold ? "Pass" : "Attention"
	    },
	    {
	      label: "Scenario tests",
	      detail: launchGateScenarioPassRate >= launchGateThreshold ? "Customer scenarios meet the launch threshold." : "Retest failed scenarios and improve the weak paths.",
	      state: launchGateScenarioPassRate >= launchGateThreshold ? "Pass" : "Review"
	    },
    {
      label: "Connection safety",
      detail: launchGateRequiredConnectionsPassed ? "CRM, telephony, knowledge, and helpdesk checks are passing." : "One required production dependency is not healthy.",
      state: launchGateRequiredConnectionsPassed ? "Pass" : "Attention"
    },
    {
      label: "AI safety",
      detail: liveMetrics.policyViolations === 0 ? "No critical safety rule breaks are currently present." : "Critical safety failures block launch.",
      state: liveMetrics.policyViolations === 0 ? "Pass" : "Attention"
    }
  ];
  const launchGateTestsComplete = launchGateRunState === "complete";
  const launchGateAccuracyBlocked = launchGateScenarioPassRate < launchGateThreshold;
  const launchGateCanLaunch = launchGateAllowed && launchGateTestsComplete;
  const launchGateOperationalState = isLaunchDeployed
    ? "live"
    : launchGateAccuracyBlocked
      ? "blocked"
      : "not-live";
  const launchGateOperationalCopy = {
    live: {
      eyebrow: "Live",
      title: "Agent is live in production.",
      summary: "Production traffic is enabled. Monitor uptime, response speed, active volume, and handoffs."
    },
    blocked: {
      eyebrow: "Cannot launch",
      title: "Accuracy is below the launch threshold.",
      summary: "Run tests to pinpoint the weak customer paths before production traffic is enabled."
    },
    "not-live": {
      eyebrow: "Not live",
      title: "Agent is ready for launch.",
      summary: "This agent is not in production yet. Launch when you are ready to enable traffic."
    }
  }[launchGateOperationalState];
  const launchGateBlockedReasons = launchGateCriticalFailures.length > 0
    ? launchGateCriticalFailures
    : launchGateAllowed
      ? ["Final gate check has not run"]
      : ["Launch score is below 90%"];
  const launchGateTestResults = [
    {
      label: "Customer accuracy",
      detail: "Runs the current scenario pack against approved answers and handoff rules.",
      value: `${launchGateScenarioPassRate}%`,
      required: `${launchGateThreshold}% required`,
      action: launchGateScenarioPassRate >= launchGateThreshold ? "No action needed" : "Retest scenarios",
      state: launchGateScenarioPassRate >= launchGateThreshold ? "Pass" : "Retest"
    },
    {
      label: "Production systems",
      detail: "Checks telephony events, CRM lookup, ticket creation, and knowledge sync.",
      value: `${launchGateConnectionScore}%`,
      required: "All required",
      action: launchGateRequiredConnectionsPassed ? "No action needed" : "Fix connection",
      state: launchGateRequiredConnectionsPassed ? "Pass" : "Blocked"
    },
    {
      label: "Runtime health",
      detail: "Confirms latency, worker health, webhook errors, and failed turn rate.",
      value: `${launchGateRuntimeScore}%`,
      required: `${launchGateThreshold}% required`,
      action: launchGateRuntimeScore >= launchGateThreshold ? "No action needed" : "Review runtime",
      state: launchGateRuntimeScore >= launchGateThreshold ? "Pass" : "Review"
    },
    {
      label: "Safety guardrails",
      detail: "Verifies critical policy breaks are zero before production traffic is allowed.",
      value: `${launchGateSafetyScore}%`,
      required: "0 critical breaks",
      action: launchGateSafetyScore >= launchGateThreshold && liveMetrics.policyViolations === 0 ? "No action needed" : "Review safety",
      state: launchGateSafetyScore >= launchGateThreshold && liveMetrics.policyViolations === 0 ? "Pass" : "Blocked"
    }
  ];
  const launchGateFailedTest = launchGateTestResults.find((test) => test.state !== "Pass") || launchGateTestResults[0];
  const launchGateDecisionTitle = isLaunchDeployed
    ? "Agent is live"
    : launchGateRunState === "running"
      ? "Checking launch readiness"
      : launchGateCanLaunch
        ? "Ready to launch"
        : launchGateAllowed
          ? "Gate check needed"
          : "Launch blocked";
  const launchGateDecisionSummary = isLaunchDeployed
    ? "Production is enabled."
    : launchGateRunState === "running"
      ? "Checking requirements."
      : launchGateCanLaunch
        ? "All checks passed."
        : launchGateAllowed
          ? "Run the final check."
          : `${launchGateFailedTest.label} needs review.`;
  const launchGatePrimaryAction = isLaunchDeployed
    ? "Live"
    : launchGateRunState === "running"
      ? "Checking"
      : launchGateCanLaunch
        ? "Launch agent"
        : "Run gate check";
  const launchGateLastChecked = launchGateTestsComplete ? "Just now" : "Not checked in this session";
  const launchGateRunHistory = [
    {
      label: launchGateTestsComplete ? "Latest gate check" : "Next gate check",
      result: launchGateTestsComplete ? (launchGateAllowed ? "Passed" : "Blocked") : "Ready to run",
      detail: launchGateTestsComplete ? `${launchGateScore}% launch score` : "Run the gate before launching"
    },
    {
      label: "Scenario pack",
      result: launchGateScenarioPassRate >= launchGateThreshold ? "Passing" : "Needs retest",
      detail: `${launchGateScenarioPassRate}% customer accuracy`
    }
  ];
  const launchDiagnosticSteps = [
    {
      label: "Replay scenarios",
      detail: `${liveMetrics.lowConfidenceAnswers} low-confidence answer${liveMetrics.lowConfidenceAnswers === 1 ? "" : "s"}`,
      state: launchGateRunState === "idle" ? "queued" : "complete"
    },
    {
      label: "Check handoffs",
      detail: `${liveMetrics.sensitiveEscalations} sensitive escalation${liveMetrics.sensitiveEscalations === 1 ? "" : "s"}`,
      state: launchGateRunState === "idle" ? "queued" : launchGateRunState === "running" ? "running" : "complete"
    },
    {
      label: "Score accuracy",
      detail: `${launchGateScenarioPassRate}% / ${launchGateThreshold}% required`,
      state: launchGateRunState === "idle" ? "queued" : launchGateRunState === "running" ? "running" : launchGateAccuracyBlocked ? "failed" : "complete"
    }
  ];
  const launchDiagnosticFinding = launchGateTestsComplete
    ? launchGateAccuracyBlocked
      ? `Accuracy is ${launchGateScenarioPassRate}%. Improve low-confidence answers and retest the customer scenario pack.`
      : "Synthetic launch tests passed. No accuracy blocker found."
    : launchGateAccuracyBlocked
      ? "Accuracy is below threshold. Run tests to isolate the failing paths."
      : "No launch blocker is currently detected.";
  const launchUptimeDetails = [
    { label: "Uptime", value: "99.98%", detail: "Last 30 days" },
    { label: "Voice response", value: `${latencySeconds}s`, detail: "P95 turn latency" },
    { label: "Active calls", value: String(liveMetrics.activeCalls), detail: "Right now" },
    { label: "Handoffs", value: String(liveMetrics.handoffs), detail: "Today" }
  ];
  const launchRuntimeDetails = [
    { label: "Channel", value: "Zoom", detail: "Production queue" },
    { label: "Monitoring", value: "On", detail: "Safety and latency" },
    { label: "Last deploy", value: "Today", detail: "Gate passed" },
    { label: "Review", value: "Weekly", detail: "Quality check" }
  ];
  const launchGateTestChecks: Record<string, { name: string; passed: boolean; value: string }[]> = {
    "Customer accuracy": [
      { name: "Answered from approved knowledge", passed: liveMetrics.citationCoverage >= 80, value: `${liveMetrics.citationCoverage}% cited` },
      { name: "Resolved on first contact", passed: liveMetrics.firstContactResolution >= 75, value: `${liveMetrics.firstContactResolution}%` },
      { name: "Low-confidence answers contained", passed: liveMetrics.lowConfidenceAnswers <= 3, value: `${liveMetrics.lowConfidenceAnswers} flagged` },
      { name: "Sensitive cases escalated", passed: liveMetrics.sensitiveEscalations <= 4, value: `${liveMetrics.sensitiveEscalations} handed off` }
    ],
    "Production systems": [
      { name: "CRM lookup", passed: liveMetrics.crmLookupSuccess >= 95, value: `${liveMetrics.crmLookupSuccess}%` },
      { name: "Ticket creation", passed: liveMetrics.ticketWriteSuccess >= 95, value: `${liveMetrics.ticketWriteSuccess}%` },
      { name: "Required connections live", passed: launchGateRequiredConnectionsPassed, value: launchGateRequiredConnectionsPassed ? "All passing" : "Action needed" },
      { name: "Knowledge sync", passed: liveMetrics.knowledgeSyncMinutes <= 15, value: `${liveMetrics.knowledgeSyncMinutes}m ago` }
    ],
    "Runtime health": [
      { name: "P95 turn latency", passed: liveMetrics.p95LatencyMs <= 2500, value: `${latencySeconds}s` },
      { name: "Webhook delivery", passed: liveMetrics.webhookErrors === 0, value: liveMetrics.webhookErrors === 0 ? "No errors" : `${liveMetrics.webhookErrors} errors` },
      { name: "Failed turns", passed: liveMetrics.failedTurns <= 1, value: `${liveMetrics.failedTurns}` },
      { name: "Worker health", passed: launchGateRuntimeScore >= launchGateThreshold, value: launchGateRuntimeScore >= launchGateThreshold ? "Healthy" : "Degraded" }
    ],
    "Safety guardrails": [
      { name: "Critical policy breaks", passed: liveMetrics.policyViolations === 0, value: `${liveMetrics.policyViolations}` },
      { name: "Unsupported attempts blocked", passed: liveMetrics.unsupportedAttempts <= 5, value: `${liveMetrics.unsupportedAttempts}` },
      { name: "Draft answers reviewed", passed: liveMetrics.draftAnswers <= 5, value: `${liveMetrics.draftAnswers} pending` },
      { name: "Sensitive escalations routed", passed: liveMetrics.sensitiveEscalations <= 4, value: `${liveMetrics.sensitiveEscalations}` }
    ]
  };
  const launchGateTestSuite = launchGateTestResults.map((test) => ({
    ...test,
    checks: launchGateTestChecks[test.label] || []
  }));
  const launchGateTestSuitePassedCount = launchGateTestSuite.filter((test) => test.state === "Pass").length;
  const launchGateFailingTests = launchGateTestSuite.filter((test) => test.state !== "Pass");
  const firstFailingLaunchTest = launchGateFailingTests[0];
  const launchTestRunPassedCount = launchGateRunState === "complete"
    ? launchGateTestSuitePassedCount
    : launchGateTestSuite.slice(0, launchTestCompletedCount).filter((test) => test.state === "Pass").length;
  const launchTestProgress = launchGateRunState === "complete"
    ? 100
    : Math.round((launchTestCompletedCount / launchGateTestSuite.length) * 100);
  const selectedLaunchTest = launchGateTestSuite[Math.min(launchTestSelectedIndex, launchGateTestSuite.length - 1)] || launchGateTestSuite[0];
  const launchTestRunningLabel = launchGateTestSuite[Math.min(launchTestActiveIndex, launchGateTestSuite.length - 1)]?.label || "launch checks";
  const runLaunchGateTests = () => {
    setActiveRoute("launch-tests");
    setActiveMetricFocus(null);

    if (launchGateRunState === "running") {
      return;
    }

    launchGateTestTimers.current.forEach((timer) => window.clearTimeout(timer));
    launchGateTestTimers.current = [];
    setLaunchTestCompletedCount(0);
    setLaunchTestActiveIndex(0);
    setLaunchTestSelectedIndex(0);
    setLaunchGateRunState("running");

    const total = launchGateTestSuite.length;
    for (let index = 0; index < total; index += 1) {
      launchGateTestTimers.current.push(window.setTimeout(() => {
        setLaunchTestActiveIndex(Math.min(index + 1, total - 1));
        setLaunchTestCompletedCount(index + 1);
        setLaunchTestSelectedIndex(index);
      }, 650 * (index + 1)));
    }
    launchGateTestTimers.current.push(window.setTimeout(() => {
      setLaunchGateRunState("complete");
    }, 650 * total + 250));
  };
  const launchAgent = () => {
    if (launchGateAccuracyBlocked) {
      runLaunchGateTests();
      return;
    }

    if (!launchGateCanLaunch) {
      return;
    }

    setIsLaunchDeployed(true);
  };
  const selectedCompletedConnector: Connector = {
    key: selectedCompletedIntegration.key,
    name: selectedCompletedIntegration.name,
    providerId: selectedCompletedIntegration.providerId,
    provider: selectedCompletedIntegration.provider,
    logoUrl: selectedCompletedIntegration.logoUrl,
    connected: selectedCompletedIntegration.status === "Connected",
    scopes: selectedCompletedIntegration.scopes,
    testStatus: selectedCompletedIntegration.health
  };
  const clearIntegrationLoginTimers = () => {
    integrationLoginTimers.current.forEach((timer) => window.clearTimeout(timer));
    integrationLoginTimers.current = [];
  };
  const closeAddIntegrationModal = () => {
    clearIntegrationLoginTimers();
    setIsAddIntegrationModalOpen(false);
    setLoginIntegration(null);
    setLoginIntegrationStage("credentials");
    setLoginIntegrationEmail("");
    setLoginIntegrationPassword("");
  };
  const startIntegrationLogin = (integration: { company: string; type: string; logoUrl: string }) => {
    clearIntegrationLoginTimers();
    setLoginIntegration(integration);
    setLoginIntegrationStage("credentials");
    setLoginIntegrationEmail("");
    setLoginIntegrationPassword("");
  };
  const connectedAccessForIntegration = (type: string) => {
    const lowerType = type.toLowerCase();

    if (lowerType.includes("crm")) {
      return [
        { label: "Contacts read", detail: "Find caller and account records" },
        { label: "Records write", detail: "Save notes and follow-up context" },
        { label: "Owner mapping", detail: "Route work to the right team member" }
      ];
    }

    if (lowerType.includes("contact")) {
      return [
        { label: "Calls read", detail: "Read conversation state and routing context" },
        { label: "Events receive", detail: "Receive transcript and handoff updates" },
        { label: "Queue mapping", detail: "Attach the agent to the right voice queue" }
      ];
    }

    if (lowerType.includes("help") || lowerType.includes("support") || lowerType.includes("service")) {
      return [
        { label: "Tickets read", detail: "Check existing customer context" },
        { label: "Tickets write", detail: "Create escalation and follow-up cases" },
        { label: "Users read", detail: "Assign work to the right owner" }
      ];
    }

    return [
      { label: "Events write", detail: "Send conversation outcomes" },
      { label: "Reports write", detail: "Publish launch and quality metrics" },
      { label: "Dashboards read", detail: "Confirm reporting destination" }
    ];
  };
  const connectCompletedIntegration = async (system = selectedCompletedIntegration) => {
    const connection = await fetchJsonFromApi<IntegrationConnectResult>("/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify({
        providerId: system.providerId,
        providerName: system.provider,
        category: system.key,
        workspaceName: activeProject.name,
        mode: "sandbox"
      })
    });

    setConnectedCompletedIntegrationIds((current) => current.includes(system.id) ? current : [...current, system.id]);
    return connection;
  };
  const completeIntegrationLogin = async (integration: { company: string; type: string; logoUrl: string }) => {
    const id = `added-${integration.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    const connectorKey = connectorKeyForIntegration(integration.type, selectedCompletedIntegrationCategory);
    const connection = await fetchJsonFromApi<IntegrationConnectResult>("/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify({
        providerId: providerIdFromName(integration.company, connectorKey),
        providerName: integration.company,
        category: connectorKey,
        workspaceName: activeProject.name,
        mode: "sandbox"
      })
    });

    setAddedCompletedIntegrations((current) => {
      if (allCompletedIntegrationSystems.some((system) => system.id === id) || current.some((system) => system.id === id)) {
        return current;
      }

      return [
        ...current,
        {
          id,
          category: selectedCompletedIntegrationCategory,
          key: id,
          name: integration.type,
          providerId: connection.providerId,
          provider: connection.name,
          logoUrl: integration.logoUrl || connection.logoUrl,
          status: "Connected",
          health: "Passing",
          lastSync: "Just now",
          description: connection.message,
          scopes: connection.scopes,
          access: connectedAccessForIntegration(integration.type),
          checks: ["Sandbox authorization", "Scope check", "Dashboard handoff"],
          actions: [`Sync ${integration.type.toLowerCase()}`]
        }
      ];
    });
    setConnectedCompletedIntegrationIds((current) => current.includes(id) ? current : [...current, id]);
    setSelectedCompletedIntegrationId(id);
  };
  const submitIntegrationLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginIntegration || !loginIntegrationEmail.trim()) {
      return;
    }

    clearIntegrationLoginTimers();
    setLoginIntegrationStage("connecting");

    try {
      await completeIntegrationLogin(loginIntegration);
      setLoginIntegrationStage("success");

      const closeTimer = window.setTimeout(closeAddIntegrationModal, 900);
      integrationLoginTimers.current = [closeTimer];
    } catch (error) {
      setLoginIntegrationStage("blocked");
      console.error(error);
    }
  };
  type CompletedDashboardPage = {
    eyebrow: string;
    title: string;
    summary: string;
    status: string;
    metrics: { label: string; value: string; detail: string }[];
    primaryTitle: string;
    primaryMeta: string;
    chart?: { label: string; value: number; display?: string }[];
    bars?: { label: string; value: number; percent: number }[];
    timeline?: { time: string; title: string; detail: string; tag: string }[];
    items?: { label: string; value: string; note: string }[];
    next: string[];
  };
  type MetricsTab = {
    id: string;
    label: string;
    title: string;
    summary: string;
    status: string;
    metrics: { label: string; value: string; detail: string }[];
    primaryTitle: string;
    primaryMeta: string;
    chart: { label: string; value: number; display?: string; empty?: boolean }[];
    chartTotal: string;
    items: { label: string; value: string; note: string }[];
    checks?: { label: string; value: string; note: string }[];
    next: string[];
  };
  const dashboardPages: Record<string, CompletedDashboardPage> = {
    launch: {
      eyebrow: "",
      title: launchGateStatus,
      summary: launchGateAllowed
        ? "This agent is ready."
        : "Review the current checks before launch.",
      status: launchGateAllowed ? "Launch" : "Review",
      metrics: [
        { label: "Launch score", value: `${launchGateScore}%`, detail: launchGateAllowed ? "Meets threshold" : "90% required" },
        { label: "Scenario pass rate", value: `${launchGateScenarioPassRate}%`, detail: "Customer test pack" },
        { label: "Required connections", value: `${launchGateConnectionScore}%`, detail: "CRM, calls, helpdesk" },
        { label: "Attention", value: String(launchGateCriticalFailures.length), detail: launchGateAllowed ? "Clear" : "Review" }
      ],
      primaryTitle: "Launch requirements",
      primaryMeta: "Automatic checks that decide whether this workspace can launch.",
      items: [
        { label: "Scenario tests", value: `${launchGateScenarioPassRate}%`, note: "Real customer situations must pass at or above 90%." },
        { label: "Runtime and container", value: `${launchGateRuntimeScore}%`, note: "Service health, containers, workers, and resource limits must be stable." },
        { label: "Safety", value: `${launchGateSafetyScore}%`, note: "Critical safety failures must be zero." }
      ],
      next: launchGateAllowed ? ["Launch agent", "Export launch proof", "Schedule first review"] : ["Run gate checks", "Review activity", "Retest"]
    },
    metrics: {
      eyebrow: "Production readiness",
      title: "Customer agent is ready to operate.",
      summary: "RelayClarity is tracking the outcome, safety, voice, knowledge, and integration signals that decide whether this agent can run in production.",
      status: liveStatus,
      metrics: [
        { label: "Overall health", value: `${readinessScore}%`, detail: "Ready for client use" },
        { label: "Solved without staff", value: `${containmentRate}%`, detail: `${liveMetrics.containedCalls} calls handled` },
        { label: "Voice response time", value: `${latencySeconds}s`, detail: "Typical caller wait" },
        { label: "Needs attention", value: String(liveMetrics.openRisks), detail: "Issues to check" }
      ],
      primaryTitle: "Call demand by hour",
      primaryMeta: "Today, showing when customers are using the agent most.",
      chart: metricsHourlyVolume.map((hour) => ({ ...hour, value: hour.value * 5, display: String(hour.value) })),
      items: [
        { label: "Critical safety issues", value: String(liveMetrics.policyViolations), note: `${liveMetrics.policyViolations} answer${liveMetrics.policyViolations === 1 ? "" : "s"} crossed a critical safety rule.` },
        { label: "Sent to staff", value: `${handoffRate}%`, note: `${liveMetrics.handoffs} conversation${liveMetrics.handoffs === 1 ? "" : "s"} needed a human because the agent should not guess.` },
        { label: "Answer confidence", value: `${liveMetrics.citationCoverage}%`, note: `${liveMetrics.draftAnswers} answer improvement${liveMetrics.draftAnswers === 1 ? "" : "s"} ready to review.` }
      ],
      next: ["Check attention items", "Improve top answers", "Export client report"]
    },
    risk: {
      eyebrow: "Live operations",
      title: "Every active chat and call is easy to manage.",
      summary: "RelayClarity shows what AI is handling now, which customers need an agent, and which conversations should be handled first.",
      status: `${humanHandoffConversations.length} agent needed`,
      metrics: [
        { label: "Active chats", value: String(liveChatConversations.length), detail: "AI conversations now" },
        { label: "Phone calls", value: String(livePhoneConversations.length), detail: "Live and recent voice" },
        { label: "Agent needed", value: String(humanHandoffConversations.length), detail: "Ready for staff" },
        { label: "Urgent", value: String(highPriorityConversations.length), detail: "Customer-impacting" }
      ],
      primaryTitle: "Live queue",
      primaryMeta: "Grouped by channel, agent ownership, and customer impact.",
      items: liveQueueItems.slice(0, 4).map((item) => ({
        label: item.title,
        value: item.status,
        note: item.detail
      })),
      next: ["Take next customer", "Review urgent queue", "Export operations summary"]
    },
    integrations: {
      eyebrow: "Connected stack",
      title: "Integrations are ready to operate.",
      summary: "Review every system the agent can read, update, test, and attach to workflow actions before launch.",
      status: `${completedConnectedCount} connected`,
      metrics: [
        { label: "Connected", value: String(completedConnectedCount), detail: "Core systems" },
        { label: "Setup needed", value: String(completedIntegrationSystems.length - completedConnectedCount), detail: "Analytics export" },
        { label: "Last sync", value: "4m", detail: "CRM records" },
        { label: "Test checks", value: `${completedCheckCount}/${completedCheckCount}`, detail: "Passing" }
      ],
      primaryTitle: "System status",
      primaryMeta: "Connection health for the services the agent can read or update.",
      next: ["Run connection test", "Finish analytics export", "Review OAuth scopes"]
    },
    settings: {
      eyebrow: "Workspace settings",
      title: "Manage this workspace and account.",
      summary: "Review workspace details, account access, and how this RelayClarity agent runs before and after launch.",
      status: liveStatus,
      metrics: [
        { label: "Workspace", value: activeProject.name, detail: activeProject.businessType || activeProject.meta },
        { label: "Account", value: user.name || user.email, detail: user.email },
        { label: "Connected systems", value: String(completedConnectedCount), detail: "Active integrations" },
        { label: "Readiness", value: `${readinessScore}%`, detail: liveStatus }
      ],
      primaryTitle: "Workspace and account",
      primaryMeta: "Details RelayClarity uses to run this agent.",
      items: [
        { label: "Workspace", value: liveStatus, note: `${activeProject.name} · ${activeProject.businessType || activeProject.meta}.` },
        { label: "Account owner", value: "Owner", note: `${user.name || "Not set"} · ${user.email}.` },
        { label: "Connected systems", value: `${completedConnectedCount} active`, note: "CRM, telephony, and knowledge tools linked to this agent." },
        { label: "Launch readiness", value: `${readinessScore}%`, note: "Scenario, runtime, and safety checks across this workspace." }
      ],
      next: ["Update workspace", "Manage account", "Review integrations"]
    },
    help: {
      eyebrow: "Help and support",
      title: "Get help with RelayClarity.",
      summary: "Find setup guides, launch checklists, and ways to reach the team when you need a hand.",
      status: "Online",
      metrics: [
        { label: "Support", value: "24/7", detail: "Email and chat" },
        { label: "Status", value: "Healthy", detail: "No incidents" },
        { label: "Avg reply", value: "2h", detail: "Email support" },
        { label: "Guides", value: "Setup", detail: "Launch and tuning" }
      ],
      primaryTitle: "Guides and support",
      primaryMeta: "Common questions and ways to reach the team.",
      items: [
        { label: "Connect a new system", value: "Integrations", note: "Open Integrations and choose Add integration to link a CRM, phone, or knowledge tool." },
        { label: "Take this agent live", value: "Launch", note: "The Launch Gate runs the scenario, runtime, and safety checks that decide readiness." },
        { label: "Handle escalated calls", value: "Live Queue", note: "The Live Queue shows every conversation that needs a human agent right now." },
        { label: "Understand the metrics", value: "Metrics", note: "Metrics tracks containment, voice response time, and attention items across today." },
        { label: "Email support", value: "2h reply", note: "Reach the RelayClarity team at support@relayclarity.ai — replies within 2 hours." }
      ],
      next: ["Browse setup guide", "Contact support", "View status page"]
    }
  };
  type SettingsRow = { label: string; value?: string; note?: string; goto?: string; href?: string };
  type SettingsSection = { id: string; label: string; hint: string; title: string; summary: string; rows: SettingsRow[] };
  const accountProviderLabel = user.provider === "google" ? "Google" : user.provider === "github" ? "GitHub" : "Email";
  const settingsSections: SettingsSection[] = [
    {
      id: "workspace",
      label: "Workspace",
      hint: "Name and business type",
      title: "Workspace",
      summary: "How this workspace is described to the agent and your team.",
      rows: [
        { label: "Name", value: activeProject.name },
        { label: "Business type", value: activeProject.businessType || activeProject.meta },
        ...(activeProject.websiteUrl ? [{ label: "Website", value: activeProject.websiteUrl }] : []),
        ...(activeProject.phoneContactNumber ? [{ label: "Phone", value: activeProject.phoneContactNumber }] : []),
        { label: "Connected systems", value: `${completedConnectedCount} active`, note: "Manage what the agent can read and update.", goto: "integrations" },
        { label: "Launch readiness", value: `${readinessScore}% · ${liveStatus}`, note: "Open the Launch Gate to see the checks.", goto: "launch" }
      ]
    },
    {
      id: "account",
      label: "Account",
      hint: "Profile and access",
      title: "Account",
      summary: "The person who owns and signs in to this workspace.",
      rows: [
        { label: "Name", value: user.name || "Not set" },
        { label: "Email", value: user.email },
        { label: "Sign-in", value: accountProviderLabel },
        { label: "Workspaces", value: String(projects.length) }
      ]
    },
    {
      id: "agent",
      label: "Agent",
      hint: "Voice and handoffs",
      title: "Agent behaviour",
      summary: isOperationalDashboardLive
        ? "Live signals that describe how the agent is handling customers today."
        : "Production customer signals unlock after the Launch Gate is passed and the agent is launched.",
      rows: isOperationalDashboardLive
        ? [
          { label: "Voice response", value: `${latencySeconds}s typical`, note: "Time a caller waits for the agent to reply." },
          { label: "Solved without staff", value: `${containmentRate}%`, note: "Conversations resolved without a human handoff." },
          { label: "Handoffs today", value: String(liveMetrics.handoffs), note: "Open the Live Queue to review them.", goto: "risk" },
          { label: "Open attention", value: String(liveMetrics.openRisks), note: "Items waiting on a check across safety and knowledge." }
        ]
        : [
          { label: "Production status", value: "Not live", note: "Launch the agent before customer activity appears here.", goto: "launch" },
          { label: "Voice response", value: "Locked", note: "Live response timing is hidden until production traffic is enabled." },
          { label: "Handoffs", value: "Locked", note: "Live Queue data unlocks after launch." },
          { label: "Attention items", value: "Locked", note: "Operational review items unlock after launch." }
        ]
    },
    {
      id: "usage",
      label: "Usage",
      hint: "Calls and activity",
      title: isOperationalDashboardLive ? "Usage today" : "Usage locked",
      summary: isOperationalDashboardLive
        ? "Live activity for this workspace today."
        : "Customer calls, chats, and metrics are hidden until the agent is live.",
      rows: isOperationalDashboardLive
        ? [
          { label: "Calls handled", value: String(liveMetrics.callsHandled), note: "Total customer calls so far today." },
          { label: "Solved by AI", value: String(liveMetrics.containedCalls), note: "Calls handled without staff." },
          { label: "Active now", value: String(liveMetrics.activeCalls), note: "Conversations in progress." },
          { label: "Full metrics", value: "Open", note: "See trends and the hourly breakdown.", goto: "metrics" }
        ]
        : [
          { label: "Calls", value: "Locked", note: "Launch the agent before live call data is visible.", goto: "launch" },
          { label: "Chats", value: "Locked", note: "Live chat data unlocks after launch.", goto: "launch" },
          { label: "Metrics", value: "Locked", note: "Production metrics unlock after launch.", goto: "launch" },
          { label: "Live Queue", value: "Locked", note: "Active operations unlock after launch.", goto: "launch" }
        ]
    }
  ];
  const activeSettingsSection = settingsSections.find((section) => section.id === settingsTab) || settingsSections[0];
  const helpSections: SettingsSection[] = [
    {
      id: "start",
      label: "Getting started",
      hint: "Set up your agent",
      title: "Getting started",
      summary: "The fastest path from a new workspace to a live customer agent.",
      rows: [
        { label: "Connect your systems", value: "Integrations", note: "Link a CRM, phone, and knowledge tool so handoffs carry context.", goto: "integrations" },
        { label: "Ask the workspace assistant", value: "AI workspace", note: "Tell the agent which questions and tasks to handle first.", goto: "ai" },
        { label: "Run launch checks", value: "Launch", note: "The Launch Gate runs scenario, runtime, and safety checks.", goto: "launch" },
        { label: "Go live", value: "Launch", note: "Turn the agent on once readiness passes the threshold.", goto: "launch" }
      ]
    },
    {
      id: "guides",
      label: "Guides",
      hint: "Step-by-step help",
      title: "Guides",
      summary: "Walkthroughs for the main areas of the workspace.",
      rows: [
        { label: "Connect a new system", value: "Integrations", note: "Open Integrations and choose Add integration.", goto: "integrations" },
        { label: "Take this agent live", value: "Launch", note: "Understand the Launch Gate checks and thresholds.", goto: "launch" },
        {
          label: "Handle escalated calls",
          value: isOperationalDashboardLive ? "Live Queue" : "Locked",
          note: isOperationalDashboardLive ? "See every conversation that needs a human now." : "Live Queue unlocks after launch.",
          goto: isOperationalDashboardLive ? "risk" : "launch"
        },
        {
          label: "Read the metrics",
          value: isOperationalDashboardLive ? "Metrics" : "Locked",
          note: isOperationalDashboardLive ? "Containment, response time, and attention items." : "Metrics unlock after launch.",
          goto: isOperationalDashboardLive ? "metrics" : "launch"
        }
      ]
    },
    {
      id: "faqs",
      label: "FAQs",
      hint: "Common questions",
      title: "Frequently asked",
      summary: "Quick answers to the questions teams ask most.",
      rows: [
        { label: "When can this agent go live?", note: "Once the Launch Gate readiness score passes the required threshold." },
        { label: "Who handles escalated calls?", note: isOperationalDashboardLive ? "Conversations that need a person appear in the Live Queue for staff." : "Escalation handling unlocks in Live Queue after launch." },
        { label: "How are metrics calculated?", note: isOperationalDashboardLive ? "From today's calls — containment, voice response time, and attention items." : "Production metrics are calculated after live customer traffic is enabled." },
        { label: "Can I add more systems?", note: "Yes — Integrations supports CRM, phone, booking, and knowledge tools." }
      ]
    },
    {
      id: "contact",
      label: "Contact",
      hint: "Reach the team",
      title: "Contact support",
      summary: "Ways to reach the RelayClarity team when you need a hand.",
      rows: [
        { label: "Email support", value: "Email", note: "support@relayclarity.ai — replies within two hours.", href: "mailto:support@relayclarity.ai" },
        { label: "Ask the workspace assistant", value: "AI workspace", note: isOperationalDashboardLive ? "Get instant answers about setup, metrics, and handoffs." : "Get instant answers about setup, integrations, and launch blockers.", goto: "ai" },
        { label: "Review integrations", value: "Integrations", note: "Check what the agent can read and update.", goto: "integrations" }
      ]
    }
  ];
  const activeHelpSection = helpSections.find((section) => section.id === helpTab) || helpSections[0];
  const openSettingsRoute = (route: string) => {
    if (!isOperationalDashboardLive && isOperationalRoute(route)) {
      setActiveRoute("launch");
      setActiveMetricFocus(null);
      return;
    }

    setActiveRoute(route);
    setActiveMetricFocus(null);
  };
  const metricsTabs: MetricsTab[] = [
    {
      id: "overview",
      label: "Overview",
      title: "Production metrics",
      summary: "The key signals that decide whether this agent can safely run today.",
      status: "Ready",
      metrics: dashboardPages.metrics.metrics,
      primaryTitle: dashboardPages.metrics.primaryTitle,
      primaryMeta: dashboardPages.metrics.primaryMeta,
      chart: dashboardPages.metrics.chart || [],
      chartTotal: `${liveMetrics.callsHandled} calls`,
      items: dashboardPages.metrics.items || [],
      checks: dashboardPages.metrics.items || [],
      next: dashboardPages.metrics.next
    },
    {
      id: "outcomes",
      label: "Outcomes",
      title: "Customer outcomes",
      summary: "How many customers get a useful answer without waiting for the team.",
      status: containmentRate >= 80 ? "Strong" : "Watching",
      metrics: [
        { label: "Solved first time", value: `${liveMetrics.firstContactResolution}%`, detail: "No repeat contact" },
        { label: "Came back later", value: `${liveMetrics.recontactRate}%`, detail: "Target is under 8%" },
        { label: "Staff time saved", value: `${liveMetrics.humanHoursSaved}h`, detail: "Estimated today" },
        { label: "Customer rating", value: liveMetrics.csat.toFixed(1), detail: "From rated calls" }
      ],
      primaryTitle: "Outcome mix",
      primaryMeta: "Solved, handed off, and follow-up conversations.",
      chart: [
        { label: "AI solved", value: containmentRate * 2, display: `${containmentRate}%` },
        { label: "Human", value: handoffRate * 6, display: `${handoffRate}%` },
        { label: "Review", value: liveMetrics.openRisks * 18, display: String(liveMetrics.openRisks) },
        { label: "Recontact", value: liveMetrics.recontactRate * 8, display: `${liveMetrics.recontactRate}%` },
        { label: "CSAT", value: liveMetrics.csat * 20, display: liveMetrics.csat.toFixed(1) }
      ],
      chartTotal: `${containmentRate}% true containment`,
      items: [
        { label: "Solved by the agent", value: `${containmentRate}%`, note: `${liveMetrics.containedCalls} customers got an answer without needing staff follow-up.` },
        { label: "Sent to the team", value: `${handoffRate}%`, note: `${liveMetrics.handoffs} conversations were passed over with notes and context.` },
        { label: "Needs attention", value: String(liveMetrics.openRisks), note: "These are the items most likely to affect customer experience." }
      ],
      checks: [
        { label: "Repeat-contact risk", value: liveMetrics.recontactRate <= 5 ? "Low" : "Med", note: "Shows whether customers had to come back after an answer." },
        { label: "Best performing topic", value: "Billing", note: "Invoice requests are currently handled most reliably." },
        { label: "Customer friction", value: `${liveMetrics.recontactRate}%`, note: "Lower is better; it means answers are holding up." }
      ],
      next: ["Check repeat contacts", "View top topics", "Export outcomes"]
    },
    {
      id: "voice",
      label: "Voice",
      title: "Voice quality",
      summary: "How natural and reliable the phone experience feels to callers.",
      status: liveMetrics.p95LatencyMs < 1600 ? "Healthy" : "Tuning",
      metrics: [
        { label: "Response time", value: `${latencySeconds}s`, detail: "95% of replies" },
        { label: "Heard correctly", value: `${liveMetrics.asrConfidence}%`, detail: "Speech clarity" },
        { label: "Handles interruptions", value: `${liveMetrics.bargeInRecovery}%`, detail: "Caller cuts in" },
        { label: "Silence issues", value: `${liveMetrics.silenceTimeoutRate}%`, detail: "Lower is better" }
      ],
      primaryTitle: "Voice signals",
      primaryMeta: "Signals that show whether phone calls feel smooth.",
      chart: [
        { label: "Reply", value: liveMetrics.p95LatencyMs / 12, display: `${latencySeconds}s` },
        { label: "Heard", value: liveMetrics.asrConfidence * 2, display: `${liveMetrics.asrConfidence}%` },
        { label: "Interrupt", value: liveMetrics.bargeInRecovery * 2, display: `${liveMetrics.bargeInRecovery}%` },
        { label: "Timeout", value: liveMetrics.silenceTimeoutRate * 12, display: `${liveMetrics.silenceTimeoutRate}%` },
        { label: "Missed", value: liveMetrics.failedTurns * 11, display: String(liveMetrics.failedTurns) }
      ],
      chartTotal: `${latencySeconds}s reply time`,
      items: [
        { label: "Slowest reply", value: `${(liveMetrics.p95LatencyMs * 1.9 / 1000).toFixed(1)}s`, note: "Usually caused by a lookup or a more complex customer question." },
        { label: "Missed turns", value: String(liveMetrics.failedTurns), note: "Usually caller silence, background noise, or unclear speech." },
        { label: "Calls happening now", value: String(liveMetrics.activeCalls), note: "Live phone sessions currently in progress." }
      ],
      checks: [
        { label: "Speed risk", value: liveMetrics.p95LatencyMs < 1600 ? "Low" : "Med", note: "Shows if callers are waiting too long for answers." },
        { label: "Interruption risk", value: liveMetrics.bargeInRecovery >= 88 ? "Low" : "Med", note: "Shows whether the agent recovers when callers talk over it." },
        { label: "Audio risk", value: liveMetrics.asrConfidence >= 92 ? "Low" : "Med", note: "Shows whether the agent is hearing customers clearly." }
      ],
      next: ["Check slow replies", "Improve call timing", "Review missed turns"]
    },
    {
      id: "knowledge",
      label: "Knowledge",
      title: "Knowledge quality",
      summary: "Whether the agent has the right information to answer customers accurately.",
      status: `${liveMetrics.citationCoverage}% confident`,
      metrics: [
        { label: "Answers from sources", value: `${liveMetrics.citationCoverage}%`, detail: "Uses approved info" },
        { label: "Could not find info", value: String(liveMetrics.retrievalMisses), detail: "Needs content" },
        { label: "Outdated sources", value: String(liveMetrics.staleSources), detail: "Needs refresh" },
        { label: "Suggested updates", value: String(liveMetrics.draftAnswers), detail: "Ready to review" }
      ],
      primaryTitle: "Knowledge gaps",
      primaryMeta: "The information gaps most likely to affect customer answers.",
      chart: [
        { label: "Citations", value: liveMetrics.citationCoverage * 2, display: `${liveMetrics.citationCoverage}%` },
        { label: "Coverage", value: liveMetrics.citationCoverage * 2, display: `${liveMetrics.citationCoverage}%` },
        { label: "Misses", value: liveMetrics.retrievalMisses * 10, display: String(liveMetrics.retrievalMisses) },
        { label: "Stale", value: liveMetrics.staleSources * 24, display: String(liveMetrics.staleSources) },
        { label: "Drafts", value: liveMetrics.draftAnswers * 18, display: String(liveMetrics.draftAnswers) }
      ],
      chartTotal: `${liveMetrics.citationCoverage}% confident`,
      items: [
        { label: "Billing limits", value: "High", note: "Clarify exactly what the agent can say before staff approval." },
        { label: "Holiday hours", value: "Med", note: "Confirm the latest public opening hours." },
        { label: "Refund wording", value: "Low", note: "Make the answer clearer for customers waiting on bank transfers." }
      ],
      checks: [
        { label: "Blocking issue", value: liveMetrics.staleSources > 2 ? "Content" : "None", note: "Shows whether missing information could stop the agent from launching." },
        { label: "Best next fix", value: "Billing", note: "One clearer billing source would improve several common questions." },
        { label: "Updates waiting", value: String(liveMetrics.draftAnswers), note: "Suggested answer improvements are ready to review." }
      ],
      next: ["Review answer updates", "Add missing source", "Check top questions"]
    },
    {
      id: "safety",
      label: "Safety",
      title: "Safety and guardrails",
      summary: "Whether the agent stays within the rules and avoids risky answers.",
      status: liveMetrics.policyViolations === 0 ? "Passing" : "Review",
      metrics: [
        { label: "Critical rule breaks", value: String(liveMetrics.policyViolations), detail: "Should stay at 0" },
        { label: "Unsafe requests blocked", value: String(liveMetrics.unsupportedAttempts), detail: "Handled safely" },
        { label: "Unsure answers", value: String(liveMetrics.lowConfidenceAnswers), detail: "Sent to staff" },
        { label: "Sensitive cases", value: String(liveMetrics.sensitiveEscalations), detail: "Escalated safely" }
      ],
      primaryTitle: "Safety queue",
      primaryMeta: "Clear signs of what is safe, what is blocked, and what needs attention.",
      chart: [
        { label: "Policy", value: Math.max(20, liveMetrics.policyViolations * 40), display: String(liveMetrics.policyViolations) },
        { label: "Blocked", value: liveMetrics.unsupportedAttempts * 18, display: String(liveMetrics.unsupportedAttempts) },
        { label: "Low conf", value: liveMetrics.lowConfidenceAnswers * 13, display: String(liveMetrics.lowConfidenceAnswers) },
        { label: "Sensitive", value: liveMetrics.sensitiveEscalations * 24, display: String(liveMetrics.sensitiveEscalations) },
        { label: "Guardrails", value: 184, display: "Pass" }
      ],
      chartTotal: liveMetrics.policyViolations === 0 ? "Passing" : "Review",
      items: [
        { label: "Refund promise", value: "Blocked", note: "The agent did not promise money back without staff approval." },
        { label: "Sensitive wording", value: liveMetrics.sensitiveEscalations ? "Watch" : "Good", note: "Sensitive questions are being passed to the team instead of guessed." },
        { label: "Rule following", value: liveMetrics.policyViolations === 0 ? "Good" : "Issue", note: "The agent is following the configured business rules." }
      ],
      checks: [
        { label: "Critical safety", value: liveMetrics.policyViolations === 0 ? "Good" : "Issue", note: "Any critical rule break should be treated as urgent." },
        { label: "Human backup", value: String(liveMetrics.sensitiveEscalations), note: "Shows how many sensitive cases were correctly sent to staff." },
        { label: "Rule match", value: "Good", note: "The current rules still match the configured workflow." }
      ],
      next: ["Check safety summary", "Review escalations", "Export safety report"]
    },
    {
      id: "handoffs",
      label: "Handoffs",
      title: "Human handoffs",
      summary: "When the agent passes a customer to the team and whether that handoff is useful.",
      status: `${liveMetrics.handoffs} pending`,
      metrics: [
        { label: "Sent to staff", value: `${handoffRate}%`, detail: `${liveMetrics.handoffs} cases` },
        { label: "Close to deadline", value: String(liveMetrics.slaRisk), detail: "Needs attention" },
        { label: "Handoff speed", value: `${liveMetrics.avgHandoffSeconds}s`, detail: "With summary" },
        { label: "Right team", value: `${liveMetrics.ownerAccuracy}%`, detail: "Routing accuracy" }
      ],
      primaryTitle: "Handoff reasons",
      primaryMeta: "Why customers were passed to a person.",
      chart: [
        { label: "Billing", value: Math.max(24, liveMetrics.handoffs * 28), display: String(Math.max(1, liveMetrics.handoffs - liveMetrics.sensitiveEscalations)) },
        { label: "Policy", value: Math.max(18, liveMetrics.sensitiveEscalations * 40), display: String(liveMetrics.sensitiveEscalations) },
        { label: "SLA", value: Math.max(18, liveMetrics.slaRisk * 42), display: String(liveMetrics.slaRisk) },
        { label: "Owner", value: liveMetrics.ownerAccuracy * 2, display: `${liveMetrics.ownerAccuracy}%` },
        { label: "Context", value: 164, display: "Good" }
      ],
      chartTotal: `${liveMetrics.handoffs} pending`,
      items: [
        { label: "Billing question", value: String(Math.max(1, liveMetrics.handoffs - liveMetrics.sensitiveEscalations)), note: "Needs a finance or account owner." },
        { label: "Sensitive case", value: String(liveMetrics.sensitiveEscalations), note: "Correctly sent to a person instead of answered automatically." },
        { label: "Missing information", value: "0", note: "No customer is waiting because of an unresolved answer gap." }
      ],
      checks: [
        { label: "Deadline risk", value: String(liveMetrics.slaRisk), note: "Shows cases that should be picked up soon." },
        { label: "Summary quality", value: "Good", note: "Handoffs include what the customer needs and who should own it." },
        { label: "Wrong team", value: "None", note: "No handoff has gone to the wrong queue." }
      ],
      next: ["Assign owner", "Open urgent cases", "Clear old handoffs"]
    },
    {
      id: "systems",
      label: "Systems",
      title: "System health",
      summary: "Whether the connected tools are working reliably behind the scenes.",
      status: `${completedConnectedCount} connected`,
      metrics: [
        { label: "CRM success", value: `${liveMetrics.crmLookupSuccess}%`, detail: "Customer lookup" },
        { label: "Ticket success", value: `${liveMetrics.ticketWriteSuccess}%`, detail: "Helpdesk updates" },
        { label: "Connection errors", value: String(liveMetrics.webhookErrors), detail: "Should stay low" },
        { label: "Last content sync", value: `${liveMetrics.knowledgeSyncMinutes}m`, detail: "Minutes ago" }
      ],
      primaryTitle: "System checks",
      primaryMeta: "Connected tools the agent depends on during live customer work.",
      chart: [
        { label: "CRM", value: liveMetrics.crmLookupSuccess * 2, display: `${liveMetrics.crmLookupSuccess}%` },
        { label: "Tickets", value: liveMetrics.ticketWriteSuccess * 2, display: `${liveMetrics.ticketWriteSuccess}%` },
        { label: "Zoom", value: Math.max(20, liveMetrics.webhookErrors * 24), display: String(liveMetrics.webhookErrors) },
        { label: "Sync", value: Math.max(20, 160 - liveMetrics.knowledgeSyncMinutes * 6), display: `${liveMetrics.knowledgeSyncMinutes}m` },
        { label: "Export", value: 52, display: "Setup" }
      ],
      chartTotal: `${completedConnectedCount} connected`,
      items: [
        { label: "Zoom Contact Center", value: "Live", note: "Calls and transcripts are coming through." },
        { label: "HubSpot", value: `${Math.max(1, liveMetrics.knowledgeSyncMinutes - 2)}m`, note: "Customer lookup and notes are working." },
        { label: "Analytics export", value: "Setup", note: "Reporting export still needs final setup." }
      ],
      checks: [
        { label: "Unfinished setup", value: "Export", note: "Analytics export is the only unfinished integration path." },
        { label: "Login health", value: liveMetrics.crmLookupSuccess >= 96 ? "Good" : "Watch", note: "Connected systems are passing current checks." },
        { label: "Retry count", value: String(liveMetrics.webhookErrors), note: "Connection and tool issues update live." }
      ],
      next: ["Run system check", "Finish reporting", "Review connections"]
    },
    (() => {
      const evaluation = modelHealth.evaluation;
      const model = modelHealth.model;
      const drift = modelHealth.drift;
      const feedback = modelHealth.feedback;

      const accuracy = evaluation?.metrics?.accuracy;
      const macroF1 = evaluation?.metrics?.macroF1;
      const highRecall = evaluation?.metrics?.highRecall;
      const highPrecision = evaluation?.metrics?.perClass?.high?.precision;
      const ece = evaluation?.calibration?.expectedCalibrationError;
      const p95LatencyMs = evaluation?.performance?.p95LatencyMs;
      const throughputPerSec = evaluation?.performance?.throughputPerSec;
      const costPer1k = evaluation?.performance?.estimatedCostPer1kGbp;
      const tierDisparity = evaluation?.fairness?.customerTier?.disparityGap;
      const gatePassed = evaluation?.deploymentGate?.passed;
      const gateResults = evaluation?.deploymentGate?.results;

      const modelVersion = model?.modelVersion;
      const framework = model?.framework;
      const trainedAt = model?.trainedAt;
      const temperature = model?.calibration?.temperature;

      const psi = drift?.populationStabilityIndex;
      const driftStatus = drift?.status;
      const sampleSize = drift?.sampleSize;
      const liveTierDisparity = drift?.fairness?.attributes?.customerTier?.disparityGap;
      const liveTierStatus = drift?.fairness?.attributes?.customerTier?.status;

      const feedbackTotal = feedback?.total;
      const agreementRate = feedback?.agreementRate;
      const overridden = feedback?.overridden;

      const pct = (value: number | undefined | null) => (value != null ? `${Math.round(value * 100)}%` : "—");
      const passingGates = gateResults
        ? Object.entries(gateResults).filter(([, value]) => value === true).map(([key]) => key)
        : [];
      // Keep card/badge VALUES short — long strings overlap their fixed containers; verbose text goes in the notes.
      const shortVersion = modelVersion ? `v${String(modelVersion).split("-").pop()}` : "—";
      const trainedDate = trainedAt ? String(trainedAt).slice(0, 10) : "";
      const driftLabel = !driftStatus
        ? "—"
        : driftStatus === "insufficient_sample"
          ? "No data"
          : driftStatus.charAt(0).toUpperCase() + driftStatus.slice(1);

      return {
        id: "model",
        label: "Model Health",
        title: "Model health & governance",
        summary: "Accuracy, calibration, fairness, and drift for the risk-scoring model.",
        status: evaluation ? (gatePassed ? "Gate pass" : "Review") : "Awaiting data",
        metrics: [
          { label: "Accuracy", value: pct(accuracy), detail: "Offline evaluation" },
          { label: "High-risk recall", value: pct(highRecall), detail: "Catches risky cases" },
          { label: "Calibration (ECE)", value: ece != null ? ece.toFixed(3) : "—", detail: "Lower is better" },
          { label: "p95 latency", value: p95LatencyMs != null ? `${p95LatencyMs.toFixed(2)}ms` : "—", detail: "Scoring time" }
        ],
        primaryTitle: "Model signals",
        primaryMeta: "Offline evaluation plus live drift and feedback.",
        chart: evaluation
          ? [
            { label: "Accuracy", value: accuracy != null ? accuracy * 100 : 0, display: pct(accuracy) },
            { label: "Macro-F1", value: macroF1 != null ? macroF1 * 100 : 0, display: pct(macroF1) },
            { label: "High recall", value: highRecall != null ? highRecall * 100 : 0, display: pct(highRecall) },
            { label: "High prec", value: highPrecision != null ? highPrecision * 100 : 0, display: pct(highPrecision) },
            { label: "Calibration", value: ece != null ? (1 - ece) * 100 : 0, display: ece != null ? ece.toFixed(3) : "—" }
          ]
          : [
            { label: "Accuracy", value: 0, display: "—", empty: true },
            { label: "Macro-F1", value: 0, display: "—", empty: true },
            { label: "High recall", value: 0, display: "—", empty: true },
            { label: "High prec", value: 0, display: "—", empty: true },
            { label: "Calibration", value: 0, display: "—", empty: true }
          ],
        chartTotal: modelVersion ? shortVersion : "No model",
        items: [
          {
            label: "Model version",
            value: shortVersion,
            note: modelVersion
              ? `${modelVersion}${framework ? ` · ${framework}` : ""}${trainedDate ? ` · trained ${trainedDate}` : ""}`
              : "No model registered yet."
          },
          {
            label: "Calibration",
            value: temperature != null ? `T ${Number(temperature).toFixed(2)}` : "—",
            note: `Temperature scaling · ECE ${ece != null ? ece.toFixed(3) : "—"}`
          },
          {
            label: "Throughput",
            value: throughputPerSec != null ? `${Math.round(throughputPerSec).toLocaleString()}/s` : "—",
            note: costPer1k != null ? `≈£${costPer1k} per 1k predictions` : "Cost not available yet."
          },
          {
            label: "Drift status",
            value: driftLabel,
            note: sampleSize ? `PSI ${psi != null ? psi : "—"} · ${sampleSize} scored` : "Awaiting live traffic"
          },
          {
            label: "Human agreement",
            value: feedbackTotal ? pct(agreementRate) : "—",
            note: feedbackTotal ? `${overridden != null ? overridden : 0} overrides logged` : "No feedback yet"
          }
        ],
        checks: [
          {
            label: "Deployment gate",
            value: evaluation ? (gatePassed ? "Pass" : "Review") : "—",
            note: passingGates.length ? `Passing: ${passingGates.join(", ")}` : "No gate results yet."
          },
          {
            label: "Fairness — customer tier",
            value: tierDisparity != null ? tierDisparity.toFixed(2) : "—",
            note: "Gap in high-risk rate across tiers; monitored, not auto-tuned."
          },
          {
            label: "Live fairness",
            value: liveTierDisparity != null ? liveTierDisparity.toFixed(2) : "—",
            note: liveTierDisparity != null
              ? `Live tier disparity${liveTierStatus ? ` · ${liveTierStatus}` : ""} from the drift report.`
              : "Awaiting live traffic — needs scored cases."
          }
        ],
        next: ["Open model card", "Review drift report", "Export feedback"]
      };
    })()
  ];
  const activeMetricsTabData = metricsTabs.find((tab) => tab.id === activeMetricsTab) || metricsTabs[0];
  const activeMetricFocusForTab = activeMetricFocus?.tabId === activeMetricsTabData.id ? activeMetricFocus : null;
  const focusedMetricCalls = activeMetricFocusForTab
    ? metricCallRecords.filter((call) => {
      if (activeMetricFocusForTab.chartId === "hourly-volume") {
        return call.hourLabel === activeMetricFocusForTab.label;
      }

      if (activeMetricFocusForTab.chartId === "outcome-mix") {
        if (activeMetricFocusForTab.label === "Solved by AI") return call.outcome === "Resolved";
        if (activeMetricFocusForTab.label === "Human handoff") return call.outcome === "Handoff";
        if (activeMetricFocusForTab.label === "Open risk") return call.outcome === "Review" || call.outcome === "Handoff";
      }

      if (activeMetricFocusForTab.chartId === "handoff-reasons") {
        if (activeMetricFocusForTab.label === "Billing exception") return call.issueCategory === "Billing" && call.outcome !== "Resolved";
        if (activeMetricFocusForTab.label === "Sensitive policy") return call.issueCategory === "Policy";
        if (activeMetricFocusForTab.label === "Knowledge gap") return call.issueCategory === "Knowledge" || call.confidence < 82;
      }

      if (activeMetricFocusForTab.chartId === "knowledge-quality") {
        if (activeMetricFocusForTab.label === "Source coverage") return call.outcome === "Resolved" && call.confidence >= 86;
        if (activeMetricFocusForTab.label === "Lookup misses") return call.issueCategory === "Knowledge" || call.issueCategory === "Technical";
        if (activeMetricFocusForTab.label === "Draft updates") return call.outcome === "Review";
      }

      return true;
    }).slice(0, Math.max(1, activeMetricFocusForTab.pointValue))
    : [];
  const selectedPointShare = activeMetricFocusForTab
    ? Math.round((activeMetricFocusForTab.pointValue / Math.max(1, activeMetricFocusForTab.chartData.reduce((total, point) => total + point.value, 0))) * 100)
    : 0;
  const focusedMetricsTabData: MetricsTab | null = activeMetricFocusForTab ? {
    ...activeMetricsTabData,
    title: `${activeMetricFocusForTab.chartTitle}: ${activeMetricFocusForTab.label}`,
    summary: `Focused view for the exact data point opened from the AI workspace graph.`,
    status: activeMetricFocusForTab.pointPercent !== undefined ? `${activeMetricFocusForTab.pointPercent}%` : activeMetricFocusForTab.pointDisplay,
    metrics: [
      { label: "Selected point", value: activeMetricFocusForTab.pointDisplay, detail: activeMetricFocusForTab.label },
      { label: "Calls shown", value: String(focusedMetricCalls.length), detail: "Underlying records" },
      { label: "Problems found", value: String(focusedMetricCalls.filter((call) => call.outcome !== "Resolved").length), detail: "Handoff, review, or abandoned" },
      { label: "Avg confidence", value: `${Math.round(focusedMetricCalls.reduce((total, call) => total + call.confidence, 0) / Math.max(1, focusedMetricCalls.length))}%`, detail: "Across selected calls" }
    ],
    primaryTitle: activeMetricFocusForTab.label,
    primaryMeta: `Opened from ${activeMetricFocusForTab.chartTitle}.`,
    chart: activeMetricFocusForTab.chartData.map((point) => ({
      label: point.label,
      value: activeMetricFocusForTab.chartId === "hourly-volume"
        ? point.value * 5
        : Math.max(18, point.percent ?? point.value * 12),
      display: point.display || String(point.value)
    })),
    chartTotal: activeMetricFocusForTab.value,
    items: [
      { label: "Call records", value: String(focusedMetricCalls.length), note: `${focusedMetricCalls.length} underlying call${focusedMetricCalls.length === 1 ? "" : "s"} are available for this selected metric.` },
      { label: "Graph context", value: `${selectedPointShare}%`, note: `This point accounts for ${selectedPointShare}% of the currently visible ${activeMetricFocusForTab.chartTitle.toLowerCase()} data.` },
      { label: "Current workspace", value: liveStatus, note: `${activeProject.name} is at ${readinessScore}% readiness with ${liveMetrics.openRisks} attention item${liveMetrics.openRisks === 1 ? "" : "s"}.` }
    ],
    checks: [
      { label: "Resolved", value: String(focusedMetricCalls.filter((call) => call.outcome === "Resolved").length), note: "Calls completed by the AI without staff." },
      { label: "Needs review", value: String(focusedMetricCalls.filter((call) => call.outcome !== "Resolved").length), note: "Calls with handoff, review, or incomplete outcomes." },
      { label: "Transcript depth", value: "3 turns", note: "Each record includes customer, AI, and final system or AI turn." }
    ],
    next: ["Open calls behind this", "Compare trend", "Review related actions"]
  } : null;
  const displayedMetricsTabData = focusedMetricsTabData || activeMetricsTabData;
  const activeMetricsChart = [
    ...displayedMetricsTabData.chart,
    ...Array.from({ length: Math.max(0, 8 - displayedMetricsTabData.chart.length) }, (_, index) => ({
      label: `empty-${index}`,
      value: 0,
      display: "",
      empty: true
    }))
  ].slice(0, 8);
  const metricsStudioStatus = "Strong";
  type DashboardPage = (typeof dashboardPages)[keyof typeof dashboardPages];
  type DashboardChartBar = { label: string; value: number };
  type DashboardProgressBar = { label: string; value: number; percent: number };
  const hasChart = (page: DashboardPage): page is DashboardPage & { chart: DashboardChartBar[] } => "chart" in page;
  const hasBars = (page: DashboardPage): page is DashboardPage & { bars: DashboardProgressBar[] } => "bars" in page;
  const activeDashboardPage = activeRoute === "ai"
    ? null
    : !isOperationalDashboardLive && isOperationalRoute(activeRoute)
      ? dashboardPages.launch
      : dashboardPages[activeRoute] || dashboardPages.launch;
  const openingAssistantTurn = assistantMessages[0];
  const followUpAssistantMessages = assistantMessages.slice(1);
  const currentAssistantCharts: WorkspaceAssistantChart[] = isOperationalDashboardLive ? [
    {
      id: "hourly-volume",
      title: "Hourly call volume",
      kind: "bar",
      data: metricsHourlyVolume.map((hour) => ({
        label: hour.label,
        value: hour.value,
        display: String(hour.value)
      }))
    },
    {
      id: "outcome-mix",
      title: "Customer outcome mix",
      kind: "progress",
      data: [
        { label: "Solved by AI", value: liveMetrics.containedCalls, display: `${containmentRate}%`, percent: containmentRate },
        { label: "Human handoff", value: liveMetrics.handoffs, display: `${handoffRate}%`, percent: handoffRate },
        { label: "Open risk", value: liveMetrics.openRisks, display: String(liveMetrics.openRisks), percent: Math.min(100, Math.round((liveMetrics.openRisks / Math.max(1, liveMetrics.callsHandled)) * 100)) }
      ]
    },
    {
      id: "handoff-reasons",
      title: "Handoff reasons",
      kind: "progress",
      data: handoffReasons.map((reason) => ({
        label: reason.label,
        value: reason.value,
        display: String(reason.value),
        percent: reason.percent
      }))
    },
    {
      id: "knowledge-quality",
      title: "Knowledge quality",
      kind: "progress",
      data: [
        { label: "Source coverage", value: liveMetrics.citationCoverage, display: `${liveMetrics.citationCoverage}%`, percent: liveMetrics.citationCoverage },
        { label: "Lookup misses", value: liveMetrics.retrievalMisses, display: String(liveMetrics.retrievalMisses), percent: Math.min(100, liveMetrics.retrievalMisses * 8) },
        { label: "Draft updates", value: liveMetrics.draftAnswers, display: String(liveMetrics.draftAnswers), percent: Math.min(100, liveMetrics.draftAnswers * 12) }
      ]
    }
  ] : [];
  const openMetricPoint = (chart: WorkspaceAssistantChart, point: WorkspaceAssistantChart["data"][number]) => {
    if (!isOperationalDashboardLive) {
      setActiveRoute("launch");
      setActiveMetricFocus(null);
      return;
    }

    const chartTabMap: Record<string, string> = {
      "hourly-volume": "overview",
      "outcome-mix": "outcomes",
      "handoff-reasons": "handoffs",
      "knowledge-quality": "knowledge"
    };
    const tabId = chartTabMap[chart.id] || "overview";

    setActiveMetricsTab(tabId);
    setActiveMetricFocus({
      tabId,
      chartId: chart.id,
      chartTitle: chart.title,
      label: point.label,
      value: buildChartPointTooltip(chart, point),
      pointValue: point.value,
      pointDisplay: point.display || String(point.value),
      pointPercent: point.percent,
      chartData: chart.data
    });
    setActiveRoute("metrics");
  };
  const clearAssistantReplyTimers = () => {
    assistantReplyTimers.current.forEach((timer) => window.clearTimeout(timer));
    assistantReplyTimers.current = [];
  };
  const typeAssistantReply = (reply: string, finalStatus: "idle" | "error", charts: WorkspaceAssistantChart[] = []) => {
    clearAssistantReplyTimers();

    setAssistantMessages((current) => [
      ...current,
      { role: "agent", content: "", charts }
    ]);
    setIsAssistantTyping(true);
    setWorkspaceAssistantStatus("idle");

    let currentIndex = 0;
    const typeNextChunk = () => {
      currentIndex = Math.min(reply.length, currentIndex + (currentIndex < 120 ? 4 : 7));
      const nextContent = reply.slice(0, currentIndex);

      setAssistantMessages((current) => current.map((chatMessage, index) => (
        index === current.length - 1
          ? { ...chatMessage, content: nextContent }
          : chatMessage
      )));

      if (currentIndex >= reply.length) {
        setIsAssistantTyping(false);
        setWorkspaceAssistantStatus(finalStatus);
        return;
      }

      const timer = window.setTimeout(typeNextChunk, 18);
      assistantReplyTimers.current.push(timer);
    };

    const startTimer = window.setTimeout(typeNextChunk, 220);
    assistantReplyTimers.current.push(startTimer);
  };

  useEffect(() => {
    setLiveMetrics(createInitialLiveMetrics(activeProject));
    setRiskApiState({ status: "idle", items: [], calls: [] });
    setWorkspaceAssistantCharts([]);
    setWorkspaceAssistantError("");
    setWorkspaceAssistantStatus("idle");
    setActiveMetricFocus(null);
    setSelectedRiskId(null);
    setLaunchGateRunState("idle");
    setIsLaunchDeployed(false);
    launchFixTimers.current.forEach((timer) => window.clearTimeout(timer));
    launchFixTimers.current = [];
    setLaunchFixState("idle");
    setLaunchFixSteps([]);
  }, [activeProject.id]);

  useEffect(() => {
    if (isOperationalDashboardLive || !isOperationalRoute(activeRoute)) {
      return;
    }

    setActiveRoute("launch");
    setActiveMetricFocus(null);
    setOpenedLiveQueueId(null);
  }, [activeRoute, isOperationalDashboardLive]);

  useEffect(() => {
    setLiveChatComposerText("");

    if (!openedLiveQueueId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector(".completed-main")?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });
  }, [openedLiveQueueId]);

  useEffect(() => {
    const controller = new AbortController();
    const fallbackCalls = createMetricCallRecords(activeProject, createInitialLiveMetrics(activeProject), liveHourLabels);

    if (!isOperationalDashboardLive) {
      setRiskApiState({ status: "idle", items: [], calls: [] });
      setOpenedLiveQueueId(null);
      return () => controller.abort();
    }

    setRiskApiState((current) => ({ ...current, status: "loading", error: undefined }));

    fetchJsonFromApi<unknown>(`/api/risk/queue?projectId=${encodeURIComponent(activeProject.id)}`, {
      signal: controller.signal
    })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        const normalized = normalizeRiskQueuePayload(payload, fallbackCalls);

        setRiskApiState({
          status: normalized.items.length || normalized.calls.length ? "ready" : "fallback",
          items: normalized.items,
          calls: normalized.calls
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setRiskApiState({
          status: "fallback",
          items: [],
          calls: [],
          error: error instanceof Error ? error.message : "Risk queue API unavailable."
        });
      });

    return () => controller.abort();
  }, [activeProject.id, isOperationalDashboardLive]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.allSettled([
      fetchJsonFromApi<any>("/api/risk/model", { signal: controller.signal }),
      fetchJsonFromApi<any>("/api/risk/evaluation", { signal: controller.signal }),
      fetchJsonFromApi<any>("/api/monitoring/drift-report", { signal: controller.signal }),
      fetchJsonFromApi<any>("/api/monitoring/feedback-report", { signal: controller.signal })
    ]).then((results) => {
      if (controller.signal.aborted) {
        return;
      }

      const [model, evaluation, drift, feedback] = results.map((result) =>
        result.status === "fulfilled" ? result.value : null
      );

      setModelHealth({ model, evaluation, drift, feedback });
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveMetrics((current) => advanceLiveMetrics(current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeProject.id]);

  useEffect(() => {
    setIsRouteMenuOpen(false);
  }, [activeProjectId]);

  useEffect(() => clearIntegrationLoginTimers, []);
  useEffect(() => clearAssistantReplyTimers, []);
  useEffect(() => () => {
    launchFixTimers.current.forEach((timer) => window.clearTimeout(timer));
    launchFixTimers.current = [];
  }, []);

  useEffect(() => {
    if (activeRoute !== "ai" || introStage !== "chat") {
      return;
    }

    window.requestAnimationFrame(() => {
      assistantScrollAnchorRef.current?.scrollIntoView({
        behavior: isAssistantTyping ? "auto" : "smooth",
        block: "end"
      });
    });
  }, [activeRoute, introStage, assistantMessages, isAssistantTyping, showAgentInsights, workspaceAssistantStatus, workspaceAssistantError]);

  useEffect(() => {
    const timers: number[] = [];

    setShowAgentInsights(false);
    timers.push(window.setTimeout(() => setIntroStage("chat"), 950));
    timers.push(window.setTimeout(() => setIsAssistantTyping(true), 1750));
    timers.push(window.setTimeout(() => {
      let currentIndex = 0;
      setAssistantMessages([{ role: "agent", content: "" }]);

      const typeTimer = window.setInterval(() => {
        currentIndex += currentIndex < 70 ? 2 : 3;
        const nextContent = openingAssistantMessage.slice(0, currentIndex);
        setAssistantMessages([{ role: "agent", content: nextContent }]);

        if (currentIndex >= openingAssistantMessage.length) {
          window.clearInterval(typeTimer);
          setIsAssistantTyping(false);
          window.setTimeout(() => setShowAgentInsights(true), 260);
        }
      }, 18);

      timers.push(typeTimer);
    }, 2200));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [openingAssistantMessage]);

  const sendAssistantMessage = async (message: string) => {
    const prompt = message.trim();

    if (!prompt) {
      return;
    }

    const normalizedPrompt = prompt.toLowerCase();
    const asksForLockedOperations =
      !isOperationalDashboardLive &&
      /\b(metric|metrics|call|calls|chat|chats|queue|conversation|conversations|handoff|handoffs|today|live)\b/.test(normalizedPrompt) &&
      !/\b(launch|gate|test|tests|blocker|blockers|connect|integration|integrations)\b/.test(normalizedPrompt);

    const history = assistantMessages;
    setAssistantMessages((current) => [
      ...current,
      { role: "user", content: prompt }
    ]);
    setAssistantInput("");
    setIsAssistantTyping(false);
    setWorkspaceAssistantStatus("loading");
    setWorkspaceAssistantError("");
    clearAssistantReplyTimers();

    if (asksForLockedOperations) {
      typeAssistantReply(
        `Live operational data is locked until ${activeProject.name} passes the Launch Gate and you launch the agent. Open **Launch Gate**, run the checks, fix any blockers, then use **Launch agent** to unlock metrics, calls, chats, and the live queue.`,
        "idle"
      );
      return;
    }

    if (!isOperationalDashboardLive) {
      const preLaunchReply = normalizedPrompt.includes("connect") || normalizedPrompt.includes("integration")
        ? "**Pre-launch setup:** connect the required CRM, telephony, knowledge, and helpdesk systems, then return to **Launch Gate** and run the checks. Live metrics, calls, chats, and queue data unlock only after launch."
        : normalizedPrompt.includes("launch") || normalizedPrompt.includes("gate") || normalizedPrompt.includes("test") || normalizedPrompt.includes("block")
          ? `**Launch Gate is the control point:** run the gate checks for ${activeProject.name}, fix any failing requirements, and use **Launch agent** once the gate passes. Operational metrics, calls, chats, and live queue views remain hidden until then.`
          : `This workspace is still pre-launch. I can help with setup, integrations, launch checks, and blocker fixes, but live metrics, calls, chats, and queue views unlock only after the agent is launched.`;

      typeAssistantReply(preLaunchReply, "idle");
      return;
    }

    try {
      const response = await fetchJsonFromApi<WorkspaceAssistantResponse>("/api/dashboard/assistant", {
        method: "POST",
        body: JSON.stringify({
          message: prompt,
          project: {
            id: activeProject.id,
            name: activeProject.name,
            meta: activeProject.meta,
            businessType: activeProject.businessType
          },
          metrics: liveMetrics,
          history
        })
      });

      setWorkspaceAssistantCharts(response.charts || []);
      typeAssistantReply(response.reply, "idle", response.charts || []);
    } catch (error) {
      const reply = normalizedPrompt.includes("setup")
        ? "**Fastest setup path:**\n- Confirm the business type and priority call intents.\n- Connect CRM or helpdesk so handoffs carry customer context.\n- Choose the handoff rules for urgent, billing, and sensitive cases.\n- Run the launch evaluation pack before going live."
        : normalizedPrompt.includes("metric") || normalizedPrompt.includes("today")
          ? `**Today so far:**\n- **${liveMetrics.callsHandled}** customer calls handled.\n- **${containmentRate}%** solved without staff.\n- **${liveMetrics.handoffs}** handoff${liveMetrics.handoffs === 1 ? "" : "s"} needing review.\n- **${latencySeconds}s** typical voice response time.`
          : normalizedPrompt.includes("handoff")
            ? `There are **${liveMetrics.handoffs}** handoff${liveMetrics.handoffs === 1 ? "" : "s"} needing owner review.\n- **Billing questions** need a policy-safe answer or owner approval.\n- **Sensitive cases** should transfer with full context.\n- **Deadline risk** needs a clear next owner.`
            : "**I can help with:**\n- Setup and launch checks.\n- Metrics, calls, and handoffs.\n- Knowledge gaps and workflow routing.\n- Integrations, launch reports, and agent tuning.";

      setWorkspaceAssistantError(error instanceof Error ? error.message : "Workspace assistant is using offline fallback.");
      typeAssistantReply(reply, "error", currentAssistantCharts);
    }
  };
  const launchFixRemediations: Record<string, { note: string; apply: (current: LiveWorkspaceMetrics) => Partial<LiveWorkspaceMetrics>; connect?: boolean }> = {
    "Customer accuracy": {
      note: "Approving top knowledge sources and tightening low-confidence handling",
      apply: (current) => ({
        citationCoverage: Math.max(current.citationCoverage, 97),
        firstContactResolution: Math.max(current.firstContactResolution, 90),
        asrConfidence: Math.max(current.asrConfidence, 97),
        recontactRate: Math.min(current.recontactRate, 3),
        lowConfidenceAnswers: Math.min(current.lowConfidenceAnswers, 1),
        retrievalMisses: Math.min(current.retrievalMisses, 1),
        containedCalls: Math.max(current.containedCalls, Math.round(current.callsHandled * 0.95))
      })
    },
    "Production systems": {
      note: "Reconnecting required systems and re-running connection checks",
      connect: true,
      apply: (current) => ({
        crmLookupSuccess: Math.max(current.crmLookupSuccess, 99),
        ticketWriteSuccess: Math.max(current.ticketWriteSuccess, 99),
        knowledgeSyncMinutes: Math.min(current.knowledgeSyncMinutes, 3)
      })
    },
    "Runtime health": {
      note: "Clearing webhook errors, reducing latency, and recovering workers",
      apply: (current) => ({
        webhookErrors: 0,
        p95LatencyMs: Math.min(current.p95LatencyMs, 1300),
        failedTurns: 0
      })
    },
    "Safety guardrails": {
      note: "Closing policy gaps and routing sensitive cases correctly",
      apply: (current) => ({
        policyViolations: 0,
        unsupportedAttempts: Math.min(current.unsupportedAttempts, 2),
        draftAnswers: Math.min(current.draftAnswers, 2),
        sensitiveEscalations: Math.min(current.sensitiveEscalations, 2),
        lowConfidenceAnswers: Math.min(current.lowConfidenceAnswers, 1)
      })
    }
  };
  const scoreLaunchScenario = (metrics: LiveWorkspaceMetrics) => {
    const containment = Math.round((metrics.containedCalls / Math.max(1, metrics.callsHandled)) * 100);
    return Math.round(
      containment * 0.26 +
        metrics.firstContactResolution * 0.24 +
        metrics.citationCoverage * 0.18 +
        metrics.asrConfidence * 0.14 +
        Math.max(0, 100 - metrics.recontactRate * 5) * 0.1 +
        Math.max(0, 100 - metrics.lowConfidenceAnswers * 7) * 0.08
    );
  };
  const scoreLaunchRuntime = (metrics: LiveWorkspaceMetrics) => Math.max(86, Math.min(99, Math.round(
    98 - metrics.webhookErrors * 6 - Math.max(0, metrics.p95LatencyMs - 1500) / 120 - metrics.failedTurns * 1.5
  )));
  const scoreLaunchSafety = (metrics: LiveWorkspaceMetrics) => metrics.policyViolations === 0
    ? Math.max(90, 100 - metrics.lowConfidenceAnswers * 3 - metrics.sensitiveEscalations)
    : Math.max(0, 78 - metrics.policyViolations * 12);
  const diagnoseAndFixLaunch = () => {
    if (launchFixState === "fixing" || launchGateFailingTests.length === 0) {
      return;
    }

    const plan = launchGateFailingTests
      .map((test) => ({ test, remediation: launchFixRemediations[test.label] }))
      .filter((entry) => entry.remediation);

    if (plan.length === 0) {
      return;
    }

    // 1. Hand the failing checks to the AI workspace as a real user turn.
    const problemReport = plan
      .map(({ test }) => {
        const failedChecks = test.checks.filter((check) => !check.passed);
        const checkLines = failedChecks.length
          ? failedChecks.map((check) => `  - ${check.name}: ${check.value}`).join("\n")
          : "  - Score below the required threshold.";
        return `### ${test.label} — ${test.value} (needs ${test.required})\n${checkLines}`;
      })
      .join("\n\n");
    const userMessage = [
      `The launch gate for ${activeProject.name} is blocked at ${launchGateScore}% (launch requires ${launchGateThreshold}%).`,
      `Diagnose every failing check below and fix it so this agent can launch:`,
      "",
      problemReport
    ].join("\n");

    // Compute the repaired metrics up front so the AI can both apply and chart the result.
    const fixedMetrics = plan.reduce(
      (metrics, entry) => ({ ...metrics, ...entry.remediation.apply(metrics) }),
      liveMetrics
    );
    const fixedScenario = scoreLaunchScenario(fixedMetrics);
    const fixedRuntime = scoreLaunchRuntime(fixedMetrics);
    const fixedConnection = 100;
    const fixedSafety = scoreLaunchSafety(fixedMetrics);
    const fixedOverall = Math.round(
      fixedScenario * 0.38 + fixedConnection * 0.24 + fixedRuntime * 0.22 + fixedSafety * 0.16
    );

    launchFixTimers.current.forEach((timer) => window.clearTimeout(timer));
    launchFixTimers.current = [];
    clearAssistantReplyTimers();
    setActiveMetricFocus(null);
    setActiveRoute("ai");
    setIntroStage("chat");
    document.querySelector(".completed-main")?.scrollTo({ top: 0 });
    setLaunchFixState("fixing");
    setLaunchFixSteps(plan.map((entry, index) => ({
      label: launchFixRemediations[entry.test.label].note,
      status: index === 0 ? "fixing" : "queued"
    })));
    setAssistantMessages((current) => [...current, { role: "user", content: userMessage }]);
    setIsAssistantTyping(false);
    setWorkspaceAssistantStatus("loading");
    setWorkspaceAssistantError("");

    // 2. Apply the real metric repairs one check at a time.
    const stepDuration = 900;
    plan.forEach((entry, index) => {
      launchFixTimers.current.push(window.setTimeout(() => {
        setLiveMetrics((current) => ({ ...current, ...entry.remediation.apply(current) }));
        if (entry.remediation.connect) {
          setConnectedCompletedIntegrationIds((current) => {
            const required = ["hubspot", "zoom", "notion", "zendesk"];
            const merged = [...current];
            required.forEach((id) => {
              if (!merged.includes(id)) {
                merged.push(id);
              }
            });
            return merged;
          });
        }

        setLaunchFixSteps((current) => current.map((step, stepIndex) => {
          if (stepIndex === index) {
            return { ...step, status: "done" };
          }
          if (stepIndex === index + 1) {
            return { ...step, status: "fixing" };
          }
          return step;
        }));
      }, stepDuration * (index + 1)));
    });

    // 3. The AI confirms the fix and renders the launch-gate readiness graph.
    launchFixTimers.current.push(window.setTimeout(() => {
      setLaunchFixState("fixed");
      const launchGateChart: WorkspaceAssistantChart = {
        id: "launch-gate",
        title: "Launch gate readiness",
        kind: "progress",
        data: [
          { label: "Customer accuracy", value: fixedScenario, display: `${fixedScenario}%`, percent: fixedScenario },
          { label: "Production systems", value: fixedConnection, display: `${fixedConnection}%`, percent: fixedConnection },
          { label: "Runtime health", value: fixedRuntime, display: `${fixedRuntime}%`, percent: fixedRuntime },
          { label: "Safety guardrails", value: fixedSafety, display: `${fixedSafety}%`, percent: fixedSafety },
          { label: "Launch score", value: fixedOverall, display: `${fixedOverall}%`, percent: fixedOverall }
        ]
      };
      const fixSummary = plan
        .map(({ test }) => `- **${test.label}** — ${launchFixRemediations[test.label].note.toLowerCase()}.`)
        .join("\n");
      const reply = [
        `**Fixed.** I worked through each failing launch check and applied the repairs:`,
        "",
        fixSummary,
        "",
        `The launch gate is now at **${fixedOverall}%** (threshold ${launchGateThreshold}%) — every check is passing and the agent is clear to launch.`
      ].join("\n");
      typeAssistantReply(reply, "idle", [launchGateChart]);
    }, stepDuration * plan.length + 500));
  };

  return (
    <main className="completed-dashboard" aria-label="Completed onboarding dashboard">
      <aside className="completed-sidebar">
        <a className="completed-brand" href="/" aria-label="RelayClarity home">
          <img src={relayclarityLogoUrl} alt="RelayClarity" />
        </a>

        <button
          className={`completed-launch-sidebar-card ${launchGateAllowed ? "is-ready" : "is-locked"}`}
          type="button"
          onClick={() => {
            setActiveRoute("launch");
            setActiveMetricFocus(null);
          }}
          aria-label={`Open Launch Gate. ${launchGateStatus}, ${launchGateScore}%`}
        >
          <span aria-hidden="true"></span>
          <div>
            <strong>Launch Gate</strong>
            <small>{launchGateAllowed ? "Ready" : "Locked"}</small>
          </div>
          <b>{launchGateScore}%</b>
        </button>

        <nav className="completed-thread-list" aria-label="Dashboard routes">
          {routes.map((route) => (
            <button
              key={route.id}
              className={[
                route.id === activeRoute ? "is-active" : "",
                !isOperationalDashboardLive && isOperationalRoute(route.id) ? "is-locked" : ""
              ].filter(Boolean).join(" ")}
              type="button"
              disabled={!isOperationalDashboardLive && isOperationalRoute(route.id)}
              aria-disabled={!isOperationalDashboardLive && isOperationalRoute(route.id)}
              onClick={() => {
                if (!isOperationalDashboardLive && isOperationalRoute(route.id)) {
                  setActiveRoute("launch");
                  setActiveMetricFocus(null);
                  return;
                }

                setActiveRoute(route.id);
                setActiveMetricFocus(null);
              }}
            >
              <span>{route.title}</span>
              <small>{route.meta}</small>
            </button>
          ))}
        </nav>

        <div className="completed-sidebar-footer">
          <button
            className={`completed-footer-link ${activeRoute === "settings" ? "is-active" : ""}`}
            type="button"
            onClick={() => {
              setActiveRoute("settings");
              setActiveMetricFocus(null);
            }}
          >
            Settings
          </button>
          <button
            className={`completed-footer-link ${activeRoute === "help" ? "is-active" : ""}`}
            type="button"
            onClick={() => {
              setActiveRoute("help");
              setActiveMetricFocus(null);
            }}
          >
            Help
          </button>
          <button className="completed-account" type="button" onClick={onSignOut} aria-label="Sign out">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{workspaceInitial}</span>}
            <strong>{user.name || user.email}</strong>
          </button>
        </div>
      </aside>

      <section className="completed-main">
        <header className={`completed-topbar ${activeRoute === "risk" && isOperationalDashboardLive ? "has-live-ops-search" : ""}`}>
          <div
            className="completed-route-selector"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsRouteMenuOpen(false);
              }
            }}
          >
            <button
              className="completed-model-button"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isRouteMenuOpen}
              onClick={() => setIsRouteMenuOpen((isOpen) => !isOpen)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsRouteMenuOpen(false);
                }
              }}
            >
              {activeProject.name}
              <span aria-hidden="true">⌄</span>
            </button>
            {isRouteMenuOpen ? (
              <div className="completed-route-menu" role="menu" aria-label="Projects">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={project.id === activeProjectId ? "is-active" : ""}
                    type="button"
                    role="menuitem"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span>{project.name}</span>
                    <small>{project.meta}</small>
                  </button>
                ))}
                <button className="completed-route-menu-add" type="button" role="menuitem" onClick={onCreateProject}>
                  <span aria-hidden="true">+</span>
                  <strong>New project</strong>
                  <small>Start a fresh workspace</small>
                </button>
              </div>
            ) : null}
          </div>
          {activeRoute === "risk" && isOperationalDashboardLive ? (
            <div className="live-ops-tools">
              <label aria-label="Search conversations">
                <span>⌕</span>
                <input type="search" placeholder="Search conversations, customers..." />
                <kbd>⌘ K</kbd>
              </label>
            </div>
          ) : null}
        </header>

        <div className={`completed-content ${activeDashboardPage ? "is-dashboard-page" : ""}`}>
          {activeDashboardPage ? (
            <section
              className={[
                "completed-route-page",
                activeRoute === "launch" || (!isOperationalDashboardLive && isOperationalRoute(activeRoute)) ? "is-launch" : "",
                activeRoute === "metrics" && isOperationalDashboardLive ? "is-metrics" : "",
                activeRoute === "integrations" ? "is-integrations" : "",
                activeRoute === "risk" && isOperationalDashboardLive ? "is-risk" : "",
                activeRoute === "settings" || activeRoute === "help" ? "is-simple" : ""
              ].filter(Boolean).join(" ")}
              aria-labelledby="completed-route-title"
            >
              {activeRoute !== "launch" && activeRoute !== "launch-tests" && activeRoute !== "risk" && activeRoute !== "settings" && activeRoute !== "help" && !(!isOperationalDashboardLive && isOperationalRoute(activeRoute)) ? (
                <header className="completed-route-hero">
                  <div>
                    <span>{activeDashboardPage.eyebrow}</span>
                    <h1 id="completed-route-title">{activeDashboardPage.title}</h1>
                    <p>{activeDashboardPage.summary}</p>
                  </div>
                  <strong>{activeDashboardPage.status}</strong>
                </header>
              ) : null}

              {activeRoute === "metrics" && isOperationalDashboardLive ? (
		                <section className={`completed-metrics-studio ${activeMetricFocusForTab ? "has-focus" : ""}`} aria-label="Metrics overview">
		                  <div className="completed-metrics-title-row">
		                    <div>
		                      <h2>{displayedMetricsTabData.title}</h2>
		                      <p>{displayedMetricsTabData.summary}</p>
		                    </div>
		                    <strong><span aria-hidden="true"></span>{metricsStudioStatus}</strong>
		                  </div>
                      {activeMetricFocusForTab ? (
                        <div className="completed-metrics-focus" role="status">
                          <span>{activeMetricFocusForTab.chartTitle}</span>
                          <strong>{activeMetricFocusForTab.label}</strong>
                          <small>{activeMetricFocusForTab.value}</small>
                          <button type="button" onClick={() => setActiveMetricFocus(null)} aria-label="Clear selected metric">×</button>
                        </div>
                      ) : null}

                    <div className="completed-metrics-tabs" role="tablist" aria-label="Metrics sections">
                      {metricsTabs.map((tab) => (
                        <button
                          className={tab.id === activeMetricsTabData.id ? "is-active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={tab.id === activeMetricsTabData.id}
                          onClick={() => {
                            setActiveMetricsTab(tab.id);
                            setActiveMetricFocus(null);
                          }}
                          key={tab.id}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

	                  <div className="completed-metrics-kpi-rail" aria-label={`${activeRouteData.title} metrics`}>
	                    {displayedMetricsTabData.metrics.map((metric, index) => (
	                      <article className={index === 0 ? "is-primary" : ""} key={metric.label}>
	                        <strong>{metric.value}</strong>
	                        <span>{metric.label}</span>
                        <small>{metric.detail}</small>
                      </article>
                    ))}
                  </div>

                  <div className="completed-metrics-layout">
	                    <section className="completed-metrics-trend" aria-labelledby="completed-metrics-trend-title">
	                      <div className="completed-metrics-panel-heading">
	                        <div>
	                          <span>{displayedMetricsTabData.primaryMeta}</span>
	                          <h2 id="completed-metrics-trend-title">{displayedMetricsTabData.primaryTitle}</h2>
	                        </div>
	                        <strong>{displayedMetricsTabData.chartTotal}</strong>
	                      </div>

                        <div className={`completed-metrics-visual is-${displayedMetricsTabData.id}`} aria-label={displayedMetricsTabData.primaryTitle}>
                          {displayedMetricsTabData.id === "overview" ? (
                            <div className="completed-metrics-chart">
                              <div className="completed-metrics-chart-scale" aria-hidden="true">
                                <span>High</span>
                                <span>Med</span>
                                <span>Low</span>
                                <span>0</span>
                              </div>
                              {activeMetricsChart.map((bar, index) => (
                                <div
                                  className={[
                                    "completed-metrics-chart-bar",
                                    bar.empty ? "is-empty" : "",
                                    activeMetricFocusForTab?.label === bar.label ? "is-focused-point" : ""
                                  ].filter(Boolean).join(" ")}
                                  key={`${bar.label}-${index}`}
                                >
                                  <i style={{ height: `${bar.value}px` }}></i>
                                  <b>{bar.display || Math.round(bar.value / 5)}</b>
                                  <span>{bar.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : displayedMetricsTabData.id === "outcomes" ? (
                            <div className="completed-outcome-visual">
                              <div className="completed-outcome-stack" aria-hidden="true">
                                {displayedMetricsTabData.chart.slice(0, 4).map((bar) => (
                                  <i key={bar.label} style={{ width: `${Math.max(10, Math.min(58, bar.value / 3))}%` }}></i>
                                ))}
                              </div>
                              <div className="completed-outcome-grid">
                                {displayedMetricsTabData.chart.map((bar) => (
                                  <article className={activeMetricFocusForTab?.label === bar.label ? "is-focused-point" : ""} key={bar.label}>
                                    <strong>{bar.display}</strong>
                                    <span>{bar.label}</span>
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : displayedMetricsTabData.id === "voice" ? (
                            <div className="completed-voice-visual">
                              <div className="completed-voice-line" aria-hidden="true">
                                {displayedMetricsTabData.chart.map((bar) => (
                                  <i key={bar.label} style={{ height: `${Math.max(18, Math.min(96, bar.value / 2))}px` }}></i>
                                ))}
                              </div>
                              <div className="completed-voice-grid">
                                {displayedMetricsTabData.chart.map((bar) => (
                                  <article className={activeMetricFocusForTab?.label === bar.label ? "is-focused-point" : ""} key={bar.label}>
                                    <span>{bar.label}</span>
                                    <strong>{bar.display}</strong>
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : displayedMetricsTabData.id === "knowledge" ? (
                            <div className="completed-knowledge-visual">
                              {displayedMetricsTabData.items.map((item) => (
                                <article key={item.label}>
                                  <span>{item.value}</span>
                                  <div>
                                    <strong>{item.label}</strong>
                                    <p>{item.note}</p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : displayedMetricsTabData.id === "safety" ? (
                            <div className="completed-safety-visual">
                              {displayedMetricsTabData.metrics.map((metric) => (
                                <article key={metric.label}>
                                  <span>{metric.label}</span>
                                  <strong>{metric.value}</strong>
                                  <small>{metric.detail}</small>
                                </article>
                              ))}
                            </div>
                          ) : displayedMetricsTabData.id === "handoffs" ? (
                            <div className="completed-handoff-visual">
                              {displayedMetricsTabData.chart.map((bar) => (
                                  <article className={activeMetricFocusForTab?.label === bar.label ? "is-focused-point" : ""} key={bar.label}>
                                  <div>
                                    <span>{bar.label}</span>
                                    <strong>{bar.display}</strong>
                                  </div>
                                  <i><b style={{ width: `${Math.max(8, Math.min(100, bar.value / 2))}%` }}></b></i>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="completed-system-visual">
                              {displayedMetricsTabData.items.map((item) => (
                                <article key={item.label}>
                                  <span>{item.label}</span>
                                  <strong>{item.value}</strong>
                                  <small>{item.note}</small>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`completed-demand-note ${activeMetricFocusForTab ? "is-focused" : ""}`}>
                          {activeMetricFocusForTab
                            ? `${activeMetricFocusForTab.chartTitle}: ${activeMetricFocusForTab.label} is the selected point from the AI workspace graph.`
                            : `${displayedMetricsTabData.items[0]?.label}: ${displayedMetricsTabData.items[0]?.note}`}
                        </div>
                        {activeMetricFocusForTab ? (
                          <section className="completed-call-drilldown" aria-label={`Calls for ${activeMetricFocusForTab.label}`}>
                            <div className="completed-call-drilldown-heading">
                              <div>
                                <span>Underlying calls</span>
                                <h3>{focusedMetricCalls.length} call{focusedMetricCalls.length === 1 ? "" : "s"} behind this point</h3>
                              </div>
                              <strong>{focusedMetricCalls.filter((call) => call.outcome !== "Resolved").length} need review</strong>
                            </div>
                            <div className="completed-call-list">
                              {focusedMetricCalls.map((call) => (
                                <article className={`completed-call-card is-${call.outcome.toLowerCase()}`} key={call.id}>
                                  <header>
                                    <div>
                                      <span>{call.time} · {call.duration}</span>
                                      <strong>{call.intent}</strong>
                                      <small>{call.callerName} · {call.phone}</small>
                                    </div>
                                    <b>{call.outcome}</b>
                                  </header>
                                  <dl>
                                    <div>
                                      <dt>AI action</dt>
                                      <dd>{call.aiAction}</dd>
                                    </div>
                                    <div>
                                      <dt>What went wrong</dt>
                                      <dd>{call.wentWrong}</dd>
                                    </div>
                                    <div>
                                      <dt>Confidence</dt>
                                      <dd>{call.confidence}%</dd>
                                    </div>
                                  </dl>
                                  <div className="completed-call-transcript">
                                    {call.transcript.map((turn, turnIndex) => (
                                      <p className={`is-${turn.speaker.toLowerCase()}`} key={`${call.id}-${turn.speaker}-${turnIndex}`}>
                                        <span>{turn.speaker}</span>
                                        {turn.text}
                                      </p>
                                    ))}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </section>
                        ) : null}
	                    </section>

	                    <aside className="completed-metrics-summary" aria-label="Health summary">
		                      <div className="completed-metrics-panel-heading">
		                        <div>
		                          <span>Operating checks</span>
		                          <h2>Key signals</h2>
		                        </div>
		                        <strong>{displayedMetricsTabData.status}</strong>
	                      </div>

                        <div className="completed-metrics-health-list">
                          {(displayedMetricsTabData.checks || displayedMetricsTabData.items).map((item, index) => (
                            <article key={item.label}>
                              <span>{item.value}</span>
                              <div>
                                <strong>{item.label}</strong>
                                <p>{item.note}</p>
                              </div>
                              <b aria-hidden="true">→</b>
                            </article>
                          ))}
                        </div>

		                    </aside>
		                  </div>
		                </section>
			              ) : activeRoute === "launch" || (!isOperationalDashboardLive && isOperationalRoute(activeRoute)) ? (
	                    <>
					                <section className={`completed-launch-gate ${launchGateCanLaunch ? "is-ready" : "is-locked"} ${launchGateRunState === "running" ? "is-running" : ""}`} aria-label="Launch gate decision">
				                  <h1 className="sr-only" id="completed-route-title">Launch readiness</h1>
                          <div className="completed-launch-decision">
                            <div
                              className="completed-launch-ring"
                              aria-label={`Launch readiness ${launchGateScore}%`}
                              style={{
                                "--launch-progress": `${launchGateScore * 3.6}deg`,
                                "--launch-color": launchGateToneColor
                              } as React.CSSProperties}
                            >
                              <div>
                                <strong>{launchGateRunState === "running" ? "..." : `${launchGateScore}%`}</strong>
                                <small>{launchGateCanLaunch ? "Ready" : isLaunchDeployed ? "Live" : "Gate"}</small>
                              </div>
                            </div>
                            <div className="completed-launch-decision-copy">
                              <h2>{launchGateDecisionTitle}</h2>
                              <small>{launchGateDecisionSummary} {launchGateScore}% / {launchGateThreshold}% required.</small>
                              <button
                                className="completed-launch-primary-button"
                                type="button"
                                onClick={launchGateCanLaunch ? launchAgent : runLaunchGateTests}
                                disabled={isLaunchDeployed || launchGateRunState === "running"}
                              >
                                {launchGatePrimaryAction}
                              </button>
                            </div>
                          </div>

                          <div className="completed-launch-checklist" aria-label="Launch requirements">
                            {launchGateTestResults.map((test) => (
                              <article
                                className={[
                                  test.state === "Pass" ? "is-pass" : "",
                                  test.state === "Blocked" ? "is-blocked" : "",
                                  test.state === "Review" || test.state === "Retest" ? "is-review" : ""
                                ].filter(Boolean).join(" ")}
                                key={test.label}
                              >
                                <span className="completed-launch-check-status">{test.state}</span>
                                <div>
                                  <strong>{test.label}</strong>
                                </div>
                                <b>{test.value}</b>
                              </article>
                            ))}
                          </div>
			                </section>
	                    <section className={`completed-launch-test-runner ${launchGateCanLaunch || isLaunchDeployed ? "is-ready" : ""}`} aria-label="Launch test runner">
                        <div>
                          <span>{launchGateRunState === "running" ? "Testing now" : launchGateTestsComplete ? "Latest test" : "Scenario tests"}</span>
                          <strong>
                            {isLaunchDeployed
                              ? "Agent is live"
                              : launchGateRunState === "running"
                                ? "Running launch tests"
                                : launchGateCanLaunch
                                  ? "Tests passed"
                                  : "Run the scenario tests"}
                          </strong>
                          <small>
                            {isLaunchDeployed
                              ? launchGateOperationalCopy.summary
                              : launchGateRunState === "running"
                                ? "Replaying customer scenarios and checking production dependencies."
                                : launchGateTestsComplete
                                  ? launchDiagnosticFinding
                                  : "Run the gate check to replay customer scenarios and see what needs fixing."}
                          </small>
                        </div>
                        <button
                          type="button"
                          onClick={runLaunchGateTests}
                          disabled={isLaunchDeployed || launchGateRunState === "running"}
                        >
                          {launchGateRunState === "running" ? "Running" : launchGateTestsComplete ? "Run again" : "Run tests"}
                        </button>
                      </section>
	                    </>
	              ) : activeRoute === "launch-tests" ? (
                    <section className="launch-tests completed-launch-tests" data-state={launchGateRunState} aria-live="polite" aria-label="Launch test runner">
                      <header className="launch-tests-head">
                        <div className="launch-tests-heading">
                          <span>Launch tests · {launchGateRunState === "running" ? "Running" : launchGateTestsComplete ? "Complete" : "Ready"}</span>
                          <strong>
                            {launchGateRunState === "running"
                              ? "Running launch checks"
                              : launchGateTestsComplete
                                ? launchGateCanLaunch
                                  ? "All checks passed"
                                  : `${launchGateTestSuitePassedCount} of ${launchGateTestSuite.length} checks passed`
                                : "Run the in-depth launch check"}
                          </strong>
                          <p>
                            {launchGateRunState === "running"
                              ? `Checking ${launchTestRunningLabel.toLowerCase()}…`
                              : launchGateTestsComplete
                                ? launchDiagnosticFinding
                                : "Replays customer scenarios and verifies production systems, runtime health, and safety guardrails before you go live."}
                          </p>
                        </div>
                        <button className="launch-tests-run" type="button" onClick={runLaunchGateTests} disabled={isLaunchDeployed || launchGateRunState === "running"}>
                          {launchGateRunState === "running" ? "Running…" : launchGateTestsComplete ? "Run again" : "Run tests"}
                        </button>
                      </header>

                      <div className="launch-tests-stats">
                        <article data-tone={launchGateScore >= launchGateThreshold ? "pass" : "idle"}>
                          <span>Launch score</span>
                          <strong>{launchGateRunState === "running" ? "…" : `${launchGateScore}%`}</strong>
                          <small>{launchGateScore >= launchGateThreshold ? "Meets launch threshold" : `${launchGateThreshold}% required to launch`}</small>
                        </article>
                        <article>
                          <span>Checks passed</span>
                          <strong>
                            {launchTestRunPassedCount}
                            <i>/ {launchGateTestSuite.length}</i>
                          </strong>
                          <small>{launchGateRunState === "complete" ? "Run complete" : launchGateRunState === "running" ? "Evaluating…" : "Not started"}</small>
                        </article>
                        <article data-tone={launchGateRunState === "complete" ? (launchGateCanLaunch ? "pass" : "warn") : "idle"}>
                          <span>Status</span>
                          <strong>{launchGateRunState === "complete" ? (launchGateCanLaunch ? "Passed" : "Action needed") : launchGateRunState === "running" ? "Testing" : "Queued"}</strong>
                          <small>{launchGateRunState === "running" ? `${launchTestProgress}% complete` : `${launchGateTestSuite.length} launch checks`}</small>
                        </article>
                      </div>

                      <div
                        className="launch-tests-bar"
                        role="progressbar"
                        aria-valuenow={launchTestProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Launch test progress"
                      >
                        <i style={{ width: `${launchTestProgress}%` }} />
                      </div>

                      <div className="launch-tests-body">
                        <ol className="launch-tests-list" aria-label="Launch checks">
                          {launchGateTestSuite.map((test, index) => {
                            const isCurrent = launchGateRunState === "running" && launchTestActiveIndex === index && launchTestCompletedCount <= index;
                            const isDone = launchTestCompletedCount > index;
                            const passed = test.state === "Pass";
                            const status = isDone ? (passed ? "pass" : "warn") : isCurrent ? "running" : "queued";
                            const statusLabel = isDone ? (passed ? "Passed" : test.state) : isCurrent ? "Running" : "Queued";

                            return (
                              <li key={test.label}>
                                <button
                                  className={launchTestSelectedIndex === index ? "is-active" : ""}
                                  data-status={status}
                                  type="button"
                                  aria-pressed={launchTestSelectedIndex === index}
                                  onClick={() => setLaunchTestSelectedIndex(index)}
                                >
                                  <span className="launch-tests-index">{index + 1}</span>
                                  <span className="launch-tests-meta">
                                    <strong>{test.label}</strong>
                                    <small>{test.detail}</small>
                                  </span>
                                  <span className="launch-tests-status" data-status={status}>
                                    {isCurrent ? <i className="launch-tests-spinner" aria-hidden="true" /> : null}
                                    {statusLabel}
                                  </span>
                                  <b className="launch-tests-score">{isDone || launchGateRunState === "complete" ? test.value : "—"}</b>
                                </button>
                              </li>
                            );
                          })}
                        </ol>

                        <aside
                          className="launch-tests-detail"
                          data-status={launchTestCompletedCount > launchTestSelectedIndex ? (selectedLaunchTest.state === "Pass" ? "pass" : "warn") : "idle"}
                          aria-label="Check detail"
                        >
                          <header>
                            <span>{selectedLaunchTest.required}</span>
                            <strong>{selectedLaunchTest.label}</strong>
                          </header>
                          <div className="launch-tests-detail-score">
                            <b>{selectedLaunchTest.value}</b>
                            <span>{selectedLaunchTest.state === "Pass" ? "Check passed" : selectedLaunchTest.action}</span>
                          </div>
                          <p>{selectedLaunchTest.detail}</p>
                          <ul className="launch-tests-checks">
                            {[...selectedLaunchTest.checks]
                              .sort((a, b) => Number(a.passed) - Number(b.passed))
                              .map((check) => (
                                <li key={check.name} data-pass={check.passed ? "true" : "false"}>
                                  <i aria-hidden="true">{check.passed ? "✓" : "!"}</i>
                                  <span className="launch-tests-check-name">{check.name}</span>
                                  <b className="launch-tests-check-value">{check.value}</b>
                                </li>
                              ))}
                          </ul>
                        </aside>
                      </div>

                      {launchFixState === "fixing" || launchFixSteps.length ? (
                        <div className="launch-tests-fixlog" data-state={launchFixState} aria-live="polite">
                          <strong>
                            {launchFixState === "fixing"
                              ? "Fixing the failing checks…"
                              : firstFailingLaunchTest
                                ? "Applied fixes — re-running the gate"
                                : "All checks fixed. Ready to launch."}
                          </strong>
                          <ul>
                            {launchFixSteps.map((fixStep) => (
                              <li key={fixStep.label} data-status={fixStep.status}>
                                <i aria-hidden="true">
                                  {fixStep.status === "done" ? "✓" : fixStep.status === "fixing" ? "" : "•"}
                                </i>
                                <span>{fixStep.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {firstFailingLaunchTest ? (
                        <footer className="launch-tests-footer">
                          <button
                            className="launch-tests-fix"
                            type="button"
                            onClick={diagnoseAndFixLaunch}
                            disabled={launchFixState === "fixing"}
                          >
                            {launchFixState === "fixing" ? "Fixing…" : "Diagnose & fix"}
                            {launchFixState === "fixing" ? null : <span aria-hidden="true">→</span>}
                          </button>
                        </footer>
                      ) : null}
                    </section>
	              ) : activeRoute === "risk" && isOperationalDashboardLive ? (
                <section className="live-ops-dashboard" aria-label="Live operations queue">
                  {openedLiveQueueItem ? (
                    <section className={`live-ops-open-page is-${openedLiveQueueItem.channel}`} aria-label={`${openedLiveQueueItem.channel} detail`}>
                      {openedLiveQueueItem.channel === "phone" ? (
                        <button className="live-ops-back-button" type="button" onClick={() => setOpenedLiveQueueId(null)}>
                          Back to Live Queue
                        </button>
                      ) : null}
                      {openedLiveQueueItem.channel === "phone" ? (
                        <>
                          <header className="live-ops-session-header">
                            <div className="live-ops-detail-person">
                              <b className={`is-tone-${initialsForName(openedLiveQueueItem.customer).charCodeAt(0) % 5}`}>
                                {avatarForName(openedLiveQueueItem.customer) ? <img src={avatarForName(openedLiveQueueItem.customer)} alt="" /> : initialsForName(openedLiveQueueItem.customer)}
                              </b>
                              <div>
                                <span>Live phone call</span>
                                <h2>{openedLiveQueueItem.customer}</h2>
                                <p>{openedLiveQueueItem.title} / {operationStatusLabel(openedLiveQueueItem.status)} / {priorityLabel(openedLiveQueueItem.riskLevel)}</p>
                              </div>
                            </div>
                            <div className="live-ops-session-actions" aria-label="Session actions">
                              <button type="button">Assign owner</button>
                              <button type="button">Create ticket</button>
                              <button type="button">Join</button>
                            </div>
                          </header>
                          <div className="live-ops-phone-workspace">
                            <section className="live-ops-call-stage" aria-label="Active phone call">
                              <div className="live-ops-call-status">
                                <span><i></i>Connected</span>
                                <strong>{openedLiveQueueDuration}</strong>
                              </div>
                              <div className="live-ops-waveform" aria-hidden="true">
                                {Array.from({ length: 34 }).map((_, index) => (
                                  <i key={`wave-${index}`} style={{ "--wave": `${18 + ((index * 17) % 56)}%` } as React.CSSProperties}></i>
                                ))}
                              </div>
                              <div className="live-ops-call-controls" aria-label="Call controls">
                                <button type="button">Mute</button>
                                <button type="button">Hold</button>
                                <button type="button">Transfer</button>
                                <button type="button">End</button>
                              </div>
                            </section>
                            <aside className="live-ops-call-context" aria-label="Call context">
                              <article>
                                <span>AI confidence</span>
                                <strong>{openedLiveQueueItem.confidence}%</strong>
                                <p>{operationStatusLabel(openedLiveQueueItem.status)}. {openedLiveQueueItem.action}</p>
                              </article>
                              <article>
                                <span>Customer need</span>
                                <p>{openedLiveQueueItem.detail}</p>
                              </article>
                              <article className="live-ops-call-transcript-feed">
                                <span>Live transcript</span>
                                <div>
                                  {openedLiveQueueTranscript.map((turn, turnIndex) => {
                                    const tone = turn.speaker === "Customer" ? "customer" : turn.speaker === "System" ? "system" : "ai";
                                    const speakerName = turn.speaker === "Customer"
                                      ? openedLiveQueueItem.customer
                                      : turn.speaker === "System" ? "System" : "RelayClarity";

                                    return (
                                      <p className={`is-${tone}`} key={`live-call-turn-${turnIndex}`}>
                                        <span>{speakerName}</span>
                                        {turn.text}
                                      </p>
                                    );
                                  })}
                                </div>
                              </article>
                            </aside>
                          </div>
                        </>
                      ) : (
                        <div className="live-ops-chat-workspace">
                          <section className="live-ops-chat-thread" aria-label="Live chat transcript">
                            <header className="live-ops-chat-window-header">
                              <button
                                className="live-ops-chat-back-arrow"
                                type="button"
                                aria-label="Back to live queue"
                                title="Back to live queue"
                                onClick={() => setOpenedLiveQueueId(null)}
                              >
                                ←
                              </button>
                              <div>
                                <span><i></i>Customer online</span>
                                <strong>{openedLiveQueueItem.title}</strong>
                                <small>{openedLiveQueueItem.customer} <b>•</b> {openedLiveQueueDuration}</small>
                              </div>
                              <div className="live-ops-chat-window-tools">
                                <em><i></i>{priorityLabel(openedLiveQueueItem.riskLevel)}</em>
                                {openedLiveQueueIsJoined ? (
                                  <span className="live-ops-join-status"><i></i>You're in this chat</span>
                                ) : null}
                                <button
                                  type="button"
                                  className={`live-ops-join-button${openedLiveQueueIsJoined ? " is-joined" : ""}`}
                                  onClick={() => (openedLiveQueueIsJoined ? handleLeaveLiveChat(openedLiveQueueItem.id) : handleJoinLiveChat(openedLiveQueueItem.id))}
                                >
                                  {openedLiveQueueIsJoined ? "Leave chat" : "Join chat"}
                                </button>
                              </div>
                            </header>
                            <div className="live-ops-chat-scroll">
                              {openedLiveQueueThread.map((turn) => {
                                const tone = turn.role === "Customer"
                                  ? "customer"
                                  : turn.role === "System"
                                    ? "system"
                                    : turn.role === "Admin" ? "admin" : "ai";

                                if (tone === "system") {
                                  return (
                                    <div className="live-ops-chat-message is-system" key={`live-chat-${turn.key}`}>
                                      <p>{turn.text}</p>
                                    </div>
                                  );
                                }

                                const avatarSource = turn.role === "Customer" ? avatarForName(openedLiveQueueItem.customer) : "";
                                const avatarLabel = turn.role === "Customer"
                                  ? initialsForName(openedLiveQueueItem.customer)
                                  : turn.role === "Admin" ? "ME" : "AI";

                                return (
                                  <div className={`live-ops-chat-message is-${tone}`} key={`live-chat-${turn.key}`}>
                                    <b className="live-ops-chat-avatar">
                                      {avatarSource ? <img src={avatarSource} alt="" /> : avatarLabel}
                                    </b>
                                    <div className="live-ops-chat-bubble">
                                      <strong>{turn.name}</strong>
                                      <p>{turn.text}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <form
                              className="live-ops-chat-composer"
                              aria-label="Reply composer"
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleSendLiveChatReply(openedLiveQueueItem.id);
                              }}
                            >
                              {openedLiveQueueIsJoined ? null : (
                                <p className="live-ops-composer-hint">Join the chat to reply — your first message connects you to the customer.</p>
                              )}
                              <label>
                                <span>Your reply</span>
                                <textarea
                                  placeholder={openedLiveQueueIsJoined ? "Type your reply to the customer" : "Join the chat to start replying"}
                                  value={liveChatComposerText}
                                  onChange={(event) => setLiveChatComposerText(event.target.value)}
                                />
                              </label>
                              <div>
                                <button type="submit" disabled={!liveChatComposerText.trim()}>
                                  {openedLiveQueueIsJoined ? "Send reply ›" : "Join & send ›"}
                                </button>
                              </div>
                            </form>
                          </section>
                          <aside className="live-ops-chat-context" aria-label="Chat context">
                            <section className="live-ops-context-panel" aria-label="Customer details and next steps">
                              <header>
                                <b className={`is-tone-${initialsForName(openedLiveQueueItem.customer).charCodeAt(0) % 5}`}>
                                  {avatarForName(openedLiveQueueItem.customer) ? <img src={avatarForName(openedLiveQueueItem.customer)} alt="" /> : initialsForName(openedLiveQueueItem.customer)}
                                </b>
                                <div>
                                  <strong>{openedLiveQueueItem.customer}</strong>
                                  <small>Known customer</small>
                                  <small>Last active 4 min ago</small>
                                </div>
                              </header>
                              <article className="live-ops-context-summary">
                                <span>Conversation</span>
                                <dl>
                                  <div><dt>Intent</dt><dd>{openedLiveQueueItem.title}</dd></div>
                                  <div><dt>Status</dt><dd>{operationStatusLabel(openedLiveQueueItem.status)}</dd></div>
                                  <div><dt>Priority</dt><dd>{priorityLabel(openedLiveQueueItem.riskLevel)}</dd></div>
                                  <div><dt>AI confidence</dt><dd>{openedLiveQueueItem.confidence}%</dd></div>
                                  <div><dt>Duration</dt><dd>{openedLiveQueueDuration}</dd></div>
                                </dl>
                              </article>
                              <article className="live-ops-staff-options">
                                <span>Staff options</span>
                                <button type="button">Assign to staff</button>
                                <button type="button">Escalate to supervisor</button>
                                <button type="button">Transfer chat</button>
                                <button type="button">Add internal note</button>
                                <button type="button">Mark urgent</button>
                              </article>
                              <article className="live-ops-account-info">
                                <span>Customer</span>
                                <dl>
                                  <div><dt>Email</dt><dd>{openedLiveQueueItem.customer.toLowerCase().replace(/\s+/g, ".")}@example.com</dd></div>
                                  <div><dt>Phone</dt><dd>+44 7700 900111</dd></div>
                                  <div><dt>Account tier</dt><dd>Pro</dd></div>
                                  <div><dt>Customer since</dt><dd>Mar 2023</dd></div>
                                  <div><dt>Open tickets</dt><dd>2</dd></div>
                                </dl>
                              </article>
                              <article className="live-ops-context-actions">
                                <span>Quick actions</span>
                                <button type="button">View full profile</button>
                                <button type="button">Open order history</button>
                                <button type="button">Send help article</button>
                              </article>
                            </section>
                          </aside>
                        </div>
                      )}
                    </section>
                  ) : (
                    <div className="live-ops-board">
                      <section className="live-ops-panel live-ops-active" aria-label="Active conversations">
                        <header>
                          <div>
                            <h3>Active Conversations <span>{allActiveConversationRows.length}</span></h3>
                          </div>
                          <div className="live-ops-panel-actions">
                            <button type="button">Sort: Newest</button>
                            <button type="button" aria-label="Queue controls">≡</button>
                          </div>
                        </header>
                        <div className="live-ops-table is-conversations">
                          <div className="live-ops-table-head">
                            <span>Customer</span>
                            <span>Status</span>
                            <span>Intent</span>
                            <span>Duration</span>
                            <span>Priority</span>
                            <span></span>
                          </div>
                          {activeConversationRows.map((item, index) => (
                            <button
                              className={`live-ops-row is-${item.riskLevel}`}
                              type="button"
                              onClick={() => setOpenedLiveQueueId(item.id)}
                              key={`active-${item.id}`}
                            >
                              <span className="live-ops-customer">
                                <b className={`is-tone-${initialsForName(item.customer).charCodeAt(0) % 5}`}>
                                  {avatarForName(item.customer) ? <img src={avatarForName(item.customer)} alt="" /> : initialsForName(item.customer)}
                                </b>
                                <span><strong>{item.customer}</strong><small>{item.detail}</small></span>
                              </span>
                              <span><em>{operationStatusLabel(item.status)}</em></span>
                              <span>{item.title}</span>
                              <span>{durationForConversation(item, index)}</span>
                              <span className="live-ops-priority"><i></i>{priorityLabel(item.riskLevel)}</span>
                              <span className="live-ops-arrow">›</span>
                            </button>
                          ))}
                          {allActiveConversationRows.length > 6 ? (
                            <button
                              type="button"
                              className="live-ops-view-all"
                              onClick={() => setShowAllConversations((previous) => !previous)}
                            >
                              {showAllConversations ? "Show fewer conversations" : `View all conversations (${allActiveConversationRows.length}) →`}
                            </button>
                          ) : null}
                        </div>
                      </section>

                      <aside className="live-ops-panel live-ops-handoff" aria-label="Agent needed">
                        <header>
                          <h3>Agent Needed <span>{allHandoffQueueRows.length}</span></h3>
                          {allHandoffQueueRows.length > 5 ? (
                            <button type="button" onClick={() => setShowAllHandoffs((previous) => !previous)}>
                              {showAllHandoffs ? "Show fewer" : "View all"}
                            </button>
                          ) : null}
                        </header>
                        <div className="live-ops-handoff-list">
                          {handoffQueueRows.map((item) => (
                            <article className={`is-${item.riskLevel}`} key={`handoff-${item.id}`}>
                              <b className={`is-tone-${initialsForName(item.customer).charCodeAt(0) % 5}`}>
                                {avatarForName(item.customer) ? <img src={avatarForName(item.customer)} alt="" /> : initialsForName(item.customer)}
                              </b>
                              <div>
                                <strong>{item.customer}</strong>
                                <p>{item.detail}</p>
                                <small>{item.title} · {item.channel === "phone" ? "04:21" : "07:33"}</small>
                              </div>
                              <span><i></i>{priorityLabel(item.riskLevel)}</span>
                              <button type="button">Assign</button>
                            </article>
                          ))}
                        </div>
                      </aside>

                      <section className="live-ops-panel live-ops-calls" id="calls" aria-label="Live calls">
                        <header>
                          <h3>Live Calls <span>{allLiveCallRows.length}</span></h3>
                          {allLiveCallRows.length > 4 ? (
                            <button type="button" onClick={() => setShowAllCalls((previous) => !previous)}>
                              {showAllCalls ? "Show fewer calls" : "View all calls →"}
                            </button>
                          ) : null}
                        </header>
                        <div className="live-ops-table is-calls">
                          <div className="live-ops-table-head">
                            <span>Customer</span>
                            <span>Phone</span>
                            <span>Status</span>
                            <span>Intent</span>
                            <span>Duration</span>
                            <span>Queue</span>
                          </div>
                          {liveCallRows.map((call, index) => {
                            const callConversation = liveCallConversationRows[index];

                            return (
                              <button
                                className={`live-ops-call-row is-${call.outcome.toLowerCase()}`}
                                type="button"
                                onClick={() => setOpenedLiveQueueId(callConversation.id)}
                                key={`call-${call.id}`}
                              >
                                <span className="live-ops-customer">
                                  <b className={`is-tone-${initialsForName(call.callerName).charCodeAt(0) % 5}`}>
                                    {avatarForName(call.callerName) ? <img src={avatarForName(call.callerName)} alt="" /> : initialsForName(call.callerName)}
                                  </b>
                                  <span><strong>{call.callerName}</strong></span>
                                </span>
                                <span>{call.phone}</span>
                                <span><em>{call.outcome === "Handoff" ? "Needs agent" : call.outcome === "Review" ? "Review" : "AI active"}</em></span>
                                <span>{call.intent}</span>
                                <span>{call.duration}</span>
                                <span className="live-ops-queue-dot"><i></i>{call.issueCategory} line</span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  )}
                </section>
	              ) : activeRoute === "settings" ? (
                <section className="completed-settings" aria-label="Workspace settings">
                  <header className="completed-settings-header">
                    <span>Settings</span>
                    <h1>{activeProject.name}</h1>
                    <p>Manage how this workspace and account run.</p>
                  </header>
                  <div className="completed-settings-body">
                    <nav className="completed-settings-tabs" aria-label="Settings sections">
                      {settingsSections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          className={section.id === settingsTab ? "is-active" : ""}
                          aria-current={section.id === settingsTab ? "page" : undefined}
                          onClick={() => setSettingsTab(section.id)}
                        >
                          <strong>{section.label}</strong>
                          <small>{section.hint}</small>
                        </button>
                      ))}
                    </nav>
                    <div className="completed-settings-content">
                      <div className="completed-settings-content-head">
                        <h2>{activeSettingsSection.title}</h2>
                        <p>{activeSettingsSection.summary}</p>
                      </div>
                      <div className="completed-settings-rows">
                        {activeSettingsSection.rows.map((row) => {
                          const inner = (
                            <>
                              <div>
                                <strong>{row.label}</strong>
                                {row.note ? <p>{row.note}</p> : null}
                              </div>
                              {row.value ? <span>{row.value}</span> : null}
                            </>
                          );
                          if (row.href) {
                            return (
                              <a className="is-link" href={row.href} key={row.label}>
                                {inner}
                              </a>
                            );
                          }
                          if (row.goto) {
                            return (
                              <button className="is-link" type="button" key={row.label} onClick={() => openSettingsRoute(row.goto!)}>
                                {inner}
                              </button>
                            );
                          }
                          return <article key={row.label}>{inner}</article>;
                        })}
                      </div>
                      {activeSettingsSection.id === "workspace" ? (
                        <div className="completed-settings-switcher">
                          <span>Switch workspace</span>
                          <div className="completed-settings-switcher-list">
                            {projects.map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                className={project.id === activeProjectId ? "is-active" : ""}
                                onClick={() => onSelectProject(project.id)}
                              >
                                <strong>{project.name}</strong>
                                <small>{project.businessType || project.meta}</small>
                              </button>
                            ))}
                          </div>
                          <div className="completed-settings-actions">
                            <button type="button" onClick={onCreateProject}>New workspace</button>
                          </div>
                        </div>
                      ) : null}
                      {activeSettingsSection.id === "account" ? (
                        <div className="completed-settings-actions">
                          <button type="button" onClick={onSignOut}>Sign out</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
	              ) : activeRoute === "help" ? (
                <section className="completed-settings" aria-label="Help and support">
                  <header className="completed-settings-header">
                    <span>Help</span>
                    <h1>Help &amp; support</h1>
                    <p>Guides, answers, and ways to reach the team.</p>
                  </header>
                  <div className="completed-settings-body">
                    <nav className="completed-settings-tabs" aria-label="Help sections">
                      {helpSections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          className={section.id === helpTab ? "is-active" : ""}
                          aria-current={section.id === helpTab ? "page" : undefined}
                          onClick={() => setHelpTab(section.id)}
                        >
                          <strong>{section.label}</strong>
                          <small>{section.hint}</small>
                        </button>
                      ))}
                    </nav>
                    <div className="completed-settings-content">
                      <div className="completed-settings-content-head">
                        <h2>{activeHelpSection.title}</h2>
                        <p>{activeHelpSection.summary}</p>
                      </div>
                      <div className="completed-settings-rows">
                        {activeHelpSection.rows.map((row) => {
                          const inner = (
                            <>
                              <div>
                                <strong>{row.label}</strong>
                                {row.note ? <p>{row.note}</p> : null}
                              </div>
                              {row.value ? <span>{row.value}</span> : null}
                            </>
                          );
                          if (row.href) {
                            return (
                              <a className="is-link" href={row.href} key={row.label}>
                                {inner}
                              </a>
                            );
                          }
                          if (row.goto) {
                            return (
                              <button className="is-link" type="button" key={row.label} onClick={() => openSettingsRoute(row.goto!)}>
                                {inner}
                              </button>
                            );
                          }
                          return <article key={row.label}>{inner}</article>;
                        })}
                      </div>
                      {activeHelpSection.id === "contact" ? (
                        <div className="completed-settings-actions">
                          <a href="mailto:support@relayclarity.ai">Email support</a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
	              ) : (
                <>
                  <div className="completed-route-metrics" aria-label={`${activeRouteData.title} metrics`}>
                    {activeDashboardPage.metrics.map((metric) => (
                      <article key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>{metric.detail}</small>
                      </article>
                    ))}
                  </div>

                  <div className="completed-route-grid">
	                  {activeRoute === "integrations" ? (
		                  <section className="completed-integrations-workspace" aria-label="Integration workspace">
			                    <div className="completed-integration-grid">
		                      <section className="completed-integration-list-panel" aria-label="Systems">
		                        <div className="completed-integration-tabs" role="tablist" aria-label="Integration category">
		                          {completedIntegrationCategories.map((category) => (
		                            <button
		                              className={category.id === selectedCompletedIntegrationCategory ? "is-active" : ""}
		                              type="button"
		                              role="tab"
		                              aria-selected={category.id === selectedCompletedIntegrationCategory}
			                              onClick={() => {
			                                setSelectedCompletedIntegrationCategory(category.id);
			                                setLoginIntegration(null);
			                                const firstSystemInCategory = completedIntegrationSystems.find((system) => system.category === category.id);

		                                if (firstSystemInCategory) {
		                                  setSelectedCompletedIntegrationId(firstSystemInCategory.id);
		                                }
		                              }}
		                              key={category.id}
		                            >
		                              {category.label}
		                            </button>
		                          ))}
		                        </div>
			                        <div className="completed-integration-list">
			                          {visibleCompletedIntegrationSystems.map((system) => (
		                            <button
		                              className={[
		                                system.id === selectedCompletedIntegration.id ? "is-active" : "",
	                                system.status === "Connected" ? "is-connected" : "needs-setup"
	                              ].filter(Boolean).join(" ")}
	                              type="button"
	                              onClick={() => setSelectedCompletedIntegrationId(system.id)}
	                              key={system.id}
	                            >
	                              <ProviderLogo connector={{
	                                key: system.key,
	                                name: system.name,
	                                providerId: system.providerId,
	                                provider: system.provider,
	                                logoUrl: system.logoUrl,
	                                connected: system.status === "Connected"
		                              }} />
		                              <span>{system.name}</span>
		                              <strong>{system.provider}</strong>
		                              <small>{system.lastSync}</small>
			                            </button>
			                          ))}
			                        </div>
			                        <button
			                          className="completed-integration-add-button"
			                          type="button"
			                          onClick={() => {
			                            setLoginIntegration(null);
			                            setIsAddIntegrationModalOpen(true);
			                          }}
			                        >
			                          <span aria-hidden="true">+</span>
			                          Add integration
			                        </button>
		                      </section>

	                      <section className="completed-integration-detail-panel" aria-label={`${selectedCompletedIntegration.provider} details`}>
	                        <div className="completed-integration-detail-top">
	                          <div className="completed-integration-title-row">
	                            <ProviderLogo connector={selectedCompletedConnector} large />
	                            <div>
	                              <span>{selectedCompletedIntegration.name}</span>
	                              <h2>{selectedCompletedIntegration.provider}</h2>
	                            </div>
		                            {selectedCompletedIntegration.status !== "Connected" ? (
		                              <strong className="needs-setup">{selectedCompletedIntegration.status}</strong>
		                            ) : null}
		                          </div>
		                          <p className="completed-integration-connection-line">
		                            {selectedCompletedIntegration.provider} to RelayClarity agent tools for {selectedCompletedIntegration.actions[0].toLowerCase()}.
		                          </p>
			                          {selectedCompletedIntegration.status !== "Connected" ? (
			                            <div className="completed-integration-action-row">
			                              <button type="button" onClick={() => void connectCompletedIntegration().catch(console.error)}>Connect</button>
			                            </div>
			                          ) : null}
				                        </div>

			                        <div className="completed-integration-detail-grid">
		                          <section>
		                            <span>Access</span>
		                            <div className="completed-integration-access-list">
		                              {selectedCompletedIntegration.access.map((item) => (
		                                <article key={item.label}>
		                                  <strong>{item.label}</strong>
		                                  <small>{item.detail}</small>
		                                </article>
		                              ))}
		                            </div>
		                          </section>
		                        </div>
	                      </section>
	                    </div>
	                  </section>
	                ) : (
                <section className="completed-route-panel completed-route-panel-main">
                  <div className="completed-route-panel-header">
                    <div>
                      <span>{activeDashboardPage.primaryMeta}</span>
                      <h2>{activeDashboardPage.primaryTitle}</h2>
                    </div>
                  </div>

                  {hasChart(activeDashboardPage) ? (
                    <div className="completed-route-chart" aria-label={activeDashboardPage.primaryTitle}>
                      {activeDashboardPage.chart.map((bar) => (
                        <div key={bar.label}>
                          <i style={{ height: `${bar.value}px` }}></i>
                          <span>{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {hasBars(activeDashboardPage) ? (
                    <div className="completed-route-bars" aria-label={activeDashboardPage.primaryTitle}>
                      {activeDashboardPage.bars.map((bar) => (
                        <article key={bar.label}>
                          <div>
                            <span>{bar.label}</span>
                            <strong>{bar.value}</strong>
                          </div>
                          <i><b style={{ width: `${bar.percent}%` }}></b></i>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {activeDashboardPage.timeline ? (
                    <div className="completed-route-timeline">
                      {activeDashboardPage.timeline.map((item) => (
                        <article key={`${item.time}-${item.title}`}>
                          <time>{item.time}</time>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.detail}</p>
                          </div>
                          <span>{item.tag}</span>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {activeDashboardPage.items ? (
                    <div className="completed-route-list">
                      {activeDashboardPage.items.map((item) => (
                        <article key={item.label}>
                          <div>
                            <strong>{item.label}</strong>
                            <p>{item.note}</p>
                          </div>
                          <span>{item.value}</span>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
                )}

                <aside className="completed-route-panel completed-route-next" aria-label={`${activeRouteData.title} next actions`}>
                  <span>Next actions</span>
                  <h2>Keep momentum</h2>
                  <div>
                    {activeDashboardPage.next.map((action, index) => (
                      <button type="button" key={action}>
                        <small>{String(index + 1).padStart(2, "0")}</small>
                        {action}
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
                </>
              )}
            </section>
          ) : (
            <>
              <motion.section
                className={`completed-hero ${introStage === "chat" ? "is-docked" : ""}`}
                aria-labelledby="completed-dashboard-title"
                layout
                transition={{ layout: { type: "spring", stiffness: 82, damping: 24, mass: 0.9 } }}
              >
                <motion.div layout>
                  <motion.p layout>RelayClarity AI</motion.p>
                  <h1 id="completed-dashboard-title">Your AI customer agent is live.</h1>
                  <motion.span layout>
                    RelayClarity is watching call quality, handoffs, response speed, and knowledge gaps for you.
                  </motion.span>
                </motion.div>
              </motion.section>

              <AnimatePresence>
                {introStage === "chat" ? (
                  <motion.section
                    className="completed-assistant-panel"
                    aria-label="RelayClarity assistant"
                    initial={{ opacity: 0, y: 26, scale: 0.985, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="completed-chat-window">
                      {openingAssistantTurn ? (
                        <motion.div
                          className={`completed-message ${openingAssistantTurn.role === "agent" ? "is-assistant" : "is-user"}`}
                          key="opening-assistant-message"
                          initial={{ opacity: 0, y: 14, scale: 0.992, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <span>{openingAssistantTurn.role === "agent" ? "RC" : workspaceInitial}</span>
                          <div className="completed-message-body">
                            {renderChatMessageContent(
                              openingAssistantTurn.content,
                              openingAssistantTurn.role === "agent" && isAssistantTyping && assistantMessages.length === 1 ? <b className="completed-type-caret" aria-hidden="true"></b> : null
                            )}
                            {showAgentInsights ? (
                              <motion.section
                                className="completed-agent-insights"
                                aria-label="AI customer agent test data"
                                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                              >
                                <div className="completed-insight-metrics">
                                  {agentInsightMetrics.map((metric) => (
                                    <article key={metric.label}>
                                      <span>{metric.label}</span>
                                      <strong>{metric.value}</strong>
                                      <small>{metric.detail}</small>
                                    </article>
                                  ))}
                                </div>

                                <WorkspaceChatCharts
                                  charts={currentAssistantCharts.filter((chart) => ["hourly-volume", "handoff-reasons"].includes(chart.id))}
                                  onPointClick={openMetricPoint}
                                />
                              </motion.section>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
                      {followUpAssistantMessages.map((message, index) => {
                        const messageIndex = index + 1;

                        return (
                          <motion.div
                            className={`completed-message ${message.role === "agent" ? "is-assistant" : "is-user"}`}
                            key={`${message.role}-${messageIndex}`}
                            initial={{ opacity: 0, y: 14, scale: 0.992, filter: "blur(6px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <span>{message.role === "agent" ? "RC" : workspaceInitial}</span>
                            <div className="completed-message-body">
                              {renderChatMessageContent(
                                message.content,
                                message.role === "agent" && isAssistantTyping && messageIndex === assistantMessages.length - 1 ? <b className="completed-type-caret" aria-hidden="true"></b> : null
                              )}
                              {message.role === "agent" && message.content.length > 8 && message.charts?.length ? (
                                <WorkspaceChatCharts charts={message.charts} onPointClick={openMetricPoint} />
                              ) : null}
                            </div>
                          </motion.div>
                        );
                      })}
                      {workspaceAssistantStatus === "loading" || (isAssistantTyping && assistantMessages.length === 0) ? (
                        <motion.div
                          className="completed-message is-assistant is-thinking"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.35 }}
                        >
                          <span>RC</span>
                          <p><strong>Thinking</strong></p>
                        </motion.div>
                      ) : null}
                      {workspaceAssistantError ? (
                        <div className="completed-assistant-status" role="status">
                          {workspaceAssistantError}
                        </div>
                      ) : null}
                      <div className="completed-chat-scroll-anchor" ref={assistantScrollAnchorRef} aria-hidden="true"></div>
                    </div>
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </>
          )}
        </div>

        <form
          className={`completed-composer ${introStage === "chat" && !activeDashboardPage ? "is-visible" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            sendAssistantMessage(assistantInput);
          }}
        >
          <input
            aria-label="Ask workspace assistant"
            placeholder={
              workspaceAssistantStatus === "loading"
                ? "RelayClarity is reading the workspace data"
                : isOperationalDashboardLive
                  ? "Ask RelayClarity anything about setup, metrics, calls, or next actions"
                  : "Ask RelayClarity about setup, integrations, launch checks, or blockers"
            }
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
          />
          <button type="submit" aria-label="Send" disabled={workspaceAssistantStatus === "loading"}>
            <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
              <path d="M10 15.5V5.4M5.6 9.8 10 5.4l4.4 4.4" />
            </svg>
          </button>
	        </form>
	      </section>
	      <AnimatePresence>
	        {isAddIntegrationModalOpen ? (
	          <motion.div
	            className="completed-integration-modal-backdrop"
	            role="dialog"
	            aria-modal="true"
	            aria-labelledby="completed-integration-modal-title"
	            initial={{ opacity: 0 }}
	            animate={{ opacity: 1 }}
	            exit={{ opacity: 0 }}
	          >
	            <motion.section
	              className="completed-integration-modal"
	              initial={{ opacity: 0, y: 18, scale: 0.98 }}
	              animate={{ opacity: 1, y: 0, scale: 1 }}
	              exit={{ opacity: 0, y: 12, scale: 0.98 }}
	              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
	            >
	              <header>
	                <div>
	                  <span>{completedIntegrationCategories.find((category) => category.id === selectedCompletedIntegrationCategory)?.label}</span>
	                  <h2 id="completed-integration-modal-title">
	                    {loginIntegration
	                      ? loginIntegrationStage === "credentials"
	                        ? `Connect ${loginIntegration.company}`
	                        : loginIntegrationStage === "success"
	                          ? `${loginIntegration.company} connected`
	                        : loginIntegrationStage === "blocked"
	                          ? `${loginIntegration.company} needs setup`
	                          : `Checking ${loginIntegration.company}`
	                      : "Add integration"}
	                  </h2>
	                </div>
	                <button
	                  type="button"
	                  onClick={closeAddIntegrationModal}
	                  aria-label="Close add integration modal"
	                >
	                  ×
	                </button>
	              </header>
	              <AnimatePresence mode="wait">
	                {loginIntegration ? (
	                  <motion.div
	                    className="completed-integration-login-state"
	                    key={`login-state-${loginIntegrationStage}`}
	                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
	                    animate={{ opacity: 1, y: 0, scale: 1 }}
	                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
	                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
	                  >
	                    <motion.img
	                      src={loginIntegration.logoUrl}
	                      alt={loginIntegration.company}
	                      initial={{ scale: 0.9, opacity: 0 }}
	                      animate={{ scale: 1, opacity: 1 }}
	                      transition={{ delay: 0.08, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
	                    />
	                    {loginIntegrationStage === "credentials" ? (
	                      <form className="completed-integration-login-form" onSubmit={submitIntegrationLogin}>
	                        <label>
	                          Work email
	                          <input
	                            type="email"
	                            value={loginIntegrationEmail}
	                            onChange={(event) => setLoginIntegrationEmail(event.target.value)}
	                            placeholder="name@company.com"
	                            autoFocus
	                          />
	                        </label>
	                        <label>
	                          Required access notes
	                          <input
	                            type="text"
	                            value={loginIntegrationPassword}
	                            onChange={(event) => setLoginIntegrationPassword(event.target.value)}
	                            placeholder="OAuth app, API key owner, webhook owner"
	                          />
	                        </label>
	                        <button type="submit" disabled={!loginIntegrationEmail.trim()}>
	                          Connect integration
	                        </button>
	                        <button type="button" onClick={() => setLoginIntegration(null)}>
	                          Choose another integration
	                        </button>
	                      </form>
	                    ) : (
	                      <>
	                        <div>
	                          <span>{loginIntegration.type}</span>
	                          <strong>
	                            {loginIntegrationStage === "success"
	                              ? `${loginIntegration.company} is connected`
	                              : loginIntegrationStage === "blocked"
	                              ? `${loginIntegration.company} is not connected yet`
	                              : `Checking ${loginIntegration.company}`}
	                          </strong>
	                          <small>
	                            {loginIntegrationStage === "success"
	                              ? "Connection complete. Updating your workspace."
	                              : loginIntegrationStage === "blocked"
	                              ? "A real OAuth, API key, or webhook connector is required before this system can be used by the agent."
	                              : "Checking whether a real provider connector is available."}
	                          </small>
	                        </div>
	                        <div className={`completed-integration-login-progress ${loginIntegrationStage === "success" ? "is-complete" : ""}`} aria-hidden="true">
	                          <i></i>
	                        </div>
	                      </>
	                    )}
	                  </motion.div>
	                ) : (
	                  <motion.div
	                    className="completed-integration-picker"
	                    key="picker-state"
	                    initial={{ opacity: 0, y: 12 }}
	                    animate={{ opacity: 1, y: 0 }}
	                    exit={{ opacity: 0, y: -10 }}
	                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
	                  >
	                    {visibleAddIntegrationCatalog.map((integration, index) => (
	                      <motion.button
	                        type="button"
	                        aria-label={`Add ${integration.company} ${integration.type} integration`}
	                        title={`${integration.company} · ${integration.type}`}
	                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
	                        animate={{ opacity: 1, y: 0, scale: 1 }}
	                        transition={{ delay: index * 0.035, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
	                        whileHover={{ y: -3, scale: 1.025 }}
	                        whileTap={{ scale: 0.98 }}
	                        onClick={() => startIntegrationLogin(integration)}
	                        key={`${integration.company}-${integration.type}`}
	                      >
	                        <img
	                          src={integration.logoUrl}
	                          alt={integration.company}
	                          loading="lazy"
	                          onError={(event) => {
	                            event.currentTarget.style.display = "none";
	                          }}
	                        />
	                        <strong>{integration.company}</strong>
	                      </motion.button>
	                    ))}
	                  </motion.div>
	                )}
	              </AnimatePresence>
	            </motion.section>
	          </motion.div>
	        ) : null}
	      </AnimatePresence>
	    </main>
	  );
	}

function scoreLabel(score: number): string {
  if (score >= 92) {
    return "Excellent";
  }

  if (score >= 84) {
    return "Ready";
  }

  return "Needs review";
}

function ProviderLogo({ connector, large = false }: { connector: Connector; large?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoMark = providerLogoMark(connector.provider);
  const hasInlineLogo = Boolean(logoMark);
  const showImageLogo = !hasInlineLogo && connector.logoUrl && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [connector.logoUrl]);

  return (
    <span className={`connector-logo ${large ? "large" : ""}`} aria-hidden="true">
      {logoMark === "sevenrooms" ? (
        <svg className="connector-logo-brand sevenrooms" viewBox="0 0 36 36" role="img" focusable="false">
          <rect x="3" y="3" width="30" height="30" rx="8" />
          <path d="M12 10h13l-8.2 16h-4.2l6.5-12.2H12V10Z" />
          <circle cx="25.5" cy="25.5" r="2.4" />
        </svg>
      ) : logoMark === "zoom" ? (
        <svg className="connector-logo-brand zoom-mark" viewBox="0 0 36 36" role="img" focusable="false">
          <rect x="3" y="6" width="30" height="24" rx="8" />
          <path d="M11 14.2c0-1.2 0.9-2.2 2.2-2.2h8.4c1.2 0 2.2 1 2.2 2.2v7.6c0 1.2-1 2.2-2.2 2.2h-8.4c-1.3 0-2.2-1-2.2-2.2v-7.6Z" />
          <path d="M23.8 16.2 29 13v10l-5.2-3.2v-3.6Z" />
        </svg>
      ) : logoMark === "front" ? (
        <svg className="connector-logo-brand front" viewBox="0 0 36 36" role="img" focusable="false">
          <rect x="3" y="3" width="30" height="30" rx="8" />
          <path d="M12 10h14v4H16v4h8v4h-8v6h-4V10Z" />
        </svg>
      ) : showImageLogo ? (
        <img
          src={connector.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
        />
      ) : null}
      {!hasInlineLogo && !showImageLogo ? <b>{connector.provider.slice(0, 1)}</b> : null}
    </span>
  );
}

function providerLogoMark(provider: string) {
  const normalized = normalizeProviderName(provider);

  if (normalized.includes("sevenrooms")) return "sevenrooms";
  if (normalized.includes("zoom")) return "zoom";
  if (normalized.includes("front")) return "front";

  return "";
}

function DashboardHeader({ eyebrow, title, badge }: { eyebrow: string; title: string; badge?: string }) {
  return (
    <div className="dashboard-panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {badge ? <span className={badge === "Saved" ? "dashboard-pill is-success" : "dashboard-pill"}>{badge}</span> : null}
    </div>
  );
}

function CustomSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`custom-select ${isOpen ? "is-open" : ""}`}>
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span>{value}</span>
        <b>⌄</b>
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="custom-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {options.map((option) => (
              <button
                className={option === value ? "is-selected" : ""}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                key={option}
              >
                {option}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function EvidenceCard({
  label,
  value,
  meter,
  wave,
  caption
}: {
  label: string;
  value: string;
  meter?: number;
  wave?: boolean;
  caption?: string;
}) {
  return (
    <article className="evidence-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {meter ? (
        <div className="meter">
          <i style={{ width: `${meter}%` }} />
        </div>
      ) : null}
      {wave ? (
        <div className="micro-wave" aria-hidden="true">
          <b />
          <b />
          <b />
          <b />
        </div>
      ) : null}
      {caption ? <small>{caption}</small> : null}
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
