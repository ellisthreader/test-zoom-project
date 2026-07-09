import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import relayclarityLogoUrl from "../assets/relayclarity-logo.svg";
import relayclarityLogoDarkUrl from "../assets/relayclarity-logo-dark.svg";
import demoAgentAvatarUrl from "../assets/demo-agent-avatar.png";
import workflowConfigureCardUrl from "../assets/workflow-business-brief-photo-v3.png";
import workflowSimulateCardUrl from "../assets/workflow-customer-questions-photo-v4.png";
import workflowObserveCardUrl from "../assets/workflow-conversations-professional.png";
import workflowHandoffUrl from "../assets/workflow-handoff.png";
import timelineDay01Url from "../assets/timeline-day-01-pilot-kickoff.jpg";
import timelineDay07Url from "../assets/timeline-day-07-build.jpg";
import timelineDay14Url from "../assets/timeline-day-14-controlled-pilot.jpg";
import timelineDay21Url from "../assets/timeline-day-21-production-ramp.jpg";
import timelineDay30Url from "../assets/timeline-day-30-live-production.jpg";
import launchPhotoTestUrl from "../assets/launch-photo-test.png";
import launchPhotoControlUrl from "../assets/launch-photo-control.png";
import launchPhotoObserveUrl from "../assets/launch-photo-observe.png";
import launchPhotoLaunchUrl from "../assets/launch-photo-launch.png";
import voiceGeorgeUrl from "../assets/voice-personas/george.png";
import voiceAntoniUrl from "../assets/voice-personas/antoni.png";
import voiceAdamUrl from "../assets/voice-personas/adam.png";
import voiceBellaUrl from "../assets/voice-personas/bella.png";
import voiceMayaUrl from "../assets/voice-personas/maya.png";
import voiceRowanUrl from "../assets/voice-personas/rowan.png";
import customerBearLaneUrl from "../assets/customer-bear-lane.jpg";
import customerClearDbsUrl from "../assets/customer-cleardbs.jpg";
import clearDbsChatHeaderUrl from "../assets/cleardbs-chat-header.png";
import bearLaneLogoUrl from "../assets/customer-logos/bear-lane-logo.png";
import clearDbsLogoUrl from "../assets/customer-logos/cleardbs-logo.svg";
import { COUNTRIES } from "./country-codes";
import "@fontsource-variable/inter/index.css";
import "./styles.css";
import "./setup-redesign.css";

type ScenarioKey = "billing" | "handoff" | "injection";

type Scenario = {
  title: string;
  label: string;
  score: number;
  result: string;
};

type CinematicTestStage = {
  id: "live-chat" | "voice" | "knowledge" | "systems" | "handoff" | "launch";
  label: string;
  title: string;
  detail: string;
  scene: string;
  evidence: string;
  score: number;
  checks: string[];
  result: string;
};

type TestRunState = "idle" | "running" | "complete";

const TEST_RUN_STAGE_COUNT = 6;
const TEST_RUN_STAGE_DURATION_MS = 1320;
const TEST_RUN_STAGE_COMPLETE_OFFSET_MS = 1040;

type Connector = {
  key: string;
  name: string;
  providerId: string;
  provider: string;
  logoUrl: string;
  connected: boolean;
  connectionMode?: "oauth" | "sandbox" | "demo";
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
  mode: "oauth" | "sandbox" | "demo";
  scopes: string[];
  message: string;
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
  description: string;
  bestFor: string;
  avatarUrl: string;
  sampleAudioUrl: string;
  confirmationAudioUrl: string;
  voiceId: string;
  sample: string;
};

type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
  onboarded: boolean;
  accountType: string;
};

type AuthPayload = {
  user: AuthUser | null;
  googleAuthAvailable: boolean;
};

type PasswordResetRequestPayload = {
  ok: boolean;
  message: string;
  emailDelivery: "sent" | "not_configured";
  resetUrl?: string;
};

type ProjectsPayload = {
  projects: Project[];
};

type CheckoutSessionPayload = {
  id: string;
  url: string;
};

type CheckoutSessionStatusPayload = {
  id: string;
  status: string;
  paymentStatus: string;
  customerEmail: string;
  planId: string;
  planName: string;
  billing: string;
  subscriptionId: string;
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

const demoProjects: Project[] = [
  { id: "acme-solutions", name: "Acme Solutions", meta: "AI customer service workspace", businessType: "Retail support" },
  { id: "clear-dbs-live", name: "Clear DBS", meta: "Live DBS compliance command centre", businessType: "DBS checks and compliance support" },
  { id: "northstar-dental", name: "Northstar Dental", meta: "Live customer agent", businessType: "Dental clinic" },
  { id: "cleardbs", name: "ClearDBS archive", meta: "DBS support pilot", businessType: "Compliance checks" },
  { id: "harbour-financial", name: "Harbour Financial", meta: "Client service desk", businessType: "Financial services" },
  { id: "atlas-retail", name: "Atlas Retail", meta: "Order support and store callbacks", businessType: "Retail support" },
  { id: "midtown-property", name: "Midtown Property", meta: "Tenant maintenance triage", businessType: "Estate agency" },
  { id: "copper-saas", name: "Copper SaaS", meta: "Technical support intake", businessType: "Software support" },
  { id: "luna-dining", name: "Luna Dining", meta: "Reservation and guest care", businessType: "Restaurant group" },
  { id: "ashford-books", name: "Ashford Books", meta: "Stock and event enquiries", businessType: "Bookshop" },
  { id: "summit-insurance", name: "Summit Insurance", meta: "Claims routing pilot", businessType: "Financial services" },
];

function projectsForUser(user: AuthUser | null): Project[] {
  return user?.accountType === "demo" ? demoProjects : [];
}

async function loadProjectsForUser(user: AuthUser | null): Promise<Project[]> {
  if (!user || user.accountType === "demo") {
    return projectsForUser(user);
  }

  const payload = await fetchJsonFromApi<ProjectsPayload>("/api/dashboard/projects");
  return payload.projects;
}

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

function isClearDbsWorkspace(project: Pick<Project, "id" | "name" | "businessType">) {
  return /clear\s*dbs|cleardbs/i.test(`${project.id} ${project.name} ${project.businessType || ""}`);
}

function createInitialLiveMetrics(project: Project): LiveWorkspaceMetrics {
  const seed = projectSeed(project.id);
  const clearDbsWorkspace = isClearDbsWorkspace(project);
  const isNewWorkspace = !project.launchReport && !["northstar-dental", "cleardbs", "clear-dbs-live", "harbour-financial"].includes(project.id);
  const baseCalls = isNewWorkspace ? 4 + (seed % 7) : 92 + (seed % 48);
  const handoffs = Math.max(1, Math.round(baseCalls * 0.07));

  if (clearDbsWorkspace) {
    return {
      tick: 0,
      callsHandled: 184,
      activeCalls: 11,
      containedCalls: 151,
      handoffs: 14,
      openRisks: 5,
      p95LatencyMs: 1180,
      csat: 4.7,
      firstContactResolution: 84,
      recontactRate: 4,
      humanHoursSaved: 12.6,
      asrConfidence: 95,
      bargeInRecovery: 91,
      silenceTimeoutRate: 2,
      failedTurns: 3,
      citationCoverage: 94,
      retrievalMisses: 4,
      staleSources: 1,
      draftAnswers: 3,
      policyViolations: 0,
      unsupportedAttempts: 5,
      lowConfidenceAnswers: 4,
      sensitiveEscalations: 6,
      ownerAccuracy: 97,
      slaRisk: 2,
      avgHandoffSeconds: 34,
      crmLookupSuccess: 98,
      ticketWriteSuccess: 99,
      webhookErrors: 0,
      knowledgeSyncMinutes: 3,
      hourlyVolume: [9, 18, 33, 28, 21, 27, 19, 14]
    };
  }

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

function zoomAiCapabilitiesFor(_playbook: BusinessPlaybook, _businessType: string): GoalOption[] {
  return [
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Virtual Agent",
      detail: "Answer customer conversations across your connected channels with consistent support."
    },
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Intent Detection",
      detail: "Classify what each customer needs so every request reaches the right skill or team."
    },
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Knowledge Answers",
      detail: "Answer from your approved knowledge base, policies, service details, and FAQs."
    },
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Eligibility Check",
      detail: "Ask the right qualifying questions before giving an answer or routing the customer."
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Task Automation",
      detail: "Complete approved FAQs, structured requests, and follow-up tasks automatically."
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "System Workflows",
      detail: "Use your connected CRM, helpdesk, billing, and service systems during the conversation."
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Ticket Creation",
      detail: "Create, update, and tag helpdesk records with the right customer context."
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Follow-Up Scheduling",
      detail: "Book callbacks, reminders, or next-step tasks after the customer request is captured."
    },
    {
      category: "Escalate when needed",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Live Agent Handoff",
      detail: "Transfer complex or urgent conversations with customer context and conversation history."
    },
    {
      category: "Escalate when needed",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Priority Routing",
      detail: "Route high-value, urgent, or at-risk customers to the right team without delay."
    },
    {
      category: "Escalate when needed",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Sensitive Topic Guardrails",
      detail: "Escalate complaints, payments, legal issues, or policy exceptions before risk builds."
    },
    {
      category: "Escalate when needed",
      categoryDetail: "Human handoff for complex, sensitive, or urgent customer moments.",
      title: "Fallback Handling",
      detail: "Move unclear requests to a human when confidence is low or the customer pushes back."
    },
    {
      category: "Support the team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "AI Expert Assist",
      detail: "Surface relevant guidance, next best actions, and business context for staff."
    },
    {
      category: "Support the team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "Auto Wrap-Up",
      detail: "Generate summaries, dispositions, notes, and follow-up actions after every contact."
    },
    {
      category: "Support the team",
      categoryDetail: "Agent-side help that reduces admin and improves next actions.",
      title: "Quality Review",
      detail: "Flag missed intents, weak answers, and handoff patterns that need manager review."
    },
    {
      category: "Support the team",
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
};

type DemoChatTurn = {
  reply: string;
  intent: string;
  confidence: number;
  nextAction: string;
  escalate: boolean;
};

type VoiceSpeechResult = {
  mode: "audio" | "mock";
  provider: string;
  voiceId: string;
  modelId: string;
  contentType?: string;
  audioBase64?: string;
  estimatedCharacters?: number;
  message?: string;
};

type DemoCallStage = "idle" | "dialing" | "ringing" | "live" | "ended" | "failed";

type WorkspaceAssistantChart = {
  id: string;
  title: string;
  kind: "bar" | "progress";
  data: { label: string; value: number; display: string; percent?: number }[];
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

type BusinessTaxonomyEntry = {
  code: string;
  title: string;
  playbookId: string;
  terms: string[];
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
    phase: "Configure",
    title: "Business brief",
    example: "Bookings, FAQs, hours.",
    outcome: "",
    image: workflowConfigureCardUrl
  },
  {
    phase: "Simulate",
    title: "Customer questions",
    example: "Test real requests.",
    outcome: "",
    image: workflowSimulateCardUrl
  },
  {
    phase: "Observe",
    title: "Conversations",
    example: "Calls, chats, handoffs.",
    outcome: "",
    image: workflowObserveCardUrl
  },
  {
    phase: "Escalate",
    title: "Team handoff",
    example: "Urgent work with context.",
    outcome: "",
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

function PlatformParallaxSection() {
  const platformRef = useRef<HTMLElement>(null);
  const marketingVideoRef = useRef<HTMLVideoElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress: platformScrollProgress } = useScroll({
    target: platformRef,
    offset: ["start 78%", "end end"]
  });
  const platformWordStyles = [
    useScrollWordReveal(platformScrollProgress, 0.03, 0.11),
    useScrollWordReveal(platformScrollProgress, 0.12, 0.2),
    useScrollWordReveal(platformScrollProgress, 0.21, 0.3)
  ];
  const platformSublineStyle = useScrollLineReveal(platformScrollProgress, 0.29, 0.38, 26);
  const platformHeadlineStyle = {
    opacity: useTransform(platformScrollProgress, [0.54, 0.66], [1, 0]),
    y: useTransform(platformScrollProgress, [0.4, 0.54, 0.66], ["0vh", "-31vh", "-46vh"]),
    scale: useTransform(platformScrollProgress, [0.4, 0.54, 0.66], [1, 0.52, 0.48])
  };
  const platformVideoStyle = {
    opacity: useTransform(platformScrollProgress, [0.48, 0.64], [0, 1]),
    y: useTransform(platformScrollProgress, [0.48, 0.68, 1], ["56px", "0px", "-8vh"]),
    scale: useTransform(platformScrollProgress, [0.48, 0.68, 1], [0.94, 1, 1])
  };
  const visibleLineStyle = { opacity: 1, y: 0, filter: "blur(0px)" };
  const visibleWordStyle = { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)" };

  useEffect(() => {
    let animationFrame = 0;

    const refreshScrollMeasurements = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("scroll"));
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshScrollMeasurements();
      }
    };

    refreshScrollMeasurements();
    window.addEventListener("focus", refreshScrollMeasurements);
    window.addEventListener("pageshow", refreshScrollMeasurements);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("focus", refreshScrollMeasurements);
      window.removeEventListener("pageshow", refreshScrollMeasurements);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
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
  }, []);

  return (
    <section className="platform-section is-headline-only" id="platform" ref={platformRef}>
      <div className="platform-pin">
        <div className="platform-stage">
          <div className="platform-headline-layer">
            <motion.div className="platform-headline" style={shouldReduceMotion ? undefined : platformHeadlineStyle}>
              <h2 className="platform-words" aria-label="Build. Test. Launch. Meet Clara, your AI agent, live in days.">
                {["Build.", "Test.", "Launch."].map((word, index) => (
                  <motion.span
                    className={`platform-word ${index === 2 ? "is-accent" : ""}`}
                    style={shouldReduceMotion ? visibleWordStyle : platformWordStyles[index]}
                    aria-hidden="true"
                    key={word}
                  >
                    {word}
                  </motion.span>
                ))}
              </h2>
              <motion.p
                className="platform-subline"
                style={shouldReduceMotion ? visibleLineStyle : platformSublineStyle}
                aria-hidden="true"
              >
                Meet <em>Clara</em> - your AI agent, live in days.
              </motion.p>
            </motion.div>
          </div>

          <motion.div className="platform-video-layer" style={shouldReduceMotion ? undefined : platformVideoStyle}>
            <div className="marketing-video-shell">
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
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const timelineSteps = [
  {
    day: "Day 1",
    title: "Pilot kickoff",
    example: "Agree scope, caller journeys, success metrics, and human handoff rules before build begins.",
    image: timelineDay01Url
  },
  {
    day: "Day 7",
    title: "Build and connect",
    example: "Connect telephony, knowledge, CRM, and support workflows so the agent can handle real scenarios.",
    image: timelineDay07Url
  },
  {
    day: "Day 14",
    title: "Controlled pilot",
    example: "Run monitored pilot calls, review transcripts, tune answers, and confirm escalation quality.",
    image: timelineDay14Url
  },
  {
    day: "Day 21",
    title: "Production ramp",
    example: "Increase traffic with live dashboards, QA checks, and production owners watching every signal.",
    image: timelineDay21Url
  },
  {
    day: "Day 30",
    title: "Live in production",
    example: "Operate the agent as a production channel with daily metrics, stable handoff, and continuous improvement.",
    image: timelineDay30Url,
    live: true
  }
];

function WorkflowTimelineSection() {
  const shouldReduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLOListElement | null>(null);
  // Progress 0 -> 1 as the timeline grid crosses the viewport center,
  // so the rail fill tip always sits level with what the user is reading.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start center", "end center"]
  });
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", () => {
    const list = stepsRef.current;
    if (!list) return;
    const viewportCenter = window.innerHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(list.children).forEach((child, index) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActiveStep((previous) => (previous === best ? previous : best));
  });

  const railFillScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const mediaDrift = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section className="workflow-timeline-section" id="workflow-timeline">
      <header className="workflow-timeline-header">
        <h2>From pilot to production in 30 days.</h2>
        <p>Day-by-day launch governance from first pilot scope to a live production voice channel.</p>
      </header>
      <div className="workflow-timeline" ref={gridRef}>
        <div className="workflow-timeline-media" aria-hidden="true">
          <div className="workflow-timeline-media-pin">
            <motion.div
              className="workflow-timeline-frames"
              style={shouldReduceMotion ? undefined : { y: mediaDrift }}
            >
              {timelineSteps.map((step, index) => (
                <figure
                  className={`workflow-timeline-frame ${
                    index === activeStep ? "is-active" : index < activeStep ? "is-before" : "is-after"
                  }`}
                  key={step.title}
                >
                  <img src={step.image} alt="" loading="lazy" />
                </figure>
              ))}
            </motion.div>
          </div>
        </div>
        <div className="workflow-timeline-rail" aria-hidden="true">
          <motion.span
            className="workflow-timeline-rail-fill"
            style={{ scaleY: shouldReduceMotion ? 1 : railFillScale }}
          />
        </div>
        <ol className="workflow-timeline-steps" ref={stepsRef}>
          {timelineSteps.map((step, index) => (
            <li
              className={`workflow-timeline-step ${index <= activeStep ? "is-reached" : ""} ${
                index === activeStep ? "is-current" : ""
              }`}
              key={step.title}
            >
              <span className="workflow-timeline-number">{step.day}</span>
              <div className="workflow-timeline-title-row">
                <h3>{step.title}</h3>
                {step.live ? <span className="workflow-timeline-live-icon" role="img" aria-label="Live"></span> : null}
              </div>
              <p>{step.example}</p>
              <div className="workflow-timeline-step-media" aria-hidden="true">
                <img src={step.image} alt="" loading="lazy" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type ComparisonMark = "yes" | "no" | "partial";

type ComparisonCell = {
  kind: ComparisonMark | "text";
  note: string;
};

const comparisonColumns = [
  { key: "relay", label: "RelayClarity", sub: "AI agent" },
  { key: "voicemail", label: "Voicemail", sub: "The default" },
  { key: "service", label: "Answering service", sub: "Outsourced humans" },
  { key: "hire", label: "New hire", sub: "Full-time receptionist" }
] as const;

type ComparisonRow = {
  label: string;
} & Record<(typeof comparisonColumns)[number]["key"], ComparisonCell>;

const comparisonRows: ComparisonRow[] = [
  {
    label: "Answers 24/7, several calls at once",
    relay: { kind: "yes", note: "Every call, instantly" },
    voicemail: { kind: "no", note: "" },
    service: { kind: "partial", note: "" },
    hire: { kind: "partial", note: "" }
  },
  {
    label: "Knows your services and pricing",
    relay: { kind: "yes", note: "Trained on your brief" },
    voicemail: { kind: "no", note: "" },
    service: { kind: "partial", note: "" },
    hire: { kind: "yes", note: "" }
  },
  {
    label: "Books jobs on the spot",
    relay: { kind: "yes", note: "Straight into your calendar" },
    voicemail: { kind: "no", note: "" },
    service: { kind: "partial", note: "" },
    hire: { kind: "yes", note: "" }
  },
  {
    label: "Human handoff with context",
    relay: { kind: "yes", note: "One-tap escalation" },
    voicemail: { kind: "no", note: "" },
    service: { kind: "partial", note: "" },
    hire: { kind: "yes", note: "" }
  },
  {
    label: "Transcripts and analytics",
    relay: { kind: "yes", note: "Every conversation" },
    voicemail: { kind: "no", note: "" },
    service: { kind: "no", note: "" },
    hire: { kind: "no", note: "" }
  },
  {
    label: "Time to go live",
    relay: { kind: "text", note: "Days" },
    voicemail: { kind: "text", note: "Instant" },
    service: { kind: "text", note: "Weeks" },
    hire: { kind: "text", note: "Months" }
  },
  {
    label: "Monthly cost",
    relay: { kind: "text", note: "Fraction of a salary" },
    voicemail: { kind: "text", note: "Free — costs you jobs" },
    service: { kind: "text", note: "Per-minute fees" },
    hire: { kind: "text", note: "Full salary" }
  }
];

const explainerStats = [
  { value: 80, suffix: "%", label: "hang up on voicemail" },
  { value: 62, suffix: "%", label: "of calls go unanswered" },
  { value: 85, suffix: "%", label: "never call back" }
];

const explainerBeats = [
  { label: "AI voice" },
  { label: "AI chat", featured: true },
  { label: "Bookings" },
  { label: "Handoff" }
];

const callScript = [
  { from: "caller" as const, text: "Hi — my kitchen sink is leaking. Could someone come out on Thursday?" },
  { from: "agent" as const, text: "Sorry to hear that — we can help. Thursday has 9:30am or 2:00pm open. Which suits you?" },
  { from: "caller" as const, text: "2pm works great." },
  { from: "agent" as const, text: "Done — you're booked for Thursday at 2:00pm. A text confirmation is on its way." }
];

function CountUpStat({ value, suffix, shouldReduceMotion }: { value: number; suffix: string; shouldReduceMotion: boolean | null }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(shouldReduceMotion ? value : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || startedRef.current) return;
        startedRef.current = true;
        const startedAt = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, shouldReduceMotion]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function ComparisonMarkIcon({ kind }: { kind: ComparisonMark }) {
  if (kind === "yes") {
    return (
      <span className="explainer-mark is-yes" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.6 4.6L19 7.5" />
        </svg>
      </span>
    );
  }
  if (kind === "no") {
    return (
      <span className="explainer-mark is-no" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M7 12h10" />
        </svg>
      </span>
    );
  }
  return (
    <span className="explainer-mark is-partial" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
      </svg>
    </span>
  );
}

const markLabels: Record<ComparisonMark, string> = {
  yes: "Yes",
  no: "No",
  partial: "Partly"
};

function LiveCallDemo({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  const [visible, setVisible] = useState(shouldReduceMotion ? callScript.length : 0);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(Boolean(shouldReduceMotion));

  useEffect(() => {
    if (shouldReduceMotion) {
      setVisible(callScript.length);
      setDone(true);
      return;
    }
    let alive = true;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    (async () => {
      while (alive) {
        setVisible(0);
        setDone(false);
        setTyping(false);
        await sleep(1100);
        for (let index = 0; index < callScript.length; index++) {
          if (!alive) return;
          if (callScript[index].from === "agent") {
            setTyping(true);
            await sleep(1150);
            setTyping(false);
          }
          if (!alive) return;
          setVisible(index + 1);
          await sleep(callScript[index].from === "caller" ? 1250 : 1700);
        }
        if (!alive) return;
        setDone(true);
        await sleep(5200);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shouldReduceMotion]);

  return (
    <div className="call-demo" aria-label="Example of RelayClarity handling a live call">
      <div className="call-demo-top">
        <span className="call-demo-avatar">
          <img src={demoAgentAvatarUrl} alt="" />
        </span>
        <div className="call-demo-id">
          <strong>Clara</strong>
          <span>RelayClarity agent</span>
        </div>
        <span className="call-demo-live">
          <i aria-hidden="true" />
          Live call
        </span>
      </div>
      <div className="call-demo-thread">
        {callScript.slice(0, visible).map((message) => (
          <motion.p
            className={`call-demo-bubble is-${message.from}`}
            key={message.text}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {message.text}
          </motion.p>
        ))}
        {typing ? (
          <motion.span
            className="call-demo-typing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </motion.span>
        ) : null}
        {done ? (
          <motion.span
            className="call-demo-chip"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.6 4.6L19 7.5" />
            </svg>
            Thursday 2:00pm booked · transcript saved
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}

function ExplainerSection() {
  const shouldReduceMotion = useReducedMotion();

  const reveal = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 34, filter: "blur(10px)" },
          whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
          viewport: { once: true, margin: "-12% 0px" },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }
        };

  return (
    <section className="explainer-section" id="what-is">
      <div className="explainer-glow" aria-hidden="true" />
      <div className="explainer-intro">
        <motion.div className="explainer-copy" {...reveal()}>
          <img className="explainer-logo" src={relayclarityLogoUrl} alt="RelayClarity" />
          <span className="explainer-eyebrow">What is RelayClarity</span>
          <h2>
            An AI agent on <em>your</em> business line.
          </h2>
          <p className="explainer-lede">
            It answers missed calls, handles the next step, and sends your team the outcome.
          </p>
          <ul className="explainer-beats">
            {explainerBeats.map((beat, index) => (
              <motion.li className={beat.featured ? "is-featured" : ""} key={beat.label} {...reveal(0.14 + index * 0.08)}>
                <strong>{beat.label}</strong>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <motion.div className="explainer-demo" {...reveal(0.18)}>
          <LiveCallDemo shouldReduceMotion={shouldReduceMotion} />
        </motion.div>
      </div>

      <motion.div className="explainer-compare-intro" {...reveal(0.05)}>
        <h3>Every way to answer the phone, compared.</h3>
        <div className="explainer-statline" aria-label="Missed call statistics">
          {explainerStats.map((stat) => (
            <span className="explainer-statline-item" key={stat.label}>
              <strong>
                <CountUpStat value={stat.value} suffix={stat.suffix} shouldReduceMotion={shouldReduceMotion} />
              </strong>
              {stat.label}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="explainer-compare"
        role="table"
        aria-label="RelayClarity compared with voicemail, answering services, and hiring"
        {...reveal(0.1)}
      >
        <div className="explainer-compare-head" role="row">
          <span className="explainer-compare-corner" role="columnheader" aria-label="Capability" />
          {comparisonColumns.map((column) => (
            <span
              className={`explainer-compare-col ${column.key === "relay" ? "is-relay" : ""}`}
              role="columnheader"
              key={column.key}
            >
              <strong>{column.label}</strong>
              <small>{column.sub}</small>
            </span>
          ))}
        </div>
        {comparisonRows.map((row, rowIndex) => (
          <motion.div
            className="explainer-compare-row"
            role="row"
            key={row.label}
            {...(shouldReduceMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 18 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: "-8% 0px" },
                  transition: { duration: 0.5, delay: 0.04 * rowIndex, ease: [0.22, 1, 0.36, 1] as const }
                })}
          >
            <span className="explainer-compare-label" role="rowheader">
              {row.label}
            </span>
            {comparisonColumns.map((column) => {
              const cell = row[column.key];
              return (
                <span
                  className={`explainer-compare-cell ${column.key === "relay" ? "is-relay" : ""}`}
                  role="cell"
                  data-column={column.label}
                  key={column.key}
                >
                  {cell.kind === "text" ? (
                    <em>{cell.note}</em>
                  ) : (
                    <>
                      <ComparisonMarkIcon kind={cell.kind} />
                      <span className="explainer-sr">{markLabels[cell.kind]}</span>
                      {cell.note ? <small>{cell.note}</small> : null}
                    </>
                  )}
                </span>
              );
            })}
          </motion.div>
        ))}
      </motion.div>

      <motion.p className="explainer-compare-footnote" {...reveal(0.1)}>
        No scripts to write, no seats to staff — your agent is built from a short business brief and
        tested against real scenarios before it takes a single live call.
      </motion.p>
    </section>
  );
}

const capabilityCards = [
  {
    title: "Low Latency",
    metric: "~400ms",
    metricLabel: "median response",
    description: "Replies land in under a second — nothing stalls.",
    accent: "#2563eb",
    iconKind: "bolt",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13L13 2Z" />
      </svg>
    )
  },
  {
    title: "Ultra-Realistic Voice",
    metric: "20+",
    metricLabel: "studio-grade voices",
    description: "Callers hear a voice, not a machine.",
    accent: "#0f766e",
    iconKind: "voice",
    icon: (
      <span className="capability-eq" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
    )
  },
  {
    title: "Turn Taking",
    metric: "0",
    metricLabel: "talk-over moments",
    description: "Speaks, listens, and takes interruptions in stride.",
    accent: "#7c3aed",
    iconKind: "turns",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <g className="capability-arrow-top">
          <path d="M7 4 3 8l4 4M3 8h13" />
        </g>
        <g className="capability-arrow-bottom">
          <path d="M17 20l4-4-4-4M21 16H8" />
        </g>
      </svg>
    )
  },
  {
    title: "Human Handoff",
    metric: "1 tap",
    metricLabel: "clean escalation",
    description: "Context moves with the call — nobody repeats themselves.",
    accent: "#13866f",
    iconKind: "handoff",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a7 7 0 0 1 7-7h1" />
        <path className="capability-check" d="M15 16l3 3 5-5" />
      </svg>
    )
  }
];

function CapabilityCard({
  card,
  index,
  progress,
  shouldReduceMotion
}: {
  card: (typeof capabilityCards)[number];
  index: number;
  progress: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}) {
  // Each card owns a staggered slice of the section's scroll progress so the
  // staircase levels out card-by-card instead of all at once.
  const start = index * 0.14;
  const end = Math.min(start + 0.5, 1);
  const y = useTransform(progress, [start, end], [190 + index * 70, 0]);
  const opacity = useTransform(progress, [start, start + 0.24], [0, 1]);
  const scale = useTransform(progress, [start, end], [0.92, 1]);
  const badgeRotate = useTransform(progress, [start, end], [-90, 0]);
  const metricOpacity = useTransform(progress, [end - 0.12, end], [0, 1]);
  const metricY = useTransform(progress, [end - 0.12, end], [18, 0]);

  const accentStyle = { "--card-accent": card.accent } as React.CSSProperties;

  return (
    <motion.article
      className="capability-card"
      data-icon={card.iconKind}
      style={shouldReduceMotion ? accentStyle : { ...accentStyle, y, opacity, scale }}
    >
      <span className="capability-card-sheen" aria-hidden="true" />
      <div className="capability-card-top">
        <h3>{card.title}</h3>
        <motion.span
          className="capability-card-icon"
          style={shouldReduceMotion ? undefined : { rotate: badgeRotate }}
          aria-hidden="true"
        >
          {card.icon}
        </motion.span>
      </div>
      <motion.div
        className="capability-card-metric"
        style={shouldReduceMotion ? undefined : { opacity: metricOpacity, y: metricY }}
      >
        <strong>{card.metric}</strong>
        <span>{card.metricLabel}</span>
      </motion.div>
      <p>{card.description}</p>
    </motion.article>
  );
}

function CapabilityCardsSection() {
  const shouldReduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start 0.95", "start 0.3"]
  });

  return (
    <section className="capability-cards-section" id="capabilities">
      <header className="capability-cards-header">
        <h2>Built for real conversation.</h2>
      </header>
      <div className="capability-cards-grid" ref={gridRef}>
        {capabilityCards.map((card, index) => (
          <CapabilityCard
            card={card}
            index={index}
            progress={scrollYProgress}
            shouldReduceMotion={shouldReduceMotion}
            key={card.title}
          />
        ))}
      </div>
    </section>
  );
}

const securityCards = [
  {
    key: "sso",
    accent: "#2563eb",
    title: "SSO",
    description: "Seamless single sign-on with enterprise identity providers for secure, centralized access control.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="14" r="5" />
        <path d="M11.5 10.5 21 3M16 5l3 3M13 8l2 2" />
      </svg>
    )
  },
  {
    key: "redaction",
    accent: "#7c3aed",
    title: "Personal Info Redaction",
    description: "User-defined controls to selectively redact sensitive personal data in calls and transcripts.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.6 3.6 10 7-.5 1.2-1.3 2.5-2.4 3.6M6.3 6.3C4.3 7.7 2.9 9.6 2 12c1.4 3.4 5 7 10 7 1.6 0 3.1-.4 4.4-1" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </svg>
    )
  },
  {
    key: "encryption",
    accent: "#0f766e",
    title: "End-to-End Encryption",
    description: "AES-256 at rest and TLS 1.3 in transit — every call, transcript, and recording is encrypted by default.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="9" rx="2.2" />
        <path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 15v2" />
      </svg>
    )
  },
  {
    key: "audit",
    accent: "#b45309",
    title: "Access & Audit Logs",
    description: "Granular role-based permissions with an immutable audit trail of every action in your workspace.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 4h9a1.5 1.5 0 0 1 1.5 1.5V20a0 0 0 0 1 0 0H9" />
        <path d="M9 4H6A1.5 1.5 0 0 0 4.5 5.5V20H9M9 4v16" />
        <path d="M12.5 9h4M12.5 13h4M12.5 17h2.5" />
      </svg>
    )
  }
];

const ssoProviders = [
  {
    name: "Okta",
    logo: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="#007DC1"
          d="M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm0 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
        />
      </svg>
    )
  },
  {
    name: "Entra ID",
    logo: (
      <svg viewBox="0 0 23 23" aria-hidden="true">
        <rect x="1" y="1" width="10" height="10" fill="#f25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
        <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
        <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
      </svg>
    )
  },
  {
    name: "Google",
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
      </svg>
    )
  },
  {
    name: "SAML",
    logo: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8.5" cy="13.5" r="4.5" />
        <path d="M12 10.5 20 3M16.5 4.5l3 3M14 7l2 2" />
      </svg>
    )
  }
];

const redactionLines = [
  { label: "Caller", before: "my number is", secret: "07700 900123" },
  { label: "Caller", before: "card ending", secret: "4412 · exp 09/27" },
  { label: "Clara", before: "sent to", secret: "s•••@gmail.com" }
];

const auditEvents = [
  { time: "09:41", text: "Transcript exported", tag: "Admin" },
  { time: "09:38", text: "Redaction rule updated", tag: "Owner" },
  { time: "09:31", text: "Agent published to production", tag: "Ops" },
  { time: "09:24", text: "Viewer invited via SSO", tag: "Admin" },
  { time: "09:17", text: "Retention policy applied", tag: "System" },
  { time: "09:05", text: "Call recording accessed", tag: "Support" }
];

function SecuritySection() {
  const shouldReduceMotion = useReducedMotion();
  const revealProps = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 34, filter: "blur(12px)" },
          whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
          viewport: { once: true, amount: 0.25 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }
        };

  return (
    <section className="security-section" id="security">
      <motion.header className="security-header" {...revealProps(0)}>
        <h2>Compliance &amp; Security</h2>
        <p>
          Fully compliant with HIPAA, SOC 2 Type II, and GDPR. Your voice agents meet the highest
          global standards for data privacy and security.
        </p>
      </motion.header>
      <div className="security-grid">
        <motion.article className="security-card is-feature" {...revealProps(0.08)}>
          <div className="security-feature-copy">
            <h3>Certified to the highest global standards</h3>
            <p>
              Independent audits, continuous monitoring, and privacy-by-design across every
              conversation your agents handle.
            </p>
            <ul className="security-badges">
              {["HIPAA", "SOC 2 Type II", "GDPR"].map((badge) => (
                <li className="security-badge" key={badge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2.5 20 6v5.5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3.5Z" />
                    <path d="m8.8 12.2 2.2 2.2 4.2-4.6" />
                  </svg>
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="security-shield" aria-hidden="true">
            <span className="security-ring" />
            <span className="security-ring" />
            <span className="security-ring" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.5 20 6v5.5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3.5Z" />
              <path d="m8.8 12.2 2.2 2.2 4.2-4.6" />
            </svg>
          </div>
        </motion.article>
        {securityCards.map((card, index) => (
          <motion.article
            className={`security-card is-${card.key}`}
            style={{ "--card-accent": card.accent } as React.CSSProperties}
            {...revealProps(0.14 + index * 0.07)}
            key={card.key}
          >
            <span className="security-card-icon" aria-hidden="true">{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.key === "redaction" ? (
              <div className="redaction-demo" aria-hidden="true">
                {redactionLines.map((line) => (
                  <p key={line.secret}>
                    <b>{line.label}</b> {line.before} <span className="redact">{line.secret}</span>
                  </p>
                ))}
              </div>
            ) : null}
            {card.key === "sso" ? (
              <div className="sso-demo" aria-hidden="true">
                {ssoProviders.map((provider) => (
                  <span className="sso-tile" key={provider.name}>
                    {provider.logo}
                    {provider.name}
                  </span>
                ))}
              </div>
            ) : null}
            {card.key === "encryption" ? (
              <div className="cipher-demo" aria-hidden="true">
                <span className="cipher-plain">&ldquo;Thanks for calling…&rdquo;</span>
                <span className="cipher-code">9f 4a c2 e8 71 0b d3 56</span>
              </div>
            ) : null}
            {card.key === "audit" ? (
              <div className="audit-demo" aria-hidden="true">
                <ul>
                  {[...auditEvents, ...auditEvents].map((event, eventIndex) => (
                    <li key={`${event.time}-${eventIndex}`}>
                      <span>{event.time}</span>
                      {event.text}
                      <em>{event.tag}</em>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

const footerColumns = [
  {
    title: "About",
    links: [
      { label: "Platform", href: "#platform", view: "platform" as AppView },
      { label: "Customer stories", href: "#testimonials", view: "reviews" as AppView },
      { label: "Launch workflow", href: "#handoff", view: "launch" as AppView },
      { label: "FAQs", href: "#faqs", view: "home" as AppView }
    ]
  },
  {
    title: "Downloads",
    links: [
      { label: "Launch checklist", href: "#demo", view: "launch" as AppView },
      { label: "Readiness report", href: "#handoff", view: "launch" as AppView },
      { label: "Demo workspace", href: "#demo", view: "demo" as AppView },
      { label: "Integration guide", href: "#platform", view: "integrations" as AppView }
    ]
  },
  {
    title: "Sales",
    links: [
      { label: "Book a demo", href: "?view=contact-sales", view: "contact-sales" as AppView },
      { label: "Contact sales", href: "?view=contact-sales", view: "contact-sales" as AppView },
      { label: "Plans and pricing", href: "#demo", view: "pricing" as AppView },
      { label: "Pilot program", href: "#demo", view: "demo" as AppView }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "#faqs", view: "home" as AppView },
      { label: "Status", href: "#home", view: "home" as AppView },
      { label: "Guidelines", href: "#faqs", view: "home" as AppView },
      { label: "Accessibility", href: "#home", view: "home" as AppView }
    ]
  }
];

const footerLegalLinks = [
  { label: "Terms", href: "#home" },
  { label: "Privacy", href: "/privacy" },
  { label: "Security", href: "#security" },
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
  obsidian: "obsidian.md",
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
  obsidian: simpleIcon("obsidian"),
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
  { key: "knowledge", name: "Knowledge", providerId: "obsidian", provider: "Obsidian", logoUrl: providerLogoFallbacks.obsidian, connected: false },
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
    knowledge: "Obsidian",
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

const businessTypeOptions = [
  "Support team",
  "Bookstore",
  "Independent bookshop",
  "Clothing boutique",
  "Online retail store",
  "Dental clinic",
  "GP practice",
  "Physiotherapy clinic",
  "Financial adviser",
  "Insurance broker",
  "Mortgage broker",
  "Software company",
  "SaaS support team",
  "IT help desk",
  "Estate agency",
  "Lettings agency",
  "Property management",
  "Restaurant group",
  "Hotel reservations",
  "Event venue"
];
const priorityBusinessTypeOptions = ["Support team", "Dental clinic", "Estate agency", "SaaS support team", "Restaurant group", "Hotel reservations"];
const useCaseOptions = fallbackPlaybook.missions;
const channelOptions = ["Zoom Contact Center production voice queue", "Zoom Phone support line", "Genesys Cloud voice queue"];
const elevenLabsVoices: VoicePreset[] = [
  {
    id: "george",
    name: "George",
    role: "Front desk",
    tone: "Clear, grounded",
    description: "A steady first-contact voice for general customer questions, account checks, and warm handoffs.",
    bestFor: "General support",
    avatarUrl: voiceGeorgeUrl,
    sampleAudioUrl: "/voice-samples/george.mp3",
    confirmationAudioUrl: "/voice-confirmations/george.mp3",
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    sample: "Thanks for calling. I can help with booking, account questions, or getting you to the right person."
  },
  {
    id: "antoni",
    name: "Antoni",
    role: "Support lead",
    tone: "Calm, precise",
    description: "A measured technical voice that sounds confident when asking follow-up questions and confirming details.",
    bestFor: "Technical support",
    avatarUrl: voiceAntoniUrl,
    sampleAudioUrl: "/voice-samples/antoni.mp3",
    confirmationAudioUrl: "/voice-confirmations/antoni.mp3",
    voiceId: "cjVigY5qzO86Huf0OWal",
    sample: "I can look that up for you now. Before I continue, can I confirm the name on the account?"
  },
  {
    id: "adam",
    name: "Adam",
    role: "Operations",
    tone: "Steady, direct",
    description: "A direct operations voice for routing incidents, summarising next steps, and keeping calls moving.",
    bestFor: "Operations calls",
    avatarUrl: voiceAdamUrl,
    sampleAudioUrl: "/voice-samples/adam.mp3?v=natural-20260709",
    confirmationAudioUrl: "/voice-confirmations/adam.mp3",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    sample: "Hi, this is Adam. I have the details in front of me. I'll keep this simple, confirm the next step, and get the right person involved if we need them."
  },
  {
    id: "bella",
    name: "Bella",
    role: "Concierge",
    tone: "Bright, friendly",
    description: "A welcoming voice for bookings, availability, reception-style questions, and high-touch customer moments.",
    bestFor: "Bookings",
    avatarUrl: voiceBellaUrl,
    sampleAudioUrl: "/voice-samples/bella.mp3",
    confirmationAudioUrl: "/voice-confirmations/bella.mp3",
    voiceId: "hpp4J3VqNfWAUOO0d1Us",
    sample: "Absolutely. I can check availability, answer common questions, and make sure the handoff is clear."
  },
  {
    id: "maya",
    name: "Maya",
    role: "Care coordinator",
    tone: "Warm, reassuring",
    description: "A softer voice for sensitive conversations where callers need patience, clarity, and reassurance.",
    bestFor: "Sensitive calls",
    avatarUrl: voiceMayaUrl,
    sampleAudioUrl: "/voice-samples/maya.mp3",
    confirmationAudioUrl: "/voice-confirmations/maya.mp3",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    sample: "I can help with that. I will ask a couple of quick questions first so I route this safely."
  },
  {
    id: "rowan",
    name: "Rowan",
    role: "Scheduler",
    tone: "Friendly, efficient",
    description: "A clear scheduling voice for callbacks, appointment changes, reminders, and quick qualification.",
    bestFor: "Scheduling",
    avatarUrl: voiceRowanUrl,
    sampleAudioUrl: "/voice-samples/rowan.mp3",
    confirmationAudioUrl: "/voice-confirmations/rowan.mp3",
    voiceId: "SAz9YHcvj6GT2YYXdXww",
    sample: "I can get that arranged. Let me confirm the best time, contact number, and reason for the callback."
  }
];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const devApiBaseUrl = apiBaseUrl || "http://127.0.0.1:8787";
const devApiFallbackBaseUrls = import.meta.env.DEV ? [
  "http://127.0.0.1:8787",
  "http://127.0.0.1:8788",
  "http://127.0.0.1:8789"
] : [];
const apiBaseCandidates = Array.from(new Set([
  import.meta.env.DEV ? devApiBaseUrl : "",
  ...devApiFallbackBaseUrls,
  import.meta.env.DEV ? "" : apiBaseUrl,
  apiBaseUrl
])).filter((candidate) => candidate !== null && candidate !== undefined);
const apiBaseStorageKey = "relayclarity.apiBaseUrl";
let activeApiBaseUrl = "";

function apiPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function getOrderedApiBaseCandidates() {
  return Array.from(new Set([
    activeApiBaseUrl,
    ...apiBaseCandidates,
    getStoredApiBaseUrl()
  ])).filter((candidate) => apiBaseCandidates.includes(candidate));
}

function getStoredApiBaseUrl() {
  try {
    return window.localStorage.getItem(apiBaseStorageKey) || "";
  } catch (_error) {
    return "";
  }
}

function rememberApiBaseUrl(baseUrl: string) {
  activeApiBaseUrl = baseUrl;

  try {
    window.localStorage.setItem(apiBaseStorageKey, baseUrl);
  } catch (_error) {
    // Remembering the backend is only a dev convenience; auth still works without localStorage.
  }
}

async function fetchJsonFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const errors: string[] = [];
  const requestHeaders = new Headers(init?.headers);
  const method = (init?.method || "GET").toUpperCase();
  const canRetryAcrossApiBases = method === "GET" || method === "HEAD";

  if (init?.body && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  const orderedCandidates = getOrderedApiBaseCandidates();

  for (const baseUrl of orderedCandidates) {
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

      if (!isCompatibleApiPayload(path, payload)) {
        throw new Error("API response came from an incompatible RelayClarity backend.");
      }

      if (shouldRememberApiBaseUrl(path, payload)) {
        rememberApiBaseUrl(baseUrl);
      }
      return payload as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      errors.push(message === "Failed to fetch"
        ? "Backend API is unavailable. Start the full dev stack with npm run dev, then try signing in again."
        : message
      );

      if (!canRetryAcrossApiBases) {
        break;
      }
    }
  }

  throw new Error(errors[errors.length - 1] || "Backend API is unavailable. Start the full dev stack with npm run dev, then try signing in again.");
}

function isCompatibleApiPayload(path: string, payload: unknown) {
  if (!path.startsWith("/api/auth/")) {
    return true;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (path === "/api/auth/password-reset/request") {
    const resetPayload = payload as Partial<PasswordResetRequestPayload>;
    return resetPayload.ok === true
      && typeof resetPayload.message === "string"
      && (resetPayload.emailDelivery === "sent" || resetPayload.emailDelivery === "not_configured")
      && (resetPayload.resetUrl === undefined || typeof resetPayload.resetUrl === "string");
  }

  if (path === "/api/auth/logout") {
    return (payload as { ok?: unknown }).ok === true;
  }

  const authPayload = payload as Partial<AuthPayload>;

  if (typeof authPayload.googleAuthAvailable !== "boolean") {
    return false;
  }

  if (authPayload.user === null) {
    return true;
  }

  return isCompatibleAuthUser(authPayload.user);
}

function shouldRememberApiBaseUrl(path: string, payload: unknown) {
  if (path === "/api/auth/me") {
    return Boolean(payload && typeof payload === "object" && (payload as Partial<AuthPayload>).user);
  }

  return true;
}

function isCompatibleAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== "object") {
    return false;
  }

  const candidate = user as Partial<AuthUser>;

  return typeof candidate.id === "string"
    && typeof candidate.email === "string"
    && typeof candidate.name === "string"
    && typeof candidate.avatarUrl === "string"
    && typeof candidate.provider === "string"
    && typeof candidate.onboarded === "boolean"
    && typeof candidate.accountType === "string";
}

// Seeded from NAICS-style categories plus common UK service terms. Specific
// phrase matches are scored higher than generic terms like "shop" or "agency".
const businessTaxonomy: BusinessTaxonomyEntry[] = [
  { code: "459210", title: "Book Retailers and News Dealers", playbookId: "bookstore", terms: ["book", "books", "bookstore", "book store", "bookshop", "book shop", "independent bookshop", "bookseller", "booksellers", "book retailer", "comic book shop", "children's bookshop", "academic bookshop", "newsagent", "news agent", "news dealer", "stationery and books", "magazine shop"] },
  { code: "458110", title: "Clothing and Clothing Accessories Retailers", playbookId: "retail", terms: ["clothing", "clothes", "apparel", "fashion", "retail clothing", "clothing store", "clothes shop", "apparel store", "fashion store", "boutique", "dress shop", "menswear", "womenswear", "children's clothing", "shoe store", "footwear", "jewellery", "jewelry", "watch shop", "accessories store", "sportswear shop", "bridal shop", "tailor", "alterations shop"] },
  { code: "455", title: "Nonstore and Ecommerce Retailers", playbookId: "retail", terms: ["ecommerce", "e-commerce", "online store", "online shop", "web shop", "shopify store", "marketplace seller", "mail order", "subscription box", "direct to consumer", "d2c brand"] },
  { code: "456120", title: "Cosmetics, Beauty Supplies, and Perfume Retailers", playbookId: "retail", terms: ["cosmetics store", "beauty supply", "perfume shop", "makeup store", "skincare shop", "salon products", "beauty retailer"] },
  { code: "449210", title: "Electronics and Appliance Retailers", playbookId: "retail", terms: ["electronics store", "appliance store", "phone shop", "mobile phone shop", "computer store", "camera shop", "audio visual shop", "repair and retail"] },
  { code: "459310", title: "Florists", playbookId: "retail", terms: ["florist", "flower shop", "plant shop", "garden centre", "garden center", "nursery retail"] },
  { code: "445110", title: "Supermarkets and Food Retailers", playbookId: "retail", terms: ["grocery store", "supermarket", "food shop", "convenience store", "corner shop", "delicatessen", "deli", "butcher", "fishmonger", "bakery shop", "farm shop", "off licence", "liquor store"] },
  { code: "459920", title: "Art, Gift, and Specialty Retailers", playbookId: "retail", terms: ["art dealer", "gallery shop", "art store", "gift shop", "homeware shop", "furniture shop", "pet store", "toy shop", "hobby shop", "craft shop", "charity shop"] },
  { code: "621111", title: "Offices of Physicians", playbookId: "healthcare", terms: ["gp practice", "doctor surgery", "medical practice", "primary care", "family doctor", "walk-in clinic", "urgent care", "private clinic", "health clinic"] },
  { code: "621210", title: "Offices of Dentists", playbookId: "healthcare", terms: ["dental clinic", "dentist", "orthodontist", "dental practice", "cosmetic dentistry", "hygienist"] },
  { code: "6213", title: "Other Health Practitioners", playbookId: "healthcare", terms: ["physio", "physiotherapy", "physical therapy", "chiropractor", "osteopath", "podiatrist", "optician", "optometrist", "audiology", "hearing clinic", "therapy clinic", "counselling practice", "counseling practice"] },
  { code: "6214", title: "Outpatient and Diagnostic Care", playbookId: "healthcare", terms: ["diagnostic clinic", "imaging centre", "imaging center", "blood test clinic", "screening clinic", "fertility clinic", "mental health clinic", "med spa", "aesthetic clinic", "skin clinic", "veterinary clinic", "vet practice"] },
  { code: "522", title: "Credit Intermediation", playbookId: "financial", terms: ["bank", "credit union", "lender", "loan provider", "consumer credit", "finance company", "leasing company", "card provider", "payment provider"] },
  { code: "523", title: "Securities and Investment", playbookId: "financial", terms: ["financial adviser", "financial advisor", "wealth manager", "investment adviser", "investment advisor", "ifa", "pension adviser", "retirement planning", "asset management", "brokerage", "stock broker"] },
  { code: "524", title: "Insurance Carriers and Brokers", playbookId: "financial", terms: ["insurance broker", "insurance agency", "claims handler", "claims management", "life insurance", "home insurance", "motor insurance", "commercial insurance", "underwriter"] },
  { code: "525", title: "Mortgage and Financial Administration", playbookId: "financial", terms: ["mortgage broker", "mortgage adviser", "accountant", "accountancy firm", "bookkeeping", "payroll bureau", "tax adviser", "tax advisor", "debt advice", "financial services"] },
  { code: "531110", title: "Property Lessors and Managers", playbookId: "estate", terms: ["property management", "lettings agency", "letting agent", "landlord services", "tenant support", "block management", "strata management", "facilities management", "maintenance reporting"] },
  { code: "531210", title: "Real Estate Agents and Brokers", playbookId: "estate", terms: ["estate agency", "estate agent", "real estate agency", "real estate agent", "realtor", "property agent", "property sales", "buyer enquiries", "valuation requests", "home valuation"] },
  { code: "5313", title: "Real Estate Support Services", playbookId: "estate", terms: ["surveyors", "chartered surveyor", "property auction", "auction house", "conveyancing enquiries", "serviced apartments", "holiday lets", "short term rentals"] },
  { code: "511210", title: "Software Publishers", playbookId: "saas", terms: ["saas", "software company", "software platform", "software product", "mobile app", "web app", "subscription software", "b2b software", "cloud platform", "developer tool", "api platform"] },
  { code: "518210", title: "Data Processing and Hosting", playbookId: "saas", terms: ["managed hosting", "cloud services", "data platform", "analytics platform", "cybersecurity platform", "identity platform", "payment software", "crm platform", "helpdesk software"] },
  { code: "5415", title: "Computer Systems Design and IT Services", playbookId: "saas", terms: ["it support", "it help desk", "managed service provider", "msp", "technology consultancy", "systems integrator", "digital agency support", "support team", "support teams", "customer support team", "technical support team", "support desk"] },
  { code: "722511", title: "Restaurants and Cafes", playbookId: "hospitality", terms: ["restaurant", "restaurant group", "cafe", "coffee shop", "tea room", "takeaway", "food delivery", "pizzeria", "pub kitchen", "bistro", "fine dining", "casual dining"] },
  { code: "721", title: "Accommodation", playbookId: "hospitality", terms: ["hotel", "guest house", "bed and breakfast", "b&b", "hostel", "serviced accommodation", "hotel reservations", "front desk", "concierge", "room booking"] },
  { code: "7224", title: "Drinking Places", playbookId: "hospitality", terms: ["bar", "pub", "cocktail bar", "nightclub", "brewery taproom", "wine bar"] },
  { code: "7113", title: "Events and Venues", playbookId: "hospitality", terms: ["event venue", "wedding venue", "conference venue", "catering company", "events company", "ticketed events", "visitor attraction", "tour operator", "travel agency", "reservation desk"] }
];

function getBusinessPlaybook(businessType: string): BusinessPlaybook {
  return getBusinessMatch(businessType).playbook;
}

function getBusinessMatch(businessType: string): BusinessMatch {
  const normalized = normalizeBusinessInput(businessType);
  const fallbackMatch = { playbook: fallbackPlaybook, matchedTerms: [], confidence: normalized ? 36 : 0 };

  if (!normalized) {
    return fallbackMatch;
  }

  const bestMatch = businessTaxonomy.reduce<{
    entry: BusinessTaxonomyEntry;
    score: number;
    matchedTerms: string[];
  } | null>((best, entry) => {
    const matchedTerms = entry.terms.filter((term) => includesBusinessTerm(normalized, term));
    const score = matchedTerms.reduce((total, term) => total + scoreBusinessTerm(normalized, term), 0);

    if (!matchedTerms.length || score <= 0) {
      return best;
    }

    if (!best || score > best.score) {
      return { entry, score, matchedTerms };
    }

    return best;
  }, null);

  if (!bestMatch) {
    return fallbackMatch;
  }

  const playbook = businessPlaybooks.find((item) => item.id === bestMatch.entry.playbookId) || fallbackPlaybook;

  return {
    playbook,
    entry: bestMatch.entry,
    matchedTerms: bestMatch.matchedTerms.slice(0, 3),
    confidence: confidenceFromScore(bestMatch.score)
  };
}

function getBusinessSuggestions(query: string, limit = 8): BusinessSuggestion[] {
  const normalized = normalizeBusinessInput(query);

  if (!normalized) {
    return [];
  }

  const optionSuggestions = businessTypeOptions
    .reduce<BusinessSuggestion[]>((items, option) => {
      const score = scoreBusinessSuggestionLabel(normalized, option);

      if (score <= 0) {
        return items;
      }

      const match = getBusinessMatch(option);

      items.push({
        ...match,
        label: option,
        score
      });

      return items;
    }, []);

  if (normalized.length === 1) {
    return optionSuggestions
      .sort((first, second) => second.score - first.score || second.confidence - first.confidence || first.label.localeCompare(second.label))
      .slice(0, limit);
  }

  const taxonomySuggestions = businessTaxonomy
    .reduce<BusinessSuggestion[]>((items, entry) => {
      const matchedTerms = entry.terms
        .filter((term) => includesBusinessTerm(normalized, term))
        .sort((first, second) => scoreBusinessTerm(normalized, second) - scoreBusinessTerm(normalized, first));
      const titleMatch = normalizeBusinessInput(entry.title)
        .split(" ")
        .filter((word) => word.length > 3)
        .some((word) => word.startsWith(normalized) || normalized.includes(word));
      const score = matchedTerms.reduce((total, term) => total + scoreBusinessTerm(normalized, term), 0) + (titleMatch ? 18 : 0);

      if (score <= 0) {
        return items;
      }

      const playbook = businessPlaybooks.find((item) => item.id === entry.playbookId) || fallbackPlaybook;

      items.push({
        playbook,
        entry,
        label: formatBusinessSuggestionLabel(matchedTerms[0] || entry.title),
        matchedTerms: matchedTerms.slice(0, 3),
        confidence: confidenceFromScore(score),
        score
      });

      return items;
    }, []);
  const suggestions = [...optionSuggestions, ...taxonomySuggestions]
    .reduce<BusinessSuggestion[]>((items, suggestion) => {
      const duplicateIndex = items.findIndex((item) => normalizeBusinessInput(item.label) === normalizeBusinessInput(suggestion.label));

      if (duplicateIndex === -1) {
        items.push(suggestion);
        return items;
      }

      if (suggestion.score > items[duplicateIndex].score) {
        items[duplicateIndex] = suggestion;
      }

      return items;
    }, [])
    .sort((first, second) => second.score - first.score || second.confidence - first.confidence || first.label.localeCompare(second.label))
    .slice(0, limit);

  if (suggestions.length > 0) {
    return suggestions;
  }

  return priorityBusinessTypeOptions.slice(0, limit).map((option) => {
    const match = getBusinessMatch(option);

    return {
      ...match,
      label: option,
      score: match.confidence
    };
  });
}

function scoreBusinessSuggestionLabel(normalizedQuery: string, label: string): number {
  const normalizedLabel = normalizeBusinessInput(label);
  const labelWords = normalizedLabel.split(" ").filter(Boolean);
  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  const priorityIndex = priorityBusinessTypeOptions.indexOf(label);
  const priorityBonus = priorityIndex === -1 ? 0 : 20 - priorityIndex * 2;

  if (normalizedLabel === normalizedQuery) {
    return 180 + priorityBonus;
  }

  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 150 + priorityBonus - Math.min(20, normalizedLabel.length - normalizedQuery.length);
  }

  if (queryWords.every((queryWord) => labelWords.some((labelWord) => labelWord.startsWith(queryWord)))) {
    return 130 + priorityBonus - Math.min(18, normalizedLabel.length - normalizedQuery.length);
  }

  if (labelWords.some((labelWord) => labelWord.startsWith(normalizedQuery))) {
    return 112 + priorityBonus;
  }

  if (normalizedLabel.includes(normalizedQuery)) {
    return 72 + priorityBonus;
  }

  return 0;
}

function formatBusinessSuggestionLabel(value: string): string {
  const preservedWords: Record<string, string> = {
    api: "API",
    b2b: "B2B",
    "b&b": "B&B",
    crm: "CRM",
    d2c: "D2C",
    gp: "GP",
    ifa: "IFA",
    it: "IT",
    msp: "MSP",
    saas: "SaaS"
  };

  return value
    .split(" ")
    .map((word) => {
      const normalized = word.toLowerCase();
      return preservedWords[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

function normalizeBusinessInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+.\s-]/g, " ")
    .replace(/([a-z])\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

function includesBusinessTerm(normalizedInput: string, term: string): boolean {
  const normalizedTerm = normalizeBusinessInput(term);
  const inputWords = normalizedInput.split(" ").filter(Boolean);
  const termWords = normalizedTerm.split(" ").filter(Boolean);
  const exactPhraseMatch = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}($|\\s)`, "i").test(normalizedInput);

  if (exactPhraseMatch) {
    return true;
  }

  if (normalizedTerm.startsWith(normalizedInput) || inputWords.every((inputWord) => termWords.some((termWord) => termWord.startsWith(inputWord)))) {
    return true;
  }

  if (termWords.length < 2) {
    return inputWords.some((inputWord) => normalizedTerm.startsWith(inputWord) || inputWord.startsWith(normalizedTerm));
  }

  return termWords.every((termWord) =>
    inputWords.some((inputWord) => inputWord === termWord || inputWord.startsWith(termWord) || termWord.startsWith(inputWord))
  );
}

function scoreBusinessTerm(normalizedInput: string, term: string): number {
  const normalizedTerm = normalizeBusinessInput(term);
  const wordCount = normalizedTerm.split(" ").filter(Boolean).length;
  const specificity = Math.min(20, normalizedTerm.length);
  const exactBonus = normalizedInput === normalizedTerm ? 36 : 0;
  return 10 + wordCount * 12 + specificity + exactBonus;
}

function confidenceFromScore(score: number): number {
  if (score >= 86) {
    return 96;
  }

  if (score >= 64) {
    return 90;
  }

  if (score >= 42) {
    return 82;
  }

  if (score >= 24) {
    return 68;
  }

  return 52;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tailorConnectors(playbook: BusinessPlaybook, current: Connector[] = initialConnectors): Connector[] {
  return current.map((connector) => {
    const provider = playbook.connectorProviders[connector.key] || connector.provider;
    const startsConnected = connector.key === "crm";

    return {
      ...connector,
      ...providerMetadata(provider, connector.key),
      provider,
      connected: connector.connected || startsConnected,
      connectionMode: connector.connectionMode || (startsConnected ? "demo" : undefined),
      connectionMessage: connector.connectionMessage || (startsConnected ? provider + " connected." : undefined),
      testStatus: connector.testStatus || (startsConnected ? "Connected" : undefined)
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
  if (normalized.includes("obsidian")) return "obsidian";
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

type MarketingPageView = "platform" | "integrations" | "pricing" | "roi" | "demo" | "launch" | "reviews";
type AppView = "home" | MarketingPageView | "auth" | "setup" | "dashboard" | "contact-sales" | "checkout" | "checkout-success" | "privacy";

const marketingPageViews: MarketingPageView[] = ["platform", "integrations", "pricing", "roi", "demo", "launch", "reviews"];

const marketingNavItems: Array<{ view: AppView; label: string; section?: string }> = [
  { view: "platform", label: "Platform", section: "#platform" },
  { view: "demo", label: "Demo", section: "#demo" },
  { view: "reviews", label: "Reviews", section: "#testimonials" }
];

const productsMenuItems: Array<{ view: MarketingPageView; label: string }> = [
  { view: "integrations", label: "Integrations" },
  { view: "pricing", label: "Pricing" },
  { view: "roi", label: "ROI Calculator" }
];

const marketingPathByView: Record<MarketingPageView, string> = {
  platform: "/platform",
  integrations: "/integrations",
  pricing: "/pricing",
  roi: "/roi-calculator",
  demo: "/demo",
  launch: "/launch",
  reviews: "/reviews"
};

const marketingViewByPath: Record<string, MarketingPageView> = Object.fromEntries(
  Object.entries(marketingPathByView).map(([viewName, path]) => [path, viewName])
) as Record<string, MarketingPageView>;

const marketingPageTitles: Record<MarketingPageView, string> = {
  platform: "Platform",
  integrations: "Integrations",
  pricing: "Pricing",
  roi: "ROI Calculator",
  demo: "Demo",
  launch: "Launch",
  reviews: "Reviews"
};

type PricingPlan = {
  id: "launch" | "operate" | "scale";
  name: string;
  monthly: number | null;
  annual: number | null;
  summary: string;
  badge: string;
  cta: string;
  featured: boolean;
  features: string[];
};

const pricingPlans: PricingPlan[] = [
  {
    id: "launch",
    name: "Launch",
    monthly: 499,
    annual: 399,
    summary: "For teams launching their first AI phone or chat agent.",
    badge: "Start here",
    cta: "Buy Launch",
    featured: false,
    features: [
      "One AI agent for voice or chat",
      "Business brief and approved answers",
      "Launch test pack",
      "Human handoff summaries",
      "Basic conversation reporting"
    ]
  },
  {
    id: "operate",
    name: "Operate",
    monthly: 1250,
    annual: 999,
    summary: "For teams running live customer conversations every day.",
    badge: "Most popular",
    cta: "Buy Operate",
    featured: true,
    features: [
      "Voice and chat agents",
      "CRM, helpdesk, and knowledge integrations",
      "Scenario testing before changes go live",
      "Live handoff and containment analytics",
      "Weekly optimisation review"
    ]
  },
  {
    id: "scale",
    name: "Scale",
    monthly: null,
    annual: null,
    summary: "For enterprise teams running regulated, multi-brand, or high-volume customer operations.",
    badge: "Enterprise",
    cta: "Talk to sales",
    featured: false,
    features: [
      "Multi-agent rollout across brands, teams, and departments",
      "Advanced guardrails, approvals, and audit trails",
      "SSO and role-based access",
      "Custom launch gates for security and operations",
      "Priority implementation and success support"
    ]
  }
];

const marketingIntegrationCatalog = [
  {
    category: "Calendars",
    companies: [
      { name: "Calendly", description: "Book meetings and route callers to the right availability." },
      { name: "Google Calendar", description: "Sync availability, bookings, and follow-up tasks." },
      { name: "Microsoft Outlook", description: "Coordinate appointments across Microsoft calendars." }
    ]
  },
  {
    category: "CCaaS",
    companies: [
      { name: "8x8", description: "Contact center and unified communications platform." },
      { name: "Five9", description: "Cloud contact center solution with digital engagement." },
      { name: "RingCentral", description: "Omnichannel contact center and phone workflows." },
      { name: "Genesys Cloud CX", description: "Cloud call center software and CX platform." },
      { name: "OpenPhone", description: "Collaborative phone system for service teams." },
      { name: "Dialpad", description: "AI-powered customer intelligence platform." },
      { name: "3CX", description: "Open standards communications and call routing." },
      { name: "JustCall", description: "Customer communication platform for sales and support." },
      { name: "CloudTalk", description: "Remote-ready call center software for support teams." }
    ]
  },
  {
    category: "CRM",
    companies: [
      { name: "Salesforce", description: "Sync leads, contacts, opportunities, and account context." },
      { name: "HubSpot", description: "Use CRM records, lifecycle stage, owners, and notes." },
      { name: "Pipedrive", description: "Update deals and sales activity after each conversation." },
      { name: "Zoho CRM", description: "Connect customer records and workflow actions." }
    ]
  },
  {
    category: "Vertical CRM",
    companies: [
      { name: "ServiceTitan", description: "Field service customer, booking, and dispatch context." },
      { name: "Jobber", description: "Home service scheduling and customer records." },
      { name: "Mindbody", description: "Wellness bookings, memberships, and client details." },
      { name: "Clio", description: "Legal client intake, matters, and follow-up tasks." },
      { name: "Dentally", description: "Dental practice patient and appointment context." }
    ]
  },
  {
    category: "Sales",
    companies: [
      { name: "Outreach", description: "Create sales follow-ups from qualified calls." },
      { name: "Salesloft", description: "Move prospects into cadences and task queues." },
      { name: "Apollo", description: "Enrich contacts and route prospect conversations." },
      { name: "Gong", description: "Send call evidence into revenue intelligence workflows." }
    ]
  },
  {
    category: "Telephony",
    companies: [
      { name: "Twilio", description: "Power programmable voice, SMS, and call events." },
      { name: "Aircall", description: "Connect business phone activity and call routing." },
      { name: "Zoom Phone", description: "Run voice workflows through Zoom Phone." },
      { name: "Amazon Connect", description: "Use AWS contact flows and customer profiles." }
    ]
  },
  {
    category: "Connectors",
    companies: [
      { name: "Zapier", description: "Trigger actions across thousands of business apps." },
      { name: "Make", description: "Build visual automations from call outcomes." },
      { name: "Workato", description: "Connect enterprise workflows and approval steps." },
      { name: "Tray.io", description: "Orchestrate custom integrations for operations teams." }
    ]
  },
  {
    category: "Developer Tools",
    companies: [
      { name: "GitHub", description: "Create issues and route engineering escalations." },
      { name: "Jira", description: "Open service tickets and product follow-up tasks." },
      { name: "Postman", description: "Validate APIs and internal workflow endpoints." },
      { name: "Sentry", description: "Send technical incidents to engineering triage." }
    ]
  },
  {
    category: "Customer Support",
    companies: [
      { name: "Zendesk", description: "Create tickets, add context, and update support status." },
      { name: "Intercom", description: "Use conversation history and route support handoffs." },
      { name: "Freshdesk", description: "Open tickets and attach customer call summaries." },
      { name: "Help Scout", description: "Send support notes to shared inbox workflows." }
    ]
  },
  {
    category: "AI",
    companies: [
      { name: "OpenAI", description: "Power agent reasoning, summaries, and evaluations." },
      { name: "Anthropic", description: "Run assistant workflows with policy guardrails." },
      { name: "ElevenLabs", description: "Generate natural voice for outbound calls." },
      { name: "Deepgram", description: "Transcribe speech and analyze voice conversations." }
    ]
  },
  {
    category: "Commerce & Payments",
    companies: [
      { name: "Shopify", description: "Look up orders, customers, and fulfilment status." },
      { name: "Stripe", description: "Find customers, payments, subscriptions, and invoices." },
      { name: "Square", description: "Connect commerce, appointment, and payment records." },
      { name: "WooCommerce", description: "Use store orders, customer profiles, and carts." },
      { name: "Klarna", description: "Support payment queries and post-purchase workflows." }
    ]
  },
  {
    category: "Productivity",
    companies: [
      { name: "Slack", description: "Post summaries, escalations, and team alerts." },
      { name: "Microsoft Teams", description: "Notify channels and route internal follow-ups." },
      { name: "Notion", description: "Search workspace knowledge and update pages." },
      { name: "Google Drive", description: "Use approved documents and shared knowledge." },
      { name: "Obsidian", description: "Search internal notes and operating procedures." },
      { name: "Microsoft 365", description: "Connect documents, email, and team workflows." }
    ]
  }
] as const;

const integrationsHeroLogoNames = Array.from(
  new Set(marketingIntegrationCatalog.flatMap((group) => group.companies.map((company) => company.name)))
);

type HeroLogoSphereStyle = CSSProperties &
  Record<
    "--logo-x" | "--logo-y" | "--logo-scale" | "--logo-opacity" | "--logo-depth" | "--logo-delay" | "--logo-blur",
    string | number
  >;

function heroLogoSphereStyle(index: number, total: number): HeroLogoSphereStyle {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / Math.max(total - 1, 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = index * goldenAngle;
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const frontness = (z + 1) / 2;

  return {
    "--logo-x": `${50 + x * 38}%`,
    "--logo-y": `${50 + y * 40}%`,
    "--logo-scale": (0.66 + frontness * 0.38).toFixed(3),
    "--logo-opacity": (0.68 + frontness * 0.32).toFixed(3),
    "--logo-depth": Math.round(10 + frontness * 120),
    "--logo-delay": `${-(index % 18) * 0.12}s`,
    "--logo-blur": z < -0.58 ? "0.25px" : "0px"
  };
}

function heroLogoParallaxOffset(index: number, total: number) {
  const columns = Math.ceil(Math.sqrt(total * 1.45));
  const rows = Math.ceil(total / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = (col - (columns - 1) / 2) * 34 + ((index % 3) - 1) * 8;
  const y = 56 + (row - (rows - 1) / 2) * 28 + ((index % 5) - 2) * 5;
  const rotate = ((index % 7) - 3) * 2.4;

  return { x, y, rotate };
}

const roiCurrency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const roiNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

function MarketingNav({
  activeView,
  onNavigate,
  onContactSales,
  onOpenDashboard
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onContactSales: () => void;
  onOpenDashboard: () => void;
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement | null>(null);
  const productsActive = productsMenuItems.some((item) => item.view === activeView);

  useEffect(() => {
    if (!productsOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!productsRef.current?.contains(event.target as Node)) {
        setProductsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProductsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [productsOpen]);

  return (
    <header className="marketing-nav">
      <a
        className="brand"
        href={appViewUrl("home")}
        onClick={(event) => {
          event.preventDefault();
          onNavigate("home");
        }}
        aria-label="RelayClarity home"
      >
        <img src={relayclarityLogoUrl} alt="RelayClarity" />
      </a>
      <nav className="marketing-links" aria-label="Primary navigation">
        {marketingNavItems.map((item) => (
          <a
            href={item.section ? `${appViewUrl("home")}${item.section}` : appViewUrl(item.view)}
            className={activeView === item.view ? "is-active" : ""}
            onClick={(event) => {
              event.preventDefault();

              if (item.section) {
                // These live as sections on the home page — scroll instead of opening a page.
                if (activeView === "home") {
                  document.querySelector(item.section)?.scrollIntoView({ behavior: "smooth" });
                } else {
                  onNavigate("home");
                  window.requestAnimationFrame(() => {
                    document.querySelector(item.section!)?.scrollIntoView();
                  });
                }
                return;
              }

              onNavigate(item.view);
            }}
            key={item.view}
          >
            {item.label}
          </a>
        ))}
        <div
          className={`nav-dropdown${productsOpen ? " is-open" : ""}`}
          ref={productsRef}
          onMouseEnter={() => setProductsOpen(true)}
          onMouseLeave={() => setProductsOpen(false)}
        >
          <button
            type="button"
            className={`nav-dropdown-trigger${productsActive ? " is-active" : ""}`}
            aria-haspopup="true"
            aria-expanded={productsOpen}
            onClick={() => setProductsOpen((open) => !open)}
          >
            Products
            <span className="nav-dropdown-caret" aria-hidden="true" />
          </button>
          <div className="nav-dropdown-menu" role="menu" aria-label="Products">
            {productsMenuItems.map((item) => (
              <a
                href={appViewUrl(item.view)}
                role="menuitem"
                className={activeView === item.view ? "is-active" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  setProductsOpen(false);
                  onNavigate(item.view);
                }}
                key={item.view}
              >
                <strong>{item.label}</strong>
              </a>
            ))}
          </div>
        </div>
      </nav>
      <div className="nav-actions">
        <button className="secondary-button" type="button" onClick={onContactSales}>Contact sales</button>
        <button className="primary-button" type="button" onClick={onOpenDashboard}>Open dashboard</button>
      </div>
    </header>
  );
}

function MarketingFooter({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const footerHref = (view: AppView, hashHref?: string) => {
    if (hashHref?.startsWith("#")) {
      return `${appViewUrl("home")}${hashHref}`;
    }

    return appViewUrl(view);
  };

  const navigateFooter = (event: React.MouseEvent<HTMLAnchorElement>, view: AppView, hashHref?: string) => {
    event.preventDefault();

    if (hashHref?.startsWith("#")) {
      onNavigate("home");
      window.requestAnimationFrame(() => {
        document.querySelector(hashHref)?.scrollIntoView();
      });
      return;
    }

    onNavigate(view);
  };

  return (
    <footer className="site-footer" id="footer" aria-label="RelayClarity footer">
      <div className="footer-shell">
        <div className="footer-main">
          <div className="footer-contact">
            <a
              className="footer-brand"
              href={appViewUrl("home")}
              onClick={(event) => {
                event.preventDefault();
                onNavigate("home");
              }}
              aria-label="RelayClarity home"
            >
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
                  <a
                    href={footerHref(link.view, link.href)}
                    onClick={(event) => navigateFooter(event, link.view, link.href)}
                    key={link.label}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 RelayClarity. All rights reserved.</p>
          <div className="footer-meta-links" aria-label="Legal links">
            {footerLegalLinks.map((link) => (
              <a href={link.href.startsWith("#") ? `/${link.href}` : link.href} key={link.label}>{link.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function MarketingPageFrame({
  activeView,
  onNavigate,
  onContactSales,
  onOpenDashboard,
  children
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onContactSales: () => void;
  onOpenDashboard: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`site-shell marketing-page-shell is-${activeView}-page`}>
      <MarketingNav activeView={activeView} onNavigate={onNavigate} onContactSales={onContactSales} onOpenDashboard={onOpenDashboard} />
      <main>{children}</main>
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
}

function MarketingPageHero({
  eyebrow,
  title,
  lead,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  children
}: {
  eyebrow: string;
  title: string;
  lead: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="marketing-page-hero">
      <div className="marketing-page-hero-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{lead}</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onPrimary}>{primaryLabel}</button>
          <button className="secondary-button" type="button" onClick={onSecondary}>{secondaryLabel}</button>
        </div>
      </div>
      <div className="marketing-page-hero-panel">{children}</div>
    </section>
  );
}

function PlatformMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  return (
    <>
      <MarketingPageHero
        eyebrow="Platform"
        title="Build, test, and launch one reliable customer agent."
        lead="RelayClarity turns your business brief, systems, voice, and launch checks into a production-ready AI agent with clear human handoff."
        primaryLabel="Open dashboard"
        secondaryLabel="Contact sales"
        onPrimary={onOpenDashboard}
        onSecondary={onContactSales}
      >
        <div className="platform-page-stack">
          {workflow.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.phase}</strong>
              <p>{item.example}</p>
            </article>
          ))}
        </div>
      </MarketingPageHero>
      <WorkflowTimelineSection />
      <CapabilityCardsSection />
      <SecuritySection />
    </>
  );
}

const companyLogoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

const integrationLogoMap: Record<string, string> = {
  "Acuity Scheduling": companyLogoUrl("acuityscheduling.com"),
  Aircall: companyLogoUrl("aircall.io"),
  "Amazon Connect": companyLogoUrl("aws.amazon.com"),
  Anthropic: companyLogoUrl("anthropic.com"),
  Apollo: companyLogoUrl("apollo.io"),
  Calendly: companyLogoUrl("calendly.com"),
  "8x8": companyLogoUrl("8x8.com"),
  "3CX": companyLogoUrl("3cx.com"),
  Clio: companyLogoUrl("clio.com"),
  CloudTalk: companyLogoUrl("cloudtalk.io"),
  Deepgram: companyLogoUrl("deepgram.com"),
  Dentally: companyLogoUrl("dentally.com"),
  Dialpad: companyLogoUrl("dialpad.com"),
  ElevenLabs: companyLogoUrl("elevenlabs.io"),
  Five9: companyLogoUrl("five9.com"),
  Freshdesk: companyLogoUrl("freshdesk.com"),
  Genesys: companyLogoUrl("genesys.com"),
  "Genesys Cloud CX": companyLogoUrl("genesys.com"),
  GitHub: companyLogoUrl("github.com"),
  Gong: companyLogoUrl("gong.io"),
  "Google Calendar": companyLogoUrl("calendar.google.com"),
  "Google Drive": companyLogoUrl("drive.google.com"),
  "Help Scout": companyLogoUrl("helpscout.com"),
  HubSpot: companyLogoUrl("hubspot.com"),
  Intercom: companyLogoUrl("intercom.com"),
  Jira: companyLogoUrl("atlassian.com"),
  Jobber: companyLogoUrl("getjobber.com"),
  JustCall: companyLogoUrl("justcall.io"),
  Klarna: companyLogoUrl("klarna.com"),
  Klaviyo: companyLogoUrl("klaviyo.com"),
  Looker: companyLogoUrl("looker.com"),
  Mailchimp: companyLogoUrl("mailchimp.com"),
  Make: companyLogoUrl("make.com"),
  "Microsoft 365": companyLogoUrl("microsoft.com"),
  "Microsoft Outlook": companyLogoUrl("outlook.com"),
  "Microsoft Teams": companyLogoUrl("teams.microsoft.com"),
  Mindbody: companyLogoUrl("mindbodyonline.com"),
  "NICE CXone": companyLogoUrl("nice.com"),
  Notion: companyLogoUrl("notion.so"),
  Obsidian: companyLogoUrl("obsidian.md"),
  Okta: companyLogoUrl("okta.com"),
  OpenAI: companyLogoUrl("openai.com"),
  OpenPhone: companyLogoUrl("openphone.com"),
  Outreach: companyLogoUrl("outreach.io"),
  Pipedrive: companyLogoUrl("pipedrive.com"),
  Postman: companyLogoUrl("postman.com"),
  RingCentral: companyLogoUrl("ringcentral.com"),
  Salesforce: companyLogoUrl("salesforce.com"),
  Salesloft: companyLogoUrl("salesloft.com"),
  Segment: companyLogoUrl("segment.com"),
  Sentry: companyLogoUrl("sentry.io"),
  ServiceTitan: companyLogoUrl("servicetitan.com"),
  Shopify: companyLogoUrl("shopify.com"),
  Slack: companyLogoUrl("slack.com"),
  Square: companyLogoUrl("squareup.com"),
  Stripe: companyLogoUrl("stripe.com"),
  Talkdesk: companyLogoUrl("talkdesk.com"),
  "Tray.io": companyLogoUrl("tray.io"),
  Twilio: companyLogoUrl("twilio.com"),
  WhatsApp: companyLogoUrl("whatsapp.com"),
  WooCommerce: companyLogoUrl("woocommerce.com"),
  Workato: companyLogoUrl("workato.com"),
  Zapier: companyLogoUrl("zapier.com"),
  Zendesk: companyLogoUrl("zendesk.com"),
  Zoho: companyLogoUrl("zoho.com"),
  "Zoho CRM": companyLogoUrl("zoho.com"),
  Zoom: companyLogoUrl("zoom.us"),
  "Zoom Phone": companyLogoUrl("zoom.us")
};

function integrationCategorySlug(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function integrationCategoryId(category: string) {
  return `integrations-${integrationCategorySlug(category)}`;
}

const integrationConstellationChips = [
  { name: "OpenAI", left: "16%", top: "68%" },
  { name: "Google Calendar", left: "22%", top: "82%" },
  { name: "Genesys Cloud CX", left: "24%", top: "56%" },
  { name: "ServiceTitan", left: "35%", top: "62%" },
  { name: "Salesforce", left: "42%", top: "82%" },
  { name: "Gong", left: "48%", top: "54%" },
  { name: "Twilio", left: "56%", top: "82%" },
  { name: "Slack", left: "62%", top: "54%" },
  { name: "Zapier", left: "68%", top: "72%" },
  { name: "GitHub", left: "78%", top: "60%" },
  { name: "Shopify", left: "81%", top: "82%" },
  { name: "Zendesk", left: "84%", top: "68%" }
];

const integrationConstellationLines = [
  "M580 188 C 440 200, 260 268, 116 288",
  "M580 188 C 470 176, 350 164, 244 168",
  "M580 188 C 510 216, 450 244, 383 260",
  "M580 188 C 540 156, 500 120, 452 104",
  "M580 188 C 626 156, 672 124, 719 108",
  "M580 188 C 620 218, 658 250, 696 272",
  "M580 188 C 674 200, 770 212, 858 220",
  "M580 188 C 730 174, 880 160, 1021 152",
  "M580 188 C 554 248, 536 302, 568 344",
  "M580 188 C 428 142, 262 96, 151 80",
  "M580 188 C 414 126, 238 78, 112 72",
  "M580 188 C 752 230, 920 272, 1044 280"
];

function integrationLogoInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function IntegrationLogoMark({ name }: { name: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoUrl = integrationLogoMap[name];
  const showLogo = Boolean(logoUrl && !logoFailed);

  useEffect(() => {
    setLogoFailed(false);
    setLogoLoaded(false);
  }, [logoUrl]);

  return (
    <span className={`intg-logo-mark${showLogo && logoLoaded ? " has-logo" : ""}`} aria-hidden="true">
      {!showLogo || !logoLoaded ? <span className="intg-logo-initial">{integrationLogoInitials(name)}</span> : null}
      {showLogo ? (
        <img
          src={logoUrl}
          alt=""
          loading="eager"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoFailed(true)}
        />
      ) : null}
    </span>
  );
}

function IntegrationHeroLogoTile({
  name,
  index,
  total,
  progress,
  reduceMotion
}: {
  name: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const sphereStyle = heroLogoSphereStyle(index, total);
  const scatter = heroLogoParallaxOffset(index, total);
  const baseScale = Number(sphereStyle["--logo-scale"]);
  const baseOpacity = Number(sphereStyle["--logo-opacity"]);
  const x = useTransform(progress, [0, 0.16, 0.88], [0, 0, scatter.x]);
  const y = useTransform(progress, [0, 0.16, 0.88], [0, 0, scatter.y]);
  const rotate = useTransform(progress, [0, 0.88], [0, scatter.rotate]);
  const scale = useTransform(progress, [0, 0.88], [baseScale, Math.min(1.14, baseScale + 0.1)]);
  const opacity = useTransform(progress, [0, 0.2, 0.88], [baseOpacity, 1, 0.96]);
  const filter = useTransform(progress, [0, 0.4], [String(sphereStyle["--logo-blur"]), "blur(0px)"]);

  return (
    <motion.span
      className="intgx-hero-logo-tile"
      key={name}
      style={{
        ...sphereStyle,
        x: reduceMotion ? 0 : x,
        y: reduceMotion ? 0 : y,
        rotate: reduceMotion ? 0 : rotate,
        scale: reduceMotion ? baseScale : scale,
        opacity: reduceMotion ? baseOpacity : opacity,
        filter: reduceMotion ? String(sphereStyle["--logo-blur"]) : filter
      }}
      aria-label={name}
      title={name}
    >
      <IntegrationLogoMark name={name} />
    </motion.span>
  );
}

function IntegrationsMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress: heroLogoProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end 18%"]
  });
  const heroLogoCloudY = useTransform(heroLogoProgress, [0, 1], [0, -24]);
  const heroLogoCloudScale = useTransform(heroLogoProgress, [0, 1], [1, 0.98]);
  const heroLogoCloudOpacity = useTransform(heroLogoProgress, [0, 0.82, 1], [1, 1, 0.82]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<string>(marketingIntegrationCatalog[0]?.category ?? "");
  const normalizedCatalogQuery = catalogQuery.trim().toLowerCase();
  const visibleMarketingIntegrationCatalog = useMemo(
    () =>
      marketingIntegrationCatalog
        .map((group) => ({
          ...group,
          companies: normalizedCatalogQuery
            ? group.companies.filter((company) =>
                `${group.category} ${company.name} ${company.description}`.toLowerCase().includes(normalizedCatalogQuery)
              )
            : group.companies
        }))
        .filter((group) => group.companies.length > 0),
    [normalizedCatalogQuery]
  );
  const visibleCatalogCategoryNames = visibleMarketingIntegrationCatalog.map((group) => group.category).join("|");

  useEffect(() => {
    const firstVisibleCategory = visibleMarketingIntegrationCatalog[0]?.category ?? "";

    if (!firstVisibleCategory) {
      setActiveCatalogCategory("");
      return;
    }

    if (!visibleMarketingIntegrationCatalog.some((group) => group.category === activeCatalogCategory)) {
      setActiveCatalogCategory(firstVisibleCategory);
    }
  }, [activeCatalogCategory, visibleCatalogCategoryNames, visibleMarketingIntegrationCatalog]);

  useEffect(() => {
    if (!visibleMarketingIntegrationCatalog.length || typeof IntersectionObserver === "undefined") {
      return;
    }

    const sections = visibleMarketingIntegrationCatalog
      .map((group) => document.getElementById(integrationCategoryId(group.category)))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const aDistance = Math.abs(a.boundingClientRect.top - 118);
            const bDistance = Math.abs(b.boundingClientRect.top - 118);
            return aDistance - bDistance;
          });

        const activeEntry = visibleEntries[0];
        if (activeEntry?.target instanceof HTMLElement) {
          const activeGroup = visibleMarketingIntegrationCatalog.find(
            (group) => integrationCategoryId(group.category) === activeEntry.target.id
          );

          if (activeGroup) {
            setActiveCatalogCategory(activeGroup.category);
          }
        }
      },
      {
        root: null,
        rootMargin: "-112px 0px -58% 0px",
        threshold: [0.05, 0.18, 0.35]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleCatalogCategoryNames, visibleMarketingIntegrationCatalog]);

  return (
    <div className="intgx-page">
      <section className="intgx-hero" aria-label="Integrations overview" ref={heroRef}>
        <div className="pp-aurora intgx-hero-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="intgx-hero-inner">
          <motion.div
            className="intgx-hero-copy"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1>Connect your tools to <span>one voice agent</span></h1>
            <p>Plug in your CRM, helpdesk, calendar, phone system, and knowledge base so every call has the right context.</p>
          </motion.div>
          <motion.div
            className="intgx-hero-logo-cloud"
            aria-label="Popular integrations"
            style={{
              y: reduceMotion ? 0 : heroLogoCloudY,
              scale: reduceMotion ? 1 : heroLogoCloudScale,
              opacity: reduceMotion ? 1 : heroLogoCloudOpacity
            }}
          >
            {integrationsHeroLogoNames.map((name, index) => (
              <IntegrationHeroLogoTile
                key={name}
                name={name}
                index={index}
                total={integrationsHeroLogoNames.length}
                progress={heroLogoProgress}
                reduceMotion={Boolean(reduceMotion)}
              />
            ))}
          </motion.div>
        </div>

      </section>

      <section className="intgx-catalog">
        <div className="intgx-heading">
          <span className="intgx-eyebrow is-ink"><i aria-hidden="true" />Connected stack</span>
          <h2>Companies we connect with</h2>
        </div>
        <div className="intgx-catalog-browser">
          <aside className="intgx-catalog-sidebar" aria-label="Explore all integrations">
            <strong>Explore All Integrations</strong>
            <label className="intgx-catalog-search">
              <span aria-hidden="true" />
              <input
                type="search"
                placeholder="Search"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                aria-label="Search integrations"
              />
            </label>
            <nav aria-label="Integration categories">
              {marketingIntegrationCatalog.map((group) => (
                <a
                  href={`#${integrationCategoryId(group.category)}`}
                  className={activeCatalogCategory === group.category ? "is-active" : ""}
                  aria-current={activeCatalogCategory === group.category ? "true" : undefined}
                  onClick={() => setActiveCatalogCategory(group.category)}
                  key={group.category}
                >
                  <span className={`intgx-category-icon is-${integrationCategorySlug(group.category)}`} aria-hidden="true" />
                  {group.category}
                </a>
              ))}
            </nav>
          </aside>
          <div className="intgx-category-stack" aria-label="Available integrations by category">
            {visibleMarketingIntegrationCatalog.map((group) => (
              <section
                className="intgx-logo-category"
                id={integrationCategoryId(group.category)}
                key={group.category}
              >
                <h3>{group.category}</h3>
                <div className="intgx-logo-grid">
                  {group.companies.map((company) => (
                    <article className="intgx-logo-card" key={company.name}>
                      <IntegrationLogoMark name={company.name} />
                      <div>
                        <strong>{company.name}</strong>
                        <p>{company.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {!visibleMarketingIntegrationCatalog.length ? (
              <div className="intgx-empty-catalog" role="status">
                No integrations match that search.
              </div>
            ) : null}
          </div>
        </div>
      </section>

    </div>
  );
}

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;

    if (reduceMotion || from === value) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const duration = 620;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return <>{roiCurrency.format(display)}</>;
}

function PricingMarketingPage({
  onContactSales,
  onNavigate
}: {
  onContactSales: () => void;
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <>
      <section className="pp-hero pp-billing-hero" aria-label="Pricing billing period">
        <div className="pp-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <motion.div
          className="pp-hero-copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1>
            Simple pricing for <span className="pp-shimmer">AI customer agents</span>
          </h1>
          <p>
            Pick monthly or annual billing, choose the plan that fits, and start with a clean checkout.
          </p>
          <div className="pp-toggle" role="group" aria-label="Billing period">
            <span className={`pp-toggle-thumb${billing === "annual" ? " is-annual" : ""}`} aria-hidden="true" />
            <button
              type="button"
              className={billing === "monthly" ? "is-active" : ""}
              aria-pressed={billing === "monthly"}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === "annual" ? "is-active" : ""}
              aria-pressed={billing === "annual"}
              onClick={() => setBilling("annual")}
            >
              Annual <em>-20%</em>
            </button>
          </div>
        </motion.div>
      </section>
      <section className="pp-plans" aria-label="Plans">
        <div className="pp-grid">
          {pricingPlans.map((plan, index) => (
            <motion.article
              className={`pp-card${plan.featured ? " is-featured" : ""}`}
              initial={{ opacity: 0, y: 46 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: "easeOut" }}
              whileHover={{ y: -8 }}
              key={plan.name}
            >
              {plan.featured ? (
                <>
                  <span className="pp-card-glow" aria-hidden="true" />
                  <span className="pp-badge is-featured">
                    <i aria-hidden="true" />
                    {plan.badge}
                  </span>
                </>
              ) : null}
              {!plan.featured ? (
                <span className="pp-badge">
                  {plan.badge}
                </span>
              ) : null}
              <h2>{plan.name}</h2>
              <p className="pp-summary">{plan.summary}</p>
              <div className="pp-price" aria-live="polite">
                {plan.monthly === null ? (
                  <strong className="pp-price-custom">Custom</strong>
                ) : (
                  <>
                    <strong>
                      <AnimatedPrice value={(billing === "annual" ? plan.annual : plan.monthly) ?? 0} />
                    </strong>
                    <small>{billing === "annual" ? "/mo, billed annually" : "/mo"}</small>
                  </>
                )}
              </div>
              {plan.monthly !== null && billing === "annual" ? (
                <p className="pp-plan-save">Save {"\u00a3"}{(((plan.monthly ?? 0) - (plan.annual ?? 0)) * 12).toLocaleString("en-GB")} per year</p>
              ) : (
                <p className="pp-plan-save">{plan.monthly === null ? "Designed around your rollout" : "Monthly billing, cancel at period end"}</p>
              )}
              <ul className="pp-features">
                {plan.features.map((feature, featureIndex) => (
                  <motion.li
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.25 + index * 0.12 + featureIndex * 0.06 }}
                    key={feature}
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="7.2" fill="currentColor" opacity="0.14" />
                      <path d="M4.8 8.2l2.2 2.2 4.2-4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </motion.li>
                ))}
              </ul>
              <button
                className={plan.featured ? "primary-button" : "secondary-button"}
                type="button"
                onClick={plan.id === "scale"
                  ? onContactSales
                  : () => onNavigate("checkout", { plan: plan.id, billing })}
              >
                {plan.cta}
              </button>
            </motion.article>
          ))}
        </div>
        <p className="pp-fineprint">Prices exclude VAT. Switch plans or cancel at the end of any billing period.</p>
      </section>
    </>
  );
}

function CheckoutReviewPage({
  user,
  onNavigate,
  onContactSales,
}: {
  user: AuthUser;
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
  onContactSales: () => void;
}) {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedPlanId = searchParams.get("plan");
  const requestedBilling = searchParams.get("billing");
  const initialPlan = pricingPlans.find((plan) => plan.id === requestedPlanId && plan.monthly !== null) || pricingPlans.find((plan) => plan.id === "operate")!;
  const [selectedPlanId, setSelectedPlanId] = useState<"launch" | "operate">(initialPlan.id as "launch" | "operate");
  const [billing, setBilling] = useState<"monthly" | "annual">(requestedBilling === "annual" ? "annual" : "monthly");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const selectedPlan = pricingPlans.find((plan) => plan.id === selectedPlanId)!;
  const monthlyEquivalent = billing === "annual" ? selectedPlan.annual ?? 0 : selectedPlan.monthly ?? 0;
  const dueToday = billing === "annual" ? monthlyEquivalent * 12 : monthlyEquivalent;
  const savings = selectedPlan.monthly && selectedPlan.annual ? (selectedPlan.monthly - selectedPlan.annual) * 12 : 0;

  const updateSelection = (planId: "launch" | "operate", nextBilling = billing) => {
    setSelectedPlanId(planId);
    setBilling(nextBilling);
    onNavigate("checkout", { plan: planId, billing: nextBilling });
  };

  const startCheckout = async () => {
    setIsStartingCheckout(true);
    setCheckoutError("");

    try {
      const payload = await fetchJsonFromApi<CheckoutSessionPayload>("/api/billing/checkout-session", {
        method: "POST",
        body: JSON.stringify({ planId: selectedPlanId, billing }),
      });

      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout.");
      setIsStartingCheckout(false);
    }
  };

  return (
    <div className="checkout-shell">
      <MarketingNav
        activeView="pricing"
        onNavigate={(nextView) => onNavigate(nextView)}
        onContactSales={onContactSales}
        onOpenDashboard={() => onNavigate("dashboard")}
      />
      <main className="checkout-main">
        <section className="checkout-page" aria-label="Checkout review">
          <div className="checkout-copy">
            <button className="checkout-back" type="button" onClick={() => onNavigate("pricing")}>
              Back to pricing
            </button>
            <span className="checkout-eyebrow">Plan review</span>
            <h1>Confirm your RelayClarity plan.</h1>
            <p>
              Review the subscription, account, and billing cadence before opening Stripe's secure payment page.
            </p>
            <div className="checkout-account-card">
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <b>Signed in</b>
            </div>
          </div>

          <aside className="checkout-review-card" aria-label="Selected plan">
            <div className="checkout-plan-tabs" role="tablist" aria-label="Choose plan">
              {pricingPlans.filter((plan) => plan.monthly !== null).map((plan) => (
                <button
                  type="button"
                  className={plan.id === selectedPlanId ? "is-active" : ""}
                  onClick={() => updateSelection(plan.id as "launch" | "operate")}
                  key={plan.id}
                >
                  <span>{plan.name}</span>
                  <strong>£{(plan.monthly ?? 0).toLocaleString("en-GB")}/mo</strong>
                </button>
              ))}
            </div>

            <div className="checkout-billing-toggle" role="group" aria-label="Billing period">
              <button
                type="button"
                className={billing === "monthly" ? "is-active" : ""}
                onClick={() => updateSelection(selectedPlanId, "monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={billing === "annual" ? "is-active" : ""}
                onClick={() => updateSelection(selectedPlanId, "annual")}
              >
                Annual <span>Save £{savings.toLocaleString("en-GB")}</span>
              </button>
            </div>

            <header className="checkout-plan-head">
              <div>
                <span>{selectedPlan.featured ? "Most popular" : "Selected plan"}</span>
                <h2>{selectedPlan.name}</h2>
                <p>{selectedPlan.summary}</p>
              </div>
              <strong>£{monthlyEquivalent.toLocaleString("en-GB")}<small>/mo</small></strong>
            </header>

            <div className="checkout-total">
              <span>Due today</span>
              <strong>£{dueToday.toLocaleString("en-GB")}</strong>
              <small>{billing === "annual" ? "Billed annually, excluding VAT" : "Billed monthly, excluding VAT"}</small>
            </div>

            <ul className="checkout-feature-list">
              {selectedPlan.features.map((feature) => (
                <li key={feature}>
                  <span aria-hidden="true">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button className="primary-button checkout-pay-button" type="button" onClick={startCheckout} disabled={isStartingCheckout}>
              {isStartingCheckout ? "Opening Stripe..." : "Continue to secure payment"}
            </button>
            {checkoutError ? <p className="checkout-error">{checkoutError}</p> : null}
            <p className="checkout-note">Payments are processed by Stripe. You can cancel before payment is submitted.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

function SecureCheckoutPage({
  user,
  onNavigate,
  onContactSales,
  onRequireAccount,
}: {
  user: AuthUser | null;
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
  onContactSales: () => void;
  onRequireAccount: () => void;
}) {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedPlan = searchParams.get("plan");
  const requestedBilling = searchParams.get("billing");
  const initialPlanId = requestedPlan === "launch" || requestedPlan === "scale" ? requestedPlan : "operate";
  const [selectedPlanId, setSelectedPlanId] = useState<"launch" | "operate" | "scale">(initialPlanId);
  const [billing, setBilling] = useState<"monthly" | "annual">(requestedBilling === "monthly" ? "monthly" : "annual");
  const [email, setEmail] = useState(user?.email || "");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const checkoutPlans = pricingPlans;
  const selectedPlan = checkoutPlans.find((plan) => plan.id === selectedPlanId) || checkoutPlans[1];
  const displayMonthly = billing === "annual" ? selectedPlan.annual ?? 0 : selectedPlan.monthly ?? 0;
  const monthlyListPrice = selectedPlan.monthly ?? 0;
  const subtotal = selectedPlan.monthly === null ? 0 : billing === "annual" ? monthlyListPrice * 12 : displayMonthly;
  const discount = selectedPlan.monthly !== null && billing === "annual" ? ((selectedPlan.monthly ?? 0) - (selectedPlan.annual ?? 0)) * 12 : 0;
  const vat = (subtotal - discount) * 0.2;
  const totalDue = subtotal - discount + vat;
  const stripePlanId = selectedPlanId === "launch" ? "launch" : "operate";
  const billingDetailsComplete = Boolean(email.trim() && fullName.trim() && companyName.trim());
  const checkoutProgress = user ? billingDetailsComplete ? 78 : 54 : 34;
  const checkoutButtonLabel = selectedPlanId === "scale"
    ? "Contact sales"
    : !user
      ? "Create account to continue"
      : isStartingCheckout
        ? "Opening payment..."
        : "Continue to payment";

  useEffect(() => {
    setEmail(user?.email || "");
    setFullName(user?.name || "");
  }, [user?.email, user?.name]);

  const formatMoney = (value: number) => value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const syncUrl = (planId: "launch" | "operate" | "scale", nextBilling: "monthly" | "annual") => {
    onNavigate("checkout", { plan: planId, billing: nextBilling });
  };
  const choosePlan = (planId: "launch" | "operate" | "scale") => {
    if (planId === "scale") {
      setSelectedPlanId("scale");
      onContactSales();
      return;
    }
    setSelectedPlanId(planId);
    syncUrl(planId, billing);
  };
  const chooseBilling = (nextBilling: "monthly" | "annual") => {
    setBilling(nextBilling);
    syncUrl(selectedPlanId, nextBilling);
  };

  const startCheckout = async () => {
    if (selectedPlanId === "scale") {
      onContactSales();
      return;
    }

    if (!user) {
      onRequireAccount();
      return;
    }

    setIsStartingCheckout(true);
    setCheckoutError("");

    try {
      const payload = await fetchJsonFromApi<CheckoutSessionPayload>("/api/billing/checkout-session", {
        method: "POST",
        body: JSON.stringify({
          planId: stripePlanId,
          billing,
          billingDetails: { email, companyName, fullName, phoneNumber },
        }),
      });
      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout.");
      setIsStartingCheckout(false);
    }
  };

  return (
    <div className="secure-checkout-shell">
      <MarketingNav
        activeView="pricing"
        onNavigate={(nextView) => onNavigate(nextView)}
        onContactSales={onContactSales}
        onOpenDashboard={() => onNavigate("dashboard")}
      />
      <main className="secure-checkout-main">
        <section className="secure-checkout-page" aria-label="Secure checkout">
          <div className="secure-checkout-left">
            <div className="secure-checkout-stepper" aria-label="Checkout steps">
              {["Plan", "Billing", "Payment"].map((step, index) => (
                <div className={index === 0 || (index === 1 && billingDetailsComplete) ? "is-active" : ""} key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
            <header className="secure-checkout-title">
              <span className="secure-checkout-eyebrow">Secure checkout</span>
              <h1>Review your plan, then pay securely.</h1>
              <p>Keep your plan, billing cadence, contact details, and total due visible before Stripe opens.</p>
              <div className="secure-progress-card" aria-label="Checkout progress">
                <div>
                  <span>Checkout progress</span>
                  <strong>{checkoutProgress}%</strong>
                </div>
                <i><b style={{ width: `${checkoutProgress}%` }} /></i>
              </div>
            </header>
            <section className="secure-plan-section" aria-label="Choose your plan">
              <div className="secure-section-heading">
                <div>
                  <span>Step 1</span>
                  <h2>Choose your plan</h2>
                </div>
                <div className="secure-billing-switch" role="group" aria-label="Billing period">
                  <button className={billing === "monthly" ? "is-active" : ""} type="button" onClick={() => chooseBilling("monthly")}>Monthly</button>
                  <button className={billing === "annual" ? "is-active" : ""} type="button" onClick={() => chooseBilling("annual")}>Annual <span>Save 20%</span></button>
                </div>
              </div>
              <div className="secure-plan-grid">
                {checkoutPlans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <article className={`secure-plan-card${isSelected ? " is-selected" : ""}${plan.featured ? " is-popular" : ""}`} key={plan.id}>
                      {plan.featured ? <span className="secure-popular-badge">{plan.badge}</span> : null}
                      <h3>{plan.name}</h3>
                      <p>{plan.summary}</p>
                      {plan.monthly === null ? (
                        <>
                          <strong className="secure-custom-price">Custom</strong>
                          <small>Contact sales review</small>
                        </>
                      ) : (
                        <>
                          <strong><span>£</span>{billing === "annual" ? plan.annual : plan.monthly}<small>/mo</small></strong>
                          <small>{billing === "annual" ? "Billed annually" : "Billed monthly"}</small>
                        </>
                      )}
                      <button className={isSelected ? "is-primary" : ""} type="button" onClick={() => choosePlan(plan.id)}>
                        {plan.monthly === null ? "Contact sales" : "Select plan"}
                      </button>
                      <ul>
                        {plan.features.map((feature) => <li key={feature}><span aria-hidden="true"></span>{feature}</li>)}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="secure-billing-section" aria-label="Billing information">
              <div className="secure-section-heading">
                <div>
                  <span>Step 2</span>
                  <h2>Billing information</h2>
                </div>
                {user ? <p><strong>Signed in</strong> {user.email}</p> : <p>Have an account? <button type="button" onClick={onRequireAccount}>Log in</button></p>}
              </div>
              <div className="secure-field-grid">
                <label>
                  <span>Email address</span>
                  <div>
                    <span className="secure-field-icon"><ContactSalesIcon name="mail" /></span>
                    <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
                  </div>
                </label>
                <label>
                  <span>Company name</span>
                  <div>
                    <span className="secure-field-icon"><ContactSalesIcon name="building" /></span>
                    <input type="text" autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" />
                  </div>
                </label>
                <label>
                  <span>Full name</span>
                  <div>
                    <span className="secure-field-icon"><ContactSalesIcon name="user" /></span>
                    <input type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" />
                  </div>
                </label>
                <label>
                  <span>Phone number (optional)</span>
                  <div className="secure-phone-field">
                    <span className="secure-field-icon"><ContactSalesIcon name="phone" /></span>
                    <span className="secure-dial-code" aria-hidden="true">+44</span>
                    <input type="tel" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="7400 123456" />
                  </div>
                </label>
              </div>
              <footer className="secure-form-footer">
                <p><span aria-hidden="true"></span>We'll never share your information. See our <a href="/privacy">Privacy Policy</a></p>
                <button type="button" onClick={startCheckout} disabled={isStartingCheckout}>{checkoutButtonLabel} <span aria-hidden="true">-&gt;</span></button>
              </footer>
              {checkoutError ? <p className="checkout-error">{checkoutError}</p> : null}
            </section>
          </div>
          <aside className="secure-summary-column" aria-label="Order summary">
            <section className="secure-summary-card">
              <header><h2>Order summary</h2><button type="button" onClick={() => onNavigate("pricing")}>Edit</button></header>
              <div className="secure-summary-product">
                <span>R</span>
                <div><strong>Relay Clarity {selectedPlan.name}</strong><small>{billing === "annual" ? "Billed annually" : "Billed monthly"}</small></div>
                <p><strong>{selectedPlan.monthly === null ? "Custom" : `£${displayMonthly}.00`}</strong><small>/month</small></p>
              </div>
              <div className="secure-summary-lines">
                <p><span>Subtotal</span><strong>£{formatMoney(subtotal)}</strong></p>
                <p><span>Annual saving <b aria-hidden="true">%</b></span><strong className="is-discount">-£{formatMoney(discount)}</strong></p>
                <p><span>VAT (20%)</span><strong>£{formatMoney(vat)}</strong></p>
              </div>
              <div className="secure-summary-total"><span>Total due today</span><strong>{selectedPlan.monthly === null ? "Custom" : `£${formatMoney(totalDue)}`}</strong><small>GBP</small></div>
              <section className="secure-payment-card">
                <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.2 19 6v5.2c0 4.4-2.8 8.3-7 9.6-4.2-1.3-7-5.2-7-9.6V6l7-2.8Z" /><path d="m8.8 12.2 2.1 2.1 4.4-5" /></svg></span>
                <div>
                  <strong>100% Secure Checkout</strong>
                  <p>Your payment information is encrypted and processed securely.</p>
                  <div className="secure-card-logos" aria-label="Accepted payment methods">
                    <span className="is-visa">VISA</span>
                    <span className="is-mastercard"><i></i><i></i></span>
                    <span className="is-amex">AMEX</span>
                    <span className="is-apple-pay secure-wallet-mark" aria-label="Apple Pay">
                      <svg className="secure-apple-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M16.45 3.1c-.97.13-2.08.72-2.75 1.53-.61.72-1.12 1.88-.96 2.98 1.06.03 2.18-.58 2.87-1.42.68-.83 1.12-1.94.84-3.09ZM21.18 17.42c-.47 1.04-.69 1.5-1.3 2.42-.84 1.26-2.03 2.84-3.5 2.85-1.31.01-1.65-.83-3.43-.82-1.78.01-2.15.84-3.46.83-1.47-.02-2.59-1.43-3.43-2.69-2.35-3.53-2.6-7.67-1.15-9.88 1.03-1.57 2.65-2.49 4.18-2.49 1.56 0 2.54.85 3.83.85 1.25 0 2.02-.85 3.83-.85 1.37 0 2.82.75 3.84 2.04-3.37 1.85-2.82 6.66.59 7.74Z" />
                      </svg>
                      <span className="secure-wallet-word">Pay</span>
                    </span>
                    <span className="is-google-pay secure-wallet-mark" aria-label="Google G logo">
                      <span className="secure-google-mark" aria-hidden="true">G</span>
                    </span>
                  </div>
                </div>
              </section>
              <section className="secure-benefits">
                {[["14-day free trial", "Try all features risk-free. Cancel anytime."], ["Cancel anytime", "No long-term contracts. You're in control."], ["Dedicated support", "Our team is here to help you succeed."]].map(([title, detail]) => (
                  <article key={title}><span aria-hidden="true"></span><div><strong>{title}</strong><p>{detail}</p></div></article>
                ))}
              </section>
              <section className="secure-help-card"><strong>Need help? <button type="button" onClick={onContactSales}>Contact our sales team</button></strong><p>sales@relayclarity.com <span></span> +44 20 7946 0958</p></section>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function CheckoutSuccessPage({
  user,
  onNavigate,
  onContactSales,
}: {
  user: AuthUser;
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
  onContactSales: () => void;
}) {
  const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
  const [status, setStatus] = useState<"loading" | "complete" | "open" | "error">("loading");
  const [session, setSession] = useState<CheckoutSessionStatusPayload | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Stripe did not return a checkout session.");
      return;
    }

    fetchJsonFromApi<CheckoutSessionStatusPayload>(`/api/billing/checkout-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((payload) => {
        setSession(payload);
        setStatus(payload.status === "complete" ? "complete" : "open");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to confirm checkout.");
      });
  }, [sessionId]);

  return (
    <div className="checkout-shell">
      <MarketingNav
        activeView="pricing"
        onNavigate={(nextView) => onNavigate(nextView)}
        onContactSales={onContactSales}
        onOpenDashboard={() => onNavigate("dashboard")}
      />
      <main className="checkout-main is-success">
        <section className="checkout-success-card" aria-label="Checkout result">
          <span className={`checkout-success-mark is-${status}`} aria-hidden="true">
            {status === "complete" ? "✓" : status === "error" ? "!" : "..."}
          </span>
          <p className="checkout-eyebrow">Stripe checkout</p>
          <h1>{status === "complete" ? "Payment confirmed." : status === "open" ? "Checkout is still open." : status === "loading" ? "Confirming checkout." : "We could not confirm payment."}</h1>
          <p>
            {status === "complete"
              ? `${session?.planName || "Your plan"} is now attached to ${session?.customerEmail || user.email}.`
              : status === "open"
                ? "Stripe has not completed this session yet. You can return to the plan review and try again."
                : status === "loading"
                  ? "Checking the Stripe session linked to your RelayClarity account."
                  : message}
          </p>
          {session ? (
            <div className="checkout-success-details">
              <p><span>Plan</span><strong>{session.planName || "RelayClarity"}</strong></p>
              <p><span>Billing</span><strong>{session.billing || "Subscription"}</strong></p>
              <p><span>Status</span><strong>{session.paymentStatus}</strong></p>
            </div>
          ) : null}
          <div className="checkout-success-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("dashboard")}>Open dashboard</button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("pricing")}>Back to pricing</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PrivacyPolicyPage({
  onNavigate,
  onContactSales,
}: {
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
  onContactSales: () => void;
}) {
  return (
    <div className="privacy-shell">
      <MarketingNav
        activeView="pricing"
        onNavigate={(nextView) => onNavigate(nextView)}
        onContactSales={onContactSales}
        onOpenDashboard={() => onNavigate("dashboard")}
      />
      <main className="privacy-main">
        <article className="privacy-card">
          <p className="privacy-eyebrow">Privacy Policy</p>
          <h1>How RelayClarity handles your information.</h1>
          <p className="privacy-updated">Last updated July 9, 2026</p>
          <section>
            <h2>What we collect</h2>
            <p>
              When you use checkout or contact forms, we collect the details you provide, such as name,
              work email, company name, phone number, selected plan, and billing preferences.
            </p>
          </section>
          <section>
            <h2>How we use it</h2>
            <p>
              We use this information to create your account, prepare your subscription, respond to
              sales or support requests, and keep a record of your RelayClarity relationship.
            </p>
          </section>
          <section>
            <h2>Payments</h2>
            <p>
              Payment details are processed by Stripe. RelayClarity does not store full card numbers
              or security codes in this application.
            </p>
          </section>
          <section>
            <h2>Sharing</h2>
            <p>
              We do not sell your personal information. We only share data with service providers
              needed to operate the product, process payments, deliver email, or provide support.
            </p>
          </section>
          <section>
            <h2>Your choices</h2>
            <p>
              You can ask us to update, export, or delete your information by contacting the team.
              Some records may be retained where required for billing, security, or legal reasons.
            </p>
          </section>
          <div className="privacy-actions">
            <button className="primary-button" type="button" onClick={() => onContactSales()}>Contact sales</button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("pricing")}>Back to pricing</button>
          </div>
        </article>
      </main>
    </div>
  );
}

function RoiCalculatorMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  const [monthlyContacts, setMonthlyContacts] = useState(1200);
  const [missedRate, setMissedRate] = useState(18);
  const [leadValue, setLeadValue] = useState(180);
  const [avgHandleMinutes, setAvgHandleMinutes] = useState(6);
  const [hourlyCost, setHourlyCost] = useState(28);
  const containmentRate = 64;
  const conversionRate = 12;
  const monthlyPlatformCost = 950;
  const result = useMemo(() => {
    const missedContacts = monthlyContacts * (missedRate / 100);
    const recoveredContacts = missedContacts * (containmentRate / 100);
    const laborHoursSaved = (monthlyContacts * avgHandleMinutes * (containmentRate / 100)) / 60;
    const laborSavings = laborHoursSaved * hourlyCost;
    const recoveredRevenue = recoveredContacts * leadValue * (conversionRate / 100);
    const monthlyValue = laborSavings + recoveredRevenue;
    const netMonthlyReturn = monthlyValue - monthlyPlatformCost;
    const roiPercent = monthlyPlatformCost > 0 ? (netMonthlyReturn / monthlyPlatformCost) * 100 : 0;
    const paybackDays = monthlyValue > 0 ? (monthlyPlatformCost / monthlyValue) * 30 : 0;
    return { recoveredContacts, laborHoursSaved, laborSavings, recoveredRevenue, monthlyValue, netMonthlyReturn, roiPercent, paybackDays };
  }, [avgHandleMinutes, hourlyCost, leadValue, missedRate, monthlyContacts]);
  const stages = [
    {
      title: "Your enquiries",
      hint: "How many calls and chats come in?",
      fields: [
        { label: "Calls and chats per month", value: monthlyContacts, min: 100, max: 10000, step: 100, suffix: "", set: setMonthlyContacts },
        { label: "Enquiries you currently miss", value: missedRate, min: 1, max: 60, step: 1, suffix: "%", set: setMissedRate },
        { label: "Average value of a new customer", value: leadValue, min: 20, max: 1000, step: 10, suffix: "", prefix: "£", set: setLeadValue }
      ]
    },
    {
      title: "Your costs",
      hint: "What does handling them cost today?",
      fields: [
        { label: "Minutes to handle one enquiry", value: avgHandleMinutes, min: 2, max: 20, step: 1, suffix: " min", set: setAvgHandleMinutes },
        { label: "Team cost per hour", value: hourlyCost, min: 12, max: 90, step: 1, suffix: "/hr", prefix: "£", set: setHourlyCost }
      ]
    }
  ];

  const stepTitles = [...stages.map((stage) => stage.title), "Your results"];
  const resultsStep = stages.length;
  const [step, setStep] = useState(0);
  const stage = step === resultsStep ? null : stages[step];

  return (
    <section className="roi-page">
      <header className="roi-page-header">
        <h1>See what missed calls cost you.</h1>
        <p>Answer two quick steps. We&rsquo;ll do the maths.</p>
      </header>
      <div className="roi-wizard">
        <ol className="roi-steps">
          {stepTitles.map((title, index) => (
            <li
              key={title}
              className={index === step ? "is-current" : index < step ? "is-done" : ""}
            >
              <button type="button" disabled={index >= step} onClick={() => setStep(index)}>
                <i>{index < step ? "" : index + 1}</i>
                <span>{title}</span>
              </button>
            </li>
          ))}
        </ol>
        {stage ? (
          <div className="roi-card" key={stage.title}>
            <header className="roi-card-head">
              <span>Step {step + 1} of {stepTitles.length}</span>
              <h2>{stage.title}</h2>
              <p>{stage.hint}</p>
            </header>
            <div className="roi-card-fields">
              {stage.fields.map((field) => {
                const fill = ((field.value - field.min) / (field.max - field.min)) * 100;
                return (
                  <label className="roi-slider" key={field.label}>
                    <span className="roi-slider-head">
                      <strong>{field.label}</strong>
                      <em>{field.prefix || ""}{roiNumber.format(field.value)}{field.suffix}</em>
                    </span>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={field.value}
                      style={{ "--roi-fill": `${fill}%` } as CSSProperties}
                      onChange={(event) => field.set(Number(event.target.value))}
                    />
                  </label>
                );
              })}
            </div>
            <footer className="roi-card-nav">
              {step > 0 ? (
                <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>Back</button>
              ) : <span />}
              <button className="primary-button" type="button" onClick={() => setStep(step + 1)}>
                {step === stages.length - 1 ? "See my results" : "Next"}
              </button>
            </footer>
          </div>
        ) : (
          <div className="roi-card roi-results" key="results">
            <div className="roi-results-hero">
              <span>You could get back</span>
              <strong>{roiCurrency.format(result.monthlyValue)}</strong>
              <em>per month &middot; {roiCurrency.format(result.netMonthlyReturn)} after RelayClarity&rsquo;s cost</em>
            </div>
            <div className="roi-results-kpis">
              <article><span>Return</span><strong>{Math.round(result.roiPercent)}%</strong></article>
              <article><span>Pays back in</span><strong>{Math.max(1, Math.round(result.paybackDays))} days</strong></article>
              <article><span>Enquiries saved</span><strong>{roiNumber.format(result.recoveredContacts)}</strong></article>
              <article><span>Hours saved</span><strong>{roiNumber.format(result.laborHoursSaved)}</strong></article>
            </div>
            <div className="roi-results-breakdown">
              <h3>Where it comes from</h3>
              <p><span>Team time saved</span><strong>{roiCurrency.format(result.laborSavings)}</strong></p>
              <p><span>Sales recovered</span><strong>{roiCurrency.format(result.recoveredRevenue)}</strong></p>
              <p><span>RelayClarity cost</span><strong>-{roiCurrency.format(monthlyPlatformCost)}</strong></p>
              <p className="is-net"><span>Net every month</span><strong>{roiCurrency.format(result.netMonthlyReturn)}</strong></p>
            </div>
            <footer className="roi-card-nav">
              <button className="secondary-button" type="button" onClick={() => setStep(0)}>Edit my answers</button>
              <div className="roi-results-actions">
                <button className="secondary-button" type="button" onClick={onContactSales}>Talk to sales</button>
                <button className="primary-button" type="button" onClick={onOpenDashboard}>Start free</button>
              </div>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfessionalRoiCalculatorMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  const [monthlyContacts, setMonthlyContacts] = useState(1200);
  const [missedRate, setMissedRate] = useState(18);
  const [leadValue, setLeadValue] = useState(180);
  const [avgHandleMinutes, setAvgHandleMinutes] = useState(6);
  const [hourlyCost, setHourlyCost] = useState(28);
  const [containmentRate, setContainmentRate] = useState(64);
  const [conversionRate, setConversionRate] = useState(12);
  const monthlyPlatformCost = 950;

  const result = useMemo(() => {
    const missedContacts = monthlyContacts * (missedRate / 100);
    const recoveredContacts = missedContacts * (containmentRate / 100);
    const remainingMissedContacts = Math.max(0, missedContacts - recoveredContacts);
    const manualLaborHours = (monthlyContacts * avgHandleMinutes) / 60;
    const manualLaborCost = manualLaborHours * hourlyCost;
    const laborHoursSaved = manualLaborHours * (containmentRate / 100);
    const laborSavings = laborHoursSaved * hourlyCost;
    const remainingLaborCost = Math.max(0, manualLaborCost - laborSavings);
    const missedRevenue = missedContacts * leadValue * (conversionRate / 100);
    const recoveredRevenue = recoveredContacts * leadValue * (conversionRate / 100);
    const residualMissedRevenue = Math.max(0, missedRevenue - recoveredRevenue);
    const beforeMonthlyCost = manualLaborCost + missedRevenue;
    const afterMonthlyCost = remainingLaborCost + residualMissedRevenue + monthlyPlatformCost;
    const monthlyValue = laborSavings + recoveredRevenue;
    const netMonthlyReturn = monthlyValue - monthlyPlatformCost;
    const annualNetReturn = netMonthlyReturn * 12;
    const annualGrossValue = monthlyValue * 12;
    const roiPercent = monthlyPlatformCost > 0 ? (netMonthlyReturn / monthlyPlatformCost) * 100 : 0;
    const paybackDays = monthlyValue > 0 ? (monthlyPlatformCost / monthlyValue) * 30 : 0;
    const costReductionPercent = beforeMonthlyCost > 0 ? ((beforeMonthlyCost - afterMonthlyCost) / beforeMonthlyCost) * 100 : 0;

    return {
      afterMonthlyCost,
      annualGrossValue,
      annualNetReturn,
      beforeMonthlyCost,
      costReductionPercent,
      laborHoursSaved,
      laborSavings,
      manualLaborCost,
      manualLaborHours,
      missedContacts,
      missedRevenue,
      monthlyValue,
      netMonthlyReturn,
      paybackDays,
      recoveredContacts,
      recoveredRevenue,
      remainingLaborCost,
      remainingMissedContacts,
      residualMissedRevenue,
      roiPercent
    };
  }, [avgHandleMinutes, containmentRate, conversionRate, hourlyCost, leadValue, missedRate, monthlyContacts]);

  const formatSignedCurrency = (value: number) => `${value >= 0 ? "+" : "-"}${roiCurrency.format(Math.abs(value))}`;
  const formatPercent = (value: number) => `${Math.round(value)}%`;
  const paybackLabel = result.monthlyValue > 0 ? `${Math.max(1, Math.round(result.paybackDays))} days` : "Not met";
  const comparisonMax = Math.max(result.beforeMonthlyCost, result.afterMonthlyCost, 1);
  const driverMax = Math.max(result.laborSavings, result.recoveredRevenue, monthlyPlatformCost, 1);
  const projection = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      label: `M${month}`,
      value: result.netMonthlyReturn * month
    };
  });
  const projectionMax = Math.max(...projection.map((point) => Math.abs(point.value)), 1);

  const inputGroups: {
    title: string;
    fields: {
      label: string;
      value: number;
      min: number;
      max: number;
      step: number;
      set: (value: number) => void;
      format: (value: number) => string;
    }[];
  }[] = [
    {
      title: "Demand",
      fields: [
        { label: "Monthly enquiries", value: monthlyContacts, min: 100, max: 10000, step: 100, set: setMonthlyContacts, format: (value) => roiNumber.format(value) },
        { label: "Currently missed", value: missedRate, min: 1, max: 60, step: 1, set: setMissedRate, format: formatPercent },
        { label: "New customer value", value: leadValue, min: 20, max: 1000, step: 10, set: setLeadValue, format: (value) => roiCurrency.format(value) }
      ]
    },
    {
      title: "Cost Base",
      fields: [
        { label: "Minutes per enquiry", value: avgHandleMinutes, min: 2, max: 20, step: 1, set: setAvgHandleMinutes, format: (value) => `${roiNumber.format(value)} min` },
        { label: "Team cost per hour", value: hourlyCost, min: 12, max: 90, step: 1, set: setHourlyCost, format: (value) => `${roiCurrency.format(value)}/hr` }
      ]
    },
    {
      title: "AI Model",
      fields: [
        { label: "Resolved or rescued", value: containmentRate, min: 30, max: 85, step: 1, set: setContainmentRate, format: formatPercent },
        { label: "Recovered lead close rate", value: conversionRate, min: 4, max: 35, step: 1, set: setConversionRate, format: formatPercent }
      ]
    }
  ];

  const comparisonRows = [
    {
      label: "Before RelayClarity",
      note: "Manual handling plus missed opportunity",
      value: result.beforeMonthlyCost,
      tone: "is-before"
    },
    {
      label: "After RelayClarity",
      note: "Residual cost plus platform investment",
      value: result.afterMonthlyCost,
      tone: "is-after"
    }
  ];

  const valueDrivers = [
    { label: "Team time saved", value: result.laborSavings, tone: "is-time" },
    { label: "Revenue recovered", value: result.recoveredRevenue, tone: "is-revenue" },
    { label: "Platform cost", value: monthlyPlatformCost, tone: "is-cost" }
  ];

  const insightCards = [
    {
      label: "Monthly net saving",
      value: formatSignedCurrency(result.netMonthlyReturn),
      text: `${formatPercent(result.costReductionPercent)} lower operating drag after platform cost.`
    },
    {
      label: "Annual net saving",
      value: formatSignedCurrency(result.annualNetReturn),
      text: `${roiCurrency.format(result.annualGrossValue)} gross annual value before subscription.`
    },
    {
      label: "Recovered demand",
      value: roiNumber.format(result.recoveredContacts),
      text: `${roiNumber.format(result.remainingMissedContacts)} missed enquiries remain in the model each month.`
    },
    {
      label: "Capacity released",
      value: `${roiNumber.format(result.laborHoursSaved)} hrs`,
      text: `${roiNumber.format(result.manualLaborHours)} hours of monthly enquiry handling modelled today.`
    }
  ];

  const methodRows = [
    { label: "Current manual handling cost", value: roiCurrency.format(result.manualLaborCost) },
    { label: "Current missed revenue", value: roiCurrency.format(result.missedRevenue) },
    { label: "Remaining manual handling after AI", value: roiCurrency.format(result.remainingLaborCost) },
    { label: "Remaining missed revenue after AI", value: roiCurrency.format(result.residualMissedRevenue) },
    { label: "RelayClarity monthly platform cost", value: roiCurrency.format(monthlyPlatformCost) },
    { label: "Net monthly saving", value: formatSignedCurrency(result.netMonthlyReturn), emphasis: true }
  ];

  return (
    <section className="roi-page roi-page--professional">
      <header className="roi-page-header roi-pro-header">
        <span>ROI Calculator</span>
        <h1>Calculate the real cost of missed enquiries.</h1>
        <p>Model enquiry volume, team cost, recovered revenue, and platform investment in one executive view.</p>
      </header>

      <div className="roi-pro-shell">
        <article className="roi-pro-calculator" aria-label="ROI calculator inputs">
          <header>
            <span>Business Profile</span>
            <h2>Operating assumptions</h2>
          </header>
          <div className="roi-pro-input-groups">
            {inputGroups.map((group) => (
              <section className="roi-pro-input-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.fields.map((field) => {
                  const fill = ((field.value - field.min) / (field.max - field.min)) * 100;
                  return (
                    <label className="roi-pro-field" key={field.label}>
                      <span>
                        <strong>{field.label}</strong>
                        <em>{field.format(field.value)}</em>
                      </span>
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={field.value}
                        style={{ "--roi-fill": `${fill}%` } as CSSProperties}
                        onChange={(event) => field.set(Number(event.target.value))}
                      />
                    </label>
                  );
                })}
              </section>
            ))}
          </div>
        </article>

        <aside className="roi-pro-forecast" aria-label="ROI forecast summary">
          <span>Estimated Outcome</span>
          <strong>{formatSignedCurrency(result.netMonthlyReturn)}</strong>
          <p>net monthly impact after the {roiCurrency.format(monthlyPlatformCost)} platform cost.</p>
          <dl>
            <div>
              <dt>Annual net saving</dt>
              <dd>{formatSignedCurrency(result.annualNetReturn)}</dd>
            </div>
            <div>
              <dt>ROI on monthly cost</dt>
              <dd>{formatPercent(result.roiPercent)}</dd>
            </div>
            <div>
              <dt>Payback period</dt>
              <dd>{paybackLabel}</dd>
            </div>
            <div>
              <dt>Recovered enquiries</dt>
              <dd>{roiNumber.format(result.recoveredContacts)}/mo</dd>
            </div>
          </dl>
          <div className="roi-pro-actions">
            <button className="primary-button" type="button" onClick={onContactSales}>Book ROI review</button>
            <button className="secondary-button" type="button" onClick={onOpenDashboard}>Open dashboard</button>
          </div>
        </aside>
      </div>

      <section className="roi-pro-insights" aria-labelledby="roi-insights-title">
        <header>
          <span>Detailed Savings Analysis</span>
          <h2 id="roi-insights-title">What changes financially</h2>
          <p>Before and after costs, gross value creation, net saving, and month-by-month payback are shown from the assumptions above.</p>
        </header>

        <div className="roi-pro-insight-grid">
          {insightCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>

        <div className="roi-pro-chart-grid">
          <article className="roi-pro-chart-card roi-pro-comparison">
            <header>
              <span>Monthly Cost</span>
              <h3>Before vs after</h3>
            </header>
            <div className="roi-pro-bars">
              {comparisonRows.map((row) => (
                <div className={`roi-pro-comparison-row ${row.tone}`} key={row.label}>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.note}</span>
                  </div>
                  <div className="roi-pro-bar-track" aria-hidden="true">
                    <i style={{ "--bar-width": `${Math.max(3, (row.value / comparisonMax) * 100)}%` } as CSSProperties} />
                  </div>
                  <em>{roiCurrency.format(row.value)}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="roi-pro-chart-card">
            <header>
              <span>Monthly Value</span>
              <h3>Value drivers</h3>
            </header>
            <div className="roi-pro-driver-list">
              {valueDrivers.map((driver) => (
                <div className={`roi-pro-driver ${driver.tone}`} key={driver.label}>
                  <span>{driver.label}</span>
                  <div className="roi-pro-bar-track" aria-hidden="true">
                    <i style={{ "--bar-width": `${Math.max(3, (driver.value / driverMax) * 100)}%` } as CSSProperties} />
                  </div>
                  <strong>{driver.tone === "is-cost" ? "-" : ""}{roiCurrency.format(driver.value)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="roi-pro-chart-card roi-pro-projection">
            <header>
              <span>12 Month View</span>
              <h3>Cumulative net saving</h3>
            </header>
            <div className="roi-pro-column-chart">
              {projection.map((point) => (
                <div className={point.value >= 0 ? "is-positive" : "is-negative"} key={point.label}>
                  <i style={{ "--projection-height": `${Math.max(7, (Math.abs(point.value) / projectionMax) * 100)}%` } as CSSProperties} />
                  <span>{point.label}</span>
                </div>
              ))}
            </div>
            <strong>{formatSignedCurrency(result.annualNetReturn)} after 12 months</strong>
          </article>

          <article className="roi-pro-chart-card roi-pro-method">
            <header>
              <span>Method</span>
              <h3>Calculation breakdown</h3>
            </header>
            <div>
              {methodRows.map((row) => (
                <p className={row.emphasis ? "is-emphasis" : ""} key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}

function SimplifiedRoiCalculatorMarketingPage({ onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  const [monthlyContacts, setMonthlyContacts] = useState(1200);
  const [missedRate, setMissedRate] = useState(18);
  const [leadValue, setLeadValue] = useState(180);
  const [avgHandleMinutes, setAvgHandleMinutes] = useState(6);
  const [hourlyCost, setHourlyCost] = useState(28);
  const [step, setStep] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultPeriod, setResultPeriod] = useState<"monthly" | "annual">("monthly");
  const containmentRate = 60;
  const conversionRate = 12;
  const monthlyPlatformCost = 950;

  const result = useMemo(() => {
    const missedContacts = monthlyContacts * (missedRate / 100);
    const aiHandledContacts = monthlyContacts * (containmentRate / 100);
    const humanContactsAfter = Math.max(0, monthlyContacts - aiHandledContacts);
    const currentLaborCost = (monthlyContacts * avgHandleMinutes * hourlyCost) / 60;
    const laborCostAfterAi = (humanContactsAfter * avgHandleMinutes * hourlyCost) / 60;
    const laborSavings = Math.max(0, currentLaborCost - laborCostAfterAi);
    const missedRevenue = missedContacts * leadValue * (conversionRate / 100);
    const recoveredRevenue = missedRevenue * (containmentRate / 100);
    const remainingMissedRevenue = Math.max(0, missedRevenue - recoveredRevenue);
    const monthlyValue = laborSavings + recoveredRevenue;
    const netMonthlySavings = monthlyValue - monthlyPlatformCost;
    const monthlyCostBefore = currentLaborCost + missedRevenue;
    const monthlyCostAfter = laborCostAfterAi + remainingMissedRevenue + monthlyPlatformCost;
    const annualSavings = netMonthlySavings * 12;
    const roiPercent = monthlyPlatformCost > 0 ? (netMonthlySavings / monthlyPlatformCost) * 100 : 0;
    const paybackDays = monthlyValue > 0 ? (monthlyPlatformCost / monthlyValue) * 30 : 0;
    const costPerHumanConversation = monthlyContacts > 0 ? currentLaborCost / monthlyContacts : 0;
    const aiCostPerConversation = monthlyContacts > 0 ? monthlyPlatformCost / monthlyContacts : 0;

    return {
      aiCostPerConversation,
      aiHandledContacts,
      annualSavings,
      costPerHumanConversation,
      currentLaborCost,
      humanContactsAfter,
      laborSavings,
      missedRevenue,
      monthlyCostAfter,
      monthlyCostBefore,
      monthlyValue,
      netMonthlySavings,
      paybackDays,
      recoveredRevenue,
      roiPercent
    };
  }, [avgHandleMinutes, hourlyCost, leadValue, missedRate, monthlyContacts]);

  const updateField = (setValue: (value: number) => void, value: number) => {
    setValue(value);
    setHasGenerated(false);
    setIsCalculating(false);
  };

  useEffect(() => {
    if (!isCalculating) return;

    const timer = window.setTimeout(() => {
      setIsCalculating(false);
      setHasGenerated(true);
    }, 1450);

    return () => window.clearTimeout(timer);
  }, [isCalculating]);

  const stages: {
    title: string;
    eyebrow: string;
    description: string;
    fields: {
      label: string;
      hint: string;
      value: number;
      min: number;
      max: number;
      step: number;
      suffix?: string;
      set: (value: number) => void;
    }[];
  }[] = [
    {
      eyebrow: "Step 1",
      title: "Call volume",
      description: "Start with the number of calls and chats you handle each month.",
      fields: [
        { label: "Monthly conversations", hint: "Calls and live chats combined.", value: monthlyContacts, min: 100, max: 10000, step: 100, suffix: "conversations", set: setMonthlyContacts }
      ]
    },
    {
      eyebrow: "Step 2",
      title: "Agent costs",
      description: "This estimates the cost of handling enquiries manually today.",
      fields: [
        { label: "Average handle time", hint: "Minutes spent on one customer conversation.", value: avgHandleMinutes, min: 2, max: 30, step: 1, suffix: "minutes", set: setAvgHandleMinutes },
        { label: "Team cost per hour", hint: "Fully loaded support or reception cost.", value: hourlyCost, min: 12, max: 90, step: 1, suffix: "GBP / hour", set: setHourlyCost }
      ]
    },
    {
      eyebrow: "Step 3",
      title: "Missed calls",
      description: "Estimate how much missed demand is worth to the business.",
      fields: [
        { label: "Currently missed", hint: "The share that is missed, delayed, or goes unanswered.", value: missedRate, min: 1, max: 60, step: 1, suffix: "%", set: setMissedRate },
        { label: "Average customer value", hint: "Estimated value of a converted new enquiry.", value: leadValue, min: 20, max: 1000, step: 10, suffix: "GBP", set: setLeadValue }
      ]
    }
  ];

  const activeStage = stages[step];
  const isLastStep = step === stages.length - 1;
  const periodMultiplier = resultPeriod === "annual" ? 12 : 1;
  const periodLabel = resultPeriod === "annual" ? "Annual" : "Monthly";
  const periodSuffix = resultPeriod === "annual" ? "/yr" : "/mo";
  const periodCostBefore = result.monthlyCostBefore * periodMultiplier;
  const periodCostAfter = result.monthlyCostAfter * periodMultiplier;
  const periodNetSavings = result.netMonthlySavings * periodMultiplier;
  const periodLaborSavings = result.laborSavings * periodMultiplier;
  const periodRecoveredRevenue = result.recoveredRevenue * periodMultiplier;
  const periodPlatformCost = monthlyPlatformCost * periodMultiplier;
  const costGraphMax = Math.max(periodCostBefore, periodCostAfter, 1);
  const formatSignedCurrency = (value: number) => `${value >= 0 ? "+" : "-"}${roiCurrency.format(Math.abs(value))}`;
  const costReductionPercent = result.monthlyCostBefore > 0 ? ((result.monthlyCostBefore - result.monthlyCostAfter) / result.monthlyCostBefore) * 100 : 0;
  const paybackLabel = result.monthlyValue > 0 ? `${Math.max(1, Math.round(result.paybackDays))} days` : "Not met";
  const savingsDriverMax = Math.max(periodLaborSavings, periodRecoveredRevenue, periodPlatformCost, 1);
  const projectionRows = [3, 6, 9, 12].map((month) => ({
    label: `${month}m`,
    value: result.netMonthlySavings * month
  }));
  const projectionMax = Math.max(...projectionRows.map((row) => Math.abs(row.value)), 1);

  const handleFieldChange = (field: (typeof activeStage.fields)[number], rawValue: string) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return;
    const clampedValue = Math.min(field.max, Math.max(field.min, numericValue));
    updateField(field.set, clampedValue);
  };

  const handleNext = () => {
    if (isLastStep) {
      setResultPeriod("monthly");
      setHasGenerated(false);
      setIsCalculating(true);
      return;
    }
    setStep((currentStep) => Math.min(stages.length - 1, currentStep + 1));
  };

  const summaryMetrics = [
    { label: "ROI", value: `${Math.round(result.roiPercent)}%`, note: "Return after platform cost" },
    { label: "Cost cut", value: `${Math.max(0, Math.round(costReductionPercent))}%`, note: "Lower estimated run-rate" },
    { label: "Calls covered", value: `${roiNumber.format(result.aiHandledContacts * periodMultiplier)}${periodSuffix}`, note: "Handled or recovered by AI" },
    { label: "Payback", value: paybackLabel, note: "Estimated cost recovery" }
  ];

  const financialRows = [
    { label: "Current cost", value: roiCurrency.format(periodCostBefore), tone: "is-before" },
    { label: "With RelayClarity", value: roiCurrency.format(periodCostAfter), tone: "is-after" },
    { label: "Net saving", value: formatSignedCurrency(periodNetSavings), tone: "is-saving" }
  ];

  const driverRows = [
    { label: "Team time saved", value: periodLaborSavings, display: roiCurrency.format(periodLaborSavings), tone: "is-time" },
    { label: "Missed revenue recovered", value: periodRecoveredRevenue, display: roiCurrency.format(periodRecoveredRevenue), tone: "is-revenue" },
    { label: "Platform cost", value: periodPlatformCost, display: `-${roiCurrency.format(periodPlatformCost)}`, tone: "is-cost" }
  ];

  return (
    <section className="roi-page roi-simple-page">
      <section className="roi-simple-hero" aria-label="ROI calculator overview">
        <div className="roi-simple-hero-panel">
          <div className="pp-aurora roi-simple-aurora" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <motion.div
            className="roi-simple-header"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1>
              Find the value <span className="pp-shimmer">hidden in every enquiry.</span>
            </h1>
            <p>
              Estimate the time, missed revenue, and monthly savings RelayClarity can recover.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="roi-simple-calculator-section" aria-label="ROI calculator">
        <div id="roi-calculator" className={`roi-simple-shell ${hasGenerated || isCalculating ? "has-results" : "is-wizard-only"}`}>
        {!hasGenerated && !isCalculating ? (
          <article className="roi-simple-card">
            <ol className="roi-simple-steps" aria-label="ROI calculator progress">
              {stages.map((stage, index) => (
                <li className={index === step ? "is-active" : index < step ? "is-done" : ""} key={stage.title}>
                  <button type="button" onClick={() => setStep(index)} disabled={index > step && !hasGenerated}>
                    <i>{index + 1}</i>
                    <span>{stage.title}</span>
                  </button>
                </li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="roi-simple-stage"
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: 12 }}
                key={activeStage.title}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <header>
                  <span>{activeStage.eyebrow} of {stages.length}</span>
                  <h2>{activeStage.title}</h2>
                  <p>{activeStage.description}</p>
                </header>

                <div className="roi-simple-fields">
                  {activeStage.fields.map((field) => {
                    const fill = ((field.value - field.min) / (field.max - field.min)) * 100;
                    return (
                      <label className="roi-simple-field" key={field.label}>
                        <span className="roi-simple-field-head">
                          <strong>{field.label}</strong>
                        </span>
                        <span className="roi-simple-input-box">
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={field.value}
                            onChange={(event) => handleFieldChange(field, event.target.value)}
                          />
                          {field.suffix ? <small>{field.suffix}</small> : null}
                        </span>
                        <input
                          type="range"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={field.value}
                          style={{ "--roi-fill": `${fill}%` } as CSSProperties}
                          onChange={(event) => handleFieldChange(field, event.target.value)}
                        />
                        <small>{field.hint}</small>
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            <footer className="roi-simple-actions">
              <button className="secondary-button" type="button" onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))} disabled={step === 0}>
                Back
              </button>
              <button className="primary-button" type="button" onClick={handleNext}>
                {isLastStep ? "Generate ROI" : "Next step"}
              </button>
            </footer>
          </article>
        ) : null}

        {isCalculating ? (
          <motion.article
            className="roi-simple-calculating"
            aria-live="polite"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="roi-simple-calculation-mark" aria-hidden="true">
              <i></i>
            </div>
            <header>
              <h2>Calculating your ROI</h2>
              <p>Building your estimate.</p>
            </header>
            <div className="roi-simple-calculation-meter" aria-hidden="true">
              <i></i>
            </div>
          </motion.article>
        ) : null}

        {hasGenerated ? (
        <aside className="roi-simple-output roi-simple-output--single has-results" aria-live="polite">
          <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="roi-simple-results"
                exit={{ opacity: 0, y: -8 }}
                initial={{ opacity: 0, y: 12 }}
                key="results"
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <header>
                  <span>{periodLabel} estimate</span>
                  <div className="roi-simple-result-tabs" role="group" aria-label="ROI result period">
                    <button className={resultPeriod === "monthly" ? "is-active" : ""} type="button" aria-pressed={resultPeriod === "monthly"} onClick={() => setResultPeriod("monthly")}>
                      Monthly
                    </button>
                    <button className={resultPeriod === "annual" ? "is-active" : ""} type="button" aria-pressed={resultPeriod === "annual"} onClick={() => setResultPeriod("annual")}>
                      Annual
                    </button>
                  </div>
                </header>

                <div className="roi-simple-stat-panel">
                  <section className="roi-simple-stat-hero" aria-label="Estimated ROI headline">
                    <strong>{formatSignedCurrency(periodNetSavings)}</strong>
                    <p>
                      Based on {roiNumber.format(monthlyContacts)} conversations per month, RelayClarity cuts estimated {resultPeriod} cost from {roiCurrency.format(periodCostBefore)} to {roiCurrency.format(periodCostAfter)}.
                    </p>
                  </section>

                  <dl className="roi-simple-stat-list" aria-label="Estimated ROI statistics">
                    {summaryMetrics.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                        <small>{item.note}</small>
                      </div>
                    ))}
                  </dl>

                  <section className="roi-simple-stat-section" aria-label={`${periodLabel} financial picture`}>
                    <h3>{periodLabel} financial picture</h3>
                    <div className="roi-simple-financial-strip">
                      {financialRows.map((row) => (
                        <article className={row.tone} key={row.label}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </article>
                      ))}
                    </div>
                  </section>

                  <div className="roi-simple-graph-grid">
                    <article className="roi-simple-graph-card">
                      <header>
                        <span>Cost comparison</span>
                        <strong>{Math.max(0, Math.round(costReductionPercent))}% lower</strong>
                      </header>
                      <div className="roi-simple-cost-graph" aria-label={`${periodLabel} cost before and after RelayClarity`}>
                        <div>
                          <span>Current</span>
                          <i style={{ "--bar-width": `${Math.max(4, (periodCostBefore / costGraphMax) * 100)}%` } as CSSProperties}></i>
                          <strong>{roiCurrency.format(periodCostBefore)}</strong>
                        </div>
                        <div>
                          <span>RelayClarity</span>
                          <i className="is-after" style={{ "--bar-width": `${Math.max(4, (periodCostAfter / costGraphMax) * 100)}%` } as CSSProperties}></i>
                          <strong>{roiCurrency.format(periodCostAfter)}</strong>
                        </div>
                      </div>
                    </article>

                    <article className="roi-simple-graph-card">
                      <header>
                        <span>12-month projection</span>
                        <strong>{formatSignedCurrency(result.annualSavings)}</strong>
                      </header>
                      <div className="roi-simple-column-chart" aria-label="Cumulative net savings projection">
                        {projectionRows.map((row) => (
                          <div className={row.value < 0 ? "is-negative" : ""} key={row.label}>
                            <i style={{ "--projection-height": `${Math.max(8, (Math.abs(row.value) / projectionMax) * 100)}%` } as CSSProperties}></i>
                            <span>{row.label}</span>
                            <strong>{formatSignedCurrency(row.value)}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <section className="roi-simple-stat-section" aria-label="Savings breakdown">
                    <h3>Where the saving comes from</h3>
                    <div className="roi-simple-stat-bars">
                      {driverRows.map((row) => (
                        <div className={row.tone === "is-cost" ? "is-cost" : ""} key={row.label}>
                          <span>{row.label}</span>
                          <i className={row.tone} style={{ "--bar-width": `${Math.max(4, (row.value / savingsDriverMax) * 100)}%` } as CSSProperties} />
                          <strong>{row.display}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>

                <footer className="roi-simple-result-footer">
                  <div>
                    <strong>Ready to validate this model?</strong>
                    <span>Book a demo and we will review the assumptions with you.</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => setHasGenerated(false)}>Adjust assumptions</button>
                  <button className="primary-button" type="button" onClick={onContactSales}>Book a demo</button>
                </footer>
              </motion.div>
          </AnimatePresence>
        </aside>
        ) : null}
        </div>
      </section>
    </section>
  );
}

function DemoMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  return (
    <>
      <MarketingPageHero
        eyebrow="Demo"
        title="See the agent answer, qualify, and hand off."
        lead="Use the live workspace to test voice and chat flows against your own business details, pricing rules, and escalation policy."
        primaryLabel="Open dashboard"
        secondaryLabel="Contact sales"
        onPrimary={onOpenDashboard}
        onSecondary={onContactSales}
      >
        <video className="marketing-page-video" src="/voice-orb-demo-loop.mp4" autoPlay loop muted playsInline preload="metadata" />
      </MarketingPageHero>
      <section className="section marketing-feature-section">
        <div className="marketing-proof-grid">
          {["Business brief", "Live call test", "Chat simulation", "Launch report"].map((item) => (
            <article key={item}><strong>{item}</strong><span>Validate the experience before customers use it.</span></article>
          ))}
        </div>
      </section>
    </>
  );
}

function LaunchMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  const steps = [
    { title: "Test real conversations", detail: "Bookings, pricing, urgent requests, and edge cases checked before launch.", image: launchPhotoTestUrl },
    { title: "Approve guardrails", detail: "Decide what the agent can say and when it must hand over.", image: launchPhotoControlUrl },
    { title: "Observe the first calls", detail: "Track outcomes, transcript quality, and human handoff as the pilot goes live.", image: launchPhotoObserveUrl },
    { title: "Launch with evidence", detail: "Share the score, blockers, owners, and next steps with your team.", image: launchPhotoLaunchUrl }
  ];
  return (
    <>
      <MarketingPageHero
        eyebrow="Launch"
        title="Go live only when the evidence is strong."
        lead="RelayClarity treats launch as a gate, not a guess: scenario tests, guardrails, and handoff review happen before production traffic."
        primaryLabel="Open dashboard"
        secondaryLabel="Contact sales"
        onPrimary={onOpenDashboard}
        onSecondary={onContactSales}
      >
        <div className="launch-score-card"><span>Launch score</span><strong>94%</strong><p>Ready after final policy review</p></div>
      </MarketingPageHero>
      <section className="section marketing-feature-section">
        <div className="launch-page-grid">
          {steps.map((step) => (
            <article key={step.title}>
              <img src={step.image} alt="" loading="lazy" />
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ReviewsMarketingPage({ onOpenDashboard, onContactSales }: { onOpenDashboard: () => void; onContactSales: () => void }) {
  return (
    <>
      <MarketingPageHero
        eyebrow="Reviews"
        title="Customer teams use RelayClarity to keep every request visible."
        lead="See how teams move from missed calls and scattered notes to tested agents, cleaner handoffs, and searchable outcomes."
        primaryLabel="Open dashboard"
        secondaryLabel="Contact sales"
        onPrimary={onOpenDashboard}
        onSecondary={onContactSales}
      >
        <div className="review-quote-panel">
          <strong>"We finally see what happened on every conversation."</strong>
          <span>Operations lead, Clear DBS</span>
        </div>
      </MarketingPageHero>
      <section className="section testimonials-section marketing-reviews-section">
        <div className="reviews-page-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <img src={testimonial.image} alt="" loading="lazy" />
              <h2>{testimonial.storyTitle}</h2>
              <p>&ldquo;{testimonial.quote}&rdquo;</p>
              <span>{testimonial.name}, {testimonial.company}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function DedicatedMarketingPage({
  view,
  onOpenDashboard,
  onContactSales,
  onNavigate
}: {
  view: MarketingPageView;
  onOpenDashboard: () => void;
  onContactSales: () => void;
  onNavigate: (view: AppView, params?: Record<string, string>) => void;
}) {
  switch (view) {
    case "platform":
      return <PlatformMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
    case "integrations":
      return <IntegrationsMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
    case "pricing":
      return <PricingMarketingPage onContactSales={onContactSales} onNavigate={onNavigate} />;
    case "roi":
      return <SimplifiedRoiCalculatorMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
    case "demo":
      return <DemoMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
    case "launch":
      return <LaunchMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
    case "reviews":
      return <ReviewsMarketingPage onOpenDashboard={onOpenDashboard} onContactSales={onContactSales} />;
  }
}

function readAppViewFromLocation(): AppView {
  const requestedPath = window.location.pathname.replace(/\/+$/, "");
  const requestedView = new URLSearchParams(window.location.search).get("view");

  if (requestedPath === "/dashboard") {
    return "dashboard";
  }

  if (requestedPath === "/setup") {
    return "setup";
  }

  if (requestedPath === "/login" || requestedPath === "/reset-password") {
    return "auth";
  }

  if (requestedPath === "/contact-sales") {
    return "contact-sales";
  }

  if (requestedPath === "/checkout") {
    return "checkout";
  }

  if (requestedPath === "/checkout/success") {
    return "checkout-success";
  }

  if (requestedPath === "/privacy") {
    return "privacy";
  }

  const marketingView = marketingViewByPath[requestedPath];
  if (marketingView) {
    return marketingView;
  }

  if (requestedView === "dashboard") {
    return "dashboard";
  }

  if (requestedView === "setup") {
    return "setup";
  }

  if (requestedView === "login") {
    return "auth";
  }

  if (requestedView === "contact-sales") {
    return "contact-sales";
  }

  if (requestedView === "checkout") {
    return "checkout";
  }

  if (requestedView === "checkout-success") {
    return "checkout-success";
  }

  if (requestedView === "privacy") {
    return "privacy";
  }

  if (marketingPageViews.includes(requestedView as MarketingPageView)) {
    return requestedView as MarketingPageView;
  }

  return "home";
}

function appViewUrl(view: AppView, params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  searchParams.delete("view");

  const path = view === "dashboard"
    ? "/dashboard"
    : view === "setup"
      ? "/setup"
    : view === "auth"
        ? "/login"
        : view === "contact-sales"
          ? "/contact-sales"
          : view === "checkout"
            ? "/checkout"
            : view === "checkout-success"
              ? "/checkout/success"
              : view === "privacy"
                ? "/privacy"
                : marketingPageViews.includes(view as MarketingPageView)
                  ? marketingPathByView[view as MarketingPageView]
                  : "/";

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function updateAppHistory(view: AppView, mode: "push" | "replace" = "push", params?: Record<string, string>) {
  window.history[mode === "push" ? "pushState" : "replaceState"]({ view }, "", appViewUrl(view, params));
}

function readSetupStepFromLocation(maxStep: number) {
  const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
  return Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= maxStep ? requestedStep : 0;
}

function setupStepUrl(step: number) {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("view", "setup");

  if (step > 0) {
    searchParams.set("step", String(step));
  } else {
    searchParams.delete("step");
  }

  return `${window.location.pathname}?${searchParams.toString()}`;
}

function App() {
  const customerStoriesRef = useRef<HTMLElement>(null);
  const customerStoriesViewportRef = useRef<HTMLDivElement | null>(null);
  const customerStoriesRailRef = useRef<HTMLDivElement | null>(null);
  const demoChatThreadRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<AppView>(() => readAppViewFromLocation());
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("billing");
  const [demoCompany, setDemoCompany] = useState("");
  const [demoBusinessType, setDemoBusinessType] = useState("");
  const [demoDescription, setDemoDescription] = useState("");
  const [demoMode, setDemoMode] = useState<DemoMode>("chat");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoCountry, setDemoCountry] = useState("GB");
  const [callStage, setCallStage] = useState<DemoCallStage>("idle");
  const [callCooldown, setCallCooldown] = useState(0);
  const callTimersRef = useRef<number[]>([]);
  const [demoChatInput, setDemoChatInput] = useState("");
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([]);
  const [isDemoQuestionOpen, setIsDemoQuestionOpen] = useState(false);
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
  const [projects, setProjects] = useState<Project[]>(() => projectsForUser(null));
  const [activeProjectId, setActiveProjectId] = useState("clear-dbs-live");
  const [setupSessionId, setSetupSessionId] = useState(0);
  const { scrollY, scrollYProgress } = useScroll();
  const { scrollYProgress: customerStoriesProgress } = useScroll({
    target: customerStoriesRef,
    offset: ["start start", "end end"]
  });
  const heroY = useTransform(scrollY, [0, 820], [0, 96]);
  const heroScale = useTransform(scrollY, [0, 820], [1.06, 1.16]);
  const heroOpacity = useTransform(scrollY, [0, 720], [1, 0.6]);
  const heroGridY = useTransform(scrollY, [0, 820], [0, -64]);
  const customerStoriesX = useTransform(customerStoriesProgress, [0, 0.16, 1], [0, 0, -customerStoriesTravel]);
  const selectedScenario = scenarios[scenarioKey];
  const demoPlaybook = useMemo(() => getBusinessPlaybook(demoBusinessType), [demoBusinessType]);

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

  const navigateToView = (nextView: AppView, mode: "push" | "replace" = "push", params?: Record<string, string>) => {
    setView(nextView);
    updateAppHistory(nextView, mode, params);
  };

  const openDashboard = async () => {
    if (authStatus === "signed-in" && authUser) {
      navigateToView("dashboard");
      return;
    }

    setView("auth");
    updateAppHistory("auth");
    const payload = await refreshAuth();

    if (payload.user) {
      navigateToView("dashboard", "replace");
    } else {
      updateAppHistory("auth", "replace");
    }
  };

  const handleSignedIn = (payload: AuthPayload) => {
    setAuthUser(payload.user);
    setGoogleAuthAvailable(payload.googleAuthAvailable);
    setAuthStatus(payload.user ? "signed-in" : "signed-out");
    const signInParams = new URLSearchParams(window.location.search);
    if (payload.user && signInParams.get("checkout") === "1") {
      navigateToView("checkout", "replace", {
        plan: signInParams.get("plan") || "operate",
        billing: signInParams.get("billing") || "annual",
      });
      return;
    }
    navigateToView(payload.user ? payload.user.onboarded ? "dashboard" : "setup" : "auth", "replace");
  };

  const handleCheckoutSignedIn = (payload: AuthPayload) => {
    setAuthUser(payload.user);
    setGoogleAuthAvailable(payload.googleAuthAvailable);
    setAuthStatus(payload.user ? "signed-in" : "signed-out");

    const searchParams = new URLSearchParams(window.location.search);
    const plan = searchParams.get("plan") || "operate";
    const billing = searchParams.get("billing") || "monthly";
    navigateToView(payload.user ? "checkout" : "auth", "replace", { plan, billing });
  };

  const handleCheckoutSuccessSignedIn = (payload: AuthPayload) => {
    setAuthUser(payload.user);
    setGoogleAuthAvailable(payload.googleAuthAvailable);
    setAuthStatus(payload.user ? "signed-in" : "signed-out");

    const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
    navigateToView(payload.user ? "checkout-success" : "auth", "replace", sessionId ? { session_id: sessionId } : undefined);
  };

  const handleSignOut = async () => {
    try {
      await fetchJsonFromApi<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch (_error) {
      // Local sign-out still clears the gated dashboard even if the API is unavailable.
    }

    setAuthUser(null);
    setAuthStatus("signed-out");
    navigateToView("home", "replace");
  };

  const backToHome = () => {
    navigateToView("home");
  };

  const startNewProjectSetup = () => {
    setSetupSessionId((current) => current + 1);
    navigateToView("setup");
  };

  const completeProjectSetup = async (project: Project) => {
    setProjects((currentProjects) => [...currentProjects, project]);
    setActiveProjectId(project.id);
    try {
      await fetchJsonFromApi<{ project: Project; projects: Project[] }>("/api/dashboard/projects", {
        method: "POST",
        body: JSON.stringify(project),
      });
      const payload = await fetchJsonFromApi<AuthPayload>("/api/auth/onboarding/complete", { method: "POST" });
      setAuthUser(payload.user);
      setGoogleAuthAvailable(payload.googleAuthAvailable);
    } catch (_error) {
      setAuthUser((current) => current ? { ...current, onboarded: true } : current);
    }
    navigateToView("dashboard");
  };

  const openContactSales = () => {
    navigateToView("contact-sales");
  };

  useEffect(() => {
    const thread = demoChatThreadRef.current;
    if (!thread) {
      return;
    }

    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [demoMessages, isDemoQuestionOpen, isDemoTyping]);

  useEffect(() => {
    refreshAuth().then((payload) => {
      if (view === "dashboard" && !payload.user) {
        navigateToView("auth", "replace");
      } else if ((view === "dashboard" || view === "setup") && payload.user && !payload.user.onboarded) {
        navigateToView("setup", "replace");
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadProjectsForUser(authUser)
      .then((nextProjects) => {
        if (cancelled) {
          return;
        }

        setProjects(nextProjects);
        setActiveProjectId(nextProjects[0]?.id || "");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        const fallbackProjects = projectsForUser(authUser);
        setProjects(fallbackProjects);
        setActiveProjectId(fallbackProjects[0]?.id || "");
      });

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.accountType]);

  useEffect(() => {
    const handlePopState = () => {
      setView(readAppViewFromLocation());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector(window.location.hash)?.scrollIntoView();
    });
  }, []);

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
  const demoDialCode = (COUNTRIES.find((country) => country.iso === demoCountry) ?? COUNTRIES[0]).dial;
  const demoNationalNumber = demoPhone.replace(/\D/g, "").replace(/^0+/, "");
  const fullDemoPhone = `${demoDialCode}${demoNationalNumber}`;
  const isDemoPhoneValid = /^\+\d{8,15}$/.test(fullDemoPhone) && demoNationalNumber.length >= 6;
  const canGenerateDemo = Boolean(
    demoCompany.trim() && demoBusinessType.trim() && demoDescription.trim() && isDemoPhoneValid && callCooldown === 0
  );
  const demoBusinessChips = ["Dental clinic", "Estate agency", "Financial adviser", "Law firm", "Veterinary practice", "Salon & spa"];
  const callStageMeta: Record<DemoCallStage, { label: string; detail: string }> = {
    idle: { label: "Ready", detail: "Request a call to hear your agent." },
    dialing: { label: "Placing call", detail: `Connecting to ${fullDemoPhone}...` },
    ringing: { label: "Ringing", detail: "Answer your phone to hear your agent introduce itself." },
    live: { label: "On the call", detail: "Your agent is walking through its approved script." },
    ended: { label: "Call complete", detail: "Hear it again, or edit the setup to try a different business." },
    failed: { label: "Call not placed", detail: demoCallStatus.message },
  };
  const launchSteps = [
    {
      label: "Test",
      title: "Test real conversations",
      detail: "Bookings, pricing, and urgent requests — checked before launch.",
      visual: launchPhotoTestUrl
    },
    {
      label: "Controls",
      title: "Approve the guardrails",
      detail: "Decide what the agent can say and when it hands over.",
      visual: launchPhotoControlUrl
    },
    {
      label: "Observe",
      title: "Watch the first live calls",
      detail: "Track outcomes and handoffs as the pilot goes live.",
      visual: launchPhotoObserveUrl
    },
    {
      label: "Launch",
      title: "Launch with a clear handoff",
      detail: "A concise summary with owners and next steps.",
      visual: launchPhotoLaunchUrl
    }
  ];
  const activeStep = launchSteps[activeLaunchStep];
  const isClearDbsDemo = /clear\s*dbs|cleardbs/i.test(demoCompany);
  const demoBrandLogoUrl = isClearDbsDemo ? clearDbsLogoUrl : relayclarityLogoUrl;
  const demoHeaderStyle = isClearDbsDemo
    ? ({ "--chat-hero-image": `url(${clearDbsChatHeaderUrl})` } as React.CSSProperties)
    : undefined;

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

  const clearCallTimers = () => {
    callTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    callTimersRef.current = [];
  };

  useEffect(() => {
    if (callCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCallCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [callCooldown]);

  useEffect(
    () => () => {
      callTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const requestDemoCall = async () => {
    clearCallTimers();
    setIsCallingDemo(true);
    setCallStage("dialing");
    setDemoCallStatus({ tone: "idle", message: `Placing a call to ${fullDemoPhone}...` });

    try {
      const response = await fetch(`${apiBaseUrl}/api/telephony/outbound-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: fullDemoPhone,
          businessName: demoCompany,
          greeting: `Thanks for calling ${demoCompany || "your business"}. How can I help today?`,
          callerNeed: demoPlaybook.customerExamples[0] || "a common caller request",
          approvedAnswer: demoAgentSummary,
          handoff: "Transfer complex or urgent callers to the business team.",
          reference: `${demoBusinessType}. ${demoDescription}`
        })
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const wait = Math.max(5, Number(result.retryAfterSeconds) || 60);
        setCallCooldown(wait);
        throw new Error(result.error || "Too many test calls right now. Please wait a moment.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Call request failed");
      }

      if (result.mode === "call") {
        setCallStage("ringing");
        setDemoCallStatus({
          tone: "success",
          message: `Calling ${result.to}. Answer your phone to hear your agent.`
        });
        setCallCooldown(60);
        callTimersRef.current.push(window.setTimeout(() => setCallStage("live"), 11000));
        callTimersRef.current.push(window.setTimeout(() => setCallStage("ended"), 58000));
        return;
      }

      setCallStage("failed");
      setDemoCallStatus({
        tone: "setup",
        message: result.message || "Phone calling is ready in the interface, but outbound telephony is not configured yet."
      });
    } catch (error) {
      setCallStage("failed");
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
    if (!canGenerateDemo) {
      return;
    }

    setIsGeneratingDemo(true);
    setDemoBuilt(false);
    setCallStage("dialing");
    window.setTimeout(() => {
      setDemoCallStatus({
        tone: "idle",
        message: `Placing a call to ${fullDemoPhone}...`
      });
      setDemoBuilt(true);
      setIsGeneratingDemo(false);
      void requestDemoCall();
    }, 1850);
  };

  const sendDemoChat = async () => {
    const message = demoChatInput.trim();

    if (!message || !demoBuilt || isDemoTyping) {
      return;
    }

    setDemoMode("chat");
    setIsDemoQuestionOpen(true);
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

  if (view === "privacy") {
    return (
      <PrivacyPolicyPage
        onNavigate={(nextView, params) => navigateToView(nextView, "push", params)}
        onContactSales={openContactSales}
      />
    );
  }

  if (view === "dashboard") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    if (!authUser) {
      return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} />;
    }

    if (!authUser.onboarded) {
      return (
        <Dashboard
          key={setupSessionId}
          user={authUser}
          onSignOut={handleSignOut}
          onProjectComplete={completeProjectSetup}
        />
      );
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
    const authParams = new URLSearchParams(window.location.search);
    return (
      <AuthScreen
        googleAuthAvailable={googleAuthAvailable}
        onBack={authParams.get("checkout") === "1" ? () => navigateToView("checkout", "replace", {
          plan: authParams.get("plan") || "operate",
          billing: authParams.get("billing") || "annual",
        }) : backToHome}
        onSignedIn={handleSignedIn}
        initialMode={authParams.get("checkout") === "1" ? "signup" : "signin"}
      />
    );
  }

  if (view === "checkout") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    return (
      <SecureCheckoutPage
        user={authUser}
        onNavigate={(nextView, params) => navigateToView(nextView, "push", params)}
        onContactSales={openContactSales}
        onRequireAccount={() => {
          const searchParams = new URLSearchParams(window.location.search);
          navigateToView("auth", "push", {
            checkout: "1",
            plan: searchParams.get("plan") || "operate",
            billing: searchParams.get("billing") || "annual",
          });
        }}
      />
    );
  }

  if (view === "checkout-success") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    if (!authUser) {
      return (
        <AuthScreen
          googleAuthAvailable={googleAuthAvailable}
          onBack={() => navigateToView("pricing")}
          onSignedIn={handleCheckoutSuccessSignedIn}
        />
      );
    }

    return (
      <CheckoutSuccessPage
        user={authUser}
        onNavigate={(nextView, params) => navigateToView(nextView, "push", params)}
        onContactSales={openContactSales}
      />
    );
  }

  if (view === "contact-sales") {
    return (
      <ContactSalesPage
        onNavigate={(nextView) => navigateToView(nextView)}
        onOpenDashboard={openDashboard}
      />
    );
  }

  if (marketingPageViews.includes(view as MarketingPageView)) {
    return (
      <MarketingPageFrame
        activeView={view}
        onNavigate={(nextView) => navigateToView(nextView)}
        onContactSales={openContactSales}
        onOpenDashboard={openDashboard}
      >
        <DedicatedMarketingPage
          view={view as MarketingPageView}
          onOpenDashboard={openDashboard}
          onContactSales={openContactSales}
          onNavigate={(nextView, params) => navigateToView(nextView, "push", params)}
        />
      </MarketingPageFrame>
    );
  }

  if (view === "setup") {
    if (authStatus === "checking") {
      return <AuthLoading />;
    }

    if (!authUser) {
      return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} />;
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

  return (
    <div className="site-shell">
      <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <MarketingNav
        activeView={view}
        onNavigate={(nextView) => navigateToView(nextView)}
        onContactSales={openContactSales}
        onOpenDashboard={openDashboard}
      />

      <main>
        <section className="hero" id="home">
          <motion.div className="hero-media" style={{ y: heroY, scale: heroScale, opacity: heroOpacity }} aria-hidden="true" />
          <motion.div className="hero-grid" style={{ y: heroGridY }} aria-hidden="true" />
          <div className="hero-content">
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
            <div className="hero-meta" aria-label="Platform highlights">
              <div>
                <strong>Voice + chat</strong>
                <span>One agent, both channels</span>
              </div>
              <div>
                <strong>Human handoff</strong>
                <span>Clean escalation built in</span>
              </div>
              <div>
                <strong>Launch evidence</strong>
                <span>Every scenario tested before go-live</span>
              </div>
            </div>
          </div>
        </section>

        <PlatformParallaxSection />{/*
                    Meet <em>Clara</em> — your AI agent, live in days.

        */}
        <WorkflowTimelineSection />

        <ExplainerSection />

        <CapabilityCardsSection />

        <section className="section demo-section" id="demo">
          <div className="demo-lab-frame">
            <div className={`demo-lab ${isGeneratingDemo ? "is-loading" : demoBuilt ? "is-generated" : "is-configuring"}`}>
            <AnimatePresence mode="wait">
              {!demoBuilt && !isGeneratingDemo ? (
                <>
                <motion.div
                  className="demo-builder"
                  key="demo-setup"
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.96, filter: "blur(8px)" }}
                  transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="builder-visual">
                    <div className="builder-video-shell">
                      <video
                        className="builder-demo-video"
                        src="/voice-orb-demo-loop.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        aria-label="AI assistant demo preview"
                      />
                    </div>
                    <div className="builder-chips" role="group" aria-label="Example business types">
                      {demoBusinessChips.map((chip) => (
                        <button
                          type="button"
                          key={chip}
                          className={demoBusinessType === chip ? "is-selected" : ""}
                          onClick={() => {
                            setDemoBusinessType(chip);
                            setDemoBuilt(false);
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="builder-form">
                    <p className="builder-heading">
                      Add a few details about your business and receive a live call from your agent.
                    </p>

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
                          placeholder="Your company"
                          required
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
                          placeholder="Dental clinic, estate agency..."
                          required
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
                          required
                        />
                      </label>

                      <div className="demo-phone-field is-wide">
                        <span>Phone number</span>
                        <div className="demo-phone-row">
                          <CountrySelect value={demoCountry} onChange={setDemoCountry} />
                          <input
                            type="tel"
                            value={demoPhone}
                            onChange={(event) => {
                              setDemoPhone(event.target.value);
                              setDemoBuilt(false);
                            }}
                            placeholder="7400 123456"
                            aria-label="Phone number"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="demo-builder-footer">
                      <button className="demo-generate-button" type="button" onClick={generateDemoAgent} disabled={!canGenerateDemo}>
                        Request a call
                      </button>
                      {callCooldown > 0 ? <small className="demo-cooldown-note">You can request another call in {callCooldown}s.</small> : null}
                    </div>
                  </div>
                </motion.div>
                </>
              ) : isGeneratingDemo ? (
                <>
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
                      Reading the {demoBusinessType || demoPlaybook.label} profile, shaping approved answers, and preparing your test call.
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
                      <span>Phone call test</span>
                    </div>
                  </div>

                  <div className="demo-loading-bar" aria-hidden="true"><b /></div>
                </motion.div>
                </>
	              ) : (
                <>
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
                      <span>Live call</span>
                      <strong>{demoCompany || "Your business"}</strong>
                    </div>
                    <div className="demo-generated-actions">
                      <b>{demoPlaybook.label}</b>
                      <button
                        type="button"
                        onClick={() => {
                          clearCallTimers();
                          setCallStage("idle");
                          setDemoBuilt(false);
                        }}
                      >
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
                    <div className="demo-call-stage" data-stage={callStage}>
                      <div className="call-stage-visual" aria-hidden="true">
                        <span className="call-ring" />
                        <span className="call-ring" />
                        <span className="call-ring" />
                        <span className="call-stage-orb">
                          <span className="call-wave"><i /><i /><i /><i /><i /></span>
                        </span>
                      </div>

                      <div className="call-stage-copy" aria-live="polite">
                        <span className="call-stage-label">{callStageMeta[callStage].label}</span>
                        <strong>{demoCompany || "Your business"} voice agent</strong>
                        <p>{callStageMeta[callStage].detail}</p>
                      </div>

                      <div className="call-stage-actions">
                        <button
                          type="button"
                          onClick={() => void requestDemoCall()}
                          disabled={isCallingDemo || callCooldown > 0 || callStage === "dialing" || callStage === "ringing" || callStage === "live"}
                        >
                          {isCallingDemo
                            ? "Calling..."
                            : callStage === "ringing" || callStage === "live"
                              ? "Call in progress"
                              : callCooldown > 0
                                ? `Call again in ${callCooldown}s`
                                : "Call me again"}
                        </button>
                        <small>{fullDemoPhone}</small>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="handoff-section" id="handoff">
          <Reveal className="handoff-showcase">
            <div className="handoff-heading">
              <h2>From demo to launch.</h2>
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
                  </motion.div>
                </AnimatePresence>
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

        <section className="section testimonials-section" id="testimonials" ref={customerStoriesRef}>
          <div className="customer-stories-sticky">
            <Reveal className="testimonials-heading">
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

        <SecuritySection />

        <section className="section faq-section" id="faqs">
          <div className="faq-shell">
            <Reveal className="faq-stage">
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
                <a
                  className="footer-brand"
                  href={appViewUrl("home")}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToView("home");
                  }}
                  aria-label="RelayClarity home"
                >
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
                    {column.links.map((link) => {
                      const linkHref = link.href.startsWith("#") ? `${appViewUrl("home")}${link.href}` : appViewUrl(link.view);

                      return (
                        <a
                          href={linkHref}
                          onClick={(event) => {
                            event.preventDefault();
                            if (link.href.startsWith("#")) {
                              navigateToView("home");
                              window.requestAnimationFrame(() => {
                                document.querySelector(link.href)?.scrollIntoView();
                              });
                            } else {
                              navigateToView(link.view);
                            }
                          }}
                          key={link.label}
                        >
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            <div className="footer-bottom">
              <p>&copy; 2026 RelayClarity. All rights reserved.</p>
              <div className="footer-meta-links" aria-label="Legal links">
                {footerLegalLinks.map((link) => (
                  <a href={link.href.startsWith("#") ? `/${link.href}` : link.href} key={link.label}>{link.label}</a>
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
  initialMode = "signin",
}: {
  googleAuthAvailable: boolean;
  onBack: () => void;
  onSignedIn: (payload: AuthPayload) => void;
  initialMode?: "signin" | "signup";
}) {
  const initialResetToken = new URLSearchParams(window.location.search).get("token") || "";
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot" | "reset">(initialResetToken ? "reset" : initialMode);
  const [resetToken] = useState(initialResetToken);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState("");
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = authMode === "signup";
  const isForgotPassword = authMode === "forgot";
  const isResetPassword = authMode === "reset";

  useEffect(() => {
    if (isResetPassword && !resetToken) {
      setStatus("Password reset link is missing or invalid.");
    }
  }, [isResetPassword, resetToken]);

  const switchAuthMode = (mode: "signin" | "signup" | "forgot" | "reset") => {
    setAuthMode(mode);
    setStatus("");
    setDevelopmentResetUrl("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const payload = await fetchJsonFromApi<AuthPayload>(isSignup ? "/api/auth/signup" : "/api/auth/email", {
        method: "POST",
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password, rememberMe }),
      });
      onSignedIn(payload);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : isSignup ? "Sign up failed." : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    setDevelopmentResetUrl("");

    try {
      const payload = await fetchJsonFromApi<PasswordResetRequestPayload>("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus(payload.message);
      setDevelopmentResetUrl(payload.resetUrl || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    if (password !== confirmPassword) {
      setStatus("New passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = await fetchJsonFromApi<AuthPayload>("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password }),
      });
      onSignedIn(payload);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogleLogin = () => {
    if (!googleAuthAvailable) {
      setStatus("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.");
      return;
    }

    window.location.assign(apiPath(getOrderedApiBaseCandidates()[0] || "", "/api/auth/google/start"));
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card"
        aria-label={
          isResetPassword
            ? "Reset your RelayClarity password"
            : isForgotPassword
              ? "Request a RelayClarity password reset"
              : isSignup
                ? "Create a RelayClarity account"
                : "Sign in to RelayClarity"
        }
      >
        <div className="auth-panel">
          <img className="auth-panel-logo" src={relayclarityLogoDarkUrl} alt="RelayClarity" />
          <div className="auth-panel-copy">
            <h1>
              AI Calls.
              <br />
              Smarter Support.
              <br />
              <span>Happier Customers.</span>
            </h1>
          </div>
          <div className="auth-panel-features" aria-label="RelayClarity support channels">
            <article>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7.4 3.4 10 8.6l-2.1 1.7c.9 1.9 2.2 3.5 4 4.7l2.1-2 5 2.8-.8 3.3c-.3 1.1-1.3 1.8-2.4 1.6C9 19.7 4.2 14.9 3.2 8.2 3 7.1 3.7 6.1 4.8 5.8l2.6-.8Z" />
                  <path d="M15.5 5.5v5M18.8 4v8M21.7 6.3v3.4" />
                </svg>
              </span>
              <div>
                <strong>AI Phone Agents</strong>
                <p>Handle calls, qualify leads and solve issues.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4.5 5.5h15v10.2h-8.2L7 19.1v-3.4H4.5V5.5Z" />
                  <path d="M8.3 10.4h.1M12 10.4h.1M15.7 10.4h.1" />
                </svg>
              </span>
              <div>
                <strong>Live Chat</strong>
                <p>Real-time conversations with your customers.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="auth-form-panel">
          <button className="auth-back" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span>
            Back
          </button>
          <div className="auth-form-inner">
            <div className="auth-form-heading">
              <h2>
                {isResetPassword
                  ? "Choose new password"
                  : isForgotPassword
                    ? "Reset password"
                    : isSignup
                      ? "Create account"
                      : "Welcome back"}
              </h2>
              <p>
                {isResetPassword
                  ? "Enter a new password for your RelayClarity account."
                  : isForgotPassword
                    ? "Enter your email and we'll send a secure reset link."
                    : isSignup
                      ? "Sign up for your RelayClarity account"
                      : "Log in to your RelayClarity account"}
              </p>
            </div>

            {isForgotPassword ? (
              <form className="auth-form" onSubmit={handlePasswordResetRequest}>
                <label className="auth-field">
                  <span className="auth-field-top">Email address</span>
                  <span className="auth-input-wrap">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path d="M4.5 6.5h15v11h-15v-11Z" />
                      <path d="m5.4 7.6 6.6 5 6.6-5" />
                    </svg>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </span>
                </label>
                <button className="dark-button auth-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending reset link..." : "Send reset link"}
                </button>
              </form>
            ) : isResetPassword ? (
              <form className="auth-form" onSubmit={handlePasswordResetConfirm}>
                <label className="auth-field">
                  <span className="auth-field-top">New password</span>
                  <span className="auth-input-wrap">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path d="M7.2 10.2h9.6v9H7.2v-9Z" />
                      <path d="M9 10.2V8a3 3 0 0 1 6 0v2.2" />
                    </svg>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create a new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </span>
                </label>
                <label className="auth-field">
                  <span className="auth-field-top">Confirm password</span>
                  <span className="auth-input-wrap">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path d="M7.2 10.2h9.6v9H7.2v-9Z" />
                      <path d="M9 10.2V8a3 3 0 0 1 6 0v2.2" />
                    </svg>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </span>
                </label>
                <button className="dark-button auth-submit" type="submit" disabled={isSubmitting || !resetToken}>
                  {isSubmitting ? "Resetting password..." : "Reset password"}
                </button>
              </form>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleEmailSubmit}>
                  {isSignup ? (
                    <label className="auth-field">
                      <span className="auth-field-top">Full name</span>
                      <span className="auth-input-wrap">
                        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                          <path d="M12 12.3a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.7 20.2c1.2-3.3 3.6-5 7.3-5s6.1 1.7 7.3 5" />
                        </svg>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Alex Morgan"
                          autoComplete="name"
                          required
                        />
                      </span>
                    </label>
                  ) : null}
                  <label className="auth-field">
                    <span className="auth-field-top">Email address</span>
                    <span className="auth-input-wrap">
                      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M4.5 6.5h15v11h-15v-11Z" />
                        <path d="m5.4 7.6 6.6 5 6.6-5" />
                      </svg>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        required
                      />
                    </span>
                  </label>
                  <label className="auth-field">
                    <span className="auth-field-top">
                      <span>Password</span>
                      {!isSignup ? <button type="button" onClick={() => switchAuthMode("forgot")}>Forgot password?</button> : null}
                    </span>
                    <span className="auth-input-wrap">
                      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M7.2 10.2h9.6v9H7.2v-9Z" />
                        <path d="M9 10.2V8a3 3 0 0 1 6 0v2.2" />
                      </svg>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={isSignup ? "Create a password" : "Enter your password"}
                        autoComplete={isSignup ? "new-password" : "current-password"}
                        minLength={isSignup ? 8 : undefined}
                        required
                      />
                      <button className="auth-field-icon-button" type="button" aria-label="Password visibility">
                        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                          <path d="M3.6 12s2.9-5 8.4-5 8.4 5 8.4 5-2.9 5-8.4 5-8.4-5-8.4-5Z" />
                          <circle cx="12" cy="12" r="2.6" />
                        </svg>
                      </button>
                    </span>
                  </label>
                  <button className="dark-button auth-submit" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? isSignup ? "Creating account..." : "Logging in..." : isSignup ? "Sign up" : "Log in"}
                  </button>
                </form>

                <div className="auth-divider"><span>or continue with</span></div>

                <div className="auth-social-grid">
                  <button className="google-button" type="button" onClick={startGoogleLogin}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.53 5.53 0 0 1-2.39 3.63v2.96h3.87c2.26-2.08 3.55-5.15 3.55-8.69Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-2.96c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.05A12 12 0 0 0 12 24Z" />
                      <path fill="#FBBC05" d="M5.25 14.31a7.21 7.21 0 0 1 0-4.62V6.64H1.26a12 12 0 0 0 0 10.72l3.99-3.05Z" />
                      <path fill="#EA4335" d="M12 4.72c1.76 0 3.34.61 4.59 1.79l3.43-3.43A11.51 11.51 0 0 0 12 0 12 12 0 0 0 1.26 6.64l3.99 3.05C6.2 6.84 8.86 4.72 12 4.72Z" />
                    </svg>
                    Google
                  </button>
                  <button className="auth-provider-button" type="button" onClick={() => setStatus("Microsoft login is not configured yet.")}>
                    <span className="microsoft-mark" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    Microsoft
                  </button>
                </div>
              </>
            )}

            <p className="auth-form-switch">
              {isForgotPassword || isResetPassword ? (
                <button type="button" onClick={() => switchAuthMode("signin")}>Back to log in</button>
              ) : (
                <>
                  {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button type="button" onClick={() => switchAuthMode(isSignup ? "signin" : "signup")}>
                    {isSignup ? "Log in" : "Sign up"}
                  </button>
                </>
              )}
            </p>

            {status ? <p className="auth-status">{status}</p> : null}
            {developmentResetUrl ? (
              <p className="auth-status auth-status-dev">
                Development reset link: <a href={developmentResetUrl}>{developmentResetUrl}</a>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

type ContactSalesIconName =
  | "sparkle"
  | "phone"
  | "chat"
  | "bars"
  | "shield"
  | "user"
  | "mail"
  | "building"
  | "lock"
  | "chevron";

function ContactSalesIcon({ name }: { name: ContactSalesIconName }) {
  if (name === "sparkle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2l1.25 4.15L17 8l-3.75 1.85L12 14l-1.25-4.15L7 8l3.75-1.85L12 2z" />
        <path d="M5.8 13.6l.72 2.38 2.18.92-2.18.92-.72 2.38-.72-2.38-2.18-.92 2.18-.92.72-2.38z" />
        <path d="M18.1 14.3l.55 1.8 1.65.7-1.65.7-.55 1.8-.55-1.8-1.65-.7 1.65-.7.55-1.8z" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.2 4.8l2.1-.7 2.1 4.2-1.4 1.2c.8 1.6 2 2.8 3.6 3.6l1.2-1.4 4.2 2.1-.7 2.1c-.3.9-1.1 1.4-2 1.3-5.1-.4-9.2-4.5-9.6-9.6-.1-.9.4-1.7 1.3-2z" />
      </svg>
    );
  }

  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 6.5h12a2 2 0 0 1 2 2v6.2a2 2 0 0 1-2 2h-6.6L7.7 19v-2.3H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2z" />
        <path d="M8 10h8M8 13h5" />
      </svg>
    );
  }

  if (name === "bars") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6.5 18V10M12 18V5.8M17.5 18v-5.5" />
        <path d="M5 18.5h14" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3.8l6.5 2.4v5.2c0 4.1-2.7 7-6.5 8.8-3.8-1.8-6.5-4.7-6.5-8.8V6.2L12 3.8z" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 12.3a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8z" />
        <path d="M5.2 19.5c.6-3.3 3.2-5.1 6.8-5.1s6.2 1.8 6.8 5.1" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 7h14v10H5V7z" />
        <path d="M5.6 8l6.4 5 6.4-5" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 20V5h7v15" />
        <path d="M14 9h3v11" />
        <path d="M9.5 8h2M9.5 11.5h2M9.5 15h2M16 12.5h1M16 16h1M5 20h14" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.5 10.5h9v8h-9v-8z" />
        <path d="M9.5 10.5V8.4a2.5 2.5 0 0 1 5 0v2.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 9.5l5 5 5-5" />
    </svg>
  );
}

function ContactSalesPage({
  onNavigate,
  onOpenDashboard,
}: {
  onNavigate: (view: AppView) => void;
  onOpenDashboard: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [salesPhoneCountry, setSalesPhoneCountry] = useState("GB");
  const [salesPhone, setSalesPhone] = useState("");
  const [isSubmittingSalesForm, setIsSubmittingSalesForm] = useState(false);
  const [salesFormStatus, setSalesFormStatus] = useState("");
  const [salesFormError, setSalesFormError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const selectedSalesPhoneCountry = COUNTRIES.find((country) => country.iso === salesPhoneCountry) ?? COUNTRIES[0];
  const normalizedSalesPhone = salesPhone.replace(/\D/g, "").replace(/^0+/, "");
  const fullSalesPhone = normalizedSalesPhone ? `${selectedSalesPhoneCountry.dial}${normalizedSalesPhone}` : "";

  const focusSalesForm = () => {
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  };

  const submitSalesForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingSalesForm) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsSubmittingSalesForm(true);
    setSalesFormStatus("");
    setSalesFormError("");

    try {
      await fetchJsonFromApi<{ ok: boolean; id: string; emailDelivery: string }>("/api/contact-sales", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          company: String(form.get("company") || ""),
          phone: fullSalesPhone,
          phoneCountry: `${selectedSalesPhoneCountry.name} (${selectedSalesPhoneCountry.dial})`,
          phoneNational: salesPhone,
          companySize: String(form.get("teamSize") || ""),
          interestedIn: String(form.get("priority") || ""),
          message: String(form.get("context") || ""),
          sourceUrl: window.location.href,
        }),
      });
      setSubmitted(true);
      setSalesFormStatus("Thanks. Your request was sent to the RelayClarity team.");
      event.currentTarget.reset();
      setSalesPhone("");
    } catch (error) {
      setSubmitted(false);
      setSalesFormError(error instanceof Error ? error.message : "We could not send your request. Please try again.");
    } finally {
      setIsSubmittingSalesForm(false);
    }
  };

  const contactSalesFeatures = [
    {
      icon: "phone" as const,
      title: "AI calls",
      description: "Resolve more calls, faster.",
    },
    {
      icon: "chat" as const,
      title: "Live chat",
      description: "Turn visitors into conversations.",
    },
    {
      icon: "bars" as const,
      title: "Insights",
      description: "See what customers need.",
    },
    {
      icon: "shield" as const,
      title: "Secure at scale",
      description: "Ready for growing teams.",
    },
  ];

  return (
    <div className="contact-sales-shell">
      <MarketingNav
        activeView="contact-sales"
        onNavigate={onNavigate}
        onContactSales={focusSalesForm}
        onOpenDashboard={onOpenDashboard}
      />
      <main className="contact-sales-main">
      <section className="contact-sales-page" aria-label="Contact sales">
        <div className="contact-sales-hero">
          <div className="contact-sales-copy">
            <h1>
              Let&apos;s find the right<br />
              solution for your<br />
              <span>customer<br className="contact-sales-mobile-break" /> conversations</span>
            </h1>
          </div>

          <div className="contact-sales-feature-list">
            {contactSalesFeatures.map((feature) => (
              <article className="contact-sales-feature" key={feature.title}>
                <span className="contact-sales-feature-icon">
                  <ContactSalesIcon name={feature.icon} />
                </span>
                <span>
                  <strong>{feature.title}</strong>
                  <small>{feature.description}</small>
                </span>
              </article>
            ))}
          </div>

          <div className="contact-sales-response-card">
            <span className="contact-sales-avatars" aria-hidden="true">
              <img src={voiceMayaUrl} alt="" />
              <img src={voiceGeorgeUrl} alt="" />
              <img src={voiceBellaUrl} alt="" />
            </span>
            <p>We typically respond within <strong>1 business day.</strong></p>
          </div>
        </div>

        <form
          ref={formRef}
          className={`contact-sales-form ${submitted ? "is-submitted" : ""}`}
          onSubmit={submitSalesForm}
        >
          <div className="contact-sales-form-head">
            <strong>Contact Sales</strong>
            <p>Fill out the form and our team will be in touch.</p>
          </div>

          <label className="contact-sales-field">
            <span className="contact-sales-label-text">Full name <span aria-hidden="true">*</span></span>
            <span className="contact-sales-input-wrap">
              <ContactSalesIcon name="user" />
              <input type="text" name="name" autoComplete="name" placeholder="Enter your full name" required />
            </span>
          </label>

          <label className="contact-sales-field">
            <span className="contact-sales-label-text">Work email <span aria-hidden="true">*</span></span>
            <span className="contact-sales-input-wrap">
              <ContactSalesIcon name="mail" />
              <input type="email" name="email" autoComplete="email" placeholder="name@company.com" required />
            </span>
          </label>

          <label className="contact-sales-field">
            <span className="contact-sales-label-text">Company name <span aria-hidden="true">*</span></span>
            <span className="contact-sales-input-wrap">
              <ContactSalesIcon name="building" />
              <input
                type="text"
                name="company"
                autoComplete="organization"
                placeholder="Enter your company name"
                required
              />
            </span>
          </label>

          <div className="contact-sales-grid contact-sales-phone-grid">
            <label className="contact-sales-field">
              <span className="contact-sales-label-text">Phone number</span>
              <div className="contact-sales-phone-row">
                <CountrySelect value={salesPhoneCountry} onChange={setSalesPhoneCountry} />
                <span className="contact-sales-input-wrap">
                  <ContactSalesIcon name="phone" />
                  <input
                    type="tel"
                    name="phoneNational"
                    autoComplete="tel-national"
                    value={salesPhone}
                    onChange={(event) => setSalesPhone(event.target.value)}
                    placeholder="Phone number"
                  />
                </span>
                <input type="hidden" name="phone" value={fullSalesPhone} />
              </div>
            </label>
            <label className="contact-sales-field">
              <span className="contact-sales-label-text">Company size</span>
              <span className="contact-sales-input-wrap is-select">
              <select name="teamSize" defaultValue="" required>
                <option value="" disabled>Select company size</option>
                <option value="1-25">1-25 people</option>
                <option value="26-100">26-100 people</option>
                <option value="101-500">101-500 people</option>
                <option value="500+">500+ people</option>
              </select>
                <ContactSalesIcon name="chevron" />
              </span>
            </label>
          </div>

          <label className="contact-sales-field">
            <span className="contact-sales-label-text">What are you interested in? <span aria-hidden="true">*</span></span>
            <span className="contact-sales-input-wrap is-select">
              <select name="priority" defaultValue="" required>
              <option value="" disabled>Select all that apply</option>
              <option value="voice-agent">Launch an AI voice agent</option>
              <option value="chat-handoff">Improve chat and handoffs</option>
              <option value="call-volume">Reduce call volume</option>
              <option value="regulated-support">Handle regulated support</option>
            </select>
              <ContactSalesIcon name="chevron" />
            </span>
          </label>

          <label className="contact-sales-field">
            <span className="contact-sales-label-text">How can we help you?</span>
            <textarea
              name="context"
              rows={4}
              placeholder="Tell us about your goals, challenges, or questions..."
            />
          </label>

          <button className="contact-sales-submit" type="submit" disabled={isSubmittingSalesForm}>
            {isSubmittingSalesForm ? "Sending..." : "Send message"}
          </button>
          {salesFormStatus ? (
            <p className="contact-sales-confirmation">{salesFormStatus}</p>
          ) : null}
          {salesFormError ? (
            <p className="contact-sales-confirmation is-error">{salesFormError}</p>
          ) : null}
          <p className="contact-sales-privacy">
            <ContactSalesIcon name="lock" />
            Your information is secure and will never be shared.
          </p>
        </form>
      </section>
      </main>
    </div>
  );
}

function Dashboard({
  user,
  onSignOut,
  onProjectComplete
}: {
  user: AuthUser;
  onSignOut: () => void;
  onProjectComplete: (project: Project) => void | Promise<void>;
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
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [latency, setLatency] = useState(720);
  const [bargeIn, setBargeIn] = useState(true);
  const [step, setStep] = useState(() => readSetupStepFromLocation(5));
  const [visitedSetupSteps, setVisitedSetupSteps] = useState<number[]>([0]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(() => {
    const seeded = new URLSearchParams(window.location.search).get("skills");
    return seeded ? seeded.split("|").map((skill) => skill.trim()).filter(Boolean) : [];
  });
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
  const [customApps, setCustomApps] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [customActions, setCustomActions] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [selectedWorkflowAgentId, setSelectedWorkflowAgentId] = useState("agentIntake");
  const [hiddenWorkflowAgentIds, setHiddenWorkflowAgentIds] = useState<string[]>([]);
  const [agentToneSettings, setAgentToneSettings] = useState<Record<string, { friendliness: number; professionalism: number; conciseness: number }>>({});
  const [showWorkflowCanvas, setShowWorkflowCanvas] = useState(false);
  const [workflowNodeEdits, setWorkflowNodeEdits] = useState<Record<string, { title?: string; detail?: string }>>({});
  const [workflowNodeOffsets, setWorkflowNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [extraWorkflowConnectorKeys, setExtraWorkflowConnectorKeys] = useState<Record<string, string[]>>({});
  const [isWorkflowAddDrawerOpen, setIsWorkflowAddDrawerOpen] = useState(false);
  const [workflowBoardSize, setWorkflowBoardSize] = useState({ width: 1060, height: 390 });
  const [activeWorkflowNodeDrag, setActiveWorkflowNodeDrag] = useState<{
    nodeId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [workflowDrag, setWorkflowDrag] = useState<{ id: string; width: number } | null>(null);
  const workflowCanvasRef = useRef<HTMLDivElement | null>(null);
  const [sandboxRunState, setSandboxRunState] = useState<"idle" | "running" | "complete">("idle");
  const [sandboxActiveNodeId, setSandboxActiveNodeId] = useState<string | null>(null);
  const [sandboxVisitedNodeIds, setSandboxVisitedNodeIds] = useState<string[]>([]);
  const [sandboxLog, setSandboxLog] = useState<Array<{ speaker: string; text: string }>>([]);
  const sandboxTimersRef = useRef<number[]>([]);
  const sandboxLogRef = useRef<HTMLDivElement | null>(null);
  const [launchChannel, setLaunchChannel] = useState(playbook.channels[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(elevenLabsVoices[0].id);
  const [confirmedVoiceId, setConfirmedVoiceId] = useState("");
  const [hasSelectedVoice, setHasSelectedVoice] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState(elevenLabsVoices[0].sampleAudioUrl);
  const [voiceSettingsRevealed, setVoiceSettingsRevealed] = useState(false);
  const [voiceStability, setVoiceStability] = useState(50);
  const [voiceSimilarity, setVoiceSimilarity] = useState(75);
  const [voiceStyle, setVoiceStyle] = useState(0);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceSpeakerBoost, setVoiceSpeakerBoost] = useState(true);
  const [isRegeneratingVoice, setIsRegeneratingVoice] = useState(false);
  const [voiceRegenerationStatus, setVoiceRegenerationStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioCacheRef = useRef<Record<string, HTMLAudioElement>>({});
  const pointerPlayedVoiceIdRef = useRef<string | null>(null);
  const voiceRegenerationAttemptsRef = useRef<number[]>([]);
  const [connectorCategory, setConnectorCategory] = useState<ConnectorGroup>("core");
  const [activeConnectorKey, setActiveConnectorKey] = useState("crm");
  const [report, setReport] = useState("Prepare the launch pack when setup, connectors, voice tuning, and evaluation evidence are ready.");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneContactNumber, setPhoneContactNumber] = useState("");
  const [otherPlatformNote, setOtherPlatformNote] = useState("");
  const [setupIntegrationCategory, setSetupIntegrationCategory] = useState<ConnectorGroup>("core");
  const [isSetupIntegrationModalOpen, setIsSetupIntegrationModalOpen] = useState(false);
  const [setupLoginIntegration, setSetupLoginIntegration] = useState<{ company: string; type: string; logoUrl: string } | null>(null);
  const [setupLoginIntegrationStage, setSetupLoginIntegrationStage] = useState<"credentials" | "connecting" | "success">("credentials");
  const [setupLoginIntegrationEmail, setSetupLoginIntegrationEmail] = useState("");
  const [setupLoginIntegrationPassword, setSetupLoginIntegrationPassword] = useState("");
  const setupIntegrationLoginTimers = useRef<number[]>([]);
  const [launchStage, setLaunchStage] = useState<"review" | "contact">("review");
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
  const [testChatInput, setTestChatInput] = useState("");
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([
    { role: "user", content: "Hi, I'm having trouble logging into my account." },
    { role: "agent", content: "I'm sorry to hear you're having trouble logging in. I'd be happy to help. Can you tell me what error message you're seeing when you try to log in?" },
    { role: "user", content: "It says \"Incorrect password or email,\" but I'm sure I'm using the right one." },
    { role: "agent", content: "Thanks for confirming. Let's try a quick reset. I can send a password reset link to your email address on file. Would you like me to do that?" }
  ]);
  const [isTestChatTyping, setIsTestChatTyping] = useState(false);
  const [testChatStatus, setTestChatStatus] = useState("Live chat test ready.");
  const [testVoiceState, setTestVoiceState] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [testVoiceStatus, setTestVoiceStatus] = useState("Voice test ready.");
  const [reviewedAgentIds, setReviewedAgentIds] = useState<string[]>(["agentIntake"]);
  const testRunTimers = useRef<number[]>([]);
  const testChatThreadRef = useRef<HTMLDivElement | null>(null);
  const testVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const generatedVoiceUrlRef = useRef("");
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
      { company: "Obsidian", type: "Knowledge", logoUrl: "https://www.google.com/s2/favicons?domain=obsidian.md&sz=128" },
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
  const submitSetupIntegrationLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!setupLoginIntegration || !setupLoginIntegrationEmail.trim() || !setupLoginIntegrationPassword.trim()) {
      return;
    }

    clearSetupIntegrationLoginTimers();
    setSetupLoginIntegrationStage("connecting");

    const successTimer = window.setTimeout(() => {
      setSetupLoginIntegrationStage("success");
      setOtherPlatformNote(setupLoginIntegration.company + " (" + setupLoginIntegration.type + ")");
    }, 1450);

    const closeTimer = window.setTimeout(closeSetupIntegrationModal, 2450);
    setupIntegrationLoginTimers.current = [successTimer, closeTimer];
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
  const setupSteps = ["Workspace", "Systems", "Agent", "Voice", "Tests", "Launch"];
  const stepMeta: Array<{ title: string; detail: string }> = [
    hasBusinessType
      ? {
          title: "Choose what your AI agent handles first",
          detail: `Pick the conversation skills your ${confirmedBusinessLabel} team needs most. Select one or combine several.`
        }
      : {
          title: "Tell us about your business",
          detail: "We use this to tailor capabilities, integrations, and test scenarios to your team."
        },
    {
      title: "Connect your systems",
      detail: "Link the tools your agent will read from and write to. One connection is enough to continue."
    },
    {
      title: "Review your agent",
      detail: "See what the agent does and run one quick sample call."
    },
    {
      title: "Pick your agent's voice",
      detail: "Click a person to hear and select the voice that fits your brand."
    },
    {
      title: "Test your agent",
      detail: "Test how your AI agent responds to real conversations before you go live."
    },
    launchRequestSubmitted
      ? {
          title: "Launch request sent",
          detail: "Engineering will review the live route and follow up."
        }
      : launchStage === "review"
        ? {
            title: "Review the details",
            detail: "Check the setup details before adding launch contact information."
          }
      : {
          title: "Add launch contact",
          detail: "Enter the live website and phone route."
        }
  ];
  const selectedZoomCapabilityCount = selectedCapabilities.length;
  const hasLaunchRequestDetails = websiteUrl.trim().length > 0 && phoneContactNumber.trim().length > 0;

  const connectedCount = connectors.filter((connector) => connector.connected).length;
  const systemsComplete = connectedCount > 0;
  const agentsComplete = true;
  const testsComplete = testRunState === "complete" && completedRunCount >= TEST_RUN_STAGE_COUNT;
  const voiceConfirmed = confirmedVoiceId === selectedVoiceId;
  const stepCompletion = [
    hasBusinessType && selectedZoomCapabilityCount > 0,
    systemsComplete,
    agentsComplete,
    voiceConfirmed,
    testsComplete,
    hasLaunchRequestDetails
  ];
  const stepCanContinue = step === 3 && !voiceSettingsRevealed ? hasSelectedVoice : stepCompletion[step] ?? false;
  const canContinue = step === setupSteps.length - 1 && launchStage === "review" ? true : stepCanContinue;
  const firstIncompleteStep = stepCompletion.findIndex((isComplete) => !isComplete);
  const furthestAvailableStep = firstIncompleteStep === -1 ? setupSteps.length - 1 : firstIncompleteStep;
  const canOpenStep = (index: number) => (
    index === setupSteps.length - 1 ||
    index <= furthestAvailableStep ||
    visitedSetupSteps.includes(index)
  );
  const navigateToSetupStep = (nextStep: number, mode: "push" | "replace" = "push") => {
    const clampedStep = Math.max(0, Math.min(setupSteps.length - 1, nextStep));
    if (clampedStep === setupSteps.length - 1) {
      setLaunchStage("review");
    }
    setStep(clampedStep);
    setVisitedSetupSteps((current) => current.includes(clampedStep) ? current : [...current, clampedStep]);
    window.history[mode === "push" ? "pushState" : "replaceState"]({ view: "setup", step: clampedStep }, "", setupStepUrl(clampedStep));
  };
  const readiness = Math.min(98, 28 + Math.round((connectedCount / connectors.length) * 48) + (latency <= 800 && bargeIn ? 18 : 10));
  const selectedScenario = playbook.tests[scenarioIndex] || playbook.tests[0] || fallbackPlaybook.tests[0];
  const launchGateScore = useMemo(() => {
    const scenarioScores = playbook.tests.length
      ? playbook.tests.reduce((total, scenario) => total + scenario.score, 0) / playbook.tests.length
      : selectedScenario.score;

    return Math.round(scenarioScores * 0.74 + readiness * 0.26);
  }, [playbook.tests, readiness, selectedScenario.score]);
  const visibleConnectors = connectors.filter((connector) => connectorGroup(connector.key) === connectorCategory);
  const activeConnector = connectors.find((connector) => connector.key === activeConnectorKey) || connectors[0];
  const selectedVoice = elevenLabsVoices.find((voice) => voice.id === selectedVoiceId) || elevenLabsVoices[0];

  useEffect(() => {
    if (step !== 3 && voiceSettingsRevealed) {
      setVoiceSettingsRevealed(false);
    }
  }, [step, voiceSettingsRevealed]);

  useEffect(() => {
    if (!canOpenStep(step)) {
      navigateToSetupStep(furthestAvailableStep, "replace");
    }
  }, [furthestAvailableStep, step]);

  useEffect(() => {
    const handlePopState = () => {
      if (readAppViewFromLocation() !== "setup") {
        return;
      }

      const nextStep = readSetupStepFromLocation(setupSteps.length - 1);
      if (nextStep === setupSteps.length - 1) {
        setLaunchStage("review");
      }
      setStep(nextStep);
      setVisitedSetupSteps((current) => current.includes(nextStep) ? current : [...current, nextStep]);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setupSteps.length]);

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
    setSelectedCapabilities((current) => {
      const validTitles = new Set(zoomAiCapabilitiesFor(playbook, "").map((capability) => capability.title));
      return current.filter((title) => validTitles.has(title));
    });
    setScenarioIndex(0);
    setTestRunState("idle");
    setActiveRunIndex(0);
    setCompletedRunCount(0);
    setSelectedWorkflowAgentId("agentIntake");
    setReviewedAgentIds(["agentIntake"]);
    setHiddenWorkflowAgentIds([]);
    setWorkflowNodeEdits({});
    setWorkflowNodeOffsets({});
  }, [playbook]);

  const clearTestRunTimers = () => {
    testRunTimers.current.forEach((timer) => window.clearTimeout(timer));
    testRunTimers.current = [];
  };

  useEffect(() => clearTestRunTimers, []);

  useEffect(() => clearGeneratedVoiceUrl, []);

  useEffect(() => {
    const thread = testChatThreadRef.current;
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [testChatMessages, isTestChatTyping]);

  useEffect(() => {
    const cache = voiceAudioCacheRef.current;

    elevenLabsVoices.forEach((voice) => {
      if (!cache[voice.id]) {
        const audio = new Audio(voice.sampleAudioUrl);
        audio.preload = "auto";
        audio.load();
        cache[voice.id] = audio;
      }

      if (!cache[`confirmation-${voice.id}`]) {
        const confirmationAudio = new Audio(voice.confirmationAudioUrl);
        confirmationAudio.preload = "auto";
        confirmationAudio.load();
        cache[`confirmation-${voice.id}`] = confirmationAudio;
      }
    });

    return () => {
      Object.values(cache).forEach((audio) => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      });
      voiceAudioCacheRef.current = {};
    };
  }, []);

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

      const connector = connectors.find((item) => item.providerId === event.data.provider);

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

      setConnectionStatus(`${connection.name} did not return an authorization URL, so it was not linked.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect integration.";
      setConnectionStatus(`${activeConnector.provider} added to this demo workspace.`);
      setConnectors((current) =>
        current.map((connector) =>
          connector.key === activeConnector.key ? {
            ...connector,
            connected: true,
            connectionMode: "demo",
            connectionMessage: `${connector.provider} is available in this workspace demo. ${message}`,
            scopes: [],
            testStatus: "Demo connected",
            testChecks: [
              { name: "Workspace", status: "passed" },
              { name: "Agent canvas", status: "passed" },
              { name: "Live OAuth", status: "demo" }
            ]
          } : connector
        )
      );
      addWorkflowConnector(activeConnector.key);
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
          connected: true,
          connectionMode: "demo",
          connectionMessage: `${connector.provider} connected.`,
          scopes: [],
          testStatus: "Connected",
          testChecks: []
        } : connector
      )
    );
    setConnectionStatus(`${demoAuthConnector.provider} connected.`);
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
    if (activeConnector.connectionMode === "demo") {
      setConnectors((current) =>
        current.map((connector) =>
          connector.key === activeConnector.key ? {
            ...connector,
            connectionMessage: `${connector.provider} connected.`,
            testStatus: "Connected",
            testChecks: []
          } : connector
        )
      );
      setConnectionStatus(`${activeConnector.provider} connected.`);
      return;
    }

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
    const systems = connectors
      .filter((connector) => connector.connected)
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

  const runLaunchTests = () => {
    clearTestRunTimers();
    setTestRunState("running");
    setActiveRunIndex(0);
    setCompletedRunCount(0);
    setScenarioIndex(0);

    Array.from({ length: TEST_RUN_STAGE_COUNT }).forEach((_, index) => {
      const startTimer = window.setTimeout(() => {
        setActiveRunIndex(index);
        setScenarioIndex(index % Math.max(1, playbook.tests.length));
      }, index * TEST_RUN_STAGE_DURATION_MS);

      const completeTimer = window.setTimeout(() => {
        setCompletedRunCount(index + 1);

        if (index === TEST_RUN_STAGE_COUNT - 1) {
          setTestRunState("complete");
        }
      }, index * TEST_RUN_STAGE_DURATION_MS + TEST_RUN_STAGE_COMPLETE_OFFSET_MS);

      testRunTimers.current.push(startTimer, completeTimer);
    });
  };

  const clearGeneratedVoiceUrl = () => {
    if (generatedVoiceUrlRef.current) {
      URL.revokeObjectURL(generatedVoiceUrlRef.current);
      generatedVoiceUrlRef.current = "";
    }
  };

  const stopVoicePlayback = () => {
    Object.values(voiceAudioCacheRef.current).forEach((audio) => {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore seek errors while browser audio metadata is loading.
      }
    });

    [audioRef.current, testVoiceAudioRef.current].forEach((audio) => {
      if (!audio) {
        return;
      }
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore seek errors while browser audio metadata is loading.
      }
    });
  };

  const playTestVoiceUrl = (url: string) => {
    const audio = testVoiceAudioRef.current || audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.src = url;
    audio.load();
    void audio.play().catch(() => undefined);
  };

  const regenerateSelectedVoice = async () => {
    if (isRegeneratingVoice) {
      return;
    }

    const now = Date.now();
    const recentAttempts = voiceRegenerationAttemptsRef.current.filter((time) => now - time < 60_000);
    const lastAttempt = recentAttempts[recentAttempts.length - 1];

    if (lastAttempt && now - lastAttempt < 8_000) {
      const waitSeconds = Math.ceil((8_000 - (now - lastAttempt)) / 1000);
      voiceRegenerationAttemptsRef.current = recentAttempts;
      setVoiceRegenerationStatus(`Please wait ${waitSeconds}s before regenerating again.`);
      return;
    }

    if (recentAttempts.length >= 3) {
      voiceRegenerationAttemptsRef.current = recentAttempts;
      setVoiceRegenerationStatus("Too many regenerations. Try again in about a minute.");
      return;
    }

    voiceRegenerationAttemptsRef.current = [...recentAttempts, now];
    setIsRegeneratingVoice(true);
    setVoiceRegenerationStatus(`Regenerating ${selectedVoice.name}'s voice...`);
    stopVoicePlayback();

    try {
      const result = await fetchJsonFromApi<VoiceSpeechResult>("/api/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hi, this is ${selectedVoice.name}. Thanks for tuning my voice. I'll keep the conversation clear, natural, and helpful for your customers.`,
          voiceId: selectedVoice.voiceId,
          stability: voiceStability / 100,
          similarityBoost: voiceSimilarity / 100,
          style: voiceStyle / 100,
          speed: voiceSpeed,
          useSpeakerBoost: voiceSpeakerBoost,
        })
      });

      if (result.mode === "audio" && result.audioBase64) {
        clearGeneratedVoiceUrl();
        const bytes = Uint8Array.from(atob(result.audioBase64), (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: result.contentType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        generatedVoiceUrlRef.current = url;
        setActiveAudioUrl(url);
        playTestVoiceUrl(url);
        setVoiceRegenerationStatus(`${selectedVoice.name}'s voice has been updated.`);
        return;
      }

      setActiveAudioUrl(selectedVoice.sampleAudioUrl);
      playVoiceSample(selectedVoice);
      setVoiceRegenerationStatus(result.message || "Voice generation is in mock mode. Playing the selected sample.");
    } catch (error) {
      const failedAttempts = voiceRegenerationAttemptsRef.current.filter((time) => time !== now);
      voiceRegenerationAttemptsRef.current = failedAttempts;
      setVoiceRegenerationStatus(error instanceof Error ? error.message : "Voice regeneration failed.");
    } finally {
      setIsRegeneratingVoice(false);
    }
  };

  const playTestGreeting = () => {
    setTestVoiceStatus(`Playing ${selectedVoice.name}'s greeting sample.`);
    playVoiceSample(selectedVoice);
  };

  const buildSetupTestFallbackReply = (message: string) => {
    const business = confirmedWorkspaceName || confirmedBusinessLabel;
    const normalized = message.toLowerCase();

    if (/(password|login|log in|account|email)/i.test(normalized)) {
      return `I can help with that. For ${business}, I would verify the account email, check whether the user can receive a reset link, and escalate if the account still cannot be accessed.`;
    }

    if (/(urgent|emergency|complaint|angry|cancel|fraud|unsafe)/i.test(normalized)) {
      return `I'm sorry this is urgent. I would collect the key details, mark the conversation high priority, and route it to ${business}'s support team with the transcript attached.`;
    }

    if (/(book|appointment|schedule|reservation|available|tomorrow|today)/i.test(normalized)) {
      return `I can help with that. What name, contact detail, preferred time, and service should I pass to ${business}'s team before confirming anything?`;
    }

    return `I can help. Please share the customer name, best contact detail, and the main issue so I can answer from approved knowledge or route it to the right team.`;
  };

  const requestSetupTestChatTurn = async (message: string, history: ChatMessage[]) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5200);

    const result = await fetchJsonFromApi<DemoChatTurn>("/api/demo/chat", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        businessName: confirmedWorkspaceName,
        businessType: confirmedBusinessType || playbook.label,
        businessContext: [
          `Agent: ${agentDisplayName}.`,
          `Use case: ${useCase}.`,
          `Knowledge source: ${primaryKnowledgeSource}.`,
          `Handoff rule: ${agentHandoff.trim() || "Escalate with summary and next step"}.`,
          `Connected systems: ${connectors.filter((connector) => connector.connected).map((connector) => connector.provider).join(", ") || "demo workspace"}.`
        ].join(" "),
        capabilities: selectedCapabilities.length ? selectedCapabilities : playbook.actions,
        guardrails: playbook.guardrails,
        history: history.slice(-8).map((turn) => ({
          role: turn.role === "agent" ? "assistant" : "customer",
          content: turn.content
        }))
      })
    }).finally(() => window.clearTimeout(timeout));

    return result;
  };

  const sendSetupTestChat = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = testChatInput.trim();

    if (!message || isTestChatTyping) {
      return;
    }

    const nextHistory: ChatMessage[] = [...testChatMessages, { role: "user", content: message }];
    setTestChatMessages(nextHistory);
    setTestChatInput("");
    setIsTestChatTyping(true);
    setTestChatStatus("Running live chat response test...");

    try {
      const result = await requestSetupTestChatTurn(message, nextHistory);
      setTestChatMessages((current) => [...current, { role: "agent", content: result.reply }]);
      setTestChatStatus(`${Math.round(result.confidence * 100)}% confidence · ${result.escalate ? "Escalation path checked" : "Answered from setup context"}.`);
    } catch (_error) {
      setTestChatMessages((current) => [...current, { role: "agent", content: buildSetupTestFallbackReply(message) }]);
      setTestChatStatus("Backend chat test unavailable. Showing local fallback behavior.");
    } finally {
      setIsTestChatTyping(false);
    }
  };

  const clearSetupTestChat = () => {
    setTestChatMessages([]);
    setTestChatInput("");
    setTestChatStatus("Chat cleared. Send a customer message to run a fresh test.");
  };

  const startVoiceTest = async () => {
    if (testVoiceState === "running") {
      return;
    }

    const voiceTestLine = `Hi, this is ${agentDisplayName}. I can help with ${useCase.toLowerCase()} for ${confirmedWorkspaceName}.`;
    setTestVoiceState("running");
    setTestVoiceStatus(`Generating ${selectedVoice.name}'s voice test...`);

    try {
      const result = await fetchJsonFromApi<VoiceSpeechResult>("/api/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceTestLine,
          voiceId: selectedVoice.voiceId,
          stability: Math.max(0.2, Math.min(0.85, activeAgentTone.professionalism / 100)),
          similarityBoost: 0.82,
          speed: Math.max(0.82, Math.min(1.12, 1.08 - latency / 5000))
        })
      });

      if (result.mode === "audio" && result.audioBase64) {
        clearGeneratedVoiceUrl();
        const bytes = Uint8Array.from(atob(result.audioBase64), (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: result.contentType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        generatedVoiceUrlRef.current = url;
        playTestVoiceUrl(url);
        setTestVoiceStatus(`Live ${result.provider} audio generated for ${selectedVoice.name}.`);
      } else {
        playVoiceSample(selectedVoice);
        setTestVoiceStatus(result.message || "Speech provider is in mock mode locally. Playing the selected voice sample.");
      }

      setTestVoiceState("complete");
    } catch (error) {
      playVoiceSample(selectedVoice);
      setTestVoiceState("error");
      setTestVoiceStatus(error instanceof Error ? error.message : "Voice test failed. Playing the selected sample instead.");
    }
  };

  const nextStep = () => {
    if (!canContinue) {
      return;
    }

    if (step === 3 && !voiceSettingsRevealed) {
      setConfirmedVoiceId(selectedVoiceId);
      setVoiceSettingsRevealed(true);
      setVoiceRegenerationStatus("");
      playVoiceConfirmation(selectedVoice);
      return;
    }

    if (step === setupSteps.length - 1) {
      if (launchStage === "review") {
        setLaunchStage("contact");
        return;
      }

      generateLaunchPack();
      return;
    }
    navigateToSetupStep(step + 1);
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
  const activeTestChecks = activeConnector.connected || activeConnector.connectionMode === "demo" ? [] : activeConnector.testChecks || [];
  const primaryKnowledgeSource = playbook.connectorProviders.knowledge || "Knowledge base";
  const crmSystem = playbook.connectorProviders.crm || "CRM";
  const helpdeskSystem = playbook.connectorProviders.helpdesk || "Helpdesk";
  const agentDisplayName = agentName.trim() || `${playbook.label} assistant`;
  const averageScenarioScore = playbook.tests.length
    ? Math.round(playbook.tests.reduce((total, scenario) => total + scenario.score, 0) / playbook.tests.length)
    : selectedScenario.score;
  const connectedSystemNames = connectors.filter((connector) => connector.connected).map((connector) => connector.provider);
  const connectedSystemsLabel = connectedSystemNames.length
    ? connectedSystemNames.slice(0, 3).join(", ")
    : `${crmSystem}, ${helpdeskSystem}, ${primaryKnowledgeSource}`;
  const selectedCapabilityLabel = (selectedCapabilities.length ? selectedCapabilities : playbook.actions).slice(0, 3).join(", ");
  const handoffRule = agentHandoff.trim() || playbook.guardrails[0] || "Escalate with summary and next step";
  const cinematicTestStages: CinematicTestStage[] = [
    {
      id: "live-chat",
      label: "Live chat",
      title: "Customer chat simulation",
      detail: `Runs ${agentDisplayName} through a realistic chat for ${confirmedWorkspaceName}.`,
      scene: "Transcript, intent, and answer quality",
      evidence: `${testChatMessages.filter((message) => message.role === "agent").length} agent replies`,
      score: Math.min(99, averageScenarioScore + 2),
      checks: ["Intent classified", "Answer tone checked", "Escalation decision logged"],
      result: "Live chat handled from setup context with the right next action."
    },
    {
      id: "voice",
      label: "Voice",
      title: "Voice and timing pass",
      detail: `Checks ${selectedVoice.name}'s voice, ${latency}ms response start, and ${bargeIn ? "interruption handling" : "standard turn-taking"}.`,
      scene: "Waveform, greeting, and call feel",
      evidence: `${selectedVoice.tone} voice selected`,
      score: latency <= 800 ? 96 : 91,
      checks: ["Greeting generated", "Latency within target", "Call interruption rule tested"],
      result: "Voice channel is ready with the selected persona and call behavior."
    },
    {
      id: "knowledge",
      label: "Knowledge",
      title: "Approved answer retrieval",
      detail: `Validates answers against ${primaryKnowledgeSource} for ${confirmedBusinessType || playbook.label}.`,
      scene: "Source lookup and confidence guardrail",
      evidence: primaryKnowledgeSource,
      score: Math.min(98, averageScenarioScore + 1),
      checks: ["Source selected", "Unsupported claims blocked", "Unclear answer escalated"],
      result: "Knowledge answers stay inside approved business context."
    },
    {
      id: "systems",
      label: "Systems",
      title: "CRM and workflow context",
      detail: `Checks customer context and follow-up paths across ${connectedSystemsLabel}.`,
      scene: "CRM lookup, helpdesk task, and connected apps",
      evidence: `${Math.max(1, connectedSystemNames.length)} system${connectedSystemNames.length === 1 ? "" : "s"} ready`,
      score: connectedSystemNames.length ? 95 : 88,
      checks: ["Customer record path checked", "Follow-up task path ready", "Connected systems included"],
      result: "The agent can prepare a clean customer record and follow-up route."
    },
    {
      id: "handoff",
      label: "Handoff",
      title: "Safety and human handoff",
      detail: `Tests urgent, sensitive, and low-confidence cases against: ${handoffRule}.`,
      scene: "Risk detection and owner routing",
      evidence: `${playbook.guardrails.length} guardrails`,
      score: Math.min(99, averageScenarioScore + 4),
      checks: ["Risk trigger detected", "Human owner selected", "Summary packet attached"],
      result: "Sensitive moments route to a human with transcript context."
    },
    {
      id: "launch",
      label: "Launch",
      title: "Launch readiness gate",
      detail: `Combines ${selectedCapabilityLabel || "configured capabilities"}, ${launchChannel}, and the launch score.`,
      scene: "Production gate and engineering proof",
      evidence: `${launchGateScore}% launch score`,
      score: launchGateScore,
      checks: ["Readiness score calculated", "Launch channel confirmed", "Engineering proof assembled"],
      result: "Launch evidence is ready for production review."
    }
  ];
  const activeCinematicTest = cinematicTestStages[activeRunIndex] || cinematicTestStages[0];
  const testProgress = testRunState === "complete" ? 100 : Math.round((completedRunCount / Math.max(1, cinematicTestStages.length)) * 100);
  const testRunButtonLabel = testRunState === "running" ? `Running ${activeCinematicTest.label}` : testRunState === "complete" ? "Run tests again" : "Start tests";
  const connectedWorkflowConnectors = connectors.filter((connector) => connector.connected);
  const workflowIntegrations = connectors
    .filter((connector) => connector.connected && ["crm", "knowledge", "helpdesk", "telephony"].includes(connector.key))
    .slice(0, 4);
  const selectedWorkflowSuggestions = selectedCapabilities.slice(0, 5);
  const capabilityAgentBlueprints: Record<string, { trigger: string; job: string; outcome: string; connectorKeys: string[] }> = {
    "Virtual Agent": {
      trigger: "New inbound conversation",
      job: "Greets customers and handles conversations end to end with consistent support.",
      outcome: "Resolves the conversation or hands it to the right skill.",
      connectorKeys: ["telephony", "knowledge"]
    },
    "Intent Detection": {
      trigger: "Customer states a request",
      job: "Classifies what each customer needs and routes the request to the right skill or team.",
      outcome: "Labels the request and routes it with confidence.",
      connectorKeys: ["telephony", "crm"]
    },
    "Knowledge Answers": {
      trigger: "Question matches approved knowledge",
      job: "Answers from the approved knowledge base, policies, service details, and FAQs.",
      outcome: "Delivers a sourced answer or defers when unsure.",
      connectorKeys: ["knowledge"]
    },
    "Eligibility Check": {
      trigger: "Request needs qualification",
      job: "Asks the right qualifying questions before giving an answer or routing the customer.",
      outcome: "Confirms eligibility and passes the details forward.",
      connectorKeys: ["crm"]
    },
    "Task Automation": {
      trigger: "Approved task is requested",
      job: "Completes approved FAQs, structured requests, and follow-up tasks automatically.",
      outcome: "Finishes the task and confirms completion with the customer.",
      connectorKeys: ["crm", "helpdesk"]
    },
    "System Workflows": {
      trigger: "Conversation needs a system action",
      job: "Uses connected CRM, helpdesk, billing, and service systems during the conversation.",
      outcome: "Updates the right systems while the customer is still connected.",
      connectorKeys: ["crm", "helpdesk"]
    },
    "Ticket Creation": {
      trigger: "Request needs a record",
      job: "Creates, updates, and tags helpdesk records with the right customer context.",
      outcome: "Leaves a complete, correctly tagged record behind.",
      connectorKeys: ["helpdesk", "crm"]
    },
    "Follow-Up Scheduling": {
      trigger: "Customer needs a next step",
      job: "Books callbacks, reminders, or next-step tasks after the customer request is captured.",
      outcome: "Schedules the follow-up and confirms it with the customer.",
      connectorKeys: ["crm"]
    },
    "Live Agent Handoff": {
      trigger: "Conversation needs a human",
      job: "Transfers complex or urgent conversations with customer context and conversation history.",
      outcome: "Hands off warmly with full context attached.",
      connectorKeys: ["telephony", "crm"]
    },
    "Priority Routing": {
      trigger: "High-priority customer detected",
      job: "Routes high-value, urgent, or at-risk customers to the right team without delay.",
      outcome: "Puts priority customers at the front of the right queue.",
      connectorKeys: ["telephony", "crm"]
    },
    "Sensitive Topic Guardrails": {
      trigger: "Sensitive topic detected",
      job: "Escalates complaints, payments, legal issues, or policy exceptions before risk builds.",
      outcome: "Escalates safely before the situation escalates itself.",
      connectorKeys: ["telephony", "helpdesk"]
    },
    "Fallback Handling": {
      trigger: "Confidence drops or customer pushes back",
      job: "Moves unclear requests to a human when confidence is low or the customer pushes back.",
      outcome: "Recovers gracefully instead of guessing.",
      connectorKeys: ["telephony"]
    },
    "AI Expert Assist": {
      trigger: "Staff member handles a live contact",
      job: "Surfaces relevant guidance, next best actions, and business context for staff.",
      outcome: "Keeps staff informed without interrupting the conversation.",
      connectorKeys: ["knowledge", "crm"]
    },
    "Auto Wrap-Up": {
      trigger: "Contact ends",
      job: "Generates summaries, dispositions, notes, and follow-up actions after every contact.",
      outcome: "Files complete wrap-up notes automatically.",
      connectorKeys: ["helpdesk", "crm"]
    },
    "Quality Review": {
      trigger: "Contact is completed",
      job: "Flags missed intents, weak answers, and handoff patterns that need manager review.",
      outcome: "Surfaces the contacts managers should review first.",
      connectorKeys: ["helpdesk"]
    },
    "Coaching Insights": {
      trigger: "Enough conversations are collected",
      job: "Shows recurring questions, process gaps, and training themes from real conversations.",
      outcome: "Turns real conversations into coaching themes.",
      connectorKeys: ["knowledge"]
    }
  };
  const agentBlueprintForCapability = (capabilityTitle: string) => (
    capabilityAgentBlueprints[capabilityTitle] || {
      trigger: "New customer request",
      job: `Handles ${capabilityTitle.toLowerCase()} for your customers.`,
      outcome: "Completes the skill and confirms the next step.",
      connectorKeys: ["crm"]
    }
  );
  const capabilityAgents = selectedCapabilities.map((capabilityTitle) => {
    const blueprint = agentBlueprintForCapability(capabilityTitle);
    const businessContext = confirmedBusinessType || playbook.label;

    return {
      id: `agent-skill-${capabilityTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: "Skill agent",
      skillTitle: capabilityTitle,
      name: capabilityTitle,
      trigger: blueprint.trigger,
      job: `${blueprint.job} Tuned for ${businessContext.toLowerCase()} using the connected systems from setup.`,
      connectorKeys: Array.from(new Set(blueprint.connectorKeys)),
      outcome: blueprint.outcome
    };
  });
  const fallbackWorkflowAgent = {
    id: "agentIntake",
    label: "Agent",
    skillTitle: "Customer support",
    name: agentDisplayName,
    trigger: "New customer request",
    job: agentPurpose.trim() || playbook.missions[0],
    connectorKeys: ["crm", "telephony", "knowledge", "helpdesk"],
    outcome: "Captures the request and confirms the next step."
  };
  const customWorkflowAgents = customAgents.map((agent) => ({
    id: agent.id,
    label: "Custom agent",
    skillTitle: agent.name,
    name: agent.name,
    trigger: "Added by your team",
    job: agent.job,
    connectorKeys: ["crm", "helpdesk"],
    outcome: "Completes the job your team assigned to it."
  }));
  const workflowAgents = [
    ...(capabilityAgents.length ? capabilityAgents : [fallbackWorkflowAgent]),
    ...customWorkflowAgents
  ].filter((agent) => !hiddenWorkflowAgentIds.includes(agent.id));
  const workspaceAgents = workflowAgents;
  const activeWorkspaceAgent = workspaceAgents.find((agent) => agent.id === selectedWorkflowAgentId) || workspaceAgents[0] || workflowAgents[0];
  const defaultAgentTone = { friendliness: 70, professionalism: 80, conciseness: 60 };
  const activeAgentTone = agentToneSettings[activeWorkspaceAgent.id] || defaultAgentTone;
  const updateActiveAgentTone = (key: "friendliness" | "professionalism" | "conciseness", value: number) => {
    const agentId = activeWorkspaceAgent.id;
    setAgentToneSettings((current) => ({
      ...current,
      [agentId]: { ...(current[agentId] || defaultAgentTone), [key]: value }
    }));
  };
  const toneDescriptor = (value: number, low: string, mid: string, high: string) => (value < 34 ? low : value < 67 ? mid : high);
  const agentMonogram = (name: string) => name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";
  const agentToneControls: { key: "friendliness" | "professionalism" | "conciseness"; label: string; low: string; mid: string; high: string }[] = [
    { key: "friendliness", label: "Friendliness", low: "Reserved", mid: "Warm", high: "Very friendly" },
    { key: "professionalism", label: "Professionalism", low: "Casual", mid: "Business casual", high: "Formal" },
    { key: "conciseness", label: "Conciseness", low: "Detailed", mid: "Balanced", high: "Brief" }
  ];
  const voiceIntroLine = `Hello, I am your virtual agent for ${confirmedWorkspaceName}. I can help answer questions and get you to the right person.`;
  const activeWorkspaceConnectorKeys = Array.from(new Set([
    ...activeWorkspaceAgent.connectorKeys,
    ...(extraWorkflowConnectorKeys[activeWorkspaceAgent.id] || [])
  ]));
  const activeWorkspaceConnectors = activeWorkspaceConnectorKeys
    .map((key) => connectedWorkflowConnectors.find((connector) => connector.key === key))
    .filter((connector): connector is Connector => Boolean(connector));
  const activeWorkspaceConnectorNames = activeWorkspaceConnectors.map((connector) => connector.provider).join(", ");
  const activeWorkspaceOutcomeDetail = activeWorkspaceConnectorNames
    ? `Uses ${activeWorkspaceConnectorNames}.`
    : "Connect the required systems before launch.";
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
  const updateWorkflowNodeEdit = (nodeId: "trigger" | "instructions" | "outcome", field: "title" | "detail", value: string) => {
    const key = workflowNodeKey(nodeId);
    const currentContent = workflowNodeContent[nodeId];

    setWorkflowNodeEdits((currentEdits) => ({
      ...currentEdits,
      [key]: {
        title: field === "title" ? value : currentEdits[key]?.title || currentContent.title,
        detail: field === "detail" ? value : currentEdits[key]?.detail || currentContent.detail
      }
    }));
  };
  const resetWorkflowNodeEditsForActiveAgent = () => {
    const activePrefix = `${activeWorkspaceAgent.id}:`;
    setWorkflowNodeEdits((currentEdits) => Object.fromEntries(
      Object.entries(currentEdits).filter(([key]) => !key.startsWith(activePrefix))
    ));
  };
  const toggleWorkflowConnector = (connectorKey: string) => {
    if (activeWorkspaceAgent.connectorKeys.includes(connectorKey)) {
      return;
    }

    setExtraWorkflowConnectorKeys((current) => {
      const keys = current[activeWorkspaceAgent.id] || [];
      return keys.includes(connectorKey)
        ? { ...current, [activeWorkspaceAgent.id]: keys.filter((key) => key !== connectorKey) }
        : { ...current, [activeWorkspaceAgent.id]: [...keys, connectorKey] };
    });
  };

  useEffect(() => {
    if (!workspaceAgents.some((agent) => agent.id === selectedWorkflowAgentId)) {
      setSelectedWorkflowAgentId(workspaceAgents[0]?.id || "agentIntake");
    }
  }, [selectedWorkflowAgentId, workspaceAgents]);

  useEffect(() => {
    const board = workflowCanvasRef.current;

    if (!board) {
      return;
    }

    const updateBoardSize = () => {
      const rect = board.getBoundingClientRect();
      setWorkflowBoardSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height))
      });
    };

    updateBoardSize();
    const observer = new ResizeObserver(updateBoardSize);
    observer.observe(board);
    window.addEventListener("resize", updateBoardSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBoardSize);
    };
  }, [step, showWorkflowCanvas]);

  const boardNodeDefaults: Record<string, { x: number; y: number }> = {
    trigger: { x: 32, y: 118 },
    instructions: { x: 286, y: 118 },
    systems: { x: 540, y: 118 },
    outcome: { x: 794, y: 118 }
  };
  const boardNodeSize = { width: 190, height: 136 };
  const workflowNodePosition = (nodeId: string) => workflowNodeOffsets[workflowNodeKey(nodeId)] || boardNodeDefaults[nodeId] || { x: 32, y: 118 };
  const workflowConnectionPairs = [
    ["trigger", "instructions"],
    ["instructions", "systems"],
    ["systems", "outcome"],
    ...customApps.map((app) => ["systems", app.id]),
    ...customActions.map((action) => ["systems", action.id]),
    ...customApps.map((app) => [app.id, "outcome"]),
    ...customActions.map((action) => [action.id, "outcome"])
  ];
  const workflowConnections = workflowConnectionPairs.map(([from, to]) => {
    const fromPosition = workflowNodePosition(from);
    const toPosition = workflowNodePosition(to);
    const fromX = fromPosition.x + boardNodeSize.width;
    const fromY = fromPosition.y + boardNodeSize.height / 2;
    const toX = toPosition.x;
    const toY = toPosition.y + boardNodeSize.height / 2;
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const connected = distance < 520 && toX > fromPosition.x + 40;
    const bend = Math.max(44, Math.min(140, Math.abs(toX - fromX) * 0.38));

    return {
      from,
      to,
      connected,
      path: `M ${fromX} ${fromY} C ${fromX + bend} ${fromY}, ${toX - bend} ${toY}, ${toX} ${toY}`
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

    const currentOffset = workflowNodePosition(nodeId);
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveWorkflowNodeDrag({
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: currentOffset.x,
      originY: currentOffset.y,
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

    const deltaX = event.clientX - activeWorkflowNodeDrag.startX;
    const deltaY = event.clientY - activeWorkflowNodeDrag.startY;
    const moved = activeWorkflowNodeDrag.moved || Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;
    const maxX = Math.max(24, rect.width - boardNodeSize.width - 24);
    const maxY = Math.max(24, rect.height - boardNodeSize.height - 24);
    const x = Math.max(24, Math.min(maxX, Math.round((activeWorkflowNodeDrag.originX + deltaX) / gridSize) * gridSize));
    const y = Math.max(24, Math.min(maxY, Math.round((activeWorkflowNodeDrag.originY + deltaY) / gridSize) * gridSize));

    setWorkflowNodeOffsets((current) => ({
      ...current,
      [workflowNodeKey(activeWorkflowNodeDrag.nodeId)]: { x, y }
    }));
    setActiveWorkflowNodeDrag((current) => current ? { ...current, moved } : current);
  };

  const stopWorkspaceNodeDrag = (event: React.PointerEvent<HTMLElement>, nodeId: "trigger" | "instructions" | "outcome") => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasMoved = activeWorkflowNodeDrag?.moved;
    setActiveWorkflowNodeDrag(null);

    if (!wasMoved) {
      editWorkflowNode(nodeId);
    }
  };

  const workflowNodeOffsetStyle = (nodeId: string): React.CSSProperties => {
    const offset = workflowNodePosition(nodeId);
    return {
      left: offset.x,
      top: offset.y
    };
  };

  const clearSandboxTimers = () => {
    sandboxTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    sandboxTimersRef.current = [];
  };

  const resetWorkflowSandbox = () => {
    clearSandboxTimers();
    setSandboxRunState("idle");
    setSandboxActiveNodeId(null);
    setSandboxVisitedNodeIds([]);
    setSandboxLog([]);
  };

  const runWorkflowSandbox = () => {
    clearSandboxTimers();
    setSandboxRunState("running");
    setSandboxActiveNodeId(null);
    setSandboxVisitedNodeIds([]);
    setSandboxLog([]);

    const systemNames = activeWorkspaceConnectors.map((connector) => connector.provider);
    const sandboxSteps: Array<{ nodeId: string; speaker: string; text: string }> = [
      {
        nodeId: "trigger",
        speaker: "Caller",
        text: `"Hi — I'm calling about ${(workflowNodeContent.trigger.title || "a request").toLowerCase()}."`
      },
      {
        nodeId: "trigger",
        speaker: "Sandbox",
        text: `Trigger matched. Routing the call to ${activeWorkspaceAgent.name}.`
      },
      {
        nodeId: "instructions",
        speaker: activeWorkspaceAgent.name,
        text: `Following instructions: ${workflowNodeContent.instructions.detail}`
      },
      ...(systemNames.length
        ? systemNames.map((name) => ({
            nodeId: "systems",
            speaker: "Systems",
            text: `${name}: lookup complete — caller record and context loaded.`
          }))
        : [
            {
              nodeId: "systems",
              speaker: "Systems",
              text: "No systems connected yet — continuing with conversation context only."
            }
          ]),
      ...customApps.map((app) => ({
        nodeId: app.id,
        speaker: app.name,
        text: `${app.detail || "App step executed in the sandbox."}`
      })),
      ...customActions.map((action) => ({
        nodeId: action.id,
        speaker: action.name,
        text: `${action.detail || "Action completed in the sandbox."}`
      })),
      {
        nodeId: "outcome",
        speaker: activeWorkspaceAgent.name,
        text: `"${workflowNodeContent.outcome.title}. Is there anything else I can help with?"`
      },
      {
        nodeId: "outcome",
        speaker: "Sandbox",
        text: "Test call complete — every step in this workflow responded."
      }
    ];

    sandboxSteps.forEach((sandboxStep, index) => {
      const timer = window.setTimeout(() => {
        setSandboxActiveNodeId(sandboxStep.nodeId);
        setSandboxVisitedNodeIds((current) =>
          current.includes(sandboxStep.nodeId) ? current : [...current, sandboxStep.nodeId]
        );
        setSandboxLog((current) => [...current, { speaker: sandboxStep.speaker, text: sandboxStep.text }]);

        if (index === sandboxSteps.length - 1) {
          setSandboxRunState("complete");
          setSandboxActiveNodeId(null);
        }
      }, 500 + index * 850);
      sandboxTimersRef.current.push(timer);
    });
  };

  const sandboxNodeClass = (nodeId: string) =>
    [
      sandboxActiveNodeId === nodeId ? "is-simulating" : "",
      sandboxVisitedNodeIds.includes(nodeId) ? "is-sim-passed" : ""
    ]
      .filter(Boolean)
      .join(" ");

  useEffect(() => {
    resetWorkflowSandbox();
    return clearSandboxTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflowAgentId, step]);

  useEffect(() => {
    const log = sandboxLogRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [sandboxLog]);

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

  const startDrawerDrag = (event: React.DragEvent<HTMLElement>, payload: Record<string, string>) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-relay-workflow", JSON.stringify(payload));
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

    } catch {
      return;
    }
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
      : availableConnectors[(customApps.length + workflowIntegrations.length) % Math.max(1, availableConnectors.length)];

    if (!nextConnector) {
      return;
    }

    const id = `app-${Date.now()}`;
    const defaultPosition = { x: 554 + (customApps.length % 2) * 96, y: 248 + Math.floor(customApps.length / 2) * 48 };
    setCustomApps((current) => [...current, {
      id,
      name: nextConnector.provider,
      detail: nextConnector.name
    }]);
    setWorkflowNodeOffsets((current) => ({ ...current, [workflowNodeKey(id)]: position || defaultPosition }));
  };

  const addWorkflowAction = (position?: { x: number; y: number }) => {
    const id = `action-${Date.now()}`;
    const action = playbook.actions[(customActions.length + 1) % playbook.actions.length] || "New workflow action";
    const defaultPosition = { x: 794, y: 260 + customActions.length * 48 };
    setCustomActions((current) => [...current, { id, name: action, detail: "Configure this action" }]);
    setWorkflowNodeOffsets((current) => ({ ...current, [workflowNodeKey(id)]: position || defaultPosition }));
  };

  const playVoiceSample = (voice: VoicePreset) => {
    stopVoicePlayback();
    setActiveAudioUrl(voice.sampleAudioUrl);

    Object.entries(voiceAudioCacheRef.current).forEach(([voiceId, audio]) => {
      if (voiceId !== voice.id) {
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {
          // Ignore seek errors while another sample is still loading.
        }
      }
    });

    let sampleAudio = voiceAudioCacheRef.current[voice.id];

    if (!sampleAudio) {
      sampleAudio = new Audio(voice.sampleAudioUrl);
      sampleAudio.preload = "auto";
      voiceAudioCacheRef.current[voice.id] = sampleAudio;
    }

    sampleAudio.pause();
    sampleAudio.muted = false;
    sampleAudio.volume = 1;
    if (sampleAudio.getAttribute("src") !== voice.sampleAudioUrl) {
      sampleAudio.src = voice.sampleAudioUrl;
    }
    try {
      sampleAudio.currentTime = 0;
    } catch {
      // Some browsers disallow seeking until metadata is available.
    }
    void sampleAudio.play().catch(() => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.pause();
      audio.muted = false;
      audio.volume = 1;
      if (audio.getAttribute("src") !== voice.sampleAudioUrl) {
        audio.src = voice.sampleAudioUrl;
      }
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers disallow seeking until metadata is available.
      }
      audio.load();
      void audio.play().catch(() => undefined);
    });
  };

  const playVoiceConfirmation = (voice: VoicePreset) => {
    stopVoicePlayback();
    setActiveAudioUrl(voice.confirmationAudioUrl);

    const cacheKey = `confirmation-${voice.id}`;
    let confirmationAudio = voiceAudioCacheRef.current[cacheKey];

    if (!confirmationAudio) {
      confirmationAudio = new Audio(voice.confirmationAudioUrl);
      confirmationAudio.preload = "auto";
      voiceAudioCacheRef.current[cacheKey] = confirmationAudio;
    }

    confirmationAudio.pause();
    confirmationAudio.muted = false;
    confirmationAudio.volume = 1;
    if (confirmationAudio.getAttribute("src") !== voice.confirmationAudioUrl) {
      confirmationAudio.src = voice.confirmationAudioUrl;
    }
    try {
      confirmationAudio.currentTime = 0;
    } catch {
      // Some browsers disallow seeking until metadata is available.
    }

    void confirmationAudio.play().catch(() => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.pause();
      audio.muted = false;
      audio.volume = 1;
      if (audio.getAttribute("src") !== voice.confirmationAudioUrl) {
        audio.src = voice.confirmationAudioUrl;
      }
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers disallow seeking until metadata is available.
      }
      audio.load();
      void audio.play().catch(() => undefined);
    });
  };

  const selectVoice = (voice: VoicePreset, options: { play?: boolean } = {}) => {
    setSelectedVoiceId(voice.id);
    setHasSelectedVoice(true);
    setConfirmedVoiceId("");
    setVoiceSettingsRevealed(false);
    setVoiceRegenerationStatus("");
    if (options.play !== false) {
      playVoiceSample(voice);
    }
  };

  const submittedValue = (value: string, fallback = "Not provided") => value.trim() || fallback;
  const connectedLaunchSystems = connectors.filter((connector) => connector.connected);
  const launchFlatSummaryRows = [
    { label: "Workspace", value: confirmedWorkspaceName },
    { label: "Business type", value: submittedValue(confirmedBusinessType, playbook.label) },
    { label: "Agent", value: agentDisplayName },
    { label: "First channel", value: launchChannel },
    { label: "Goals", value: selectedGoals.join(", ") || playbook.goals.slice(0, 2).map((goal) => goal.title).join(", ") || "Review launch goals" }
  ];
  const launchFlatScopeRows = [
    { label: "Capabilities", value: selectedCapabilities.join(", ") || "Add capabilities before launch" },
    { label: "Connected systems", value: connectedLaunchSystems.map((connector) => connector.provider).join(", ") || "Connect required systems" },
    { label: "Instructions", value: submittedValue(agentPurpose, useCase) },
    { label: "Knowledge", value: submittedValue(agentKnowledge, primaryKnowledgeSource) },
    { label: "Handoff", value: submittedValue(agentHandoff, "Escalate with summary and next step") },
    { label: "Voice", value: `${selectedVoice.name} - ${selectedVoice.tone}` },
    { label: "Voice settings", value: `${voiceStability}% stable, ${voiceSimilarity}% similar, ${voiceSpeed.toFixed(2)}x speed` },
    { label: "Platform notes", value: submittedValue(otherPlatformNote, "None") },
    { label: "Tests", value: testRunState === "complete" ? `${launchGateScore}% launch score` : `${completedRunCount} of ${cinematicTestStages.length} checks complete` }
  ];

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
                  navigateToSetupStep(index);
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
          <motion.section
            className="onboarding-step-card"
            layout
            transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          >
              <AnimatePresence mode="wait">
                <motion.div
                  className="onboarding-step"
                  key={step}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.985 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <header className="onboarding-step-header">
                    <span className="onboarding-step-eyebrow">Step {step + 1} of {setupSteps.length} · {setupSteps[step]}</span>
                    <h1>{stepMeta[step].title}</h1>
                    <p>{stepMeta[step].detail}</p>
                  </header>

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
	                                placeholder="e.g. Bear Lane"
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
		                                  placeholder="e.g. dental clinic, estate agency, SaaS support team"
		                                />
		                            </label>
                              {businessSuggestions.length > 0 ? (
                                <motion.div
                                  className="business-suggestion-list"
                                  aria-label="Suggested business types"
                                  initial="hidden"
                                  animate="visible"
                                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                                >
                                  {businessSuggestions.map((suggestion) => (
                                    <motion.button
                                      type="button"
                                      onClick={() => selectBusinessSuggestion(suggestion)}
                                      variants={{
                                        hidden: { opacity: 0, y: 8 },
                                        visible: { opacity: 1, y: 0 }
                                      }}
                                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                      key={`${suggestion.entry?.code || suggestion.label}-${suggestion.label}`}
                                    >
                                      <span>{suggestion.label}</span>
                                    </motion.button>
                                  ))}
                                </motion.div>
                              ) : null}
                          </div>
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
	                          <div className="workspace-selection-meter" aria-live="polite">
	                            <b>{selectedZoomCapabilityCount} of {zoomAiCapabilities.length} selected</b>
	                          </div>
	                          <div className="workspace-capability-sections" aria-label="Select Zoom AI capabilities">
	                            {groupedZoomAiCapabilities.map((group, groupIndex) => {
	                              const precedingCount = groupedZoomAiCapabilities
	                                .slice(0, groupIndex)
	                                .reduce((total, currentGroup) => total + currentGroup.items.length, 0);

	                              return (
	                                <section className="workspace-capability-section" key={group.title}>
	                                  <div className="workspace-capability-heading">
	                                    <div>
	                                      <strong>{group.title}</strong>
	                                    </div>
	                                  </div>
	                                  <div className="workspace-confirmation-grid">
	                                    {group.items.map((goal, itemIndex) => {
	                                      const capabilityIndex = precedingCount + itemIndex;

	                                      return (
	                                        <motion.button
	                                          className={`workspace-confirmation-card ${selectedCapabilities.includes(goal.title) ? "is-selected" : ""}`}
	                                          type="button"
	                                          aria-pressed={selectedCapabilities.includes(goal.title)}
	                                          onClick={() => toggleCapability(goal.title)}
	                                          initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
	                                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
	                                          transition={{ delay: 0.24 + capabilityIndex * 0.08, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
	                                          key={goal.title}
	                                        >
	                                          <span className="workspace-card-topline">
	                                            <small>{selectedCapabilities.includes(goal.title) ? "Selected" : "Select"}</small>
	                                          </span>
	                                          <strong>{goal.title}</strong>
	                                          <p>{goal.detail}</p>
	                                        </motion.button>
	                                      );
	                                    })}
	                                  </div>
	                                </section>
	                              );
	                            })}
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

                  {step === 2 ? (
                    <div className="agent-step">
                      <section className="agent-studio" aria-label="Agent configuration">
                        <div className="agent-studio-body">
                          <nav className="agent-studio-agent-strip" aria-label="Generated agents">
                            {workspaceAgents.map((agent) => (
                              <button
                                className={[
                                  "agent-studio-agent-chip",
                                  activeWorkspaceAgent.id === agent.id ? "is-active" : "",
                                  reviewedAgentIds.includes(agent.id) ? "is-reviewed" : ""
                                ].filter(Boolean).join(" ")}
                                type="button"
                                onClick={() => {
                                  setSelectedWorkflowAgentId(agent.id);
                                  setReviewedAgentIds((current) => current.includes(agent.id) ? current : [...current, agent.id]);
                                }}
                                key={agent.id}
                              >
                                <span className="agent-studio-avatar" aria-hidden="true">{agentMonogram(agent.name)}</span>
                                <span>
                                  <strong>{agent.name}</strong>
                                  <small>{agent.label}</small>
                                </span>
                              </button>
                            ))}
                          </nav>

                          <section className="agent-studio-detail" aria-label={`${activeWorkspaceAgent.name} details`}>
                            <header className="agent-studio-detail-head">
                              <span className="agent-studio-avatar is-large" aria-hidden="true">{agentMonogram(activeWorkspaceAgent.name)}</span>
                              <div>
                                <span>{activeWorkspaceAgent.label}</span>
                                <h3>{activeWorkspaceAgent.name}</h3>
                                <p>{activeWorkspaceAgent.job}</p>
                              </div>
                            </header>

                            <div className="agent-studio-columns">
                              <section className="agent-studio-block" aria-label="How this agent runs">
                                <div className="agent-studio-block-title">
                                  <span>How it runs</span>
                                  <button type="button" onClick={() => navigateToSetupStep(1)}>Edit systems</button>
                                </div>
                                <ol className="agent-studio-steps">
                                  <li className={sandboxNodeClass("trigger")}>
                                    <span>Starts when</span>
                                    <strong>{workflowNodeContent.trigger.title}</strong>
                                    <p>{workflowNodeContent.trigger.detail}</p>
                                  </li>
                                  <li className={sandboxNodeClass("instructions")}>
                                    <span>Does</span>
                                    <strong>{workflowNodeContent.instructions.title}</strong>
                                    <p>{workflowNodeContent.instructions.detail}</p>
                                  </li>
                                  <li className={sandboxNodeClass("systems")}>
                                    <span>Uses</span>
                                    <div className="agent-studio-systems">
                                      {activeWorkspaceConnectors.map((connector) => (
                                        <span className="agent-studio-system-chip" key={connector.key}>
                                          <ProviderLogo connector={connector} />
                                          <em>{connector.provider}</em>
                                        </span>
                                      ))}
                                      {!activeWorkspaceConnectors.length ? (
                                        <button className="agent-studio-empty-system" type="button" onClick={() => navigateToSetupStep(1)}>
                                          Connect a system
                                        </button>
                                      ) : null}
                                    </div>
                                  </li>
                                  <li className={sandboxNodeClass("outcome")}>
                                    <span>Finishes by</span>
                                    <strong>{workflowNodeContent.outcome.title}</strong>
                                    <p>{workflowNodeContent.outcome.detail}</p>
                                  </li>
                                </ol>
                              </section>

                              <div className="agent-studio-side">
                                <section className="agent-studio-block agent-skill-summary-card" aria-label="Selected skills">
                                  <div className="agent-studio-block-title">
                                    <span>Skill</span>
                                    <small>Configured from workspace setup</small>
                                  </div>
                                  <div className="agent-skill-summary">
                                    <span className="agent-skill-icon" aria-hidden="true">{agentMonogram(activeWorkspaceAgent.skillTitle)}</span>
                                    <div>
                                      <strong>{activeWorkspaceAgent.skillTitle}</strong>
                                      <p>{activeWorkspaceAgent.outcome}</p>
                                    </div>
                                  </div>
                                </section>

                                <section className="agent-studio-block agent-tweak-card" aria-label={`${activeWorkspaceAgent.name} workflow tweaks`}>
                                  <div className="agent-studio-block-title">
                                    <span>Tweaks</span>
                                    <button type="button" onClick={resetWorkflowNodeEditsForActiveAgent}>Reset</button>
                                  </div>
                                  <label className="agent-tweak-field">
                                    <span>When it starts</span>
                                    <input
                                      type="text"
                                      value={workflowNodeContent.trigger.title}
                                      onChange={(event) => updateWorkflowNodeEdit("trigger", "title", event.target.value)}
                                    />
                                  </label>
                                  <label className="agent-tweak-field">
                                    <span>Instructions</span>
                                    <textarea
                                      value={workflowNodeContent.instructions.detail}
                                      onChange={(event) => updateWorkflowNodeEdit("instructions", "detail", event.target.value)}
                                      rows={3}
                                    />
                                  </label>
                                  <label className="agent-tweak-field">
                                    <span>Success outcome</span>
                                    <textarea
                                      value={workflowNodeContent.outcome.title}
                                      onChange={(event) => updateWorkflowNodeEdit("outcome", "title", event.target.value)}
                                      rows={2}
                                    />
                                  </label>
                                </section>

                                <section className="agent-studio-block agent-systems-card" aria-label={`${activeWorkspaceAgent.name} systems`}>
                                  <div className="agent-studio-block-title">
                                    <span>Systems</span>
                                    <small>{activeWorkspaceConnectors.length} active</small>
                                  </div>
                                  <div className="agent-system-toggle-list">
                                    {connectedWorkflowConnectors.map((connector) => {
                                      const isRequired = activeWorkspaceAgent.connectorKeys.includes(connector.key);
                                      const isActive = activeWorkspaceConnectorKeys.includes(connector.key);

                                      return (
                                        <label className={isRequired ? "is-required" : ""} key={connector.key}>
                                          <input
                                            type="checkbox"
                                            checked={isActive}
                                            disabled={isRequired}
                                            onChange={() => toggleWorkflowConnector(connector.key)}
                                          />
                                          <ProviderLogo connector={connector} />
                                          <span>
                                            <strong>{connector.provider}</strong>
                                            <small>{isRequired ? "Required by skill" : "Optional context"}</small>
                                          </span>
                                        </label>
                                      );
                                    })}
                                    {!connectedWorkflowConnectors.length ? (
                                      <button className="agent-studio-empty-system" type="button" onClick={() => navigateToSetupStep(1)}>
                                        Connect a system
                                      </button>
                                    ) : null}
                                  </div>
                                </section>

                                <section className="agent-studio-block" aria-label={`${activeWorkspaceAgent.name} personality tuning`}>
                                  <div className="agent-studio-block-title">
                                    <span>Personality</span>
                                    <small>Affects this agent</small>
                                  </div>
                                  <div className="agent-studio-tone-list">
                                    {agentToneControls.map((control) => (
                                      <label className="agent-tone-control" key={control.key}>
                                        <span>
                                          {control.label}
                                          <em>{toneDescriptor(activeAgentTone[control.key], control.low, control.mid, control.high)}</em>
                                        </span>
                                        <input
                                          type="range"
                                          min={0}
                                          max={100}
                                          step={5}
                                          value={activeAgentTone[control.key]}
                                          onChange={(event) => updateActiveAgentTone(control.key, Number(event.target.value))}
                                          aria-label={`${control.label} for ${activeWorkspaceAgent.name}`}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </section>
                              </div>
                            </div>

                            <button
                              className="agent-studio-canvas-toggle"
                              type="button"
                              onClick={() => setShowWorkflowCanvas((current) => !current)}
                              aria-expanded={showWorkflowCanvas}
                            >
                              {showWorkflowCanvas ? "Hide advanced workflow canvas" : "Open advanced workflow canvas"}
                            </button>
                          </section>
                        </div>
                      </section>
                      {showWorkflowCanvas ? (
                      <section className="agent-workflow-panel" aria-label="Agent workflow builder">
                        <div className="agent-workflow-canvas">
                          <div className="workflow-ide-shell">
                            <aside className="workflow-agent-sidebar" aria-label="Agents">
                              <div className="workflow-sidebar-title">
                                <div>
                                  <span>Agents</span>
                                  <strong>{workspaceAgents.length}</strong>
                                </div>
                                <button type="button" onClick={addWorkflowAgent}>+ Add</button>
                              </div>
                              <div className="workflow-agent-nav">
                                {workspaceAgents.map((agent) => (
                                  <div
                                    className={[
                                      "workflow-agent-item",
                                      activeWorkspaceAgent.id === agent.id ? "is-active" : "",
                                      reviewedAgentIds.includes(agent.id) ? "is-reviewed" : ""
                                    ].filter(Boolean).join(" ")}
                                    key={agent.id}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWorkflowAgentId(agent.id);
                                        setReviewedAgentIds((current) => current.includes(agent.id) ? current : [...current, agent.id]);
                                      }}
                                    >
                                      <span>{agent.label}</span>
                                      <strong>{agent.name}</strong>
                                      <small>{agent.trigger}</small>
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
                                  <button type="button" onClick={() => addWorkflowAction()}>+ Action</button>
                                  <button
                                    className={`workflow-run-button ${sandboxRunState === "running" ? "is-running" : ""}`}
                                    type="button"
                                    onClick={runWorkflowSandbox}
                                    disabled={sandboxRunState === "running"}
                                  >
                                    {sandboxRunState === "running" ? "Running test call..." : sandboxRunState === "complete" ? "Run test again" : "▶ Test call"}
                                  </button>
                                </div>
                              </div>
                              <div
                                className="workflow-workspace-board"
                                ref={workflowCanvasRef}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "copy";
                                }}
                                onDrop={dropWorkflowDrawerItem}
                              >
                                <div className="workflow-background-tools" aria-label="Connected apps">
                                  {connectedWorkflowConnectors.map((connector) => (
                                    <button
                                      type="button"
                                      draggable
                                      onDragStart={(event) => startDrawerDrag(event, { type: "app", connectorKey: connector.key })}
                                      onClick={() => {
                                        addWorkflowConnector(connector.key);
                                        addWorkflowApp(connector.key);
                                      }}
                                      key={connector.key}
                                    >
                                      <ProviderLogo connector={connector} />
                                      <span>{connector.provider}</span>
                                    </button>
                                  ))}
                                  {!connectedWorkflowConnectors.length ? <span>Connect apps in the previous step to place them here.</span> : null}
                                </div>
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
                                  className={`workflow-node workflow-trigger ${sandboxNodeClass("trigger")}`}
                                  style={workflowNodeOffsetStyle("trigger")}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("trigger", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "trigger")}
                                  tabIndex={0}
                                >
                                  <b>Trigger</b>
                                  <strong>{workflowNodeContent.trigger.title}</strong>
                                  <p>{workflowNodeContent.trigger.detail}</p>
                                </article>
                                <article
                                  className={`workflow-node workflow-agent ${sandboxNodeClass("instructions")}`}
                                  style={workflowNodeOffsetStyle("instructions")}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("instructions", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "instructions")}
                                  tabIndex={0}
                                >
                                  <b>Instructions</b>
                                  <strong>{workflowNodeContent.instructions.title}</strong>
                                  <p>{workflowNodeContent.instructions.detail}</p>
                                </article>
                                <div
                                  className={`workflow-tool-panel ${sandboxNodeClass("systems")}`}
                                  aria-label={`${activeWorkspaceAgent.label} connected systems`}
                                  style={workflowNodeOffsetStyle("systems")}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("systems", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => {
                                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                      event.currentTarget.releasePointerCapture(event.pointerId);
                                    }
                                    setActiveWorkflowNodeDrag(null);
                                  }}
                                >
                                  <b>Connected systems</b>
                                  <div>
                                    {activeWorkspaceConnectors.map((connector) => (
                                      <span className="workflow-system-chip" key={connector.key}>
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
                                  className={`workflow-node workflow-action-a ${sandboxNodeClass("outcome")}`}
                                  style={workflowNodeOffsetStyle("outcome")}
                                  onPointerDown={(event) => startWorkspaceNodeDrag("outcome", event)}
                                  onPointerMove={moveWorkspaceNodeDrag}
                                  onPointerUp={(event) => stopWorkspaceNodeDrag(event, "outcome")}
                                  tabIndex={0}
                                >
                                  <b>Outcome</b>
                                  <strong>{workflowNodeContent.outcome.title}</strong>
                                  <p>{workflowNodeContent.outcome.detail}</p>
                                </article>
                                {customApps.map((app) => (
                                  <article
                                    className={`workflow-node workflow-board-app ${sandboxNodeClass(app.id)}`}
                                    style={workflowNodeOffsetStyle(app.id)}
                                    onPointerDown={(event) => startWorkspaceNodeDrag(app.id, event)}
                                    onPointerMove={moveWorkspaceNodeDrag}
                                    onPointerUp={(event) => {
                                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                        event.currentTarget.releasePointerCapture(event.pointerId);
                                      }
                                      setActiveWorkflowNodeDrag(null);
                                    }}
                                    key={app.id}
                                  >
                                    <b>App</b>
                                    <strong>{app.name}</strong>
                                    <p>{app.detail}</p>
                                  </article>
                                ))}
                                {customActions.map((action) => (
                                  <article
                                    className={`workflow-node workflow-board-action ${sandboxNodeClass(action.id)}`}
                                    style={workflowNodeOffsetStyle(action.id)}
                                    onPointerDown={(event) => startWorkspaceNodeDrag(action.id, event)}
                                    onPointerMove={moveWorkspaceNodeDrag}
                                    onPointerUp={(event) => {
                                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                        event.currentTarget.releasePointerCapture(event.pointerId);
                                      }
                                      setActiveWorkflowNodeDrag(null);
                                    }}
                                    key={action.id}
                                  >
                                    <b>Action</b>
                                    <strong>{action.name}</strong>
                                    <p>{action.detail}</p>
                                  </article>
                                ))}
                              </div>
                              <div className={`workflow-sandbox-console is-${sandboxRunState}`} aria-label="Workflow sandbox console" aria-live="polite">
                                <div className="workflow-sandbox-header">
                                  <span className="workflow-sandbox-light" aria-hidden="true"></span>
                                  <strong>Sandbox</strong>
                                  <small>
                                    {sandboxRunState === "running"
                                      ? "Simulating a live caller through this workflow..."
                                      : sandboxRunState === "complete"
                                        ? "Test call passed — every step responded."
                                        : "Run a test call to watch this workflow handle a caller."}
                                  </small>
                                  {sandboxLog.length ? (
                                    <button type="button" onClick={resetWorkflowSandbox}>
                                      Clear
                                    </button>
                                  ) : null}
                                </div>
                                {sandboxLog.length ? (
                                  <div className="workflow-sandbox-log" ref={sandboxLogRef}>
                                    {sandboxLog.map((entry, index) => (
                                      <p key={`${entry.speaker}-${index}`}>
                                        <b>{entry.speaker}</b>
                                        <span>{entry.text}</span>
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </section>
                          </div>
                        </div>
                      </section>
                      ) : null}
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className={`voice-step ${voiceSettingsRevealed ? "is-reviewing" : ""}`}>
                      <motion.section
                        className="voice-lab"
                        initial={{ opacity: 0, y: 18, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          {!voiceSettingsRevealed ? (
                            <motion.div
                              className="voice-lab-grid"
                              key="voice-grid"
                              layout
                              initial={{ opacity: 0, scale: 0.992, filter: "blur(2px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 0.992, filter: "blur(3px)" }}
                              transition={{
                                layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                                duration: 0.26,
                                ease: [0.22, 1, 0.36, 1]
                              }}
                            >
                              <section className="voice-rail" aria-label="Choose a voice agent">
                                {elevenLabsVoices.map((voice, index) => (
                                  <motion.button
                                    className={[
                                      voice.id === selectedVoice.id ? "is-active" : "",
                                      confirmedVoiceId === voice.id ? "is-confirmed" : ""
                                    ].filter(Boolean).join(" ")}
                                    type="button"
                                    aria-pressed={voice.id === selectedVoice.id}
                                    onPointerDown={(event) => {
                                      if (event.pointerType === "mouse" && event.button !== 0) {
                                        return;
                                      }
                                      pointerPlayedVoiceIdRef.current = voice.id;
                                      selectVoice(voice);
                                    }}
                                    onClick={() => {
                                      if (pointerPlayedVoiceIdRef.current === voice.id) {
                                        pointerPlayedVoiceIdRef.current = null;
                                        const cachedAudio = voiceAudioCacheRef.current[voice.id];

                                        if (cachedAudio && !cachedAudio.paused) {
                                          return;
                                        }
                                      }
                                      selectVoice(voice);
                                    }}
                                    data-voice-id={voice.id}
                                    data-audio-src={voice.sampleAudioUrl}
                                    aria-label={`Preview ${voice.name} voice`}
                                    whileTap={{ scale: 0.975 }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.28, delay: index * 0.04 }}
                                    key={voice.id}
                                  >
                                    <motion.span
                                      className="voice-persona-avatar"
                                      layoutId={`voice-avatar-${voice.id}`}
                                      transition={{ layout: { duration: 0.58, ease: [0.16, 1, 0.3, 1] } }}
                                      aria-hidden="true"
                                    >
                                      <img src={voice.avatarUrl} alt="" />
                                    </motion.span>
                                    <span className="voice-persona-meta">
                                      <strong>{voice.name}</strong>
                                      <small>{voice.tone}</small>
                                    </span>
                                  </motion.button>
                                ))}
                              </section>
                            </motion.div>
                          ) : (
                            <motion.div
                              className="voice-review-stage"
                              key="voice-review"
                              layout
                              initial={{ opacity: 0, scale: 0.992, filter: "blur(4px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 0.992, filter: "blur(3px)" }}
                              transition={{
                                layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                                duration: 0.34,
                                ease: [0.22, 1, 0.36, 1]
                              }}
                            >
                              <div className="voice-portrait-stack">
                                <motion.div
                                  className="voice-review-portrait"
                                  layoutId={`voice-avatar-${selectedVoice.id}`}
                                  transition={{ layout: { duration: 0.58, ease: [0.16, 1, 0.3, 1] } }}
                                >
                                  <img src={selectedVoice.avatarUrl} alt="" />
                                </motion.div>
                                <button
                                  className="voice-regenerate-button"
                                  type="button"
                                  onClick={regenerateSelectedVoice}
                                  disabled={isRegeneratingVoice}
                                >
                                  {isRegeneratingVoice ? "Regenerating..." : "Regenerate voice"}
                                </button>
                                {voiceRegenerationStatus ? (
                                  <small className="voice-regenerate-status" aria-live="polite">
                                    {voiceRegenerationStatus}
                                  </small>
                                ) : null}
                              </div>

                              <motion.section
                                className="voice-settings-panel"
                                aria-label={`${selectedVoice.name} voice settings`}
                                initial={{ opacity: 0, scale: 0.985, filter: "blur(5px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                transition={{ duration: 0.36, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <details className="voice-settings-dropdown" open>
                                  <summary>
                                    <span className="voice-settings-summary-copy">
                                      <span>Voice settings</span>
                                      <strong>{selectedVoice.name}</strong>
                                      <small>{selectedVoice.tone}</small>
                                    </span>
                                    <span className="voice-settings-summary-meta">
                                      <b>{voiceStability}% stable</b>
                                      <em>{voiceSpeed.toFixed(2)}x speed</em>
                                    </span>
                                    <i aria-hidden="true" />
                                  </summary>

                                  <div className="voice-settings-content">
                                    <section className="voice-settings-group" aria-label="ElevenLabs voice generation settings">
                                      <div className="voice-settings-group-title">
                                        <span>ElevenLabs voice</span>
                                        <strong>Generation controls</strong>
                                      </div>
                                      <div className="voice-settings-grid">
                                        <label className="voice-setting-row">
                                          <span>
                                            <strong>Stability</strong>
                                            <small>More consistent output.</small>
                                          </span>
                                          <b>{voiceStability}%</b>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={voiceStability}
                                            onChange={(event) => setVoiceStability(Number(event.currentTarget.value))}
                                          />
                                        </label>

                                        <label className="voice-setting-row">
                                          <span>
                                            <strong>Clarity + similarity</strong>
                                            <small>Closer voice match.</small>
                                          </span>
                                          <b>{voiceSimilarity}%</b>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={voiceSimilarity}
                                            onChange={(event) => setVoiceSimilarity(Number(event.currentTarget.value))}
                                          />
                                        </label>

                                        <label className="voice-setting-row">
                                          <span>
                                            <strong>Style exaggeration</strong>
                                            <small>More expressive delivery.</small>
                                          </span>
                                          <b>{voiceStyle}%</b>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={voiceStyle}
                                            onChange={(event) => setVoiceStyle(Number(event.currentTarget.value))}
                                          />
                                        </label>

                                        <label className="voice-setting-row">
                                          <span>
                                            <strong>Speech speed</strong>
                                            <small>Slower or faster speech.</small>
                                          </span>
                                          <b>{voiceSpeed.toFixed(2)}x</b>
                                          <input
                                            type="range"
                                            min="0.7"
                                            max="1.2"
                                            step="0.01"
                                            value={voiceSpeed}
                                            onChange={(event) => setVoiceSpeed(Number(event.currentTarget.value))}
                                          />
                                        </label>

                                        <label className="voice-setting-row is-toggle">
                                          <span>
                                            <strong>Speaker boost</strong>
                                            <small>Stronger voice identity.</small>
                                          </span>
                                          <input
                                            type="checkbox"
                                            checked={voiceSpeakerBoost}
                                            onChange={(event) => setVoiceSpeakerBoost(event.currentTarget.checked)}
                                          />
                                        </label>
                                      </div>
                                    </section>

                                    <section className="voice-settings-group" aria-label="Live call behaviour settings">
                                      <div className="voice-settings-group-title">
                                        <span>Call behaviour</span>
                                        <strong>Conversation feel</strong>
                                      </div>
                                    <div className="voice-settings-grid">
                                      <label className="voice-setting-row">
                                        <span>
                                          <strong>Response timing</strong>
                                          <small>When the agent starts.</small>
                                        </span>
                                        <b>{latency}ms</b>
                                        <input
                                          type="range"
                                          min="420"
                                          max="1200"
                                          step="20"
                                          value={latency}
                                          onChange={(event) => setLatency(Number(event.currentTarget.value))}
                                        />
                                      </label>

                                      <label className="voice-setting-row is-toggle">
                                        <span>
                                          <strong>Allow interruptions</strong>
                                          <small>Let callers cut in.</small>
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={bargeIn}
                                          onChange={(event) => setBargeIn(event.currentTarget.checked)}
                                        />
                                      </label>
                                    </div>
                                    </section>

                                    <div className="voice-playback voice-playback-review">
                                      <audio ref={audioRef} src={activeAudioUrl} data-active-voice-id={selectedVoice.id} controls preload="auto" />
                                    </div>
                                  </div>
                                </details>
                              </motion.section>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.section>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="test-step">
                      <section className={`test-cinematic-runner ${testRunState === "running" ? "is-running" : ""} ${testsComplete ? "is-complete" : ""}`} aria-label="Automated launch test sequence" aria-live="polite">
                        <div className="test-cinematic-header">
                          <div>
                            <span>Launch simulation</span>
                            <h2>Run the full production test sequence</h2>
                            <p>{testsComplete ? `${agentDisplayName} passed the six-stage launch gate at ${launchGateScore}%.` : testRunState === "running" ? `Running ${activeCinematicTest.label}: ${activeCinematicTest.scene}.` : "Start with six checks. Each box runs in order and streams the current test below."}</p>
                          </div>
                          <button className="test-run-master-button" type="button" onClick={runLaunchTests} disabled={testRunState === "running"}>
                            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                              <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                            </svg>
                            <span>{testRunButtonLabel}</span>
                          </button>
                        </div>

                        <div className="test-runner-grid" aria-label="Six launch checks">
                          {cinematicTestStages.map((stage, index) => {
                            const stageState = testRunState === "complete" || index < completedRunCount
                              ? "complete"
                              : testRunState === "running" && index === activeRunIndex
                                ? "running"
                                : "queued";

                            return (
                              <motion.article
                                className={`test-runner-box is-${stageState} is-${stage.id}`}
                                style={{ "--runner-index": index } as CSSProperties}
                                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.045, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                                key={stage.id}
                              >
                                <span className="test-runner-box-index">{String(index + 1).padStart(2, "0")}</span>
                                <div>
                                  <strong>{stage.label}</strong>
                                  <p>{stage.title}</p>
                                </div>
                                <small>{stageState === "complete" ? "Passed" : stageState === "running" ? "Running" : "Queued"}</small>
                                <i aria-hidden="true"><b style={{ width: stageState === "complete" ? "100%" : stageState === "running" ? "62%" : "0%" }} /></i>
                              </motion.article>
                            );
                          })}
                        </div>

                        <div className="test-cinematic-stage">
                          <motion.div
                            className={`test-visual-stage is-${activeCinematicTest.id}`}
                            key={activeCinematicTest.id}
                            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                            aria-hidden="true"
                          >
                            <div className="test-visual-core">
                              <span>{activeCinematicTest.label}</span>
                              <strong>{testRunState === "idle" ? "Ready" : activeCinematicTest.score + "%"}</strong>
                            </div>
                            {activeCinematicTest.id === "live-chat" ? (
                              <div className="test-visual-chat">
                                <p><b>Customer</b><span>I need help with this today.</span></p>
                                <p><b>{agentDisplayName}</b><span>Intent found. Answering from approved context.</span></p>
                              </div>
                            ) : null}
                            {activeCinematicTest.id === "voice" ? (
                              <div className="test-visual-voice">
                                {Array.from({ length: 16 }).map((_, index) => (
                                  <i style={{ height: `${14 + ((index * 13) % 38)}px` }} key={index} />
                                ))}
                              </div>
                            ) : null}
                            {activeCinematicTest.id === "knowledge" ? (
                              <div className="test-visual-knowledge">
                                <span>{primaryKnowledgeSource}</span>
                                <i><b /></i>
                                <small>Source matched</small>
                              </div>
                            ) : null}
                            {activeCinematicTest.id === "systems" ? (
                              <div className="test-visual-systems">
                                {["CRM", "KB", "Desk"].map((item) => <span key={item}>{item}</span>)}
                              </div>
                            ) : null}
                            {activeCinematicTest.id === "handoff" ? (
                              <div className="test-visual-handoff">
                                <span>AI</span>
                                <i />
                                <span>Human</span>
                              </div>
                            ) : null}
                            {activeCinematicTest.id === "launch" ? (
                              <div className="test-visual-launch">
                                <i />
                                <span>{launchGateScore}%</span>
                              </div>
                            ) : null}
                          </motion.div>

                          <details className="test-activity-dropdown" open={testRunState === "running" || testsComplete}>
                            <summary>
                              <span>{testRunState === "running" ? "Now running" : testsComplete ? "Run complete" : "Activity"}</span>
                              <strong>{activeCinematicTest.scene}</strong>
                              <b>{testProgress}%</b>
                            </summary>
                            <div className="test-activity-body">
                              <p>{activeCinematicTest.detail}</p>
                              <ul>
                                {activeCinematicTest.checks.map((check, index) => (
                                  <li className={testRunState === "complete" || index < Math.min(activeCinematicTest.checks.length, completedRunCount + 1) ? "is-done" : ""} key={check}>
                                    {check}
                                  </li>
                                ))}
                              </ul>
                              <footer>
                                <span>{activeCinematicTest.evidence}</span>
                                <strong>{testRunState === "complete" || completedRunCount > activeRunIndex ? activeCinematicTest.result : "Streaming evidence..."}</strong>
                              </footer>
                            </div>
                          </details>
                        </div>
                      </section>

                      <div className="test-agent-grid">
                        <aside className="test-agent-summary" aria-label="Agent summary">
                          <h2>Agent summary</h2>
                          <div className="test-agent-profile-card">
                            <span className="test-bot-avatar" aria-hidden="true">
                              <svg viewBox="0 0 24 24" focusable="false">
                                <path d="M12 4v2.2" />
                                <rect x="5.4" y="7.2" width="13.2" height="10" rx="3.2" />
                                <path d="M9 11.5h.1M15 11.5h.1M9.5 15h5" />
                                <path d="M3.4 12.2h2M18.6 12.2h2" />
                              </svg>
                            </span>
                            <div>
                              <strong>{agentDisplayName}</strong>
                              <small><i />Ready to test</small>
                            </div>
                          </div>

                          <dl className="test-summary-list">
                            <div>
                              <dt>
                                <span aria-hidden="true" />
                                Role / Use case
                              </dt>
                              <dd>{useCase || "Customer support & product help"}</dd>
                            </div>
                            <div>
                              <dt>
                                <span aria-hidden="true" />
                                Tone of voice
                              </dt>
                              <dd>{selectedVoice.tone}; {toneDescriptor(activeAgentTone.professionalism, "casual", "helpful", "professional")}</dd>
                            </div>
                            <div>
                              <dt>
                                <span aria-hidden="true" />
                                Channels enabled
                              </dt>
                              <dd className="test-channel-row">
                                <b>Voice</b>
                                <b>Live Chat</b>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <span aria-hidden="true" />
                                Business hours
                              </dt>
                              <dd>Mon - Fri, 8:00 AM - 6:00 PM<br />Sat - Sun, 9:00 AM - 5:00 PM</dd>
                            </div>
                            <div>
                              <dt>
                                <span aria-hidden="true" />
                                Language
                              </dt>
                              <dd>English (US)</dd>
                            </div>
                          </dl>

                          <button className="test-edit-agent-button" type="button" onClick={() => navigateToSetupStep(2)}>
                            Edit agent
                          </button>
                        </aside>

                        <section className="test-chat-card" aria-label="Chat test">
                          <header className="test-card-header">
                            <div>
                              <h2>Chat test</h2>
                              <p>Simulate a conversation with your AI agent.</p>
                            </div>
                            <button type="button" onClick={clearSetupTestChat}>
                              Clear chat
                            </button>
                          </header>

                          <div className="test-chat-thread" ref={testChatThreadRef}>
                            {testChatMessages.map((message, index) => (
                              <div className={`test-message-row is-${message.role}`} key={`${message.role}-${index}-${message.content.slice(0, 12)}`}>
                                {message.role === "agent" ? <span className="test-small-bot" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="9" rx="3" /><path d="M12 5v3M9.2 12h.1M14.7 12h.1" /></svg></span> : null}
                                <article>
                                  <p>{message.content}</p>
                                  <time>{index < 2 ? "10:24 AM" : "10:25 AM"}</time>
                                </article>
                                {message.role === "user" ? <span className="test-user-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.7-4 3.1-6 6.5-6s5.8 2 6.5 6" /></svg></span> : null}
                              </div>
                            ))}
                            {isTestChatTyping ? (
                              <div className="test-message-row is-agent">
                                <span className="test-small-bot" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="9" rx="3" /><path d="M12 5v3M9.2 12h.1M14.7 12h.1" /></svg></span>
                                <article className="is-typing">
                                  <p><i /><i /><i /></p>
                                  <time>Testing</time>
                                </article>
                              </div>
                            ) : null}
                          </div>

                          <form className="test-chat-composer" onSubmit={sendSetupTestChat}>
                            <input
                              type="text"
                              value={testChatInput}
                              onChange={(event) => setTestChatInput(event.target.value)}
                              placeholder="Ask a question or start a test conversation"
                              aria-label="Chat test message"
                            />
                            <button type="submit" disabled={!testChatInput.trim() || isTestChatTyping} aria-label="Send chat test">
                              <svg viewBox="0 0 24 24" focusable="false">
                                <path d="M20 4 9.4 14.6" />
                                <path d="m20 4-6.7 16-3.9-5.4L4 10.7 20 4Z" />
                              </svg>
                            </button>
                          </form>
                          <p className="test-chat-tip">{testChatStatus}</p>
                        </section>

                        <div className="test-right-column">
                          <section className="test-voice-card" aria-label="Voice test">
                            <header className="test-card-header">
                              <div>
                                <h2>Voice test</h2>
                                <p>Test your agent's voice and responses.</p>
                              </div>
                              <button type="button" onClick={() => navigateToSetupStep(3)}>
                                Call settings
                              </button>
                            </header>

                            <label className="test-voice-select">
                              <span>Select voice</span>
                              <select
                                value={selectedVoiceId}
                                onChange={(event) => setSelectedVoiceId(event.target.value)}
                              >
                                {elevenLabsVoices.map((voice) => (
                                  <option value={voice.id} key={voice.id}>
                                    {voice.name} ({voice.role}) - {voice.tone}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="test-voice-stage">
                              <button className="test-play-greeting" type="button" onClick={playTestGreeting} aria-label="Play greeting">
                                <svg viewBox="0 0 24 24" focusable="false"><path d="M8 5.5v13l10-6.5-10-6.5Z" /></svg>
                                <span>Play greeting</span>
                              </button>

                              <div className={`test-call-orb ${testVoiceState === "running" ? "is-running" : ""} ${testVoiceState === "complete" ? "is-complete" : ""}`} aria-hidden="true">
                                <span>
                                  <svg viewBox="0 0 24 24" focusable="false"><path d="M7.4 4.8 9.5 4l2.2 4.2-1.5 1.3c.8 1.7 2.1 2.9 3.8 3.8l1.3-1.5 4.2 2.2-.8 2.1c-.3.9-1.1 1.4-2 1.3-5.3-.5-9.6-4.8-10.1-10.1-.1-.9.4-1.7 1.3-2.1Z" /></svg>
                                </span>
                              </div>

                              <div className="test-waveform" aria-hidden="true">
                                {Array.from({ length: 34 }).map((_, index) => (
                                  <i style={{ height: `${10 + ((index * 17) % 38)}px` }} key={index} />
                                ))}
                              </div>
                            </div>

                            <button className="test-start-voice-button" type="button" onClick={startVoiceTest} disabled={testVoiceState === "running"}>
                              <svg viewBox="0 0 24 24" focusable="false"><path d="M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" /><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v3M9 20h6" /></svg>
                              {testVoiceState === "running" ? "Running voice test" : "Start voice test"}
                            </button>
                            <audio ref={testVoiceAudioRef} preload="auto" />
                            <p className="test-voice-status">{testVoiceStatus}</p>

                            <div className="test-metric-grid">
                              <div>
                                <span>Response time</span>
                                <strong>{(latency / 1000).toFixed(1)}s <b>Good</b></strong>
                              </div>
                              <div>
                                <span>Confidence</span>
                                <strong>{testRunState === "complete" ? launchGateScore : selectedScenario.score}% <b>High</b></strong>
                              </div>
                              <div>
                                <span>Escalation path</span>
                                <strong>Tier 2 Support <b>Enabled</b></strong>
                              </div>
                            </div>
                          </section>

                          <section className="test-checklist-card" aria-label="Test checklist">
                            <div>
                              <h2>Test checklist</h2>
                              <ul>
                                <li className={confirmedVoiceId ? "is-done" : ""}>Greeting configured</li>
                                <li className={connectedCount > 0 ? "is-done" : ""}>Knowledge connected</li>
                                <li className={testChatMessages.some((message) => message.role === "agent") ? "is-done" : ""}>Escalation enabled</li>
                                <li className={testsComplete ? "is-done" : ""}>Call routing ready</li>
                              </ul>
                            </div>
                            <aside>
                              <span aria-hidden="true">OK</span>
                              <strong>{testsComplete ? "All set!" : `${testProgress}% ready`}</strong>
                              <small>{testsComplete ? "You're ready to go live." : "Run tests to finish."}</small>
                            </aside>
                          </section>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <section className={`launch-request-panel ${launchRequestSubmitted ? "is-submitted" : ""}`}>
                      <div className="launch-flat-top">
                        <div>
                          <span>{launchRequestSubmitted ? "Submitted" : launchStage === "review" ? "Review details" : "Live route"}</span>
                          <h2>{launchStage === "review" ? "Review the details" : "Add launch contact"}</h2>
                          <p>
                            {launchStage === "review"
                              ? "Check the setup that will be sent to engineering."
                              : "Add the live website and phone route for production setup."}
                          </p>
                        </div>
                        <strong>{launchRequestSubmitted ? "Submitted" : launchStage === "review" ? "Step 1 of 2" : "Step 2 of 2"}</strong>
                      </div>

                      <div className="launch-flat-flow" aria-label="Launch request workflow">
                        <span className={launchStage === "review" ? "is-active" : "is-complete"}><b>1</b> Review details</span>
                        <span className={launchStage === "contact" ? "is-active" : ""}><b>2</b> Add contact</span>
                      </div>

                      {launchStage === "review" ? (
                        <>
                          <section className="launch-flat-section" aria-label="Setup details">
                            <header>
                              <span>Setup details</span>
                              <p>Core details for engineering.</p>
                            </header>
                            <div className="launch-flat-list">
                              {launchFlatSummaryRows.map((row) => (
                                <p key={row.label}>
                                  <span>{row.label}</span>
                                  <strong>{row.value}</strong>
                                </p>
                              ))}
                            </div>
                          </section>

                          <section className="launch-flat-section" aria-label="Agent scope">
                            <header>
                              <span>Agent scope</span>
                              <p>What the agent is expected to handle.</p>
                            </header>
                            <div className="launch-flat-list">
                              {launchFlatScopeRows.map((row) => (
                                <p key={row.label}>
                                  <span>{row.label}</span>
                                  <strong>{row.value}</strong>
                                </p>
                              ))}
                            </div>
                          </section>
                        </>
                      ) : (
                        <>
                          <section className="launch-flat-section" aria-label="Production contact details">
                            <header>
                              <span>Contact details</span>
                              <p>Use the final customer-facing route.</p>
                            </header>
                            <div className="launch-request-fields">
                              <label>
                                Website URL
                                <input
                                  type="url"
                                  value={websiteUrl}
                                  onChange={(event) => {
                                    setWebsiteUrl(event.target.value);
                                    setLaunchRequestSubmitted(false);
                                  }}
                                  placeholder="https://yourcompany.com"
                                />
                              </label>
                              <label>
                                Phone contact number
                                <input
                                  type="tel"
                                  value={phoneContactNumber}
                                  onChange={(event) => {
                                    setPhoneContactNumber(event.target.value);
                                    setLaunchRequestSubmitted(false);
                                  }}
                                  placeholder="+1 555 010 1234"
                                />
                              </label>
                            </div>
                          </section>

                        </>
                      )}

                    </section>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="onboarding-actions">
                <div className="onboarding-actions-buttons">
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => {
                      if (step === setupSteps.length - 1 && launchStage === "contact") {
                        setLaunchStage("review");
                        return;
                      }

                      navigateToSetupStep(step - 1);
                    }}
                    disabled={step === 0}
                  >
                    Back
                  </button>
                  <button className="dark-button" type="button" onClick={nextStep} disabled={!canContinue}>
                    {step === setupSteps.length - 1 && launchStage === "contact" ? "Submit launch details" : "Continue"}
                  </button>
                </div>
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
                        ? "Log in to " + setupLoginIntegration.company
                        : setupLoginIntegrationStage === "success"
                          ? setupLoginIntegration.company + " connected"
                          : "Logging in to " + setupLoginIntegration.company
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
                          Email
                          <input
                            type="email"
                            value={setupLoginIntegrationEmail}
                            onChange={(event) => setSetupLoginIntegrationEmail(event.target.value)}
                            placeholder="name@company.com"
                            autoFocus
                          />
                        </label>
                        <label>
                          Password
                          <input
                            type="password"
                            value={setupLoginIntegrationPassword}
                            onChange={(event) => setSetupLoginIntegrationPassword(event.target.value)}
                            placeholder="Enter password"
                          />
                        </label>
                        <button type="submit" disabled={!setupLoginIntegrationEmail.trim() || !setupLoginIntegrationPassword.trim()}>
                          Continue
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
                              : "Logging in to " + setupLoginIntegration.company}
                          </strong>
                          <small>
                            {setupLoginIntegrationStage === "success"
                              ? "Connection complete. Updating your setup."
                              : "Opening secure authorization for this workspace."}
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
      </AnimatePresence>
    </main>
  );
}

type InboxMessage = {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  side: "customer" | "agent" | "human" | "note" | "system";
};

type InboxThread = {
  id: string;
  name: string;
  initials: string;
  intent: string;
  time: string;
  status: "Open" | "AI Handled" | "Needs Review" | "Resolved";
  tone: string;
  mood: string;
  starred: boolean;
  joined: boolean;
  autoReplied: boolean;
  email: string;
  phone: string;
  facts: [string, string][];
  suggestedReplies: string[];
  article: { title: string; note: string } | null;
  messages: InboxMessage[];
};

type CallStatus = "Live" | "Waiting" | "AI Handled" | "Missed" | "Resolved";

type CallQueueItem = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  badge: string;
  status: CallStatus;
  time: string;
  tone: string;
  active?: boolean;
};

type CallAssistantMessage = {
  id: string;
  role: "operator" | "ai";
  text: string;
  time: string;
};

type InboxSeed = {
  name: string;
  intent: string;
  time: string;
  status: InboxThread["status"];
  tone: string;
  mood: string;
  phone: string;
  facts: [string, string][];
  replies: string[];
  article?: { title: string; note: string };
  thread: [side: "c" | "a", text: string, time: string][];
};

function buildInboxThreads(isClearDbs: boolean): InboxThread[] {
  const seeds: InboxSeed[] = isClearDbs ? [
    {
      name: "Priya Shah", intent: "Enhanced DBS status", time: "2m", status: "Open", tone: "purple", mood: "Neutral", phone: "+44 7700 910214",
      facts: [["Application ID", "DBS-APP-28419"], ["Check type", "Enhanced DBS"], ["Employer", "Little Oaks Care"], ["Stage", "4 of 5 - with DBS"]],
      replies: [
        "Your check is at stage 4 of 5, which means DBS is doing the final review. Nothing is missing from your side.",
        "I've flagged your Monday deadline to our operations team - they'll review the case today and update you by email.",
        "You'll get an email the moment the certificate is issued. It's posted to your home address."
      ],
      article: { title: "What the 5 DBS stages mean", note: "Plain-English guide to each stage of a check." },
      thread: [
        ["c", "Hi, can you tell me if my enhanced DBS check has moved? My reference is DBS-APP-28419.", "10:32 AM"],
        ["a", "I can help with the status. I found reference DBS-APP-28419 and it is currently with DBS for stage 4 review.\n\nThe last update was today at 09:48. There is no missing ID evidence showing on the case.", "10:33 AM"],
        ["c", "Does that mean Clear DBS can speed it up?", "10:34 AM"],
        ["a", "Clear DBS can monitor the case and help with missing information, but cannot control the DBS review time once it is with DBS.\n\nI can ask the operations team to review the case if there is a deadline.", "10:34 AM"],
        ["c", "Yes please, the employer needs it before Monday.", "10:35 AM"]
      ]
    },
    {
      name: "Little Oaks Care", intent: "Missing ID evidence", time: "9m", status: "Open", tone: "green", mood: "Neutral", phone: "+44 161 555 0148",
      facts: [["Account type", "Employer"], ["Open applications", "6"], ["Contact", "HR team"]],
      replies: [
        "The applicant still needs to provide one document from group 1 - a passport or driving licence works.",
        "I can email the applicant the document checklist directly if that helps."
      ],
      article: { title: "Accepted ID documents", note: "Group 1 and group 2 document lists." },
      thread: [
        ["c", "We need to know what the applicant still needs to provide for their check to move forward.", "10:26 AM"],
        ["a", "The application is waiting on one more identity document from group 1 - a passport or UK driving licence.\n\nEverything else on the application is complete.", "10:27 AM"]
      ]
    },
    {
      name: "Marcus Reid", intent: "Certificate posted", time: "18m", status: "AI Handled", tone: "green", mood: "Positive", phone: "+44 7700 910588",
      facts: [["Application ID", "DBS-APP-28204"], ["Check type", "Standard DBS"], ["Stage", "Complete"]],
      replies: ["Your certificate was posted to your home address on file. Allow 5 working days for delivery."],
      thread: [
        ["c", "I need to confirm where my certificate will be sent now that my check is complete.", "10:17 AM"],
        ["a", "Congratulations, your check is complete. The certificate is posted by DBS to your home address - the one you entered on the application.\n\nIt usually arrives within 5 working days.", "10:18 AM"],
        ["c", "Great, thanks!", "10:19 AM"]
      ]
    },
    {
      name: "Northpoint Education", intent: "Barred-list eligibility", time: "31m", status: "Needs Review", tone: "purple", mood: "Neutral", phone: "+44 113 555 0182",
      facts: [["Account type", "Employer"], ["Sector", "Education"], ["Flag", "Eligibility question"]],
      replies: [
        "Barred-list checks are only allowed for roles in regulated activity. Our compliance team is reviewing whether this role qualifies and will confirm today.",
        "Could you share the job description? That's what compliance needs to confirm eligibility."
      ],
      article: { title: "Barred-list eligibility rules", note: "When a role can legally include barred-list checks." },
      thread: [
        ["c", "Can this role request the barred list check? It's a teaching assistant position.", "10:04 AM"],
        ["a", "Barred-list checks are only permitted for roles in regulated activity. A teaching assistant role usually qualifies, but this needs a compliance confirmation.\n\nI've passed this to the team so a specialist can confirm before you submit.", "10:05 AM"]
      ]
    },
    {
      name: "Amina Yusuf", intent: "Application correction", time: "48m", status: "Open", tone: "green", mood: "Frustrated", phone: "+44 7700 910712",
      facts: [["Application ID", "DBS-APP-28530"], ["Check type", "Enhanced DBS"], ["Stage", "1 of 5 - form review"]],
      replies: [
        "Because the application hasn't been submitted to DBS yet, we can fix the surname spelling now with no delay to your check.",
        "I've corrected the surname - please double-check the confirmation email we've just sent."
      ],
      thread: [
        ["c", "There is a spelling mistake in my previous surname on the application. Can it be fixed?", "9:47 AM"],
        ["a", "Yes - your application is still at form review, so the surname can be corrected without restarting the check.\n\nWould you like me to apply the correction now?", "9:48 AM"],
        ["c", "Yes please, it should be 'Hassan' not 'Hasan'.", "9:50 AM"]
      ]
    },
    {
      name: "Harbour Homecare", intent: "Bulk checks", time: "1h", status: "AI Handled", tone: "green", mood: "Positive", phone: "+44 121 555 0199",
      facts: [["Account type", "Employer"], ["Open applications", "14"], ["Report", "Weekly status export"]],
      replies: ["Your weekly status export is ready - I've sent it to your registered email."],
      thread: [
        ["c", "We need a status export for this week's starters. Can you send the latest?", "9:31 AM"],
        ["a", "Done - I've generated the status export for all 14 open applications and emailed it to your registered address.\n\nIt includes the current stage and any missing items for each applicant.", "9:32 AM"]
      ]
    },
    {
      name: "Theo Martin", intent: "Identity route", time: "2h", status: "Resolved", tone: "purple", mood: "Positive", phone: "+44 7700 910845",
      facts: [["Application ID", "DBS-APP-28112"], ["Check type", "Basic DBS"], ["Route", "ID route 2"]],
      replies: ["Route 2 lets you use a birth certificate plus two proofs of address - I can email the full list."],
      thread: [
        ["c", "I do not have the usual documents. What can I use instead?", "8:36 AM"],
        ["a", "No problem - you can use identity route 2. That means a birth certificate plus two proofs of address, like a bank statement and a utility bill from the last 3 months.\n\nI've emailed you the full accepted list.", "8:37 AM"],
        ["c", "That works, I have those. Thank you!", "8:40 AM"]
      ]
    },
    {
      name: "Greenfield Trust", intent: "Invoice and applicant list", time: "3h", status: "Resolved", tone: "green", mood: "Positive", phone: "+44 20 5555 0134",
      facts: [["Account type", "Employer"], ["Checks this month", "22"], ["Billing", "Monthly invoice"]],
      replies: ["July's invoice with the full applicant list was sent to your finance contact this morning."],
      thread: [
        ["c", "Please confirm the checks submitted this month and send the invoice breakdown.", "7:58 AM"],
        ["a", "You submitted 22 checks this month. I've sent the itemised invoice with the applicant list to your finance contact.\n\nLet me know if you need it resent to a different address.", "7:59 AM"]
      ]
    }
  ] : [
    {
      name: "Jessica Cooper", intent: "Order status inquiry", time: "2m", status: "Open", tone: "purple", mood: "Positive", phone: "+44 7700 900123",
      facts: [["Company", "Cooper Marketing Ltd."], ["Plan", "Pro Plan"], ["Customer since", "Feb 14, 2025"], ["Latest order", "#ACM-12345 · Shipped · $149.00"]],
      replies: [
        "Your order #ACM-12345 is on the way and should arrive by Friday, May 23. Here's the tracking link again in case you need it.",
        "Is there anything else you'd like me to check on this order?",
        "I can set up an SMS alert so you get a text the moment it's delivered - want me to do that?"
      ],
      article: { title: "Where is my order?", note: "Delivery timelines and tracking help." },
      thread: [
        ["c", "Hi, can you help me check the status of my order #ACM-12345?", "10:32 AM"],
        ["a", "Of course! I'd be happy to help you with that.\n\nI've checked your order #ACM-12345 and it was shipped yesterday, May 18, 2026.\n\nYou can expect delivery by Friday, May 23, 2026.", "10:33 AM"],
        ["c", "Great, thank you! Can you also send me the tracking number?", "10:33 AM"],
        ["a", "Absolutely! Here's your tracking number:\n\n1Z999AA10123456784\n\nYou can track your package here:\nhttps://tracking.ups.com/1Z999AA10123456784", "10:34 AM"],
        ["c", "Perfect, that's exactly what I needed. Thanks!", "10:34 AM"]
      ]
    },
    {
      name: "Michael Brown", intent: "Refund request", time: "12m", status: "Open", tone: "green", mood: "Neutral", phone: "+44 7700 900456",
      facts: [["Plan", "Starter Plan"], ["Customer since", "Nov 3, 2025"], ["Latest order", "#ACM-12290 · Delivered · $89.00"]],
      replies: [
        "I've started the refund for order #ACM-12290 - you'll see $89.00 back on your card within 3-5 working days.",
        "Could you tell me briefly what went wrong with the order? It helps us fix things."
      ],
      article: { title: "Refund policy", note: "30-day returns, refunds in 3-5 working days." },
      thread: [
        ["c", "I'd like to request a refund for my last order. It arrived damaged.", "10:22 AM"],
        ["a", "I'm sorry to hear that. I can see order #ACM-12290 was delivered on Tuesday.\n\nYou're within the 30-day window, so a full refund of $89.00 is available. Would you like me to start it now?", "10:23 AM"],
        ["c", "Yes please, and I don't want a replacement.", "10:24 AM"]
      ]
    },
    {
      name: "David Lee", intent: "Product question", time: "25m", status: "AI Handled", tone: "green", mood: "Positive", phone: "+44 7700 900789",
      facts: [["Plan", "Trial"], ["Customer since", "Jun 28, 2026"], ["Interest", "Pro Plan"]],
      replies: ["Yes - the Pro Plan includes the full analytics dashboard, exports, and 12 months of history."],
      thread: [
        ["c", "Does the Pro Plan include analytics, or is that an add-on?", "10:09 AM"],
        ["a", "Analytics is included in the Pro Plan - no add-on needed. You get the full dashboard, CSV exports, and 12 months of history.\n\nOn your current trial you can preview it under Reports.", "10:10 AM"],
        ["c", "That's exactly what I wanted to hear.", "10:11 AM"]
      ]
    },
    {
      name: "Sarah Martinez", intent: "Billing issue", time: "45m", status: "Needs Review", tone: "purple", mood: "Frustrated", phone: "+44 7700 900321",
      facts: [["Plan", "Pro Plan"], ["Customer since", "Aug 9, 2024"], ["Flag", "Possible duplicate charge"]],
      replies: [
        "You're right - I can see two charges of $49 on June 30. I've escalated this to our billing team and the duplicate will be refunded within 3-5 working days.",
        "I'm sorry about this. While billing confirms the refund, is there anything else you need from me?"
      ],
      article: { title: "Duplicate charges", note: "Why they happen and how refunds work." },
      thread: [
        ["c", "I was double charged last month and I want it sorted out today please.", "9:50 AM"],
        ["a", "I'm sorry about that, Sarah. I can see two identical charges of $49.00 on June 30.\n\nDuplicate charges need a quick human approval to refund, so I've flagged this to the billing team as urgent.", "9:51 AM"],
        ["c", "OK, but I've been waiting 45 minutes already.", "10:12 AM"]
      ]
    },
    {
      name: "James Wilson", intent: "Technical support", time: "1h", status: "Open", tone: "green", mood: "Neutral", phone: "+44 7700 900654",
      facts: [["Plan", "Pro Plan"], ["Customer since", "Mar 2, 2025"], ["Topic", "API integration"]],
      replies: [
        "A 401 on that endpoint usually means the API key is missing the 'orders:read' scope - you can add it under Settings > API keys.",
        "If you share the request ID from the error response, I can look up exactly what was rejected."
      ],
      article: { title: "API quick-start", note: "Auth, scopes, and common errors." },
      thread: [
        ["c", "I'm having trouble integrating the API - I keep getting a 401 on the orders endpoint.", "9:36 AM"],
        ["a", "Let's fix that. A 401 on /v1/orders almost always means the API key doesn't have the 'orders:read' scope.\n\nCheck Settings > API keys > your key > Scopes, add 'orders:read', and try again.", "9:37 AM"],
        ["c", "Hmm, I think I already have that scope. Let me check again.", "9:41 AM"]
      ]
    },
    {
      name: "Ashley Kim", intent: "Feature request", time: "2h", status: "AI Handled", tone: "green", mood: "Positive", phone: "+44 7700 900987",
      facts: [["Plan", "Pro Plan"], ["Customer since", "Jan 20, 2026"], ["Request", "Slack notifications"]],
      replies: ["I've logged your Slack notifications request with the product team - you'll get an email if it ships."],
      thread: [
        ["c", "It would be great if you could add Slack notifications for new orders.", "8:33 AM"],
        ["a", "Thanks for the suggestion! I've logged 'Slack notifications for new orders' with our product team, linked to your account so you're notified if it ships.\n\nIn the meantime, email alerts for new orders are available under Settings > Notifications.", "8:34 AM"]
      ]
    },
    {
      name: "Daniel Garcia", intent: "Account access", time: "3h", status: "Resolved", tone: "purple", mood: "Neutral", phone: "+44 7700 901234",
      facts: [["Plan", "Starter Plan"], ["Customer since", "Sep 15, 2025"], ["Issue", "Password reset"]],
      replies: ["Your account is unlocked and a fresh password reset link is in your inbox - it's valid for 60 minutes."],
      thread: [
        ["c", "I can't log in to my account - the reset email never arrives.", "7:29 AM"],
        ["a", "I checked your account and the reset emails were being blocked after too many attempts.\n\nI've unlocked the account and sent a fresh reset link to your inbox - it's valid for 60 minutes.", "7:30 AM"],
        ["c", "Got it this time. I'm back in, thanks.", "7:36 AM"]
      ]
    },
    {
      name: "Emma Thompson", intent: "General inquiry", time: "5h", status: "Resolved", tone: "green", mood: "Positive", phone: "+44 7700 901567",
      facts: [["Plan", "None yet"], ["Type", "Nonprofit"], ["Interest", "Discount"]],
      replies: ["Yes - registered nonprofits get 30% off any plan. I can send the short verification form."],
      thread: [
        ["c", "Do you offer discounts for nonprofits?", "5:12 AM"],
        ["a", "We do! Registered nonprofits get 30% off any plan.\n\nI've sent the short verification form to your email - once approved, the discount applies automatically.", "5:13 AM"],
        ["c", "Wonderful, I'll fill it in today.", "5:15 AM"]
      ]
    }
  ];

  return seeds.map((seed, index) => {
    const initials = seed.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return {
      id: `inbox-${index}`,
      name: seed.name,
      initials,
      intent: seed.intent,
      time: seed.time,
      status: seed.status,
      tone: seed.tone,
      mood: seed.mood,
      starred: false,
      joined: false,
      autoReplied: false,
      email: `${seed.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      phone: seed.phone,
      facts: seed.facts,
      suggestedReplies: seed.replies,
      article: seed.article || null,
      messages: seed.thread.map(([side, text, time], messageIndex) => ({
        id: `inbox-${index}-m${messageIndex}`,
        author: side === "c" ? seed.name : "Clarity AI",
        initials: side === "c" ? initials : "+",
        text,
        time,
        side: side === "c" ? "customer" as const : "agent" as const
      }))
    };
  });
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
  const completedRouteIds = ["ai", "launch", "metrics", "analytics", "conversations", "calls", "handoffs", "knowledge", "workflows", "integrations"];
  const [activeRoute, setActiveRoute] = useState(() => {
    const requestedRoute = new URLSearchParams(window.location.search).get("route");
    return requestedRoute && completedRouteIds.includes(requestedRoute) ? requestedRoute : "ai";
  });
  const [assistantInput, setAssistantInput] = useState("");
  const [introStage, setIntroStage] = useState<"title" | "chat">("title");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [showAgentInsights, setShowAgentInsights] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [workspaceAssistantStatus, setWorkspaceAssistantStatus] = useState<"idle" | "loading" | "error">("idle");
  const [workspaceAssistantError, setWorkspaceAssistantError] = useState("");
  const [workspaceAssistantCharts, setWorkspaceAssistantCharts] = useState<WorkspaceAssistantChart[]>([]);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMetricsTab, setActiveMetricsTab] = useState("overview");
  const [launchGateRunState, setLaunchGateRunState] = useState<"idle" | "running" | "complete">("idle");
  const [selectedAiAgentId, setSelectedAiAgentId] = useState("clara");
  const [aiAgentFilter, setAiAgentFilter] = useState("All");
  const workspaceInitial = user.name?.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase();
  const routes = [
    { id: "ai", title: "AI workspace", meta: "Ask anything" },
    { id: "launch", title: "Launch Gate", meta: "Required tests" },
    { id: "metrics", title: "Metrics", meta: "Today and trends" },
    { id: "analytics", title: "Analytics", meta: "Deep-dive performance" },
    { id: "conversations", title: "Conversations", meta: "Chat inbox" },
    { id: "calls", title: "Calls", meta: "Phone queues" },
    { id: "handoffs", title: "Handoffs", meta: "Owner review" },
    { id: "knowledge", title: "Knowledge", meta: "Answers and gaps" },
    { id: "workflows", title: "Workflows", meta: "Agent routing" },
    { id: "integrations", title: "Integrations", meta: "Connected stack" }
  ];
  const changeActiveRoute = (routeId: string) => {
    setActiveRoute(routeId);
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("view") === "dashboard") {
      searchParams.set("route", routeId);
      window.history.replaceState(null, "", `${window.location.pathname}?${searchParams.toString()}`);
    }
  };
  const activeRouteData = routes.find((route) => route.id === activeRoute) || routes[0];
  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0] || {
    id: "project",
    name: "Project",
    meta: "Workspace"
  };
  const launchReportRows = useMemo(() => {
    if (!activeProject.launchReport) {
      return [];
    }

    return activeProject.launchReport
      .split("\n")
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          return null;
        }

        return {
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim()
        };
      })
      .filter((row): row is { label: string; value: string } => Boolean(row?.label));
  }, [activeProject.launchReport]);
  const launchReportValue = (label: string, fallback = "Not provided") => (
    launchReportRows.find((row) => row.label === label)?.value || fallback
  );
  const launchReportList = (label: string) => launchReportValue(label, "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== "none selected" && item.toLowerCase() !== "none connected");
  const completedLaunchDetails = [
    { label: "Customer", value: launchReportValue("Customer", activeProject.name) },
    { label: "Business type", value: launchReportValue("Business type", activeProject.businessType || "Not provided") },
    { label: "Website URL", value: launchReportValue("Website URL", activeProject.websiteUrl || "Not provided") },
    { label: "Phone contact", value: launchReportValue("Phone contact", activeProject.phoneContactNumber || "Not provided") },
    { label: "Other platform notes", value: launchReportValue("Other platform notes", "None") },
    { label: "Matched playbook", value: launchReportValue("Matched playbook", activeProject.businessType || "Not provided") }
  ];
  const completedAgentDetails = [
    { label: "Agent name", value: launchReportValue("Agent name", `${activeProject.businessType || "Customer"} assistant`) },
    { label: "Agent mission", value: launchReportValue("Agent mission") },
    { label: "Agent instructions", value: launchReportValue("Agent instructions") },
    { label: "Agent knowledge", value: launchReportValue("Agent knowledge") },
    { label: "Handoff rule", value: launchReportValue("Handoff rule") },
    { label: "First channel", value: launchReportValue("First channel") }
  ];
  const completedLaunchCapabilities = launchReportList("Selected AI capabilities");
  const completedLaunchGoals = launchReportList("Selected goals");
  const completedLaunchSystems = launchReportList("Connected systems");
  const completedLaunchActions = [
    launchReportValue("Next action", "Confirm production routing and final handoff owners."),
    `Connect website entry point: ${launchReportValue("Website URL", activeProject.websiteUrl || "Not provided")}`,
    `Confirm phone routing with ${launchReportValue("Phone contact", activeProject.phoneContactNumber || "Not provided")}`,
    `Prepare first channel: ${launchReportValue("First channel", "Not provided")}`,
    "Attach the launch report to the engineering ticket"
  ];
  const isClearDbsActive = isClearDbsWorkspace(activeProject);
  const [liveMetrics, setLiveMetrics] = useState<LiveWorkspaceMetrics>(() => createInitialLiveMetrics(activeProject));
  const openingMetrics = useMemo(() => createInitialLiveMetrics(activeProject), [activeProject.id, activeProject.name]);
  const [inboxThreads, setInboxThreads] = useState<InboxThread[]>(() => buildInboxThreads(isClearDbsActive));
  const [activeInboxId, setActiveInboxId] = useState("inbox-0");
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState("All");
  const [inboxDraft, setInboxDraft] = useState("");
  const [inboxComposerMode, setInboxComposerMode] = useState<"reply" | "note">("reply");
  const [showInboxCustomerFacts, setShowInboxCustomerFacts] = useState(false);
  const [createdCalls, setCreatedCalls] = useState<CallQueueItem[]>([]);
  const [activeCallId, setActiveCallId] = useState("call-0");
  const [callsSearch, setCallsSearch] = useState("");
  const [callsFilter, setCallsFilter] = useState("All Calls");
  const [callsPage, setCallsPage] = useState(0);
  const [activeCallTab, setActiveCallTab] = useState<"Transcript" | "Notes" | "Summary">("Transcript");
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);
  const [heldCallIds, setHeldCallIds] = useState<string[]>([]);
  const [mutedCallIds, setMutedCallIds] = useState<string[]>([]);
  const [callStatusOverrides, setCallStatusOverrides] = useState<Record<string, CallStatus>>({});
  const [callOutcomes, setCallOutcomes] = useState<Record<string, string>>({});
  const [callSuggestionsApplied, setCallSuggestionsApplied] = useState<Record<string, boolean>>({});
  const [callAskDraft, setCallAskDraft] = useState("");
  const [callAssistantThreads, setCallAssistantThreads] = useState<Record<string, CallAssistantMessage[]>>({});
  useEffect(() => {
    setInboxThreads(buildInboxThreads(isClearDbsActive));
    setActiveInboxId("inbox-0");
    setInboxSearch("");
    setInboxFilter("All");
    setInboxDraft("");
    setInboxComposerMode("reply");
    setShowInboxCustomerFacts(false);
    setCreatedCalls([]);
    setActiveCallId("call-0");
    setCallsSearch("");
    setCallsFilter("All Calls");
    setCallsPage(0);
    setActiveCallTab("Transcript");
    setIsTranscriptCollapsed(false);
    setHeldCallIds([]);
    setMutedCallIds([]);
    setCallStatusOverrides({});
    setCallOutcomes({});
    setCallSuggestionsApplied({});
    setCallAskDraft("");
    setCallAssistantThreads({});
  }, [isClearDbsActive]);
  const activeInboxThread = inboxThreads.find((thread) => thread.id === activeInboxId) || inboxThreads[0];
  const inboxThreadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = inboxThreadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [activeInboxId, activeInboxThread?.messages.length]);
  const inboxStatusFilters: Array<{ id: string; label: string; statuses: InboxThread["status"][] | null }> = [
    { id: "All", label: "All", statuses: null },
    { id: "AI", label: "AI", statuses: ["Open", "AI Handled"] },
    { id: "Human", label: "Needs team", statuses: ["Needs Review"] },
    { id: "Resolved", label: "Resolved", statuses: ["Resolved"] }
  ];
  const activeInboxFilter = inboxStatusFilters.find((filter) => filter.id === inboxFilter) || inboxStatusFilters[0];
  const inboxStatusLabel = (status: InboxThread["status"]) => {
    if (status === "Needs Review") return "Needs team";
    if (status === "Resolved") return "Resolved";
    return "AI";
  };
  const visibleInboxThreads = inboxThreads.filter((thread) => {
    const matchesFilter = !activeInboxFilter.statuses || activeInboxFilter.statuses.includes(thread.status);
    const query = inboxSearch.trim().toLowerCase();
    const matchesSearch = !query || `${thread.name} ${thread.intent} ${thread.messages.map((message) => message.text).join(" ")}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const inboxTimeNow = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const operatorName = user.name?.split(" ")[0] || "You";
  const updateInboxThread = (threadId: string, updater: (thread: InboxThread) => InboxThread) => {
    setInboxThreads((previous) => previous.map((thread) => (thread.id === threadId ? updater(thread) : thread)));
  };
  const inboxSystemMessage = (text: string): InboxMessage => ({
    id: `system-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author: "System",
    initials: "",
    text,
    time: inboxTimeNow(),
    side: "system"
  });
  const joinInboxChat = (threadId: string) => {
    updateInboxThread(threadId, (thread) => thread.joined ? thread : ({
      ...thread,
      joined: true,
      status: thread.status === "Resolved" ? thread.status : "Open",
      messages: [...thread.messages, inboxSystemMessage(`${operatorName} joined the chat`)]
    }));
  };
  const sendInboxMessage = () => {
    const text = inboxDraft.trim();
    if (!text || !activeInboxThread) return;
    const threadId = activeInboxThread.id;
    const time = inboxTimeNow();
    if (inboxComposerMode === "note") {
      updateInboxThread(threadId, (thread) => ({
        ...thread,
        messages: [...thread.messages, {
          id: `note-${Date.now()}`,
          author: operatorName,
          initials: workspaceInitial,
          text,
          time,
          side: "note" as const
        }]
      }));
    } else {
      const wasJoined = activeInboxThread.joined;
      const needsAutoReply = !activeInboxThread.autoReplied;
      updateInboxThread(threadId, (thread) => ({
        ...thread,
        joined: true,
        autoReplied: true,
        status: thread.status === "Resolved" ? "Open" : thread.status,
        messages: [
          ...thread.messages,
          ...(wasJoined ? [] : [inboxSystemMessage(`${operatorName} joined the chat`)]),
          {
            id: `human-${Date.now()}`,
            author: operatorName,
            initials: workspaceInitial,
            text,
            time,
            side: "human" as const
          }
        ]
      }));
      if (needsAutoReply) {
        window.setTimeout(() => {
          updateInboxThread(threadId, (thread) => ({
            ...thread,
            messages: [...thread.messages, {
              id: `auto-${Date.now()}`,
              author: thread.name,
              initials: thread.initials,
              text: "Thanks, that helps!",
              time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              side: "customer" as const
            }]
          }));
        }, 1600);
      }
    }
    setInboxDraft("");
  };
  const resolveInboxChat = (threadId: string) => {
    updateInboxThread(threadId, (thread) => ({
      ...thread,
      status: "Resolved",
      messages: [...thread.messages, inboxSystemMessage("Marked as solved")]
    }));
  };
  const reopenInboxChat = (threadId: string) => {
    updateInboxThread(threadId, (thread) => ({
      ...thread,
      status: "Open",
      messages: [...thread.messages, inboxSystemMessage("Chat reopened")]
    }));
  };
  const escalateInboxChat = (threadId: string) => {
    updateInboxThread(threadId, (thread) => thread.status === "Needs Review" ? thread : ({
      ...thread,
      status: "Needs Review",
      messages: [...thread.messages, inboxSystemMessage("Sent to the team for review")]
    }));
  };
  const toggleInboxStar = (threadId: string) => {
    updateInboxThread(threadId, (thread) => ({ ...thread, starred: !thread.starred }));
  };
  const insertInboxSuggestion = (text: string) => {
    setInboxComposerMode("reply");
    setInboxDraft(text);
  };
  const startNewInboxChat = () => {
    const newId = `inbox-new-${Date.now()}`;
    const newThread: InboxThread = {
      id: newId,
      name: "New customer",
      initials: "NC",
      intent: "New conversation",
      time: "now",
      status: "Open",
      tone: "purple",
      mood: "Neutral",
      starred: false,
      joined: true,
      autoReplied: true,
      email: "new.customer@example.com",
      phone: "+44 7700 900000",
      facts: [["Type", "New contact"]],
      suggestedReplies: ["Hi! Thanks for reaching out - how can I help today?"],
      article: null,
      messages: [inboxSystemMessage("New conversation started")]
    };
    setInboxThreads((previous) => [newThread, ...previous]);
    setActiveInboxId(newId);
    setInboxFilter("All");
    setInboxSearch("");
    setInboxComposerMode("reply");
  };
  const openInboxThread = (threadId: string) => {
    setActiveInboxId(threadId);
    setInboxDraft("");
    setInboxComposerMode("reply");
    setShowInboxCustomerFacts(false);
  };
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
  const openingAssistantMessage =
    `I loaded the ${activeProject.name} workspace snapshot. The preview currently shows ${openingMetrics.callsHandled} calls, ${openingContainmentRate}% solved without a human handoff, and ${openingLatencySeconds}s typical voice response time. There are ${openingMetrics.openRisks} item${openingMetrics.openRisks === 1 ? "" : "s"} needing attention across handoffs, knowledge, and safety checks. I can walk you through the numbers, show the calls behind them, or draft the next action plan.`;
  const agentInsightMetrics = [
    { label: "Calls handled", value: String(liveMetrics.callsHandled), detail: `${liveMetrics.activeCalls} active now` },
    { label: "Resolved by AI", value: `${containmentRate}%`, detail: `${liveMetrics.containedCalls} calls contained` },
    { label: "Reply time", value: `${latencySeconds}s`, detail: "Live voice turn" },
    { label: "Review needed", value: String(liveMetrics.openRisks), detail: `${liveMetrics.handoffs} handoffs today` }
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
  const clearDbsVisibilityPlan = [
    {
      label: "Conversation evidence",
      value: `${liveMetrics.callsHandled} events`,
      detail: "Every chat, call, applicant question, employer status request, confidence score, and final outcome is shown with timestamp and owner."
    },
    {
      label: "Voice call audit",
      value: `${liveMetrics.activeCalls} live`,
      detail: "Call state, transcript turns, caller intent, queue, recording readiness, speech confidence, and transfer reason are visible while the call is active."
    },
    {
      label: "Integration truth",
      value: `${liveMetrics.crmLookupSuccess}% lookup`,
      detail: "Applicant portal, case CRM, Zoom, helpdesk, knowledge source, and reporting export each show sync time, scopes, checks, and failure state."
    },
    {
      label: "Compliance control",
      value: `${liveMetrics.policyViolations} breaches`,
      detail: "The agent cannot advise on eligibility beyond approved DBS guidance; low-confidence, identity, barred-list, and certificate disputes go to humans."
    }
  ];
  const clearDbsDataStreams = [
    { source: "Applicant portal", status: "Live", detail: "Application ID, check level, ID route, current stage, missing documents, consent status." },
    { source: "Employer dashboard", status: "Synced 3m", detail: "Organisation, requester, sector, role type, SLA, candidate owner, escalation contact." },
    { source: "Zoom Contact Center", status: "Streaming", detail: "Voice call metadata, transcript turns, queue, recording state, transfer and missed-call events." },
    { source: "Zendesk compliance queue", status: "Passing", detail: "Escalation tickets, priority, policy reason, transcript summary, assigned owner and SLA risk." }
  ];
  const clearDbsAuditPlan = [
    "Show raw customer wording next to the AI answer and approved source citation.",
    "Separate routine FAQ containment from compliance-sensitive handoffs.",
    "Track every integration read/write with last sync, OAuth scope, and test result.",
    "Expose unresolved cases by applicant, employer, owner, SLA, risk reason, and next action."
  ];
  const [selectedCompletedIntegrationId, setSelectedCompletedIntegrationId] = useState("hubspot");
  const [selectedCompletedIntegrationCategory, setSelectedCompletedIntegrationCategory] = useState<"core" | "operations" | "growth">("core");
  const [isAddIntegrationModalOpen, setIsAddIntegrationModalOpen] = useState(false);
  const [loginIntegration, setLoginIntegration] = useState<{ company: string; type: string; logoUrl: string } | null>(null);
  const [loginIntegrationStage, setLoginIntegrationStage] = useState<"credentials" | "connecting" | "success">("credentials");
  const [loginIntegrationEmail, setLoginIntegrationEmail] = useState("");
  const [loginIntegrationPassword, setLoginIntegrationPassword] = useState("");
  const integrationLoginTimers = useRef<number[]>([]);
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
      { company: "Obsidian", type: "Knowledge", logoUrl: "https://www.google.com/s2/favicons?domain=obsidian.md&sz=128" },
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
  const completedIntegrationSystems = isClearDbsActive ? [
    {
      id: "cleardbs-applicant-portal",
      category: "core",
      key: "crm",
      name: "Applicant portal",
      providerId: "cleardbs-portal",
      provider: "Clear DBS Portal",
      logoUrl: clearDbsLogoUrl,
      status: "Connected",
      health: "Passing",
      lastSync: "Live",
      description: "Reads applicant reference, check level, identity route, missing documents, and current DBS stage before Clara answers.",
      scopes: ["applications.read", "applicants.read", "status_events.read"],
      access: [
        { label: "Applications read", detail: "Find case stage and check type" },
        { label: "Applicant read", detail: "Confirm non-sensitive contact context" },
        { label: "Status events read", detail: "Show latest movement and blockers" }
      ],
      checks: ["Application lookup", "Stage mapping", "Consent status read"],
      actions: ["Review case fields", "Map status stages", "Retest applicant lookup"]
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
      lastSync: "Streaming",
      description: "Streams voice call events, transcript turns, queue state, missed-call records, and handoff events into the dashboard.",
      scopes: ["contact_center:read:engagement", "phone:read:call", "webhook:event"],
      access: [
        { label: "Engagement read", detail: "Read active Clear DBS support calls" },
        { label: "Call read", detail: "Inspect call state and recording readiness" },
        { label: "Webhook events", detail: "Receive transcript, queue, and transfer updates" }
      ],
      checks: ["Webhook signature", "Live transcript ingest", "Transfer event"],
      actions: ["Confirm webhook URL", "Test DBS status call", "Review urgent routing"]
    },
    {
      id: "cleardbs-knowledge",
      category: "core",
      key: "knowledge",
      name: "Knowledge",
      providerId: "obsidian",
      provider: "DBS Obsidian vault",
      logoUrl: providerLogoFallbacks.obsidian,
      status: "Connected",
      health: "Passing",
      lastSync: "3m ago",
      description: "Syncs approved DBS FAQs, identity-route guidance, certificate wording, employer help articles, and escalation rules.",
      scopes: ["knowledge.search", "knowledge.read", "citations.read"],
      access: [
        { label: "Search approved sources", detail: "Find DBS process and FAQ answers" },
        { label: "Read policy content", detail: "Ground answers in approved wording" },
        { label: "Citation read", detail: "Attach source evidence to answers" }
      ],
      checks: ["Source search", "Citation coverage", "Policy fallback"],
      actions: ["Approve draft answers", "Refresh embeddings", "Retest status questions"]
    },
    {
      id: "zendesk",
      category: "operations",
      key: "helpdesk",
      name: "Compliance queue",
      providerId: "zendesk",
      provider: "Zendesk Support",
      logoUrl: providerLogoFallbacks["zendesk support"],
      status: "Connected",
      health: "Passing",
      lastSync: "6m ago",
      description: "Creates audit-ready escalation tickets with applicant reference, employer, issue type, transcript summary, and owner.",
      scopes: ["tickets:read", "tickets:write", "users:read"],
      access: [
        { label: "Tickets read", detail: "Check existing applicant or employer cases" },
        { label: "Tickets write", detail: "Create compliance and handoff tickets" },
        { label: "Users read", detail: "Route to the DBS operations owner" }
      ],
      checks: ["Ticket create", "Priority mapping", "Transcript attachment"],
      actions: ["Map queues", "Assign compliance owners", "Test disputed certificate handoff"]
    },
    {
      id: "cleardbs-employer-crm",
      category: "operations",
      key: "crm",
      name: "Employer CRM",
      providerId: "hubspot",
      provider: "HubSpot",
      logoUrl: providerLogoFallbacks.hubspot,
      status: "Connected",
      health: "Passing",
      lastSync: "4m ago",
      description: "Matches callers to employer account, requester, sector, agreed SLA, and named success owner.",
      scopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.notes.write"],
      access: [
        { label: "Contacts read", detail: "Find requester and authorised contacts" },
        { label: "Companies read", detail: "Load employer account and sector" },
        { label: "Notes write", detail: "Save follow-up summaries" }
      ],
      checks: ["Contact lookup", "Company match", "Follow-up note write"],
      actions: ["Verify employer owners", "Map sectors", "Run account note test"]
    },
    {
      id: "analytics",
      category: "growth",
      key: "analytics",
      name: "Reporting export",
      providerId: "warehouse",
      provider: "Warehouse",
      logoUrl: "",
      status: "Setup needed",
      health: "Needs destination",
      lastSync: "Not started",
      description: "Exports DBS support metrics, containment, handoffs, status request themes, answer quality, and audit outcomes.",
      scopes: ["events.write", "reports.write", "dashboards.read"],
      access: [
        { label: "Events write", detail: "Send conversation and case outcomes" },
        { label: "Reports write", detail: "Publish compliance support metrics" },
        { label: "Dashboards read", detail: "Confirm BI destination" }
      ],
      checks: ["Destination selected", "Schema mapped", "Sample export"],
      actions: ["Choose warehouse", "Map audit schema", "Run sample export"]
    }
  ] : [
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
      id: "obsidian",
      category: "core",
      key: "knowledge",
      name: "Knowledge",
      providerId: "obsidian",
      provider: "Obsidian",
      logoUrl: providerLogoFallbacks.obsidian,
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
  const allCompletedIntegrationSystems = [...completedIntegrationSystems, ...addedCompletedIntegrations];
  const selectedCompletedIntegration = allCompletedIntegrationSystems.find((system) => system.id === selectedCompletedIntegrationId) || allCompletedIntegrationSystems[0];
  const visibleCompletedIntegrationSystems = allCompletedIntegrationSystems.filter((system) => system.category === selectedCompletedIntegrationCategory);
  const visibleAddIntegrationCatalog = addIntegrationCatalog[selectedCompletedIntegrationCategory];
  const completedConnectedCount = allCompletedIntegrationSystems.filter((system) => system.status === "Connected").length;
  const completedCheckCount = allCompletedIntegrationSystems
    .filter((system) => system.status === "Connected")
    .reduce((total, system) => total + system.checks.length, 0);
  const launchGateRequiredIds = isClearDbsActive
    ? ["cleardbs-applicant-portal", "zoom", "cleardbs-knowledge", "zendesk", "cleardbs-employer-crm"]
    : ["hubspot", "zoom", "obsidian", "zendesk"];
  const launchGateRequiredConnections = allCompletedIntegrationSystems.filter((system) => launchGateRequiredIds.includes(system.id));
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
  const launchGateCriticalFailures = [
    liveMetrics.policyViolations > 0 ? "Critical safety rule break" : "",
    !launchGateRequiredConnectionsPassed ? "Required connection failed" : "",
    launchGateRuntimeScore < 90 ? "Runtime health below launch threshold" : "",
    launchGateScenarioPassRate < 90 ? "Scenario pass rate below 90%" : ""
  ].filter(Boolean);
  const launchGateAllowed = launchGateScore >= 90 && launchGateCriticalFailures.length === 0;
  const launchGateStatus = launchGateAllowed ? "Ready to launch" : "Launch locked";
  const launchGateStatusDetail = launchGateAllowed
    ? "All required checks are above the production threshold."
    : `${launchGateCriticalFailures.length || 1} blocker${launchGateCriticalFailures.length === 1 ? "" : "s"} must be cleared before launch.`;
  const launchGateFixItems = launchGateCriticalFailures.length
    ? launchGateCriticalFailures
    : launchGateScore < 90
      ? ["Raise launch score to 90%"]
      : ["No fixes needed"];
  const launchGateFixSummary = launchGateAllowed
    ? "No blockers remain. You can launch this agent now."
    : `${launchGateFixItems.length} ${launchGateFixItems.length === 1 ? "item needs" : "items need"} attention before launch.`;
  const runLaunchGateTests = () => {
    if (launchGateRunState === "running") {
      return;
    }

    setLaunchGateRunState("running");
    window.setTimeout(() => setLaunchGateRunState("complete"), 1500);
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
  const completeIntegrationLogin = (integration: { company: string; type: string; logoUrl: string }) => {
    const id = `added-${integration.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

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
          providerId: id,
          provider: integration.company,
          logoUrl: integration.logoUrl,
          status: "Connected",
          health: "Connected",
          lastSync: "Just now",
          description: `${integration.company} is connected to this workspace.`,
          scopes: [],
          access: connectedAccessForIntegration(integration.type),
          checks: [],
          actions: [`Sync ${integration.type.toLowerCase()}`]
        }
      ];
    });
    setSelectedCompletedIntegrationId(id);
  };
  const submitIntegrationLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginIntegration || !loginIntegrationEmail.trim() || !loginIntegrationPassword.trim()) {
      return;
    }

    clearIntegrationLoginTimers();
    setLoginIntegrationStage("connecting");

    const successTimer = window.setTimeout(() => {
      setLoginIntegrationStage("success");
    }, 1450);

    const closeTimer = window.setTimeout(() => {
      completeIntegrationLogin(loginIntegration);
      closeAddIntegrationModal();
    }, 2450);

    integrationLoginTimers.current = [successTimer, closeTimer];
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
      eyebrow: "Production gate",
      title: launchGateStatus,
      summary: launchGateAllowed
        ? "This agent is ready. Launch now, or review the final fix list first."
        : "Choose one next step: fix the blockers, or come back and launch once they are clear.",
      status: launchGateAllowed ? "Launch" : "Fix",
      metrics: [
        { label: "Launch score", value: `${launchGateScore}%`, detail: launchGateAllowed ? "Meets threshold" : "90% required" },
        { label: "Scenario pass rate", value: `${launchGateScenarioPassRate}%`, detail: "Customer test pack" },
        { label: "Required connections", value: `${launchGateConnectionScore}%`, detail: "CRM, calls, helpdesk" },
        { label: "Critical blockers", value: String(launchGateCriticalFailures.length), detail: launchGateAllowed ? "None" : "Must fix" }
      ],
      primaryTitle: "Launch requirements",
      primaryMeta: "Automatic checks that decide whether this workspace can launch.",
      items: [
        { label: "Scenario tests", value: `${launchGateScenarioPassRate}%`, note: "Real customer situations must pass at or above 90%." },
        { label: "Runtime and container", value: `${launchGateRuntimeScore}%`, note: "Service health, containers, workers, and resource limits must be stable." },
        { label: "Safety", value: `${launchGateSafetyScore}%`, note: "Critical safety failures must be zero." }
      ],
      next: launchGateAllowed ? ["Launch agent", "Export launch proof", "Schedule first review"] : ["Run full gate", "Fix blockers", "Retest failed checks"]
    },
    metrics: {
      eyebrow: isClearDbsActive ? "Clear DBS command centre" : "Production readiness",
      title: isClearDbsActive ? "Clear DBS support is live." : "Customer agent is live.",
      summary: isClearDbsActive
        ? "Live DBS applicants, employers, calls, chats, reviews, knowledge, and tools."
        : "Live outcomes, safety, voice, knowledge, and tool health.",
      status: liveStatus,
      metrics: [
        { label: "Overall health", value: `${readinessScore}%`, detail: "Ready for client use" },
        { label: "Solved by AI", value: `${containmentRate}%`, detail: `${liveMetrics.containedCalls} calls handled` },
        { label: "Reply time", value: `${latencySeconds}s`, detail: "Typical wait" },
        { label: "Needs attention", value: String(liveMetrics.openRisks), detail: "Issues to check" }
      ],
      primaryTitle: isClearDbsActive ? "DBS support demand by hour" : "Call demand by hour",
      primaryMeta: isClearDbsActive ? "Today, showing when applicants and employers are asking for help." : "Today, showing when customers are using the agent most.",
      chart: metricsHourlyVolume.map((hour) => ({ ...hour, value: hour.value * 5, display: String(hour.value) })),
      items: [
        { label: "Critical safety issues", value: String(liveMetrics.policyViolations), note: `${liveMetrics.policyViolations} answer${liveMetrics.policyViolations === 1 ? "" : "s"} crossed a critical safety rule.` },
        { label: "Sent to staff", value: `${handoffRate}%`, note: `${liveMetrics.handoffs} conversation${liveMetrics.handoffs === 1 ? "" : "s"} needed a human because the agent should not guess.` },
        { label: "Answer confidence", value: `${liveMetrics.citationCoverage}%`, note: `${liveMetrics.draftAnswers} answer improvement${liveMetrics.draftAnswers === 1 ? "" : "s"} ready to review.` }
      ],
      next: isClearDbsActive ? ["Review sensitive handoffs", "Check portal sync", "Export DBS audit report"] : ["Check attention items", "Improve top answers", "Export client report"]
    },
    analytics: {
      eyebrow: isClearDbsActive ? "Clear DBS analytics" : "Performance analytics",
      title: "Live performance.",
      summary: isClearDbsActive
        ? "DBS outcomes, voice, knowledge, safety, reviews, and tools."
        : "Outcomes, voice, knowledge, safety, reviews, and tools.",
      status: liveStatus,
      metrics: [
        { label: "Solved by AI", value: `${containmentRate}%`, detail: `${liveMetrics.containedCalls} calls solved` },
        { label: "Customer rating", value: liveMetrics.csat.toFixed(1), detail: "From rated calls" },
        { label: "Reply time", value: `${latencySeconds}s`, detail: "95% of replies" },
        { label: "Answer confidence", value: `${liveMetrics.citationCoverage}%`, detail: "Sourced answers" }
      ],
      primaryTitle: "Performance deep dive",
      primaryMeta: "Every production signal, grouped by the question it answers.",
      next: ["Export analytics report", "Review weakest signal", "Share with the team"]
    },
    conversations: {
      eyebrow: "Customer conversations",
      title: isClearDbsActive ? "Applicant and employer chats are easy to scan." : "Customer conversations are easy to scan.",
      summary: isClearDbsActive
        ? "Recent DBS chats are grouped by applicant status, employer query, compliance escalation, and follow-up owner."
        : "Recent chat and inbox conversations are grouped by status so teams can see what was solved, what escalated, and what needs follow-up.",
      status: isClearDbsActive ? "9 open" : "8 open",
      metrics: [
        { label: "Open now", value: isClearDbsActive ? "9" : "8", detail: "Needs attention" },
        { label: "AI handled", value: isClearDbsActive ? "21" : "12", detail: "No staff reply needed" },
        { label: "Needs review", value: isClearDbsActive ? "6" : "5", detail: "Escalation queue" },
        { label: "Resolved", value: isClearDbsActive ? "11" : "7", detail: "Closed today" }
      ],
      primaryTitle: isClearDbsActive ? "Recent DBS conversations" : "Recent conversations",
      primaryMeta: "Latest chat and inbox moments with intent, outcome, and context.",
      timeline: [
        ...(isClearDbsActive ? [
          { time: "12:44", title: "Enhanced check status requested", detail: "AI confirmed the application is with DBS and explained the next visible status.", tag: "Resolved" },
          { time: "12:31", title: "Certificate dispute wording", detail: "Sensitive case detected and moved to compliance review with transcript.", tag: "Review" },
          { time: "12:18", title: "Employer asked for missing ID", detail: "Captured applicant reference and routed document request to operations.", tag: "Follow-up" }
        ] : [
          { time: "12:44", title: "Order status inquiry", detail: "AI checked the order and supplied the latest delivery update.", tag: "Open" },
          { time: "12:31", title: "Refund request", detail: "Customer asked for a refund and is waiting for confirmation.", tag: "Open" },
          { time: "12:18", title: "Product question", detail: "AI answered from the knowledge base and closed the thread.", tag: "AI handled" }
        ])
      ],
      next: isClearDbsActive ? ["Open compliance reviews", "Check applicant portal sync", "Send employer update"] : ["Reply to open chats", "Review escalations", "Update top answer"]
    },
    calls: {
      eyebrow: "Customer conversations",
      title: isClearDbsActive ? "Applicant and employer activity is easy to scan." : "Live call activity is easy to scan.",
      summary: isClearDbsActive
        ? "Recent DBS conversations are grouped by applicant status, employer query, compliance escalation, and follow-up owner."
        : "Recent conversations are grouped by status so teams can see what was solved, what escalated, and what needs follow-up.",
      status: isClearDbsActive ? `${liveMetrics.activeCalls} active` : "12 active",
      metrics: [
        { label: "Active now", value: isClearDbsActive ? String(liveMetrics.activeCalls) : "12", detail: isClearDbsActive ? "6 voice, 5 chat" : "7 voice, 5 chat" },
        { label: "Solved today", value: isClearDbsActive ? String(liveMetrics.containedCalls) : "34", detail: "No human needed" },
        { label: "Avg duration", value: isClearDbsActive ? "3m 46s" : "3m 12s", detail: isClearDbsActive ? "DBS status calls" : "Down 18 sec" },
        { label: "Follow-ups", value: isClearDbsActive ? String(liveMetrics.handoffs) : "5", detail: isClearDbsActive ? "Compliance queue" : "Queued for CRM" }
      ],
      primaryTitle: isClearDbsActive ? "Recent DBS cases" : "Recent calls",
      primaryMeta: isClearDbsActive ? "Latest applicant and employer moments with intent, outcome, and owner." : "Latest customer moments with intent, outcome, and owner.",
      timeline: [
        ...(isClearDbsActive ? [
          { time: "12:44", title: "Enhanced check status requested", detail: "AI confirmed the application is with DBS and explained the next visible status.", tag: "Resolved" },
          { time: "12:31", title: "Certificate dispute wording", detail: "Sensitive case detected and moved to compliance review with transcript.", tag: "Review" },
          { time: "12:18", title: "Employer asked for missing ID", detail: "Captured applicant reference and routed document request to operations.", tag: "Follow-up" },
          { time: "11:57", title: "Barred-list eligibility question", detail: "Transferred with approved source citation and risk reason.", tag: "Handoff" }
        ] : [
          { time: "12:44", title: "Invoice copy requested", detail: "AI verified account and sent the latest invoice.", tag: "Resolved" },
          { time: "12:31", title: "Policy exception question", detail: "Sensitive guidance detected and moved to review.", tag: "Review" },
          { time: "12:18", title: "Booking change", detail: "Captured new time preference and updated CRM.", tag: "Resolved" },
          { time: "11:57", title: "Billing dispute", detail: "Transferred with summary and account context.", tag: "Handoff" }
        ])
      ],
      next: isClearDbsActive ? ["Open compliance reviews", "Check applicant portal sync", "Listen to flagged recording"] : ["Open review calls", "Check CRM follow-ups", "Listen to flagged recording"]
    },
    handoffs: {
      eyebrow: "Owner review",
      title: "Handoffs are small and explainable.",
      summary: "Every escalation has a reason, suggested owner, and the context needed for a fast human response.",
      status: "3 pending",
      metrics: [
        { label: "Pending", value: "3", detail: "Needs owner" },
        { label: "SLA risk", value: "1", detail: "Due in 22 min" },
        { label: "Avg handoff", value: "41s", detail: "Context prepared" },
        { label: "Resolved", value: "9", detail: "Today" }
      ],
      primaryTitle: "Handoff reasons",
      primaryMeta: "The current review queue is mostly billing exceptions.",
      bars: handoffReasons,
      items: [
        { label: "Billing exception", value: "2", note: "Needs finance owner approval." },
        { label: "Sensitive policy", value: "1", note: "Check wording before customer reply." },
        { label: "Knowledge gap", value: "0", note: "No unresolved answer gaps in queue." }
      ],
      next: ["Assign billing owner", "Approve policy response", "Close stale reviews"]
    },
    knowledge: {
      eyebrow: "Answer quality",
      title: isClearDbsActive ? "DBS answers are sourced." : "Knowledge ready.",
      summary: isClearDbsActive ? "Tracking DBS coverage, wording, identity guidance, and review gaps." : "Tracking coverage, stale sources, and trust-risk gaps.",
      status: isClearDbsActive ? `${liveMetrics.citationCoverage}% sourced` : "91% confident",
      metrics: [
        { label: "Coverage", value: "91%", detail: "Approved sources" },
        { label: "Draft updates", value: "2", detail: "Ready to review" },
        { label: "Outdated sources", value: "1", detail: "Pricing policy" },
        { label: "Questions covered", value: "8", detail: "Fully covered" }
      ],
      primaryTitle: isClearDbsActive ? "DBS knowledge gaps" : "Knowledge gaps",
      primaryMeta: isClearDbsActive ? "Small set of updates that would improve applicant and employer answer confidence." : "Small set of updates that would improve answer confidence.",
      timeline: [
        ...(isClearDbsActive ? [
          { time: "High", title: "Enhanced check eligibility", detail: "Keep role eligibility wording locked to approved DBS guidance.", tag: "Guardrail" },
          { time: "Med", title: "ID route 2 evidence", detail: "Confirm latest document wording for applicants without standard ID.", tag: "Needs source" },
          { time: "Low", title: "Certificate issued wording", detail: "Tighten answer for when certificate is posted to the applicant.", tag: "Improve" }
        ] : [
          { time: "High", title: "Billing exception limits", detail: "Add what the agent can promise before finance review.", tag: "Draft" },
          { time: "Med", title: "Holiday opening hours", detail: "Confirm the latest customer-facing schedule.", tag: "Needs source" },
          { time: "Low", title: "Refund status wording", detail: "Tighten answer for pending bank transfers.", tag: "Improve" }
        ])
      ],
      next: isClearDbsActive ? ["Approve DBS wording", "Upload policy source", "Retest applicant intents"] : ["Approve draft answers", "Upload policy source", "Retest top intents"]
    },
    workflows: {
      eyebrow: "Agent routing",
      title: "Workflows show where each request goes.",
      summary: "The agent routes common customer intents to the right tool, owner, or handoff path with clear launch guardrails.",
      status: "6 active",
      metrics: [
        { label: "Active flows", value: "6", detail: "All tested" },
        { label: "Automations", value: "14", detail: "CRM and helpdesk" },
        { label: "Guardrails", value: "11", detail: "Launch locked" },
        { label: "Last test", value: "9m", detail: "Passed" }
      ],
      primaryTitle: "Routing map",
      primaryMeta: "Core customer intents and where RelayClarity sends them.",
      items: [
        { label: "Account and billing", value: "CRM", note: "Verify account, summarize request, create follow-up." },
        { label: "Urgent or sensitive", value: "Human", note: "Escalate with transcript and recommended owner." },
        { label: "FAQs and policies", value: "Knowledge", note: "Answer only from approved sources." },
        { label: "After-call admin", value: "Auto wrap-up", note: "Write summary, tags, and next action." }
      ],
      next: ["Review guardrails", "Run workflow test", "Publish routing changes"]
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
    }
  };
  const metricsTabs: MetricsTab[] = [
    {
      id: "overview",
      label: "Summary",
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
    }
  ];
  const activeMetricsTabData = metricsTabs.find((tab) => tab.id === activeMetricsTab) || metricsTabs[0];
  const activeMetricsChart = [
    ...activeMetricsTabData.chart,
    ...Array.from({ length: Math.max(0, 8 - activeMetricsTabData.chart.length) }, (_, index) => ({
      label: `empty-${index}`,
      value: 0,
      display: "",
      empty: true
    }))
  ].slice(0, 8);
  const metricsStudioStatus = "Strong";
  const metricsSidebarNav = [
    { id: "metrics", label: "Overview", icon: "⌂" },
    { id: "conversations", label: "Conversations", icon: "□" },
    { id: "calls", label: "Calls", icon: "◜" },
    { id: "workflows", label: "AI Agents", icon: "✣" },
    { id: "knowledge", label: "Knowledge", icon: "▭" },
    { id: "analytics", label: "Analytics", icon: "▥" },
    { id: "handoffs", label: "Follow-ups", icon: "♙" },
    { id: "integrations", label: "Integrations", icon: "✳" },
    { id: "launch", label: "Launch & Billing", icon: "▰" }
  ];
  const metricsDashboardKpis = isClearDbsActive ? [
    {
      label: "Conversations",
      value: liveMetrics.callsHandled,
      display: String(liveMetrics.callsHandled),
      trend: "14.8%",
      tone: "blue",
      icon: "Case"
    },
    {
      label: "Calls",
      value: 97,
      display: "97",
      trend: "12.1%",
      tone: "green",
      icon: "Call"
    },
    {
      label: "Sourced answers",
      value: containmentRate,
      display: `${containmentRate}%`,
      trend: "5.9%",
      tone: "blue",
      icon: "OK"
    },
    {
      label: "Sensitive reviews",
      value: liveMetrics.sensitiveEscalations,
      display: String(liveMetrics.sensitiveEscalations),
      trend: "2 fewer",
      tone: "amber",
      icon: "Risk"
    }
  ] : [
    {
      label: "Conversations",
      value: 2562,
      display: "2,562",
      trend: "18.2%",
      tone: "blue",
      icon: "□"
    },
    {
      label: "Calls",
      value: 842,
      display: "842",
      trend: "15.7%",
      tone: "green",
      icon: "◜"
    },
    {
      label: "Resolved",
      value: 87.6,
      display: "87.6%",
      trend: "6.3%",
      tone: "blue",
      icon: ""
    },
    {
      label: "CSAT",
      value: 4.8,
      display: "4.8 / 5",
      trend: "0.4",
      tone: "amber",
      icon: "☺"
    }
  ];
  const metricChartPoints = [
    { label: "May 19", total: 530, calls: 248, chat: 120 },
    { label: "May 20", total: 590, calls: 276, chat: 132 },
    { label: "May 21", total: 720, calls: 402, chat: 172 },
    { label: "May 22", total: 652, calls: 328, chat: 134 },
    { label: "May 23", total: 644, calls: 298, chat: 112 },
    { label: "May 24", total: 640, calls: 300, chat: 120 },
    { label: "May 25", total: 546, calls: 248, chat: 88 }
  ];
  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadX = 38;
  const chartPadY = 24;
  const chartMax = 820;
  const chartInnerWidth = chartWidth - chartPadX * 2;
  const chartInnerHeight = chartHeight - chartPadY * 2;
  const metricChartPath = (key: "total" | "calls" | "chat") =>
    metricChartPoints
      .map((point, index) => {
        const x = chartPadX + (index / (metricChartPoints.length - 1)) * chartInnerWidth;
        const y = chartPadY + chartInnerHeight - (point[key] / chartMax) * chartInnerHeight;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  const metricChartArea = `${metricChartPath("total")} L ${chartPadX + chartInnerWidth} ${chartPadY + chartInnerHeight} L ${chartPadX} ${chartPadY + chartInnerHeight} Z`;
  const liveActivityItems = isClearDbsActive ? [
    { type: "call", title: "Incoming applicant call", detail: "DBS-APP-28419 status request", time: "Now", tone: "green" },
    { type: "chat", title: "Employer chat opened", detail: "Little Oaks Care asks for missing ID evidence", time: "1m ago", tone: "blue" },
    { type: "call", title: "AI resolved status call", detail: "Enhanced check still with DBS", time: "2m ago", tone: "green" },
    { type: "chat", title: "Compliance handoff created", detail: "Certificate dispute needs human review", time: "4m ago", tone: "blue" },
    { type: "call", title: "Missed call captured", detail: "Callback task assigned to operations", time: "6m ago", tone: "red" }
  ] : [
    { type: "call", title: "Incoming call from", detail: "+44 7700 900123", time: "Now", tone: "green" },
    { type: "chat", title: "New live chat from", detail: "Jessica Cooper", time: "1m ago", tone: "blue" },
    { type: "call", title: "Call resolved by AI Agent", detail: "Duration: 3m 42s", time: "2m ago", tone: "green" },
    { type: "chat", title: "New live chat from", detail: "Michael Brown", time: "3m ago", tone: "blue" },
    { type: "call", title: "Missed call", detail: "+44 7700 900456", time: "5m ago", tone: "red" }
  ];
  const channelBreakdown = [
    { label: "Live Chat", value: 1324, percent: 52, tone: "blue" },
    { label: "Phone Calls", value: 842, percent: 33, tone: "green" },
    { label: "Email", value: 256, percent: 10, tone: "cyan" },
    { label: "Other", value: 140, percent: 5, tone: "amber" }
  ];
  const topIntents = [
    { label: "Order Status", percent: 24.5 },
    { label: "Returns & Refunds", percent: 18.7 },
    { label: "Product Information", percent: 15.2 },
    { label: "Pricing & Plans", percent: 11.3 },
    { label: "Technical Support", percent: 8.6 }
  ];
  const agentPerformance = [
    { label: "Answer Accuracy", value: "92%" },
    { label: "Response Time", value: "1.2s" },
    { label: "Escalation Rate", value: "9%" },
    { label: "Resolution Rate", value: "87%" }
  ];
  const aiAgentRoster = isClearDbsActive ? [
    {
      id: "clara",
      name: "Clara",
      role: "Applicant Support Agent",
      status: "Live",
      tone: "green",
      channels: ["Voice", "Chat"],
      headline: "1,118 conversations",
      description: "Answers DBS application status, identity-route, and certificate questions from approved guidance, and hands sensitive cases to compliance with full context.",
      stats: [
        { label: "Conversations today", value: String(liveMetrics.callsHandled), detail: `${liveMetrics.activeCalls} active now` },
        { label: "Resolution rate", value: `${containmentRate}%`, detail: "No staff needed" },
        { label: "Avg response", value: `${latencySeconds}s`, detail: "Voice turn" },
        { label: "Handoffs", value: String(liveMetrics.handoffs), detail: "Compliance queue" }
      ],
      config: [
        ["Model", "Claude Sonnet 5"],
        ["Voice", "Nova · Warm UK"],
        ["Language", "English (UK)"],
        ["Creativity", "Low · Grounded"],
        ["Escalation threshold", "80% confidence"]
      ],
      routing: [
        { label: "Application status", dest: "Portal", note: "Read case stage and explain the next visible step." },
        { label: "Sensitive or disputed", dest: "Human", note: "Escalate to compliance with transcript and reason." },
        { label: "Process and FAQ", dest: "Knowledge", note: "Answer only from approved DBS guidance." },
        { label: "After-call admin", dest: "Auto wrap-up", note: "Write summary, applicant reference, and next action." }
      ],
      guardrails: [
        { label: "No eligibility advice beyond approved guidance", state: "Enforced" },
        { label: "Identity and barred-list topics go to humans", state: "Enforced" },
        { label: "Every answer carries a source citation", state: "Enforced" }
      ],
      activity: [
        { time: "12:44", title: "Status call resolved", detail: "Confirmed enhanced check is with DBS and set expectations.", tag: "Resolved" },
        { time: "12:31", title: "Certificate dispute detected", detail: "Moved to compliance review with transcript attached.", tag: "Handoff" },
        { time: "12:18", title: "Employer ID request routed", detail: "Captured applicant reference for operations follow-up.", tag: "Follow-up" }
      ],
      tools: [
        { name: "Applicant portal", status: "Live" },
        { name: "Zoom Contact Center", status: "Streaming" },
        { name: "DBS Obsidian vault", status: "Synced 3m" },
        { name: "Zendesk compliance", status: "Passing" }
      ],
      test: [
        { label: "Routing accuracy", value: "24/24 passed" },
        { label: "Guardrail probes", value: "11/11 held" },
        { label: "Source citations", value: "100% attached" }
      ]
    },
    {
      id: "harbor",
      name: "Harbor",
      role: "Employer Line Agent",
      status: "Live",
      tone: "green",
      channels: ["Voice"],
      headline: "97 calls",
      description: "Handles employer status requests, SLA questions, and bulk application queries, matching every caller to their account and named owner.",
      stats: [
        { label: "Calls today", value: "97", detail: "12 active now" },
        { label: "Resolution rate", value: "84%", detail: "No staff needed" },
        { label: "Avg response", value: "1.4s", detail: "Voice turn" },
        { label: "Handoffs", value: "6", detail: "Account owners" }
      ],
      config: [
        ["Model", "Claude Sonnet 5"],
        ["Voice", "Atlas · Neutral UK"],
        ["Language", "English (UK)"],
        ["Creativity", "Low · Grounded"],
        ["Escalation threshold", "85% confidence"]
      ],
      routing: [
        { label: "Account and SLA", dest: "CRM", note: "Load employer account, sector, and agreed SLA." },
        { label: "Urgent deadline", dest: "Human", note: "Notify the named success owner immediately." },
        { label: "Process questions", dest: "Knowledge", note: "Answer from employer help articles." }
      ],
      guardrails: [
        { label: "Verify requester before sharing case detail", state: "Enforced" },
        { label: "No commitments beyond the agreed SLA", state: "Enforced" },
        { label: "Deadline risks alert the account owner", state: "Enforced" }
      ],
      activity: [
        { time: "12:26", title: "SLA question answered", detail: "Confirmed turnaround for enhanced checks in care roles.", tag: "Resolved" },
        { time: "11:52", title: "Deadline escalation", detail: "Monday start date flagged to the account owner.", tag: "Handoff" },
        { time: "11:15", title: "Bulk query summarised", detail: "Six applications summarised for Little Oaks Care.", tag: "Resolved" }
      ],
      tools: [
        { name: "HubSpot CRM", status: "Synced 4m" },
        { name: "Zoom Contact Center", status: "Streaming" },
        { name: "DBS Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Routing accuracy", value: "18/18 passed" },
        { label: "Guardrail probes", value: "9/9 held" },
        { label: "Account matching", value: "100% matched" }
      ]
    },
    {
      id: "sentinel",
      name: "Sentinel",
      role: "Compliance Triage Agent",
      status: "Paused",
      tone: "amber",
      channels: ["Chat"],
      headline: "Paused for review",
      description: "Pre-sorts the compliance queue by risk reason, attaches transcripts and sources, and drafts the first response for human approval.",
      stats: [
        { label: "Tickets triaged", value: "31", detail: "This week" },
        { label: "Draft accuracy", value: "91%", detail: "Approved as-is" },
        { label: "Avg triage", value: "38s", detail: "Per ticket" },
        { label: "Escalations", value: "3", detail: "To senior review" }
      ],
      config: [
        ["Model", "Claude Opus 4.8"],
        ["Voice", "Text only"],
        ["Language", "English (UK)"],
        ["Creativity", "Minimal · Draft only"],
        ["Escalation threshold", "Always human approval"]
      ],
      routing: [
        { label: "Certificate disputes", dest: "Human", note: "Draft response with policy citation for approval." },
        { label: "Identity concerns", dest: "Human", note: "Flag as sensitive, never auto-reply." },
        { label: "Routine queries", dest: "Knowledge", note: "Return to Clara with suggested answer." }
      ],
      guardrails: [
        { label: "Never sends a reply without human approval", state: "Enforced" },
        { label: "Sensitive categories locked to senior queue", state: "Enforced" },
        { label: "Full audit trail on every draft", state: "Enforced" }
      ],
      activity: [
        { time: "10:40", title: "Agent paused", detail: "Paused while the new dispute policy wording is approved.", tag: "Paused" },
        { time: "09:58", title: "Draft approved", detail: "Certificate reprint response accepted without edits.", tag: "Resolved" },
        { time: "09:12", title: "Queue triaged", detail: "Seven tickets sorted by risk reason and SLA.", tag: "Resolved" }
      ],
      tools: [
        { name: "Zendesk compliance", status: "Passing" },
        { name: "DBS Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Triage accuracy", value: "14/15 passed" },
        { label: "Guardrail probes", value: "8/8 held" },
        { label: "Policy wording", value: "1 update pending" }
      ]
    },
    {
      id: "scribe",
      name: "Scribe",
      role: "Audit Summary Agent",
      status: "Draft",
      tone: "slate",
      channels: ["Internal"],
      headline: "In build",
      description: "Will compile weekly audit packs covering containment, handoffs, guardrail events, and answer quality for the compliance team.",
      stats: [
        { label: "Reports drafted", value: "2", detail: "Sample runs" },
        { label: "Data sources", value: "4", detail: "Connected" },
        { label: "Coverage", value: "86%", detail: "Of audit schema" },
        { label: "Launch checks", value: "5/8", detail: "Passing" }
      ],
      config: [
        ["Model", "Claude Sonnet 5"],
        ["Voice", "Text only"],
        ["Language", "English (UK)"],
        ["Creativity", "Low · Structured"],
        ["Escalation threshold", "Not live"]
      ],
      routing: [
        { label: "Weekly audit pack", dest: "Reporting", note: "Compile containment, handoffs, and guardrail events." },
        { label: "Anomaly detected", dest: "Human", note: "Flag unusual patterns to the compliance lead." }
      ],
      guardrails: [
        { label: "Read-only access to conversation data", state: "Enforced" },
        { label: "No customer-facing output", state: "Enforced" },
        { label: "Reports reviewed before distribution", state: "Planned" }
      ],
      activity: [
        { time: "Mon", title: "Sample report generated", detail: "Weekly pack draft shared with compliance lead.", tag: "Draft" },
        { time: "Fri", title: "Schema mapped", detail: "Audit fields matched to warehouse export.", tag: "Resolved" }
      ],
      tools: [
        { name: "Reporting export", status: "Setup needed" },
        { name: "DBS Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Schema coverage", value: "86% mapped" },
        { label: "Sample export", value: "Pending destination" },
        { label: "Access scopes", value: "Read-only verified" }
      ]
    }
  ] : [
    {
      id: "clara",
      name: "Clara",
      role: "Customer Support Agent",
      status: "Live",
      tone: "green",
      channels: ["Voice", "Chat"],
      headline: "1,284 conversations",
      description: "Answers account, billing, and product questions from approved sources, verifies callers against the CRM, and hands sensitive cases to the team with full context.",
      stats: [
        { label: "Conversations today", value: String(liveMetrics.callsHandled), detail: `${liveMetrics.activeCalls} active now` },
        { label: "Resolution rate", value: `${containmentRate}%`, detail: "No staff needed" },
        { label: "Avg response", value: `${latencySeconds}s`, detail: "Voice turn" },
        { label: "Handoffs", value: String(liveMetrics.handoffs), detail: "With context notes" }
      ],
      config: [
        ["Model", "Claude Sonnet 5"],
        ["Voice", "Nova · Warm UK"],
        ["Language", "English (UK)"],
        ["Creativity", "Low · Grounded"],
        ["Escalation threshold", "80% confidence"]
      ],
      routing: [
        { label: "Account and billing", dest: "CRM", note: "Verify account, summarise request, create follow-up." },
        { label: "Urgent or sensitive", dest: "Human", note: "Escalate with transcript and recommended owner." },
        { label: "FAQs and policies", dest: "Knowledge", note: "Answer only from approved sources." },
        { label: "After-call admin", dest: "Auto wrap-up", note: "Write summary, tags, and next action." }
      ],
      guardrails: [
        { label: "No refund promises above the approved limit", state: "Enforced" },
        { label: "Sensitive topics always reach a human", state: "Enforced" },
        { label: "Every answer carries a source citation", state: "Enforced" }
      ],
      activity: [
        { time: "12:44", title: "Invoice request resolved", detail: "Verified the account and sent the latest invoice.", tag: "Resolved" },
        { time: "12:31", title: "Policy exception detected", detail: "Moved to review with transcript and suggested owner.", tag: "Handoff" },
        { time: "12:18", title: "Booking updated", detail: "Captured new time preference and updated the CRM.", tag: "Resolved" }
      ],
      tools: [
        { name: "HubSpot CRM", status: "Synced 4m" },
        { name: "Zoom Contact Center", status: "Streaming" },
        { name: "Obsidian vault", status: "Synced 3m" },
        { name: "Zendesk Support", status: "Passing" }
      ],
      test: [
        { label: "Routing accuracy", value: "24/24 passed" },
        { label: "Guardrail probes", value: "11/11 held" },
        { label: "Source citations", value: "100% attached" }
      ]
    },
    {
      id: "atlas",
      name: "Atlas",
      role: "Voice Reception Agent",
      status: "Live",
      tone: "green",
      channels: ["Voice"],
      headline: "842 calls",
      description: "Greets every inbound call, identifies intent in the first turn, routes to the right queue or agent, and captures callbacks for missed calls.",
      stats: [
        { label: "Calls today", value: "842", detail: "12 active now" },
        { label: "Routed first try", value: "94%", detail: "Correct queue" },
        { label: "Avg response", value: "0.9s", detail: "Voice turn" },
        { label: "Callbacks captured", value: "17", detail: "From missed calls" }
      ],
      config: [
        ["Model", "Claude Haiku 4.5"],
        ["Voice", "Atlas · Neutral UK"],
        ["Language", "English (UK)"],
        ["Creativity", "Minimal · Scripted"],
        ["Escalation threshold", "90% confidence"]
      ],
      routing: [
        { label: "Support requests", dest: "Clara", note: "Warm transfer with caller intent attached." },
        { label: "Sales enquiries", dest: "Scout", note: "Qualify and book time with the right owner." },
        { label: "Unknown intent", dest: "Human", note: "Route to reception with a live summary." }
      ],
      guardrails: [
        { label: "Never leaves a caller in silence beyond 4s", state: "Enforced" },
        { label: "Announces AI identity at call start", state: "Enforced" },
        { label: "Missed calls always create a callback task", state: "Enforced" }
      ],
      activity: [
        { time: "12:40", title: "Call routed to support", detail: "Delivery question passed to Clara with intent.", tag: "Resolved" },
        { time: "12:22", title: "Callback captured", detail: "Missed call converted to a task for the team.", tag: "Follow-up" },
        { time: "11:58", title: "Sales enquiry qualified", detail: "Routed to Scout with company context.", tag: "Resolved" }
      ],
      tools: [
        { name: "Zoom Contact Center", status: "Streaming" },
        { name: "HubSpot CRM", status: "Synced 4m" },
        { name: "Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Routing accuracy", value: "19/20 passed" },
        { label: "Guardrail probes", value: "7/7 held" },
        { label: "Latency budget", value: "0.9s median" }
      ]
    },
    {
      id: "scout",
      name: "Scout",
      role: "Lead Qualifier Agent",
      status: "Paused",
      tone: "amber",
      channels: ["Chat"],
      headline: "Paused for tuning",
      description: "Qualifies inbound website chats, scores fit against the ideal customer profile, and books demos straight into the team calendar.",
      stats: [
        { label: "Leads qualified", value: "48", detail: "This week" },
        { label: "Demo bookings", value: "12", detail: "Calendar synced" },
        { label: "Avg response", value: "1.1s", detail: "Chat turn" },
        { label: "Handoffs", value: "4", detail: "To sales team" }
      ],
      config: [
        ["Model", "Claude Sonnet 5"],
        ["Voice", "Text only"],
        ["Language", "English (UK)"],
        ["Creativity", "Medium · Conversational"],
        ["Escalation threshold", "75% confidence"]
      ],
      routing: [
        { label: "Qualified leads", dest: "CRM", note: "Create contact, score fit, and assign an owner." },
        { label: "Demo requests", dest: "Calendar", note: "Book directly into the round-robin rota." },
        { label: "Pricing negotiations", dest: "Human", note: "Hand to sales with conversation summary." }
      ],
      guardrails: [
        { label: "No discounts or pricing commitments", state: "Enforced" },
        { label: "Qualification questions capped at five", state: "Enforced" },
        { label: "GDPR consent before storing contact data", state: "Enforced" }
      ],
      activity: [
        { time: "10:32", title: "Agent paused", detail: "Paused while the new qualification script is reviewed.", tag: "Paused" },
        { time: "09:47", title: "Demo booked", detail: "Enterprise lead scheduled with the sales lead.", tag: "Resolved" },
        { time: "09:05", title: "Lead scored", detail: "Mid-market fit synced to the CRM with owner.", tag: "Resolved" }
      ],
      tools: [
        { name: "HubSpot CRM", status: "Synced 4m" },
        { name: "Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Qualification accuracy", value: "15/16 passed" },
        { label: "Guardrail probes", value: "6/6 held" },
        { label: "Script update", value: "1 review pending" }
      ]
    },
    {
      id: "relay",
      name: "Relay",
      role: "After-call Assistant",
      status: "Draft",
      tone: "slate",
      channels: ["Internal"],
      headline: "In build",
      description: "Will handle after-call wrap-up automatically: summaries, tags, CRM notes, follow-up tasks, and quality flags for every conversation.",
      stats: [
        { label: "Wrap-ups drafted", value: "36", detail: "Sample runs" },
        { label: "Summary accuracy", value: "89%", detail: "Team reviewed" },
        { label: "Time saved", value: "4m", detail: "Per conversation" },
        { label: "Launch checks", value: "6/8", detail: "Passing" }
      ],
      config: [
        ["Model", "Claude Haiku 4.5"],
        ["Voice", "Text only"],
        ["Language", "English (UK)"],
        ["Creativity", "Low · Structured"],
        ["Escalation threshold", "Not live"]
      ],
      routing: [
        { label: "Call summaries", dest: "CRM", note: "Write summary, tags, and next action to the record." },
        { label: "Quality flags", dest: "Human", note: "Surface low-confidence calls for team review." }
      ],
      guardrails: [
        { label: "Read-only until launch checks pass", state: "Enforced" },
        { label: "No customer-facing output", state: "Enforced" },
        { label: "Summaries sampled weekly for accuracy", state: "Planned" }
      ],
      activity: [
        { time: "Mon", title: "Sample wrap-ups reviewed", detail: "36 drafts checked by the support team.", tag: "Draft" },
        { time: "Fri", title: "CRM write test", detail: "Notes format approved for the pilot.", tag: "Resolved" }
      ],
      tools: [
        { name: "HubSpot CRM", status: "Synced 4m" },
        { name: "Zoom Contact Center", status: "Streaming" },
        { name: "Obsidian vault", status: "Synced 3m" }
      ],
      test: [
        { label: "Summary accuracy", value: "89% approved" },
        { label: "Write permissions", value: "Sandbox only" },
        { label: "Launch checks", value: "6/8 passing" }
      ]
    }
  ];
  const aiAgentFilters = [
    { label: "All", count: aiAgentRoster.length },
    { label: "Live", count: aiAgentRoster.filter((agent) => agent.status === "Live").length },
    { label: "Paused", count: aiAgentRoster.filter((agent) => agent.status === "Paused").length },
    { label: "Draft", count: aiAgentRoster.filter((agent) => agent.status === "Draft").length }
  ];
  const visibleAiAgents = aiAgentFilter === "All"
    ? aiAgentRoster
    : aiAgentRoster.filter((agent) => agent.status === aiAgentFilter);
  const selectedAiAgent = aiAgentRoster.find((agent) => agent.id === selectedAiAgentId) || aiAgentRoster[0];
  const liveAiAgentCount = aiAgentRoster.filter((agent) => agent.status === "Live").length;
  const aiAgentsKpis = [
    { label: "Live agents", value: `${liveAiAgentCount} of ${aiAgentRoster.length}`, trend: "1 launched this month", tone: "purple", icon: "agents" },
    { label: "Conversations", value: isClearDbsActive ? "1,215" : "2,126", trend: "18.2%", tone: "blue", icon: "chat" },
    { label: "Resolution Rate", value: `${containmentRate}%`, trend: "6.3% vs last 7 days", tone: "green", icon: "check" },
    { label: "Safety checks", value: "11/11", trend: "Last test 9m ago", tone: "amber", icon: "shield" }
  ];
  const integrationUsageByKey: Record<string, {
    stats: Array<{ label: string; value: string; detail: string }>;
    activity: Array<{ time: string; title: string; detail: string; tag: string }>;
  }> = {
    crm: {
      stats: [
        { label: "API calls today", value: "1,204", detail: "Well under limit" },
        { label: "Records read", value: "462", detail: "Contacts and companies" },
        { label: "Notes written", value: "38", detail: "Follow-up summaries" },
        { label: "Uptime", value: "99.98%", detail: "Last 30 days" }
      ],
      activity: [
        { time: "12:41", title: "Contact matched", detail: "Caller verified against the account record before the answer.", tag: "Read" },
        { time: "12:32", title: "Follow-up note written", detail: "Conversation summary and next action saved to the record.", tag: "Write" },
        { time: "11:58", title: "Owner mapped", detail: "Escalation routed to the account owner automatically.", tag: "Read" },
        { time: "09:00", title: "Scheduled full sync", detail: "All contact and company fields refreshed without errors.", tag: "Sync" }
      ]
    },
    telephony: {
      stats: [
        { label: "Webhook events", value: "3,412", detail: "Today" },
        { label: "Live streams", value: String(liveMetrics.activeCalls), detail: "Active right now" },
        { label: "Transcript turns", value: "1,860", detail: "Ingested today" },
        { label: "Uptime", value: "99.99%", detail: "Last 30 days" }
      ],
      activity: [
        { time: "12:44", title: "Transcript streaming", detail: "Live voice turns flowing into the calls workspace.", tag: "Stream" },
        { time: "12:31", title: "Transfer event received", detail: "Handoff context attached to the escalation ticket.", tag: "Event" },
        { time: "12:06", title: "Missed call captured", detail: "Callback task created from the missed-call webhook.", tag: "Event" },
        { time: "11:40", title: "Webhook signature verified", detail: "Rotating secret validated on schedule.", tag: "Check" }
      ]
    },
    knowledge: {
      stats: [
        { label: "Searches today", value: "964", detail: "Agent lookups" },
        { label: "Citation coverage", value: `${liveMetrics.citationCoverage}%`, detail: "Answers with sources" },
        { label: "Articles synced", value: "148", detail: "Approved sources" },
        { label: "Uptime", value: "100%", detail: "Last 30 days" }
      ],
      activity: [
        { time: "12:38", title: "Source search served", detail: "Policy answer grounded in the latest approved wording.", tag: "Read" },
        { time: "12:12", title: "Draft answer suggested", detail: "New wording proposed for a repeated customer question.", tag: "Draft" },
        { time: "11:47", title: "Embeddings refreshed", detail: "Updated articles re-indexed for retrieval.", tag: "Sync" },
        { time: "10:05", title: "Stale source flagged", detail: "One pricing document is older than the freshness rule.", tag: "Check" }
      ]
    },
    helpdesk: {
      stats: [
        { label: "Tickets read", value: "210", detail: "Context lookups" },
        { label: "Tickets created", value: "27", detail: "Escalations today" },
        { label: "SLA breaches", value: "0", detail: "This week" },
        { label: "Uptime", value: "99.97%", detail: "Last 30 days" }
      ],
      activity: [
        { time: "12:31", title: "Escalation ticket created", detail: "Transcript, priority, and suggested owner attached.", tag: "Write" },
        { time: "11:56", title: "Existing case matched", detail: "Caller linked to an open ticket to avoid duplicates.", tag: "Read" },
        { time: "11:12", title: "Priority mapped", detail: "Sensitive category routed to the senior queue.", tag: "Event" },
        { time: "09:30", title: "Queue mapping verified", detail: "All escalation paths tested and passing.", tag: "Check" }
      ]
    },
    analytics: {
      stats: [
        { label: "Events queued", value: "5,120", detail: "Awaiting destination" },
        { label: "Exports run", value: "0", detail: "Not started" },
        { label: "Schema mapped", value: "86%", detail: "Of report fields" },
        { label: "Destination", value: "Pending", detail: "Choose a warehouse" }
      ],
      activity: [
        { time: "Today", title: "Events buffering", detail: "Conversation outcomes are queued until a destination is set.", tag: "Queued" },
        { time: "Mon", title: "Schema draft updated", detail: "Containment and handoff fields mapped to the export shape.", tag: "Draft" },
        { time: "Fri", title: "Setup started", detail: "Warehouse connection wizard opened but not completed.", tag: "Setup" }
      ]
    }
  };
  const selectedIntegrationUsage = integrationUsageByKey[selectedCompletedIntegration.key] || {
    stats: [
      { label: "API calls today", value: "312", detail: "Well under limit" },
      { label: "Records read", value: "84", detail: "Lookups served" },
      { label: "Records written", value: "9", detail: "Updates saved" },
      { label: "Uptime", value: "99.9%", detail: "Last 30 days" }
    ],
    activity: [
      { time: "12:20", title: "Connection healthy", detail: "Scheduled check completed without errors.", tag: "Check" },
      { time: "09:00", title: "Scheduled sync", detail: "Records refreshed on the standard cadence.", tag: "Sync" }
    ]
  };
  const integrationWordTokens = (text: string) => text.toLowerCase().split(/[^a-z]+/).filter((word) => word.length >= 4);
  const selectedIntegrationTokens = new Set(integrationWordTokens(`${selectedCompletedIntegration.provider} ${selectedCompletedIntegration.name}`));
  const agentsUsingSelectedIntegration = aiAgentRoster.filter((agent) =>
    agent.tools.some((tool) => integrationWordTokens(tool.name).some((word) => selectedIntegrationTokens.has(word)))
  );
  const selectedIntegrationConnected = selectedCompletedIntegration.status === "Connected";
  const selectedIntegrationDetails = [
    ["Status", selectedCompletedIntegration.status],
    ["Health", selectedCompletedIntegration.health],
    ["Auth method", selectedIntegrationConnected ? "OAuth 2.0" : "Not authorised"],
    ["Environment", "Production"],
    ["API version", selectedIntegrationConnected ? "v3 · Current" : "—"],
    ["Webhooks", selectedCompletedIntegration.key === "telephony" ? "3 active" : selectedIntegrationConnected ? "2 active" : "None"],
    ["Last sync", selectedCompletedIntegration.lastSync],
    ["Owner", user.name || user.email]
  ];
  const integrationsKpis = [
    { label: "Connected", value: `${completedConnectedCount} of ${allCompletedIntegrationSystems.length}`, trend: "Core tools live", tone: "purple", icon: "plug" },
    { label: "API calls", value: "12,480", trend: "18.2%", tone: "blue", icon: "bolt" },
    { label: "Checks", value: `${completedCheckCount}/${completedCheckCount}`, trend: "Last run 4m ago", tone: "green", icon: "check" },
    { label: "Setup needed", value: String(allCompletedIntegrationSystems.length - completedConnectedCount), trend: "Analytics export pending", tone: "amber", icon: "alert" }
  ];
  const callsDashboardKpis = isClearDbsActive ? [
    { label: "Total Calls", value: "97", trend: "12.1%", tone: "purple", icon: "call" },
    { label: "Active Calls", value: String(liveMetrics.activeCalls), trend: "9.4%", tone: "green", icon: "levels" },
    { label: "Answered Rate", value: "94.8%", trend: "4.2%", tone: "blue", icon: "check" },
    { label: "Average Handle Time", value: "03:46", trend: "5.1%", tone: "amber", icon: "clock", negative: true }
  ] : [
    { label: "Total Calls", value: "1,324", trend: "21.4%", tone: "purple", icon: "call" },
    { label: "Active Calls", value: "18", trend: "12.5%", tone: "green", icon: "levels" },
    { label: "Answered Rate", value: "92.3%", trend: "7.1%", tone: "blue", icon: "check" },
    { label: "Average Handle Time", value: "04:26", trend: "6.2%", tone: "amber", icon: "clock", negative: true }
  ];
  const callInitials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const seededCalls: CallQueueItem[] = (isClearDbsActive ? [
    { name: "Priya Shah", phone: "+44 7700 910214", badge: "Enhanced DBS status", status: "Live" as const, time: "00:02:34", tone: "purple", active: true },
    { name: "Little Oaks Care", phone: "+44 161 555 0148", badge: "Missing ID evidence", status: "Waiting" as const, time: "02:15", tone: "green" },
    { name: "Marcus Reid", phone: "+44 7700 910588", badge: "Certificate posted", status: "AI Handled" as const, time: "10:24 AM", tone: "purple" },
    { name: "Northpoint Education", phone: "+44 113 555 0182", badge: "Barred-list eligibility", status: "Missed" as const, time: "9:57 AM", tone: "red" },
    { name: "Amina Yusuf", phone: "+44 7700 910712", badge: "Application correction", status: "Resolved" as const, time: "9:42 AM", tone: "green" },
    { name: "Harbour Homecare", phone: "+44 121 555 0199", badge: "Bulk check export", status: "AI Handled" as const, time: "9:21 AM", tone: "purple" },
    { name: "Theo Martin", phone: "+44 7700 910845", badge: "Identity route", status: "Resolved" as const, time: "9:03 AM", tone: "green" },
    { name: "Greenfield Trust", phone: "+44 20 5555 0134", badge: "Employer invoice", status: "Missed" as const, time: "8:45 AM", tone: "red" }
  ] : [
    { name: "Jessica Cooper", phone: "+44 7700 900123", badge: "Order status", status: "Live" as const, time: "00:02:34", tone: "purple", active: true },
    { name: "Michael Brown", phone: "+44 7700 900456", badge: "Refund request", status: "Waiting" as const, time: "02:15", tone: "green" },
    { name: "David Lee", phone: "+44 7700 900789", badge: "Product question", status: "AI Handled" as const, time: "10:24 AM", tone: "purple" },
    { name: "Sarah Martinez", phone: "+44 7700 900321", badge: "Billing issue", status: "Missed" as const, time: "9:57 AM", tone: "red" },
    { name: "James Wilson", phone: "+44 7700 900654", badge: "Technical support", status: "Resolved" as const, time: "9:42 AM", tone: "green" },
    { name: "Ashley Kim", phone: "+44 7700 900987", badge: "Account access", status: "AI Handled" as const, time: "9:21 AM", tone: "purple" },
    { name: "Daniel Garcia", phone: "+44 7700 901234", badge: "General inquiry", status: "Resolved" as const, time: "9:03 AM", tone: "green" },
    { name: "Emma Thompson", phone: "+44 7700 901567", badge: "Sales question", status: "Missed" as const, time: "8:45 AM", tone: "red" }
  ]).map((call, index) => ({
    ...call,
    id: `call-${index}`,
    initials: callInitials(call.name)
  }));
  const callsQueue = [...createdCalls, ...seededCalls].map((call) => ({
    ...call,
    status: callStatusOverrides[call.id] || call.status
  }));
  const callFilters: Array<{ id: string; label: string; statuses: CallStatus[] | null }> = [
    { id: "All Calls", label: "All Calls", statuses: null },
    { id: "Live", label: "Live", statuses: ["Live"] },
    { id: "Waiting", label: "Waiting", statuses: ["Waiting"] },
    { id: "Missed", label: "Missed", statuses: ["Missed"] }
  ];
  const activeCallFilter = callFilters.find((filter) => filter.id === callsFilter) || callFilters[0];
  const callMatchesFilter = (call: CallQueueItem, filter = activeCallFilter) => !filter.statuses || filter.statuses.includes(call.status);
  const visibleCalls = callsQueue.filter((call) => {
    const query = callsSearch.trim().toLowerCase();
    const matchesSearch = !query || `${call.name} ${call.phone} ${call.badge} ${call.status}`.toLowerCase().includes(query);
    return callMatchesFilter(call) && matchesSearch;
  });
  const callsPageSize = 8;
  const callsPageCount = Math.max(1, Math.ceil(visibleCalls.length / callsPageSize));
  const normalizedCallsPage = Math.min(callsPage, callsPageCount - 1);
  const pagedVisibleCalls = visibleCalls.slice(normalizedCallsPage * callsPageSize, normalizedCallsPage * callsPageSize + callsPageSize);
  const activeCall = (callsQueue.find((call) => call.id === activeCallId) || visibleCalls[0] || callsQueue[0]) as CallQueueItem;
  const activeCallIsHeld = activeCall ? heldCallIds.includes(activeCall.id) : false;
  const activeCallIsMuted = activeCall ? mutedCallIds.includes(activeCall.id) : false;
  const activeCallOutcome = activeCall ? callOutcomes[activeCall.id] : "";
  const activeCallSuggestionApplied = activeCall ? Boolean(callSuggestionsApplied[activeCall.id]) : false;
  const activeCallAssistantMessages = activeCall ? callAssistantThreads[activeCall.id] || [] : [];
  const callTranscript = isClearDbsActive ? [
    { speaker: "Priya Shah", initials: "PS", time: "00:02", text: "Hi, I am calling about my enhanced DBS application. The reference is DBS-APP-28419.", tone: "purple" },
    { speaker: "AI Agent", initials: "AI", time: "00:06", text: "Thanks Priya. I can check the visible status and tell you if anything is missing.\nI will not share sensitive certificate details on this call.", tone: "green" },
    { speaker: "Priya Shah", initials: "PS", time: "00:14", text: "The employer needs it before Monday. Is there anything holding it up?", tone: "purple" },
    { speaker: "AI Agent", initials: "AI", time: "00:20", text: "The case is currently with DBS at stage 4 review. I do not see missing ID evidence. Because you mentioned a deadline, I am preparing a handoff for operations.", tone: "green" }
  ] : [
    { speaker: "Jessica Cooper", initials: "JC", time: "00:02", text: "Hi, I'm calling about my order #ACM-12345.", tone: "purple" },
    { speaker: "AI Agent", initials: "AI", time: "00:06", text: "Hello Jessica! I can definitely help you with that.\nCan you tell me what seems to be the issue with your order?", tone: "green" },
    { speaker: "Jessica Cooper", initials: "JC", time: "00:12", text: "It was supposed to arrive yesterday, but I still haven't received it.", tone: "purple" },
    { speaker: "AI Agent", initials: "AI", time: "00:16", text: "I understand. Let me check the latest status for order #ACM-12345 for you.", tone: "green" }
  ];
  const callsProfileStats = isClearDbsActive ? [
    { label: "Risk", value: "Low", tone: "green" },
    { label: "Previous Calls", value: "3" },
    { label: "Employer SLA", value: "Mon" }
  ] : [
    { label: "Sentiment", value: "Positive", tone: "green" },
    { label: "Previous Calls", value: "12" },
    { label: "Customer Since", value: "Feb 14, 2025" }
  ];
  const callsDetails = isClearDbsActive ? [
    ["Call Reason", "Enhanced DBS status"],
    ["Phone Number", "+44 7700 910214"],
    ["Queue", "Applicant support"],
    ["IVR Path", "Applicants > Status"],
    ["Language", "English"],
    ["Application ID", "DBS-APP-28419"],
    ["Check Type", "Enhanced DBS"],
    ["Current Stage", "Stage 4 - DBS review"],
    ["Employer", "Little Oaks Care"],
    ["First Contact", "No"]
  ] : [
    ["Call Reason", "Order status"],
    ["Phone Number", "+44 7700 900123"],
    ["Queue", "General Support"],
    ["IVR Path", "Orders > Status"],
    ["Language", "English"],
    ["Device", "iPhone (iOS 17.5)"],
    ["First Contact", "Yes"]
  ];
  const callsAiInsights = isClearDbsActive ? [
    ["Detected Intent", "Enhanced DBS Status"],
    ["Sentiment", "Neutral"],
    ["Resolution Likelihood", "Medium 74%"],
    ["Priority", "SLA watch"],
    ["Policy Confidence", "High 94%"],
    ["Handoff Reason", "Employer deadline"]
  ] : [
    ["Detected Intent", "Order Status"],
    ["Sentiment", "Positive"],
    ["Resolution Likelihood", "High 85%"],
    ["Priority", "Medium"],
    ["Language Confidence", "High"]
  ];
  const callsTeamStatus = isClearDbsActive ? [
    { name: "Maya Collins", status: "Live Call (02:12)", tone: "purple" },
    { name: "Ravi Singh", status: "Available", tone: "green" },
    { name: "Olivia Grant", status: "Compliance review", tone: "red" },
    { name: "Ben Turner", status: "Available", tone: "green" }
  ] : [
    { name: "James Wilson", status: "Live Call (02:12)", tone: "purple" },
    { name: "Sarah Martinez", status: "Available", tone: "green" },
    { name: "Daniel Garcia", status: "Wrap-up (01:25)", tone: "red" },
    { name: "Ashley Kim", status: "Available", tone: "green" }
  ];
  const activeCallIsSeedPrimary = activeCall.id === "call-0";
  const selectedCallTranscript = activeCallIsSeedPrimary ? callTranscript : [
    { speaker: activeCall.name, initials: activeCall.initials, time: "00:01", text: `Hi, I'm calling about ${activeCall.badge.toLowerCase()}.`, tone: activeCall.tone },
    { speaker: "AI Agent", initials: "AI", time: "00:04", text: `I can help with ${activeCall.badge.toLowerCase()}. Let me check the account and recent activity now.`, tone: "green" },
    { speaker: activeCall.name, initials: activeCall.initials, time: "00:09", text: activeCall.status === "Missed" ? "Please call me back when someone is available." : "Thanks, I just need the next step confirmed.", tone: activeCall.tone }
  ];
  const selectedCallsProfileStats = activeCallIsSeedPrimary ? callsProfileStats : [
    { label: activeCall.status === "Missed" ? "Callback" : "Status", value: activeCall.status, tone: activeCall.status === "Resolved" ? "green" : undefined },
    { label: "Previous Calls", value: activeCall.status === "AI Handled" ? "4" : "1" },
    { label: isClearDbsActive ? "SLA" : "Since", value: isClearDbsActive ? "Today" : "2026" }
  ];
  const selectedCallsDetails = activeCallIsSeedPrimary ? callsDetails : [
    ["Call Reason", activeCall.badge],
    ["Phone Number", activeCall.phone],
    ["Queue", activeCall.status === "Missed" ? "Callback queue" : activeCall.status === "Waiting" ? "Waiting room" : "General Support"],
    ["IVR Path", `${isClearDbsActive ? "DBS" : "Support"} > ${activeCall.badge}`],
    ["Language", "English"],
    ["First Contact", activeCall.status === "Resolved" ? "No" : "Yes"]
  ];
  const selectedCallsAiInsights = activeCallIsSeedPrimary ? callsAiInsights : [
    ["Detected Intent", activeCall.badge],
    ["Sentiment", activeCall.status === "Missed" ? "Unknown" : activeCall.status === "Resolved" ? "Positive" : "Neutral"],
    ["Resolution Likelihood", activeCall.status === "Missed" ? "Medium 62%" : "High 82%"],
    ["Priority", activeCall.status === "Missed" || activeCall.status === "Waiting" ? "Follow-up" : "Medium"]
  ];
  const selectedCallSummary = activeCallIsSeedPrimary
    ? isClearDbsActive
      ? ["Applicant calling about enhanced DBS status.", "Reference DBS-APP-28419 is at stage 4 with DBS.", "Employer deadline creates an SLA watch handoff."]
      : ["Customer calling about delayed order.", "Order #ACM-12345 was expected May 18.", "Last scan: May 22, in transit."]
    : [
      `${activeCall.name} is calling about ${activeCall.badge.toLowerCase()}.`,
      `Current queue state is ${activeCall.status.toLowerCase()}.`,
      activeCall.status === "Missed" ? "Callback should be queued before closing." : "AI can prepare a concise next-step response."
    ];
  const selectedCallActions = activeCallIsSeedPrimary
    ? isClearDbsActive
      ? ["Create operations handoff with applicant reference", "Attach source-backed status explanation"]
      : ["Provide updated delivery ETA", "Offer delivery updates via SMS"]
    : [
      activeCall.status === "Missed" ? "Create callback task" : "Confirm next step with caller",
      activeCall.status === "Waiting" ? "Move caller to available agent" : "Save call summary to CRM"
    ];
  const selectedCallerEmail = activeCallIsSeedPrimary
    ? isClearDbsActive ? "priya.shah@example.com" : "jessica.cooper@email.com"
    : `${activeCall.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/(^\.|\.$)/g, "")}@example.com`;
  const selectedCallerLocation = activeCallIsSeedPrimary
    ? isClearDbsActive ? "DBS-APP-28419" : "London, United Kingdom"
    : activeCall.status === "Missed" ? "Callback requested" : activeCall.badge;
  const selectedCallReference = activeCallIsSeedPrimary
    ? isClearDbsActive ? "Applicant support queue" : "London, United Kingdom"
    : `${activeCall.status} queue`;
  const callTimeNow = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const setCallFilterAndSelection = (filter: typeof callFilters[number]) => {
    setCallsFilter(filter.id);
    setCallsPage(0);
    const query = callsSearch.trim().toLowerCase();
    const firstMatch = callsQueue.find((call) => {
      const matchesSearch = !query || `${call.name} ${call.phone} ${call.badge} ${call.status}`.toLowerCase().includes(query);
      return (!filter.statuses || filter.statuses.includes(call.status)) && matchesSearch;
    });
    if (firstMatch) setActiveCallId(firstMatch.id);
  };
  const startNewCallTask = () => {
    const id = `call-new-${Date.now()}`;
    const newCall: CallQueueItem = {
      id,
      name: "New caller",
      initials: "NC",
      phone: "+44 7700 900000",
      badge: isClearDbsActive ? "Applicant callback" : "Manual callback",
      status: "Waiting",
      time: "now",
      tone: "green"
    };
    setCreatedCalls((current) => [newCall, ...current]);
    setActiveCallId(id);
    setCallsFilter("All Calls");
    setCallsSearch("");
    setCallsPage(0);
    setActiveCallTab("Notes");
    setCallOutcomes((current) => ({ ...current, [id]: "New call task created" }));
  };
  const toggleActiveCallFlag = (kind: "hold" | "mute") => {
    if (!activeCall) return;
    const setter = kind === "hold" ? setHeldCallIds : setMutedCallIds;
    setter((current) => current.includes(activeCall.id)
      ? current.filter((id) => id !== activeCall.id)
      : [...current, activeCall.id]
    );
  };
  const transferActiveCall = () => {
    if (!activeCall) return;
    setCallStatusOverrides((current) => ({ ...current, [activeCall.id]: "Waiting" }));
    setCallOutcomes((current) => ({ ...current, [activeCall.id]: "Transfer prepared for the next available teammate" }));
    setActiveCallTab("Notes");
  };
  const endActiveCall = () => {
    if (!activeCall) return;
    setCallStatusOverrides((current) => ({ ...current, [activeCall.id]: "Resolved" }));
    setHeldCallIds((current) => current.filter((id) => id !== activeCall.id));
    setMutedCallIds((current) => current.filter((id) => id !== activeCall.id));
    setCallOutcomes((current) => ({ ...current, [activeCall.id]: "Call ended and wrap-up summary saved" }));
    setActiveCallTab("Summary");
  };
  const applyCallSuggestion = () => {
    if (!activeCall) return;
    setCallSuggestionsApplied((current) => ({ ...current, [activeCall.id]: true }));
    setCallOutcomes((current) => ({
      ...current,
      [activeCall.id]: selectedCallActions[0] || "Suggestion applied"
    }));
    setActiveCallTab("Notes");
  };
  const submitCallAsk = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCall) return;
    const question = callAskDraft.trim();
    if (!question) return;
    const lowerQuestion = question.toLowerCase();
    const answer = lowerQuestion.includes("transfer") || lowerQuestion.includes("handoff")
      ? `Transfer context is ready for ${activeCall.name}: ${activeCall.badge}, ${activeCall.phone}, current status ${activeCall.status}.`
      : lowerQuestion.includes("summary") || lowerQuestion.includes("what")
        ? selectedCallSummary.join(" ")
        : `For ${activeCall.name}, the next best action is: ${selectedCallActions[0] || "confirm the caller's next step"}.`;
    setCallAssistantThreads((current) => ({
      ...current,
      [activeCall.id]: [
        ...(current[activeCall.id] || []),
        { id: `call-q-${Date.now()}`, role: "operator", text: question, time: callTimeNow() },
        { id: `call-a-${Date.now()}`, role: "ai", text: answer, time: callTimeNow() }
      ]
    }));
    setCallAskDraft("");
  };
  const conversationFilters: Array<{ label: string; count: number }> = isClearDbsActive ? [
    { label: "All", count: 32 },
    { label: "Open", count: 8 },
    { label: "SLA watch", count: 3 },
    { label: "AI handled", count: 21 }
  ] : [
    { label: "All", count: 32 },
    { label: "Open", count: 6 },
    { label: "Waiting", count: 4 },
    { label: "AI handled", count: 22 }
  ];
  const conversationsList: Array<{ name: string; initials: string; intent: string; preview: string; time: string; status: string; tone: string; active?: boolean }> = isClearDbsActive ? [
    { name: "Priya Shah", initials: "PS", intent: "Enhanced DBS status", preview: "The employer needs it before Monday...", time: "2m", status: "Open", tone: "purple", active: true },
    { name: "Little Oaks Care", initials: "LO", intent: "Bulk application check", preview: "Can we export all pending starters...", time: "12m", status: "SLA Watch", tone: "green" },
    { name: "Marcus Reid", initials: "MR", intent: "Certificate dispatch", preview: "Has my certificate been posted yet?", time: "28m", status: "AI Handled", tone: "purple" },
    { name: "Amina Yusuf", initials: "AY", intent: "Application correction", preview: "I need to update my previous address...", time: "1h", status: "Resolved", tone: "green" }
  ] : [
    { name: "Jessica Cooper", initials: "JC", intent: "Order status", preview: "It was supposed to arrive yesterday...", time: "2m", status: "Open", tone: "purple", active: true },
    { name: "Michael Brown", initials: "MB", intent: "Refund request", preview: "Can you confirm when the refund lands?", time: "14m", status: "Waiting", tone: "green" },
    { name: "David Lee", initials: "DL", intent: "Product question", preview: "Does this work with the larger plan?", time: "36m", status: "AI Handled", tone: "purple" },
    { name: "James Wilson", initials: "JW", intent: "Technical support", preview: "I'm having trouble integrating the API...", time: "1h", status: "Open", tone: "green" }
  ];
  const conversationMessages: Array<{ side: "agent" | "customer"; initials: string; text: string; time: string }> = isClearDbsActive ? [
    { side: "customer", initials: "PS", text: "Hi, I need an update on DBS-APP-28419. My employer needs it before Monday.", time: "10:31 AM" },
    { side: "agent", initials: "AI", text: "I can help with the visible application status. I can see it is at stage 4 review and there are no missing ID evidence flags.", time: "10:32 AM" },
    { side: "customer", initials: "PS", text: "Can you tell them it is urgent?", time: "10:33 AM" },
    { side: "agent", initials: "AI", text: "Yes. I am preparing a handoff for operations with the employer deadline and your case reference attached.", time: "10:34 AM" }
  ] : [
    { side: "customer", initials: "JC", text: "Hi, I'm checking order #ACM-12345. It was meant to arrive yesterday.", time: "10:31 AM" },
    { side: "agent", initials: "AI", text: "I can help. The order is marked shipped and the carrier scan shows a local delay.", time: "10:32 AM" },
    { side: "customer", initials: "JC", text: "Can someone send me the new delivery estimate?", time: "10:33 AM" },
    { side: "agent", initials: "AI", text: "Yes. I can send the updated estimate and attach the tracking link to this conversation.", time: "10:34 AM" }
  ];
  const customerProfileStats: Array<{ label: string; value: string; tone?: string }> = isClearDbsActive ? [
    { label: "Risk", value: "Low", tone: "green" },
    { label: "Cases", value: "2" },
    { label: "SLA", value: "Mon" }
  ] : [
    { label: "Sentiment", value: "Positive", tone: "green" },
    { label: "Orders", value: "8" },
    { label: "Since", value: "2025" }
  ];
  const customerDetails: Array<[string, string]> = isClearDbsActive ? [
    ["Application ID", "DBS-APP-28419"],
    ["Employer", "Little Oaks Care"],
    ["Check type", "Enhanced DBS"],
    ["Owner", "Operations"]
  ] : [
    ["Customer ID", "CUS-29481"],
    ["Order ID", "ACM-12345"],
    ["Plan", "Premium"],
    ["Owner", "Support"]
  ];
  const conversationInsights: Array<[string, string]> = isClearDbsActive ? [
    ["Intent", "DBS status"],
    ["Sentiment", "Neutral"],
    ["Outcome", "Escalated"],
    ["Confidence", "High"]
  ] : [
    ["Intent", "Order status"],
    ["Sentiment", "Positive"],
    ["Outcome", "Completed"],
    ["Confidence", "High"]
  ];
  const orderDetails: Array<[string, string]> = isClearDbsActive ? [
    ["Stage", "With DBS"],
    ["Submitted", "26 Jun"],
    ["Deadline", "Monday"],
    ["Next step", "Operations review"]
  ] : [
    ["Status", "Shipped"],
    ["Carrier", "DPD"],
    ["ETA", "Tomorrow"],
    ["Next step", "Send tracking"]
  ];
  const aiSuggestionGroups: Array<[string, number]> = isClearDbsActive ? [
    ["Send SLA update", 3],
    ["Escalate to operations", 1],
    ["Attach case summary", 2]
  ] : [
    ["Send tracking update", 4],
    ["Apply goodwill credit", 1],
    ["Create follow-up task", 2]
  ];
  type DashboardPage = (typeof dashboardPages)[keyof typeof dashboardPages];
  type DashboardChartBar = { label: string; value: number };
  type DashboardProgressBar = { label: string; value: number; percent: number };
  const hasChart = (page: DashboardPage): page is DashboardPage & { chart: DashboardChartBar[] } => "chart" in page;
  const hasBars = (page: DashboardPage): page is DashboardPage & { bars: DashboardProgressBar[] } => "bars" in page;
  const activeDashboardPage = activeRoute === "ai" ? null : dashboardPages[activeRoute];
  type OpsTone = "purple" | "blue" | "green" | "amber" | "slate" | "red";
  type OpsListItem = {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    meta: string;
    badge: string;
    tone: OpsTone;
  };
  type OpsKpi = {
    label: string;
    value: string;
    trend: string;
    tone: OpsTone;
    icon: string;
  };
  type OpsRow = {
    label: string;
    value: string;
    note?: string;
    badge?: string;
  };
  type OpsActivity = {
    time: string;
    title: string;
    detail: string;
    tag?: string;
  };
  type OpsBar = {
    label: string;
    value: string;
    percent: number;
  };
  type OpsSection = {
    title: string;
    description?: string;
    rows?: OpsRow[];
    activity?: OpsActivity[];
    bars?: OpsBar[];
    chips?: string[];
    table?: Array<[string, string]>;
  };
  type OpsPageConfig = {
    id: string;
    title: string;
    summary: string;
    actions: string[];
    searchPlaceholder: string;
    filters: Array<{ label: string; count: number }>;
    selectedItemId: string;
    listItems: OpsListItem[];
    onSelectItem?: (id: string) => void;
    addLabel: string;
    kpis: OpsKpi[];
    detail: {
      eyebrow: string;
      title: string;
      status: string;
      subtitle: string;
      description: string;
      actions: string[];
      stats: Array<{ label: string; value: string; detail: string }>;
      sections: OpsSection[];
    };
    side: OpsSection[];
    next: string[];
  };
  const metricTabById = (id: string) => metricsTabs.find((tab) => tab.id === id) || metricsTabs[0];
  const knowledgeMetricsTab = metricTabById("knowledge");
  const handoffsMetricsTab = metricTabById("handoffs");
  const systemsMetricsTab = metricTabById("systems");
  const overviewRows = (dashboardPages.metrics.items || []).map((item) => ({
    label: item.label,
    value: item.value,
    note: item.note
  }));
  const overviewActivity = liveActivityItems.map((item) => ({
    time: item.time,
    title: item.title,
    detail: item.detail,
    tag: item.type === "call" ? "Call" : "Chat"
  }));
  const overviewChannelBars = channelBreakdown.map((channel) => ({
    label: channel.label,
    value: channel.value.toLocaleString("en-GB"),
    percent: channel.percent
  }));
  const overviewTrendRows = metricChartPoints.map((point) => ({
    label: point.label,
    value: point.total.toLocaleString("en-GB"),
    note: `${point.calls} calls, ${point.chat} chats`
  }));
  const analyticsListItems = metricsTabs.map((tab) => ({
    id: tab.id,
    title: tab.label,
    subtitle: tab.status,
    detail: tab.summary,
    meta: tab.chartTotal || "Live section",
    badge: tab.status,
    tone: tab.status === "Review" || tab.status === "Tuning" ? "amber" as OpsTone : tab.id === "systems" ? "blue" as OpsTone : "purple" as OpsTone
  }));
  const analyticsBars = activeMetricsChart
    .filter((bar) => !bar.empty)
    .map((bar) => ({
      label: bar.label,
      value: bar.display || String(bar.value),
      percent: Math.min(100, Math.max(8, Math.round((bar.value / 200) * 100)))
    }));
  const knowledgeTimeline = (dashboardPages.knowledge.timeline || []).map((item, index) => ({
    id: `knowledge-${index}`,
    title: item.title,
    subtitle: item.time,
    detail: item.detail,
    meta: item.tag,
    badge: item.tag,
    tone: item.time === "High" ? "amber" as OpsTone : item.time === "Med" ? "blue" as OpsTone : "green" as OpsTone
  }));
  const knowledgeSourceRows = knowledgeMetricsTab.checks?.map((item) => ({
    label: item.label,
    value: item.value,
    note: item.note
  })) || [];
  const knowledgeActivity = integrationUsageByKey.knowledge.activity.map((item) => ({
    time: item.time,
    title: item.title,
    detail: item.detail,
    tag: item.tag
  }));
  const contactListItems: OpsListItem[] = isClearDbsActive ? [
    { id: "contact-priya", title: "Priya Shah", subtitle: "Applicant", detail: "Enhanced DBS status needs an employer-deadline update.", meta: "Due in 22m", badge: "SLA watch", tone: "amber" },
    { id: "contact-oaks", title: "Little Oaks Care", subtitle: "Employer account", detail: "Bulk application query waiting for operations context.", meta: "Owner ready", badge: "Open", tone: "purple" },
    { id: "contact-compliance", title: "Compliance review", subtitle: "Sensitive queue", detail: "Certificate wording needs approval before reply.", meta: "Senior owner", badge: "Review", tone: "red" },
    { id: "contact-audit", title: "Audit summary", subtitle: "Internal", detail: "Weekly pack has the latest handoffs and guardrail events.", meta: "Draft", badge: "Draft", tone: "slate" }
  ] : [
    { id: "contact-sarah", title: "Sarah Martinez", subtitle: "Billing contact", detail: "Duplicate charge needs finance owner approval.", meta: "Due in 22m", badge: "Due soon", tone: "amber" },
    { id: "contact-jessica", title: "Jessica Cooper", subtitle: "Customer", detail: "Delivery update can be sent with tracking context.", meta: "Ready", badge: "Open", tone: "purple" },
    { id: "contact-finance", title: "Finance owner", subtitle: "Internal", detail: "Refund exception queue has two pending approvals.", meta: "Assigned", badge: "Review", tone: "blue" },
    { id: "contact-support", title: "Support manager", subtitle: "Internal", detail: "Old handoffs can be closed after owner confirmation.", meta: "Today", badge: "Follow-up", tone: "green" }
  ];
  const contactActivity = (dashboardPages.handoffs.items || []).map((item, index) => ({
    time: index === 0 ? "Now" : index === 1 ? "12m" : "34m",
    title: item.label,
    detail: item.note,
    tag: item.value
  }));
  const handoffBars = handoffReasons.map((reason) => ({
    label: reason.label,
    value: String(reason.value),
    percent: reason.percent
  }));
  const billingListItems: OpsListItem[] = [
    { id: "billing-plan", title: "Plan and subscription", subtitle: completedLaunchDetails[0].value, detail: launchGateAllowed ? "Workspace is ready for the active launch plan." : "Workspace is in review until checks clear.", meta: launchGateAllowed ? "Ready" : "Review", badge: launchGateAllowed ? "Ready" : "Needs review", tone: launchGateAllowed ? "green" : "amber" },
    { id: "billing-invoice", title: "Invoice setup", subtitle: "Billing contact", detail: completedLaunchDetails[3].value === "Not provided" ? "Billing contact still needs to be confirmed." : `Use ${completedLaunchDetails[3].value} for billing checks.`, meta: "Setup", badge: "Pending", tone: "purple" },
    { id: "billing-usage", title: "Usage summary", subtitle: "Today", detail: `${liveMetrics.callsHandled} calls tracked with ${liveMetrics.handoffs} review items.`, meta: "Live", badge: "Usage", tone: "blue" },
    { id: "billing-proof", title: "Readiness check", subtitle: "Launch status", detail: launchGateAllowed ? "All critical checks are clear." : launchGateFixSummary, meta: `${launchGateScore}%`, badge: "Checks", tone: launchGateAllowed ? "green" : "red" }
  ];
  const billingRows = [
    { label: "Customer", value: completedLaunchDetails[0].value, note: "Billing account" },
    { label: "Business type", value: completedLaunchDetails[1].value, note: "Plan context" },
    { label: "Phone contact", value: completedLaunchDetails[3].value, note: "Billing and launch contact" },
    { label: "Readiness", value: `${launchGateScore}%`, note: launchGateAllowed ? "Ready for activation" : launchGateStatusDetail }
  ];
  const billingSystemRows = completedLaunchSystems.length
    ? completedLaunchSystems.map((system) => ({ label: system, value: "Submitted", note: "Included in scope" }))
    : [{ label: "Connected systems", value: "None submitted", note: "Confirm required systems before activation" }];
  const opsDashboardPages: Partial<Record<string, OpsPageConfig>> = {
    metrics: {
      id: "metrics",
      title: "Overview",
      summary: "Live volume, outcomes, channels, and items to review.",
      actions: ["Ask AI"],
      searchPlaceholder: "Search activity...",
      filters: [
        { label: "All", count: liveActivityItems.length },
        { label: "Calls", count: liveActivityItems.filter((item) => item.type === "call").length },
        { label: "Chats", count: liveActivityItems.filter((item) => item.type === "chat").length },
        { label: "Risks", count: liveMetrics.openRisks }
      ],
      selectedItemId: "overview-0",
      listItems: liveActivityItems.map((item, index) => ({
        id: `overview-${index}`,
        title: item.title,
        subtitle: item.type === "call" ? "Call" : "Chat",
        detail: item.detail,
        meta: item.time,
        badge: item.type === "call" ? "Call" : "Chat",
        tone: item.tone === "red" ? "red" : item.tone === "green" ? "green" : "blue"
      })),
      addLabel: "Open full activity",
      kpis: metricsDashboardKpis.map((metric) => ({
        label: metric.label,
        value: metric.display,
        trend: metric.trend,
        tone: metric.tone as OpsTone,
        icon: metric.icon
      })),
      detail: {
        eyebrow: "Live overview",
        title: dashboardPages.metrics.title,
        status: dashboardPages.metrics.status,
        subtitle: dashboardPages.metrics.primaryMeta,
        description: dashboardPages.metrics.summary,
        actions: ["Ask AI"],
        stats: dashboardPages.metrics.metrics.slice(0, 3),
        sections: [
          { title: "Conversation trend", description: "Daily totals by channel.", rows: overviewTrendRows },
          { title: "Channel mix", description: "Where customers contact the agent.", bars: overviewChannelBars }
        ]
      },
      side: [
        { title: "Attention items", rows: overviewRows },
        { title: "Top intents", rows: topIntents.slice(0, 3).map((intent) => ({ label: intent.label, value: `${intent.percent.toFixed(1)}%`, note: "Share of demand" })) }
      ],
      next: dashboardPages.metrics.next
    },
    analytics: {
      id: "analytics",
      title: "Analytics",
      summary: "Performance by outcome, voice, knowledge, safety, reviews, and systems.",
      actions: ["Export"],
      searchPlaceholder: "Search analytics sections...",
      filters: [
        { label: "All", count: metricsTabs.length },
        { label: "Quality", count: 3 },
        { label: "Risk", count: 2 },
        { label: "Systems", count: 1 }
      ],
      selectedItemId: activeMetricsTabData.id,
      listItems: analyticsListItems,
      onSelectItem: setActiveMetricsTab,
      addLabel: "View saved reports",
      kpis: activeMetricsTabData.metrics.map((metric, index) => ({
        label: metric.label,
        value: metric.value,
        trend: metric.detail,
        tone: index === 0 ? "purple" : index === 1 ? "blue" : index === 2 ? "green" : "amber",
        icon: metric.label.slice(0, 2)
      })),
      detail: {
        eyebrow: "Active analytics",
        title: activeMetricsTabData.title === "Production metrics" ? "Live metrics" : activeMetricsTabData.title,
        status: activeMetricsTabData.status,
        subtitle: activeMetricsTabData.primaryMeta,
        description: activeMetricsTabData.summary,
        actions: ["Export"],
        stats: activeMetricsTabData.metrics.slice(0, 3),
        sections: [
          { title: activeMetricsTabData.primaryTitle, description: activeMetricsTabData.chartTotal, bars: analyticsBars },
          { title: "Key takeaways", rows: [...activeMetricsTabData.items, ...(activeMetricsTabData.checks || [])].slice(0, 4).map((item) => ({ label: item.label, value: item.value, note: item.note })) }
        ]
      },
      side: [
        { title: "Current view", table: [["Section", activeMetricsTabData.label], ["Status", activeMetricsTabData.status], ["Total", activeMetricsTabData.chartTotal || "Live"]] },
        { title: "Systems to watch", rows: systemsMetricsTab.items.slice(0, 3).map((item) => ({ label: item.label, value: item.value, note: item.note })) }
      ],
      next: activeMetricsTabData.next
    },
    knowledge: {
      id: "knowledge",
      title: "Knowledge",
      summary: "Tracking coverage, stale sources, and trust-risk gaps.",
      actions: ["New source"],
      searchPlaceholder: "Search sources and gaps...",
      filters: [
        { label: "All", count: knowledgeTimeline.length },
        { label: "High", count: knowledgeTimeline.filter((item) => item.subtitle === "High").length },
        { label: "Needs source", count: knowledgeTimeline.filter((item) => item.badge === "Needs source").length },
        { label: "Drafts", count: liveMetrics.draftAnswers }
      ],
      selectedItemId: knowledgeTimeline[0]?.id || "knowledge",
      listItems: knowledgeTimeline,
      addLabel: "Add knowledge source",
      kpis: dashboardPages.knowledge.metrics.map((metric, index) => ({
        label: metric.label,
        value: metric.value,
        trend: metric.detail,
        tone: index === 0 ? "purple" : index === 1 ? "blue" : index === 2 ? "amber" : "green",
        icon: metric.label.slice(0, 2)
      })),
      detail: {
        eyebrow: "Answer quality",
        title: isClearDbsActive ? "DBS answers are sourced." : "Knowledge ready.",
        status: dashboardPages.knowledge.status,
        subtitle: dashboardPages.knowledge.primaryMeta,
        description: "Review answer gaps, stale sources, and draft updates in one place.",
        actions: ["Approve draft"],
        stats: knowledgeMetricsTab.metrics.slice(0, 3),
        sections: [
          { title: dashboardPages.knowledge.primaryTitle, description: "Answer gaps to review first.", activity: (dashboardPages.knowledge.timeline || []).map((item) => ({ time: item.time, title: item.title, detail: item.detail, tag: item.tag })) },
          { title: "Source health", rows: knowledgeSourceRows.slice(0, 4) }
        ]
      },
      side: [
        { title: "Source health", table: [["Sourced answers", `${liveMetrics.citationCoverage}%`], ["Missing info", String(liveMetrics.retrievalMisses)], ["Outdated sources", String(liveMetrics.staleSources)], ["Last sync", `${liveMetrics.knowledgeSyncMinutes}m ago`]] },
        { title: "Source activity", activity: knowledgeActivity.slice(0, 3) }
      ],
      next: dashboardPages.knowledge.next
    },
    handoffs: {
      id: "handoffs",
      title: "Follow-ups",
      summary: "See who needs a reply, owner, or review.",
      actions: ["New follow-up"],
      searchPlaceholder: "Search follow-ups...",
      filters: [
        { label: "All", count: contactListItems.length },
        { label: "Open", count: Math.max(1, liveMetrics.handoffs) },
        { label: "Due soon", count: liveMetrics.slaRisk },
        { label: "Resolved", count: 9 }
      ],
      selectedItemId: contactListItems[0].id,
      listItems: contactListItems,
      addLabel: "Create follow-up",
      kpis: dashboardPages.handoffs.metrics.map((metric, index) => ({
        label: metric.label,
        value: metric.value,
        trend: metric.detail,
        tone: index === 0 ? "purple" : index === 1 ? "amber" : index === 2 ? "blue" : "green",
        icon: metric.label.slice(0, 2)
      })),
      detail: {
        eyebrow: "Owner review",
        title: contactListItems[0].title,
        status: contactListItems[0].badge,
        subtitle: contactListItems[0].subtitle,
        description: contactListItems[0].detail,
        actions: ["Open thread"],
        stats: handoffsMetricsTab.metrics.slice(0, 3),
        sections: [
          { title: "Review reasons", description: "Why a person is needed.", bars: handoffBars },
          { title: "Current queue", activity: contactActivity },
          { title: "Review checks", rows: (handoffsMetricsTab.checks || []).slice(0, 3).map((item) => ({ label: item.label, value: item.value, note: item.note })) }
        ]
      },
      side: [
        { title: "Selected follow-up", table: [["Owner", user.name || user.email], ["Deadline risk", String(liveMetrics.slaRisk)], ["Avg transfer", `${liveMetrics.avgHandoffSeconds}s`]] },
        { title: "Reason mix", rows: dashboardPages.handoffs.items?.slice(0, 3).map((item) => ({ label: item.label, value: item.value, note: item.note })) || [] }
      ],
      next: dashboardPages.handoffs.next
    },
    launch: {
      id: "launch",
      title: "Launch & Billing",
      summary: "Plan, invoice, payment, and launch status in one view.",
      actions: ["Run checks"],
      searchPlaceholder: "Search billing records...",
      filters: [
        { label: "All", count: billingListItems.length },
        { label: "Ready", count: launchGateAllowed ? 2 : 0 },
        { label: "Pending", count: launchGateAllowed ? 1 : 3 },
        { label: "Usage", count: 1 }
      ],
      selectedItemId: billingListItems[0].id,
      listItems: billingListItems,
      addLabel: "Add billing note",
      kpis: [
        { label: "Readiness", value: `${launchGateScore}%`, trend: launchGateAllowed ? "Ready" : "90% required", tone: launchGateAllowed ? "green" : "amber", icon: "RD" },
        { label: "Tests passed", value: `${launchGateScenarioPassRate}%`, trend: "Customer tests", tone: "purple", icon: "TP" },
        { label: "Systems", value: `${launchGateConnectionScore}%`, trend: "Required tools", tone: "blue", icon: "SY" },
        { label: "Issues", value: String(launchGateCriticalFailures.length), trend: launchGateAllowed ? "None" : "Needs fixes", tone: launchGateAllowed ? "green" : "red", icon: "IS" }
      ],
      detail: {
        eyebrow: "Billing account",
        title: completedLaunchDetails[0].value,
        status: launchGateAllowed ? "Ready" : "Needs review",
        subtitle: completedLaunchDetails[1].value,
        description: launchGateAllowed ? "Billing is ready." : launchGateStatusDetail,
        actions: ["Run checks"],
        stats: [
          { label: "Submitted", value: activeProject.launchReport ? "Yes" : "Demo", detail: "Request record" },
          { label: "Systems", value: `${launchGateConnectionScore}%`, detail: "Required tools" },
          { label: "Safety", value: `${launchGateSafetyScore}%`, detail: "Rules tested" }
        ],
        sections: [
          { title: "Billing details", rows: billingRows },
          { title: "Included systems", rows: billingSystemRows },
          { title: "Launch checks", activity: launchGateFixItems.map((item, index) => ({ time: String(index + 1).padStart(2, "0"), title: item, detail: launchGateAllowed ? "Clear" : launchGateFixSummary, tag: launchGateAllowed ? "Clear" : "Fix" })) }
        ]
      },
      side: [
        { title: "Account fields", table: completedLaunchDetails.slice(0, 5).map((row) => [row.label, row.value]) },
        { title: "Selected scope", chips: completedLaunchCapabilities.length ? completedLaunchCapabilities : ["No capabilities submitted"] },
        { title: "Goals", chips: completedLaunchGoals.length ? completedLaunchGoals : ["No goals submitted"] }
      ],
      next: dashboardPages.launch.next
    }
  };
  const activeOpsPage = activeDashboardPage ? opsDashboardPages[activeRoute] : undefined;

  useEffect(() => {
    setLiveMetrics(createInitialLiveMetrics(activeProject));
    setWorkspaceAssistantCharts([]);
    setWorkspaceAssistantError("");
    setWorkspaceAssistantStatus("idle");
  }, [activeProject.id]);

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

    const history = assistantMessages;
    setAssistantMessages((current) => [
      ...current,
      { role: "user", content: prompt }
    ]);
    setAssistantInput("");
    setIsAssistantTyping(true);
    setWorkspaceAssistantStatus("loading");
    setWorkspaceAssistantError("");

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
      setAssistantMessages((current) => [
        ...current,
        { role: "agent", content: response.reply }
      ]);
      setWorkspaceAssistantStatus("idle");
    } catch (error) {
      const normalizedPrompt = prompt.toLowerCase();
      const reply = normalizedPrompt.includes("setup")
        ? "I can help finish setup. The fastest path is to confirm the business type, connect CRM or helpdesk, choose the handoff rules, then run the launch evaluation pack."
        : normalizedPrompt.includes("metric") || normalizedPrompt.includes("today")
          ? `Current workspace metrics show ${containmentRate}% of customers solved without staff, ${liveMetrics.callsHandled} customer calls handled, ${liveMetrics.handoffs} handoff${liveMetrics.handoffs === 1 ? "" : "s"} needing review, and ${latencySeconds}s voice response time.`
          : normalizedPrompt.includes("handoff")
            ? `There are ${liveMetrics.handoffs} handoff${liveMetrics.handoffs === 1 ? "" : "s"} needing owner review. The biggest areas are billing questions, sensitive cases, and deadline risk.`
            : "I can help with setup, metrics, calls, handoffs, knowledge gaps, workflow routing, integrations, launch reports, or agent tuning. Tell me the outcome you want and I will map the next steps.";

      setWorkspaceAssistantError(error instanceof Error ? error.message : "Workspace assistant is using offline fallback.");
      setAssistantMessages((current) => [
        ...current,
        { role: "agent", content: reply }
      ]);
      setWorkspaceAssistantStatus("error");
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const renderOpsSection = (section: OpsSection) => (
    <section className="completed-ops-card" key={section.title}>
      <header>
        <div>
          <h3>{section.title}</h3>
          {section.description ? <p>{section.description}</p> : null}
        </div>
      </header>

      {section.rows ? (
        <div className="completed-ops-rows">
          {section.rows.map((row) => (
            <article key={`${section.title}-${row.label}`}>
              <div>
                <strong>{row.label}</strong>
                {row.note ? <p>{row.note}</p> : null}
              </div>
              <span>{row.value}</span>
              {row.badge ? <b>{row.badge}</b> : null}
            </article>
          ))}
        </div>
      ) : null}

      {section.activity ? (
        <div className="completed-ops-activity">
          {section.activity.map((item) => (
            <article key={`${section.title}-${item.time}-${item.title}`}>
              <time>{item.time}</time>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              {item.tag ? <span>{item.tag}</span> : null}
            </article>
          ))}
        </div>
      ) : null}

      {section.bars ? (
        <div className="completed-ops-bars">
          {section.bars.map((bar) => (
            <article key={`${section.title}-${bar.label}`}>
              <div>
                <span>{bar.label}</span>
                <strong>{bar.value}</strong>
              </div>
              <i><b style={{ width: `${Math.min(100, Math.max(4, bar.percent))}%` }}></b></i>
            </article>
          ))}
        </div>
      ) : null}

      {section.table ? (
        <div className="completed-ops-table">
          {section.table.map(([label, value]) => (
            <p key={`${section.title}-${label}`}><span>{label}</span><strong>{value}</strong></p>
          ))}
        </div>
      ) : null}

      {section.chips ? (
        <div className="completed-ops-chip-list">
          {section.chips.map((chip) => <span key={`${section.title}-${chip}`}>{chip}</span>)}
        </div>
      ) : null}
    </section>
  );

  const renderOpsDashboardPage = (page: OpsPageConfig) => (
    <section className={`completed-ops-page completed-ops-${page.id}`} aria-label={page.title}>
      <header className="completed-ops-header">
        <div>
          <h2>{page.title}</h2>
          <p>{page.summary}</p>
        </div>
        <div className="completed-ops-actions">
          {page.actions.slice(0, 2).map((action, index) => (
            <button
              className={index === 0 ? "is-primary" : ""}
              type="button"
              key={action}
              onClick={action === "Ask AI" ? () => changeActiveRoute("ai") : action === "Run checks" ? runLaunchGateTests : undefined}
              disabled={action === "Run checks" && launchGateRunState === "running"}
            >
              <span aria-hidden="true">{action.startsWith("New") ? "+" : action === "Ask AI" ? "AI" : action.includes("Export") ? "EX" : action === "Run checks" ? "OK" : ""}</span>
              {action === "Run checks" && launchGateRunState === "running" ? "Checking" : action}
            </button>
          ))}
        </div>
      </header>

      <div className="completed-ops-kpi-grid" aria-label={`${page.title} metrics`}>
        {page.kpis.slice(0, 3).map((metric) => (
          <article className={`is-${metric.tone}`} key={`${page.id}-${metric.label}`}>
            <i aria-hidden="true">{metric.icon}</i>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.trend}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="completed-ops-workspace">
        <section className="completed-ops-list-panel" aria-label={`${page.title} list`}>
          <div className="completed-ops-list">
            {page.listItems.map((item) => (
              <button
                className={[
                  item.id === page.selectedItemId ? "is-active" : "",
                  `is-${item.tone}`
                ].filter(Boolean).join(" ")}
                type="button"
                key={item.id}
                onClick={page.onSelectItem ? () => page.onSelectItem?.(item.id) : undefined}
              >
                <span aria-hidden="true">{item.title.slice(0, 1)}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                  <p>{item.detail}</p>
                </div>
                <aside>
                  <b>{item.badge}</b>
                  <time>{item.meta}</time>
                </aside>
              </button>
            ))}
          </div>

          <button className="completed-ops-add" type="button">
            <span aria-hidden="true">+</span>
            {page.addLabel}
          </button>
        </section>

        <section className="completed-ops-detail" aria-label={`${page.detail.title} details`}>
          <header className="completed-ops-hero">
            <span className={`completed-ops-avatar is-${page.listItems.find((item) => item.id === page.selectedItemId)?.tone || "purple"}`} aria-hidden="true">
              {page.detail.title.slice(0, 1)}
              <i></i>
            </span>
            <div>
              <small>{page.detail.eyebrow}</small>
              <h3>{page.detail.title} <b>{page.detail.status}</b></h3>
              <em>{page.detail.subtitle}</em>
              <p>{page.detail.description}</p>
            </div>
            <nav aria-label={`${page.title} actions`}>
              {page.detail.actions.slice(0, 2).map((action, index) => (
                <button
                  className={index === 0 ? "is-primary" : ""}
                  type="button"
                  key={`${page.id}-${action}`}
                  onClick={action === "Ask AI" ? () => changeActiveRoute("ai") : action === "Run checks" ? runLaunchGateTests : undefined}
                  disabled={action === "Run checks" && launchGateRunState === "running"}
                >
                  {action === "Run checks" && launchGateRunState === "running" ? "Checking" : action}
                </button>
              ))}
            </nav>
          </header>

          {page.detail.sections.slice(0, 2).map(renderOpsSection)}
        </section>

        <aside className="completed-ops-side" aria-label={`${page.title} context`}>
          <section className="completed-ops-side-panel">
            {page.side.slice(0, 2).map(renderOpsSection)}
            <header>
              <div>
                <h3>Next</h3>
              </div>
            </header>
            <div className="completed-ops-next">
              {page.next.slice(0, 3).map((action, index) => (
                <button type="button" key={`${page.id}-next-${action}`}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  {action}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );

  return (
    <main className={`completed-dashboard ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`} aria-label="Completed onboarding dashboard">
      <aside className="completed-sidebar">
        <a className="completed-brand" href="/" aria-label="RelayClarity home">
          <img src={relayclarityLogoDarkUrl} alt="RelayClarity" />
        </a>

        <nav className="completed-thread-list completed-metrics-nav" aria-label="Dashboard routes">
          {metricsSidebarNav.map((item, index) => {
            const activeSidebarLabel =
              activeRoute === "metrics" ? "Overview" :
              activeRoute === "analytics" ? "Analytics" :
              activeRoute === "conversations" ? "Conversations" :
              activeRoute === "calls" ? "Calls" :
              activeRoute === "ai" ? "AI Chat" :
              activeRoute === "workflows" ? "AI Agents" :
              activeRoute === "knowledge" ? "Knowledge" :
              activeRoute === "handoffs" ? "Follow-ups" :
              activeRoute === "integrations" ? "Integrations" :
              activeRoute === "launch" ? "Launch & Billing" :
              "";
            const isActive = item.label === activeSidebarLabel;

            return (
              <button
                key={`${item.label}-${index}`}
                className={isActive ? "is-active" : ""}
                type="button"
                onClick={() => changeActiveRoute(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <i aria-hidden="true">{item.icon}</i>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          className={`completed-ai-chat-tab ${activeRoute === "ai" ? "is-active" : ""}`}
          type="button"
          onClick={() => changeActiveRoute("ai")}
          aria-label="Open AI Chat"
          title="AI Chat"
        >
          <strong>AI Chat</strong>
        </button>

        <button className="completed-account completed-metrics-account" type="button" onClick={onSignOut} aria-label="Sign out">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{workspaceInitial}</span>}
          <div>
            <strong>{user.name || user.email}</strong>
            <small>Admin</small>
          </div>
          <b aria-hidden="true">v</b>
        </button>

        {false ? <div hidden>
        {activeRoute === "metrics" ? (
          <>
            <button
              className="completed-metrics-company"
              type="button"
              onClick={() => setIsRouteMenuOpen((isOpen) => !isOpen)}
            >
              <span aria-hidden="true">✥</span>
              <strong>{activeProject.name}</strong>
              <b aria-hidden="true">⌄</b>
            </button>

            <nav className="completed-thread-list completed-metrics-nav" aria-label="Metrics dashboard routes">
              {metricsSidebarNav.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  className={item.label === "Overview" ? "is-active" : ""}
                  type="button"
                  onClick={() => changeActiveRoute(item.id)}
                >
                  <i aria-hidden="true">{item.icon}</i>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <section className="completed-metrics-assistant-card" aria-label="RelayClarity assistant">
              <span aria-hidden="true">✦</span>
              <strong>Your AI Assistant</strong>
              <p>Ask me anything about your conversations, agents or data.</p>
              <button type="button" onClick={() => changeActiveRoute("ai")}>Ask Clarity AI</button>
            </section>

            <button className="completed-account completed-metrics-account" type="button" onClick={onSignOut} aria-label="Sign out">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{workspaceInitial}</span>}
              <div>
                <strong>{user.name || user.email}</strong>
                <small>Admin</small>
              </div>
              <b aria-hidden="true">⌄</b>
            </button>
          </>
        ) : (
          <>
            <button
              className={`completed-launch-sidebar-card ${launchGateAllowed ? "is-ready" : "is-locked"}`}
              type="button"
              onClick={() => changeActiveRoute("launch")}
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
                  className={route.id === activeRoute ? "is-active" : ""}
                  type="button"
                  onClick={() => changeActiveRoute(route.id)}
                >
                  <span>{route.title}</span>
                  <small>{route.meta}</small>
                </button>
              ))}
            </nav>

            <div className="completed-sidebar-footer">
              <button className="completed-footer-link" type="button">Settings</button>
              <button className="completed-footer-link" type="button">Help</button>
              <button className="completed-account" type="button" onClick={onSignOut} aria-label="Sign out">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{workspaceInitial}</span>}
                <strong>{user.name || user.email}</strong>
              </button>
            </div>
          </>
        )}
        </div> : null}
      </aside>

      <section className="completed-main">
        <header className="completed-topbar">
          <button
            className="completed-sidebar-toggle"
            type="button"
            onClick={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={isSidebarCollapsed}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="completed-sidebar-toggle-icon" aria-hidden="true">
              <span></span>
              <span></span>
            </span>
          </button>
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
        </header>

        <div className={`completed-content ${activeDashboardPage ? "is-dashboard-page" : ""}`}>
          {activeDashboardPage ? (
            <section
              className={[
                "completed-route-page",
                activeRoute === "launch" ? "is-ops is-billing" : "",
                activeRoute === "metrics" ? "is-ops is-metrics" : "",
                activeRoute === "analytics" ? "is-ops is-analytics" : "",
                activeRoute === "knowledge" ? "is-ops is-knowledge" : "",
                activeRoute === "handoffs" ? "is-ops is-handoffs" : "",
                activeRoute === "conversations" ? "is-conversations" : "",
                activeRoute === "calls" ? "is-calls" : "",
                activeRoute === "workflows" ? "is-agents" : "",
                activeRoute === "integrations" ? "is-integrations" : ""
              ].filter(Boolean).join(" ")}
              aria-labelledby="completed-route-title"
            >
              <header className="completed-route-hero">
                <div>
                  <span>{activeDashboardPage.eyebrow}</span>
                  <h1 id="completed-route-title">{activeDashboardPage.title}</h1>
                  <p>{activeDashboardPage.summary}</p>
                </div>
                <strong>{activeDashboardPage.status}</strong>
              </header>

              {activeOpsPage ? (
                renderOpsDashboardPage(activeOpsPage)
              ) : activeRoute === "metrics" ? (
		                <section className="completed-metrics-studio" aria-label="Metrics overview">
                      <div className="completed-metrics-dashboard">
                        <header className="completed-metrics-dashboard-header">
                          <div>
                            <h2>Welcome back, {user.name?.split(" ")[0] || "there"}</h2>
                            <p>Here's what's happening with your AI customer service today.</p>
                          </div>
                          <div className="completed-metrics-header-actions">
                            <button type="button"><span aria-hidden="true">□</span> May 19 - May 25, 2026</button>
                            <button type="button"><span aria-hidden="true">▽</span> Filter</button>
                            <button className="is-primary" type="button"><span aria-hidden="true">+</span> New</button>
                          </div>
                        </header>

                        <div className="completed-metrics-kpi-grid" aria-label="Key metrics">
                          {metricsDashboardKpis.map((metric) => (
                            <article className={`is-${metric.tone}`} key={metric.label}>
                              <span aria-hidden="true">{metric.icon}</span>
                              <div>
                                <p>{metric.label}</p>
                                <strong>{metric.display}</strong>
                                <small>↗ {metric.trend} vs last 7 days</small>
                              </div>
                            </article>
                          ))}
                        </div>

                        {isClearDbsActive ? (
                          <section className="clear-dbs-command-plan" aria-label="Clear DBS real data visibility plan">
                            <header>
                              <div>
                                <span>Clear DBS project plan</span>
                                <h3>See every conversation, call, integration, handoff, and data source.</h3>
                              </div>
                              <strong>Live command centre</strong>
                            </header>
                            <div className="clear-dbs-plan-grid">
                              {clearDbsVisibilityPlan.map((item) => (
                                <article key={item.label}>
                                  <span>{item.label}</span>
                                  <strong>{item.value}</strong>
                                  <p>{item.detail}</p>
                                </article>
                              ))}
                            </div>
                            <div className="clear-dbs-data-grid">
                              <section>
                                <h4>Data feeds to surface</h4>
                                {clearDbsDataStreams.map((stream) => (
                                  <article key={stream.source}>
                                    <div>
                                      <strong>{stream.source}</strong>
                                      <p>{stream.detail}</p>
                                    </div>
                                    <span>{stream.status}</span>
                                  </article>
                                ))}
                              </section>
                              <section>
                                <h4>Audit requirements</h4>
                                {clearDbsAuditPlan.map((item, index) => (
                                  <p key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</p>
                                ))}
                              </section>
                            </div>
                          </section>
                        ) : null}

                        <div className="completed-metrics-main-grid">
                          <section className="completed-metrics-card completed-metrics-chart-card" aria-labelledby="completed-metrics-line-title">
                            <div className="completed-metrics-card-header">
                              <h3 id="completed-metrics-line-title">Conversations Over Time</h3>
                              <div className="completed-metrics-chart-legend" aria-label="Chart legend">
                                <span className="is-chat">Live Chat</span>
                                <span className="is-calls">Calls</span>
                                <span className="is-total">Total</span>
                              </div>
                              <button type="button">Daily <span aria-hidden="true">⌄</span></button>
                            </div>
                            <div className="completed-metrics-line-wrap">
                              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Conversation trend from May 19 to May 25">
                                <defs>
                                  <linearGradient id="completedMetricArea" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#0b5cff" stopOpacity="0.18" />
                                    <stop offset="100%" stopColor="#0b5cff" stopOpacity="0.02" />
                                  </linearGradient>
                                </defs>
                                {[0, 200, 400, 600, 800].map((tick) => {
                                  const y = chartPadY + chartInnerHeight - (tick / chartMax) * chartInnerHeight;
                                  return (
                                    <g key={tick}>
                                      <line x1={chartPadX} y1={y} x2={chartPadX + chartInnerWidth} y2={y} />
                                      <text x="0" y={y + 5}>{tick}</text>
                                    </g>
                                  );
                                })}
                                <path className="metric-area" d={metricChartArea} />
                                <path className="metric-line is-chat" d={metricChartPath("chat")} />
                                <path className="metric-line is-calls" d={metricChartPath("calls")} />
                                <path className="metric-line is-total" d={metricChartPath("total")} />
                                {metricChartPoints.map((point, index) => {
                                  const x = chartPadX + (index / (metricChartPoints.length - 1)) * chartInnerWidth;
                                  return (
                                    <g key={point.label}>
                                      <circle className="is-chat-dot" cx={x} cy={chartPadY + chartInnerHeight - (point.chat / chartMax) * chartInnerHeight} r="5" />
                                      <circle className="is-calls-dot" cx={x} cy={chartPadY + chartInnerHeight - (point.calls / chartMax) * chartInnerHeight} r="5" />
                                      <circle className="is-total-dot" cx={x} cy={chartPadY + chartInnerHeight - (point.total / chartMax) * chartInnerHeight} r="5" />
                                      <text className="metric-date" x={x} y={chartHeight - 2}>{point.label}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          </section>

                          <aside className="completed-metrics-card completed-live-activity-card" aria-labelledby="completed-live-activity-title">
                            <div className="completed-metrics-card-header">
                              <h3 id="completed-live-activity-title">Live Activity</h3>
                              <strong><span aria-hidden="true"></span> Live</strong>
                            </div>
                            <div className="completed-live-activity-list">
                              {liveActivityItems.map((item) => (
                                <article className={`is-${item.tone}`} key={`${item.title}-${item.time}`}>
                                  <span aria-hidden="true">{item.type === "call" ? "◜" : "□"}</span>
                                  <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.detail}</p>
                                  </div>
                                  <div className="completed-live-wave" aria-hidden="true">
                                    {Array.from({ length: 18 }, (_, index) => <i key={index}></i>)}
                                  </div>
                                  <time>{item.time}</time>
                                </article>
                              ))}
                            </div>
                            <button className="completed-metrics-card-action" type="button">View all activity <span aria-hidden="true">›</span></button>
                          </aside>
                        </div>

                        <div className="completed-metrics-bottom-grid">
                          <section className="completed-metrics-card completed-channel-card" aria-labelledby="completed-channel-title">
                            <h3 id="completed-channel-title">Conversations by Channel</h3>
                            <div className="completed-channel-content">
                              <div
                                className="completed-channel-donut"
                                style={{ background: "conic-gradient(#0b5cff 0 52%, #14b8a6 52% 85%, #2f80ed 85% 95%, #f2b705 95% 100%)" }}
                              >
                                <span><strong>2,562</strong>Total</span>
                              </div>
                              <div className="completed-channel-legend">
                                {channelBreakdown.map((channel) => (
                                  <article className={`is-${channel.tone}`} key={channel.label}>
                                    <span aria-hidden="true"></span>
                                    <div>
                                      <strong>{channel.label}</strong>
                                      <small>{channel.value.toLocaleString("en-GB")} ({channel.percent.toFixed(1)}%)</small>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </div>
                          </section>

                          <section className="completed-metrics-card completed-intents-card" aria-labelledby="completed-intents-title">
                            <div className="completed-metrics-card-header">
                              <h3 id="completed-intents-title">Top Intents</h3>
                              <span>% of Total</span>
                            </div>
                            <div className="completed-intent-list">
                              {topIntents.map((intent) => (
                                <article key={intent.label}>
                                  <div>
                                    <strong>{intent.label}</strong>
                                    <span>{intent.percent.toFixed(1)}%</span>
                                  </div>
                                  <i><b style={{ width: `${intent.percent * 3.2}%` }}></b></i>
                                </article>
                              ))}
                            </div>
                            <button className="completed-metrics-card-action" type="button">View all intents <span aria-hidden="true">›</span></button>
                          </section>

                          <section className="completed-metrics-card completed-performance-card" aria-labelledby="completed-performance-title">
                            <h3 id="completed-performance-title">AI Agent Performance</h3>
                            <div className="completed-performance-content">
                              <div
                                className="completed-performance-ring"
                                style={{ background: "conic-gradient(#14b8a6 0 87%, #e8f5ef 87% 100%)" }}
                              >
                                <span><strong>87%</strong>Overall Performance</span>
                              </div>
                              <div className="completed-performance-list">
                                {agentPerformance.map((item) => (
                                  <article key={item.label}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                  </article>
                                ))}
                              </div>
                            </div>
                            <button className="completed-metrics-card-action" type="button">View full performance <span aria-hidden="true">›</span></button>
                          </section>
                        </div>

                        <aside className="completed-metrics-insight">
                          <span aria-hidden="true">✦</span>
                          <div>
                            <strong>Clarity AI Insight</strong>
                            <p>{isClearDbsActive
                              ? "DBS status questions are the busiest intent today. Certificate dispute and barred-list eligibility questions are correctly moving to human review."
                              : "Your resolution rate has improved 6.3% this week. Customers are asking more about Order Status, so consider updating your knowledge base."}</p>
                          </div>
                          <button type="button">View Insights <span aria-hidden="true">⌄</span></button>
                        </aside>
                      </div>
		                </section>
	              ) : activeRoute === "analytics" ? (
		                <section className="completed-analytics-studio" aria-label="Analytics">
                      <header className="completed-metrics-dashboard-header">
                        <div>
                          <h2>Analytics</h2>
                          <p>Deep-dive performance across outcomes, voice, knowledge, safety, handoffs, and systems.</p>
                        </div>
                        <div className="completed-metrics-header-actions">
                          <button type="button"><span aria-hidden="true">□</span> May 19 - May 25, 2026</button>
                          <button type="button"><span aria-hidden="true">▽</span> Filter</button>
                          <button className="is-primary" type="button"><span aria-hidden="true">↧</span> Export report</button>
                        </div>
                      </header>

		                  <div className="completed-metrics-title-row">
		                    <div>
		                      <h2>Production metrics</h2>
		                      <p>Live workspace signals refresh every second while this agent is being set up, tested, and monitored.</p>
		                    </div>
		                    <strong><span aria-hidden="true"></span>{metricsStudioStatus}</strong>
		                  </div>

                    <div className="completed-metrics-tabs" role="tablist" aria-label="Metrics sections">
                      {metricsTabs.map((tab) => (
                        <button
                          className={tab.id === activeMetricsTabData.id ? "is-active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={tab.id === activeMetricsTabData.id}
                          onClick={() => setActiveMetricsTab(tab.id)}
                          key={tab.id}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

	                  <div className="completed-metrics-kpi-rail" aria-label={`${activeRouteData.title} metrics`}>
	                    {activeMetricsTabData.metrics.map((metric, index) => (
	                      <article className={index === 0 ? "is-primary" : ""} key={metric.label}>
	                        <div className="completed-kpi-icon" aria-hidden="true">
	                          {index === 0 ? "" : index === 1 ? "⌕" : index === 2 ? "ϟ" : index === 3 ? "☆" : "•"}
	                        </div>
	                        <span>{metric.label}</span>
	                        <strong>{metric.value}</strong>
                        <small>{metric.detail}</small>
                      </article>
                    ))}
                  </div>

                  <div className="completed-metrics-layout">
	                    <section className="completed-metrics-trend" aria-labelledby="completed-metrics-trend-title">
	                      <div className="completed-metrics-panel-heading">
	                        <div>
	                          <span>{activeMetricsTabData.primaryMeta}</span>
	                          <h2 id="completed-metrics-trend-title">{activeMetricsTabData.primaryTitle}</h2>
	                        </div>
	                        <strong>{activeMetricsTabData.chartTotal}</strong>
	                      </div>

                        <div className={`completed-metrics-visual is-${activeMetricsTabData.id}`} aria-label={activeMetricsTabData.primaryTitle}>
                          {activeMetricsTabData.id === "overview" ? (
                            <div className="completed-metrics-chart">
                              <div className="completed-metrics-chart-scale" aria-hidden="true">
                                <span>High</span>
                                <span>Med</span>
                                <span>Low</span>
                                <span>0</span>
                              </div>
                              {activeMetricsChart.map((bar, index) => (
                                <div className={`completed-metrics-chart-bar ${bar.empty ? "is-empty" : ""}`} key={`${bar.label}-${index}`}>
                                  <i style={{ height: `${bar.value}px` }}></i>
                                  <b>{bar.display || Math.round(bar.value / 5)}</b>
                                  <span>{bar.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : activeMetricsTabData.id === "outcomes" ? (
                            <div className="completed-outcome-visual">
                              <div className="completed-outcome-stack" aria-hidden="true">
                                {activeMetricsTabData.chart.slice(0, 4).map((bar) => (
                                  <i key={bar.label} style={{ width: `${Math.max(10, Math.min(58, bar.value / 3))}%` }}></i>
                                ))}
                              </div>
                              <div className="completed-outcome-grid">
                                {activeMetricsTabData.chart.map((bar) => (
                                  <article key={bar.label}>
                                    <strong>{bar.display}</strong>
                                    <span>{bar.label}</span>
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : activeMetricsTabData.id === "voice" ? (
                            <div className="completed-voice-visual">
                              <div className="completed-voice-line" aria-hidden="true">
                                {activeMetricsTabData.chart.map((bar) => (
                                  <i key={bar.label} style={{ height: `${Math.max(18, Math.min(96, bar.value / 2))}px` }}></i>
                                ))}
                              </div>
                              <div className="completed-voice-grid">
                                {activeMetricsTabData.chart.map((bar) => (
                                  <article key={bar.label}>
                                    <span>{bar.label}</span>
                                    <strong>{bar.display}</strong>
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : activeMetricsTabData.id === "knowledge" ? (
                            <div className="completed-knowledge-visual">
                              {activeMetricsTabData.items.map((item) => (
                                <article key={item.label}>
                                  <span>{item.value}</span>
                                  <div>
                                    <strong>{item.label}</strong>
                                    <p>{item.note}</p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : activeMetricsTabData.id === "safety" ? (
                            <div className="completed-safety-visual">
                              {activeMetricsTabData.metrics.map((metric) => (
                                <article key={metric.label}>
                                  <span>{metric.label}</span>
                                  <strong>{metric.value}</strong>
                                  <small>{metric.detail}</small>
                                </article>
                              ))}
                            </div>
                          ) : activeMetricsTabData.id === "handoffs" ? (
                            <div className="completed-handoff-visual">
                              {activeMetricsTabData.chart.map((bar) => (
                                <article key={bar.label}>
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
                              {activeMetricsTabData.items.map((item) => (
                                <article key={item.label}>
                                  <span>{item.label}</span>
                                  <strong>{item.value}</strong>
                                  <small>{item.note}</small>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="completed-demand-note">
                          <span aria-hidden="true">✦</span>
                          {activeMetricsTabData.items[0]?.label}: {activeMetricsTabData.items[0]?.note}
                        </div>
	                    </section>

	                    <aside className="completed-metrics-summary" aria-label="Health summary">
		                      <div className="completed-metrics-panel-heading">
		                        <div>
		                          <span>Operating checks</span>
		                          <h2>Key signals</h2>
		                        </div>
		                        <strong>{activeMetricsTabData.status}</strong>
	                      </div>

                        <div className="completed-metrics-health-list">
                          {(activeMetricsTabData.checks || activeMetricsTabData.items).map((item, index) => (
                            <article key={item.label}>
                              <i aria-hidden="true">{index === 0 ? "✧" : index === 1 ? "↱" : "⌘"}</i>
                              <span>{item.value}</span>
                              <div>
                                <strong>{item.label}</strong>
                                <p>{item.note}</p>
                              </div>
                              <b aria-hidden="true">›</b>
                            </article>
                          ))}
                        </div>

	                      <div className="completed-metrics-actions">
	                        <span>Next</span>
	                        {activeMetricsTabData.next.map((action) => (
	                          <button type="button" key={action}>{action}<span aria-hidden="true">›</span></button>
	                        ))}
	                      </div>
		                    </aside>
		                  </div>
		                </section>
	              ) : activeRoute === "launch" ? (
		                <section className="completed-engineer-handoff" aria-label="Engineer launch handoff">
		                  <header className="completed-handoff-hero">
		                    <div>
		                      <span>Launch request</span>
		                      <h2>Engineer handoff for {completedLaunchDetails[0].value}.</h2>
		                      <p>Everything submitted during setup is grouped here so engineering can connect production systems, verify routing, and prepare the go-live ticket.</p>
		                    </div>
		                    <div className="completed-handoff-score" aria-label={`Launch score ${launchGateScore}%`}>
		                      <strong>{launchGateRunState === "running" ? "Checking" : `${launchGateScore}%`}</strong>
		                      <small>{launchGateAllowed ? "Ready" : "Needs review"}</small>
		                    </div>
		                  </header>

		                  <div className="completed-handoff-metrics" aria-label="Launch request status">
		                    <article>
		                      <span>Submitted</span>
		                      <strong>{activeProject.launchReport ? "Yes" : "Demo"}</strong>
		                      <small>Request record</small>
		                    </article>
		                    <article>
		                      <span>Scenario pass</span>
		                      <strong>{launchGateScenarioPassRate}%</strong>
		                      <small>Test pack</small>
		                    </article>
		                    <article>
		                      <span>Connections</span>
		                      <strong>{launchGateConnectionScore}%</strong>
		                      <small>Required systems</small>
		                    </article>
		                    <article>
		                      <span>Blockers</span>
		                      <strong>{launchGateCriticalFailures.length}</strong>
		                      <small>{launchGateAllowed ? "None critical" : "Needs fixes"}</small>
		                    </article>
		                  </div>

		                  <div className="completed-handoff-grid">
		                    <section className="completed-handoff-panel">
		                      <div className="completed-handoff-panel-head">
		                        <span>Submitted details</span>
		                        <h3>Customer and production access</h3>
		                      </div>
		                      <div className="completed-handoff-detail-list">
		                        {completedLaunchDetails.map((row) => (
		                          <p key={row.label}>
		                            <span>{row.label}</span>
		                            <strong>{row.value}</strong>
		                          </p>
		                        ))}
		                      </div>
		                    </section>

		                    <section className="completed-handoff-panel">
		                      <div className="completed-handoff-panel-head">
		                        <span>Agent build</span>
		                        <h3>Behavior, knowledge, and handoff</h3>
		                      </div>
		                      <div className="completed-handoff-detail-list">
		                        {completedAgentDetails.map((row) => (
		                          <p key={row.label}>
		                            <span>{row.label}</span>
		                            <strong>{row.value}</strong>
		                          </p>
		                        ))}
		                      </div>
		                    </section>
		                  </div>

		                  <div className="completed-handoff-grid">
		                    <section className="completed-handoff-panel">
		                      <div className="completed-handoff-panel-head">
		                        <span>Capabilities</span>
		                        <h3>Selected scope</h3>
		                      </div>
		                      <div className="completed-handoff-chip-list">
		                        {(completedLaunchCapabilities.length ? completedLaunchCapabilities : ["No capabilities submitted"]).map((item) => (
		                          <span key={item}>{item}</span>
		                        ))}
		                      </div>
		                      <div className="completed-handoff-chip-list is-secondary">
		                        {(completedLaunchGoals.length ? completedLaunchGoals : ["No goals submitted"]).map((item) => (
		                          <span key={item}>{item}</span>
		                        ))}
		                      </div>
		                    </section>

		                    <section className="completed-handoff-panel">
		                      <div className="completed-handoff-panel-head">
		                        <span>Systems</span>
		                        <h3>Connected stack</h3>
		                      </div>
		                      <div className="completed-handoff-system-list">
		                        {(completedLaunchSystems.length ? completedLaunchSystems : ["No connected systems submitted"]).map((system) => (
		                          <article key={system}>
		                            <strong>{system}</strong>
		                            <small>{completedLaunchSystems.length ? "Submitted for production verification" : "Engineering should confirm required systems"}</small>
		                          </article>
		                        ))}
		                      </div>
		                    </section>
		                  </div>

		                  <section className="completed-handoff-panel">
		                    <div className="completed-handoff-panel-head">
		                      <span>Engineer plan</span>
		                      <h3>Next implementation actions</h3>
		                    </div>
		                    <ol className="completed-handoff-action-list">
		                      {completedLaunchActions.map((action) => (
		                        <li key={action}>{action}</li>
		                      ))}
		                    </ol>
		                  </section>

		                  <section className="completed-handoff-panel">
		                    <div className="completed-handoff-panel-head">
		                      <span>Evaluation and launch gate</span>
		                      <h3>{launchGateStatus}</h3>
		                    </div>
		                    <p className="completed-handoff-note">{launchGateStatusDetail}</p>
		                    <div className="completed-handoff-system-list">
		                      {launchGateFixItems.map((item) => (
		                        <article className={launchGateAllowed ? "is-clear" : "is-blocked"} key={item}>
		                          <strong>{item}</strong>
		                          <small>{launchGateAllowed ? "Clear" : launchGateFixSummary}</small>
		                        </article>
		                      ))}
		                    </div>
		                    <button className="completed-handoff-test-button" type="button" onClick={runLaunchGateTests} disabled={launchGateRunState === "running"}>
		                      {launchGateRunState === "running" ? "Checking launch gate" : "Run launch gate again"}
		                    </button>
		                  </section>

		                  {activeProject.launchReport ? (
		                    <details className="completed-handoff-report">
		                      <summary>Raw launch report</summary>
		                      <pre>{activeProject.launchReport}</pre>
		                    </details>
		                  ) : null}
		                </section>
	              ) : activeRoute === "calls" ? (
                  <section className="completed-calls-dashboard" aria-label="Calls dashboard">
                    <div className="completed-calls-workspace">
                      <section className="completed-calls-list-panel" aria-label="Call queue">
                        <header className="completed-calls-panel-head">
                          <div>
                            <h2>Calls</h2>
                            <p>Live queue and recent outcomes.</p>
                          </div>
                          <button className="is-new" type="button" aria-label="Create a new call task" title="Create a new call task" onClick={startNewCallTask}>+</button>
                        </header>
                        <div className="completed-calls-search-row">
                          <label>
                            <span aria-hidden="true"></span>
                            <input
                              type="search"
                              value={callsSearch}
                              onChange={(event) => {
                                setCallsSearch(event.target.value);
                                setCallsPage(0);
                              }}
                              aria-label="Search calls"
                              placeholder="Search calls or numbers..."
                            />
                          </label>
                          <button
                            type="button"
                            aria-label="Reset call filters"
                            title="Reset call filters"
                            onClick={() => {
                              setCallsSearch("");
                              setCallsFilter("All Calls");
                              setCallsPage(0);
                            }}
                            disabled={!callsSearch && callsFilter === "All Calls"}
                          >
                            <span aria-hidden="true"></span>
                          </button>
                        </div>
                        <div className="completed-calls-tabs" role="tablist" aria-label="Call filters">
                          {callFilters.map((filter) => {
                            const count = !filter.statuses
                              ? callsQueue.length
                              : callsQueue.filter((call) => filter.statuses?.includes(call.status)).length;
                            const isActive = filter.id === callsFilter;
                            return (
                              <button
                                className={isActive ? "is-active" : ""}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                key={filter.id}
                                onClick={() => setCallFilterAndSelection(filter)}
                              >
                                {filter.label}<b>{count}</b>
                              </button>
                            );
                          })}
                        </div>
                        <div className="completed-calls-queue">
                          {pagedVisibleCalls.length === 0 ? (
                            <p className="completed-calls-empty">No calls match. Try another search or filter.</p>
                          ) : pagedVisibleCalls.map((call) => (
                            <button
                              className={call.id === activeCall.id ? "is-active" : ""}
                              type="button"
                              key={call.id}
                              onClick={() => {
                                setActiveCallId(call.id);
                                setCallAskDraft("");
                                setActiveCallTab("Transcript");
                                setIsTranscriptCollapsed(false);
                              }}
                            >
                              <i className={`is-${call.tone}`} aria-hidden="true"></i>
                              <div>
                                <strong>{call.name}<span aria-hidden="true"></span></strong>
                                <small>{call.phone}</small>
                                <b>{call.badge}</b>
                              </div>
                              <aside className={`is-${call.status.toLowerCase().replaceAll(" ", "-")}`}>
                                <span>{call.status}</span>
                                <time>{call.time}</time>
                              </aside>
                            </button>
                          ))}
                        </div>
                        <footer className="completed-calls-pagination">
                          <span>
                            {visibleCalls.length === 0
                              ? "0 of 0"
                              : `${normalizedCallsPage * callsPageSize + 1}-${Math.min(visibleCalls.length, normalizedCallsPage * callsPageSize + pagedVisibleCalls.length)} of ${visibleCalls.length}`}
                          </span>
                          <div>
                            <button type="button" aria-label="Previous calls" onClick={() => setCallsPage((page) => Math.max(0, page - 1))} disabled={normalizedCallsPage === 0}>{"<"}</button>
                            <button type="button" aria-label="Next calls" onClick={() => setCallsPage((page) => Math.min(callsPageCount - 1, page + 1))} disabled={normalizedCallsPage >= callsPageCount - 1}>{">"}</button>
                          </div>
                        </footer>
                      </section>

                      <section className="completed-calls-live-panel" aria-label="Active call">
                        <header className="completed-active-call-card">
                          <div className="completed-active-avatar" aria-hidden="true"></div>
                          <div>
                            <strong>{activeCall.name} <span></span> <small>{activeCall.status === "Live" ? "Live Call" : activeCall.status}</small></strong>
                            <p>{activeCall.phone} <b>{"*"}</b> {selectedCallReference}</p>
                          </div>
                          <time>{activeCall.time}</time>
                          <button className="is-hangup" type="button" aria-label="End call" onClick={endActiveCall}></button>
                          <nav aria-label="Call controls">
                            <button className={activeCallIsHeld ? "is-on" : ""} type="button" aria-pressed={activeCallIsHeld} onClick={() => toggleActiveCallFlag("hold")}>
                              {activeCallIsHeld ? "Resume" : "Hold"}
                            </button>
                            <button className={activeCallIsMuted ? "is-on" : ""} type="button" aria-pressed={activeCallIsMuted} onClick={() => toggleActiveCallFlag("mute")}>
                              {activeCallIsMuted ? "Unmute" : "Mute"}
                            </button>
                            <button type="button" onClick={transferActiveCall}>Transfer</button>
                          </nav>
                        </header>

                        <section className="completed-live-transcript" aria-label="Live transcript">
                          <header>
                            <h3>Live Transcript</h3>
                            <div>
                              <span>{activeCall.status === "Live" ? "Live" : activeCall.status}</span>
                              <i aria-hidden="true"></i>
                              <button type="button" aria-label={isTranscriptCollapsed ? "Expand transcript" : "Collapse transcript"} onClick={() => setIsTranscriptCollapsed((isCollapsed) => !isCollapsed)}>{isTranscriptCollapsed ? "v" : "^"}</button>
                            </div>
                          </header>
                          <div className="completed-transcript-turns">
                            {isTranscriptCollapsed ? (
                              <p className="completed-calls-empty">Transcript collapsed.</p>
                            ) : selectedCallTranscript.map((turn) => (
                              <article className={`is-${turn.tone}`} key={`${turn.speaker}-${turn.time}`}>
                                <span>{turn.initials}</span>
                                <div>
                                  <strong>{turn.speaker} <time>{turn.time}</time></strong>
                                  {turn.text.split("\n").map((line) => <p key={line}>{line}</p>)}
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>

                        <section className="completed-call-assistant" aria-label="AI call assistant">
                          <nav role="tablist" aria-label="Call notes">
                            {(["Transcript", "Notes", "Summary"] as const).map((item) => (
                              <button
                                className={item === activeCallTab ? "is-active" : ""}
                                type="button"
                                role="tab"
                                aria-selected={item === activeCallTab}
                                key={item}
                                onClick={() => setActiveCallTab(item)}
                              >
                                {item}
                              </button>
                            ))}
                          </nav>
                          <article>
                            <h3>{activeCallTab === "Notes" ? "Call notes" : activeCallTab === "Summary" ? "Wrap-up summary" : "Recommended next step"}</h3>
                            <div className="completed-call-summary-grid">
                              <section>
                                <strong>{activeCallTab === "Notes" ? "Operator Notes" : activeCallTab === "Summary" ? "Final Summary" : "Live Call Summary"}</strong>
                                {activeCallTab === "Notes" ? (
                                  <div className="completed-call-note-stack">
                                    <p>{activeCallOutcome || "No saved action yet."}</p>
                                    {activeCallIsHeld ? <p>Call is on hold.</p> : null}
                                    {activeCallIsMuted ? <p>Microphone is muted.</p> : null}
                                  </div>
                                ) : (
                                  <ul>
                                    {selectedCallSummary.map((item) => <li key={item}>{item}</li>)}
                                  </ul>
                                )}
                              </section>
                              <section>
                                <strong>{activeCallTab === "Summary" ? "Saved Outcome" : "Suggested Actions"}</strong>
                                <ul>
                                  {(activeCallTab === "Summary" && activeCallOutcome ? [activeCallOutcome] : selectedCallActions).map((item) => <li key={item}>{item}</li>)}
                                </ul>
                                <button type="button" onClick={applyCallSuggestion} disabled={activeCallSuggestionApplied}>
                                  <span aria-hidden="true">+</span> {activeCallSuggestionApplied ? "Saved" : "Save suggested action"}
                                </button>
                              </section>
                            </div>
                            {activeCallAssistantMessages.length ? (
                              <div className="completed-call-ai-thread" aria-label="AI answers about this call">
                                {activeCallAssistantMessages.map((message) => (
                                  <p className={`is-${message.role}`} key={message.id}>
                                    <strong>{message.role === "ai" ? "AI" : "You"} <time>{message.time}</time></strong>
                                    <span>{message.text}</span>
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        </section>

                        <form className="completed-call-ask" onSubmit={submitCallAsk}>
                          <input
                            type="text"
                            value={callAskDraft}
                            onChange={(event) => setCallAskDraft(event.target.value)}
                            placeholder="Ask about this call..."
                            aria-label="Ask about this call"
                          />
                          <button type="submit" aria-label="Send question" disabled={!callAskDraft.trim()}>{">"}</button>
                        </form>
                      </section>

                      <aside className="completed-calls-side-panel" aria-label="Caller intelligence">
                        <section className="completed-caller-card">
                          <header><h3>Caller</h3></header>
                          <div className="completed-caller-person">
                            <span>{activeCall.initials}</span>
                            <div>
                              <strong>{activeCall.name} <b>{isClearDbsActive ? "SLA" : "VIP"}</b></strong>
                              <small>{selectedCallerEmail}</small>
                              <small>{activeCall.phone}</small>
                              <small>{selectedCallerLocation}</small>
                            </div>
                          </div>
                          <div className="completed-caller-stats">
                            {selectedCallsProfileStats.map((stat) => (
                              <article className={stat.tone ? `is-${stat.tone}` : ""} key={stat.label}>
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                              </article>
                            ))}
                          </div>
                        </section>
                        <section className="completed-caller-card">
                          <h3>Details</h3>
                          <div className="completed-caller-table">
                            {selectedCallsDetails.slice(0, 4).map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}
                          </div>
                        </section>
                        <section className="completed-caller-card">
                          <h3>Insights</h3>
                          <div className="completed-caller-table">
                            {selectedCallsAiInsights.slice(0, 4).map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}
                          </div>
                        </section>
                        <section className="completed-caller-card">
                          <header><h3>Team</h3><span className="completed-team-online">Online</span></header>
                          <div className="completed-team-list">
                            {callsTeamStatus.slice(0, 3).map((member) => (
                              <article key={member.name}>
                                <span className={`is-${member.tone}`}>{member.name.slice(0, 1)}</span>
                                <strong>{member.name}</strong>
                                <small>{member.status}</small>
                              </article>
                            ))}
                          </div>
                        </section>
                      </aside>
                    </div>
                  </section>
	              ) : activeRoute === "conversations" ? (
                    <section className="completed-conversations-page" aria-label="Conversations">
                      <div className="completed-conversations-shell">
                        <aside className="completed-inbox-panel" aria-label="Conversation inbox">
                          <div className="completed-inbox-search">
                            <label>
                              <span aria-hidden="true">⌕</span>
                              <input
                                type="search"
                                value={inboxSearch}
                                onChange={(event) => setInboxSearch(event.target.value)}
                                aria-label="Search conversations"
                                placeholder="Search conversations..."
                              />
                            </label>
                            <button className="is-new" type="button" aria-label="Start a new conversation" title="Start a new conversation" onClick={startNewInboxChat}>+</button>
                          </div>
                          <div className="completed-inbox-filters" aria-label="Conversation filters">
                            {inboxStatusFilters.map((filter) => {
                              const count = !filter.statuses
                                ? inboxThreads.length
                                : inboxThreads.filter((thread) => filter.statuses?.includes(thread.status)).length;
                              return (
                                <button
                                  className={filter.id === inboxFilter ? "is-active" : ""}
                                  type="button"
                                  key={filter.id}
                                  onClick={() => setInboxFilter(filter.id)}
                                >
                                  {filter.label}<span>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="completed-inbox-list">
                            {visibleInboxThreads.length === 0 ? (
                              <p className="completed-inbox-empty">No conversations match. Try a different search or filter.</p>
                            ) : visibleInboxThreads.map((thread) => (
                              <button
                                className={thread.id === activeInboxThread?.id ? "is-active" : ""}
                                type="button"
                                key={thread.id}
                                onClick={() => openInboxThread(thread.id)}
                              >
                                <span className={`completed-conversation-avatar is-${thread.tone}`}>{thread.initials}</span>
                                <div>
                                  <strong>{thread.starred ? "★ " : ""}{thread.name}<i aria-hidden="true"></i></strong>
                                  <small>{thread.intent}</small>
                                  <p>{(thread.messages.find((message) => message.side === "customer")?.text || "No messages yet").split("\n")[0]}</p>
                                </div>
                                <time>{thread.time}</time>
                                <b className={`is-${thread.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{inboxStatusLabel(thread.status)}</b>
                              </button>
                            ))}
                          </div>
                          <footer className="completed-inbox-footer">
                            <span>{visibleInboxThreads.length} of {inboxThreads.length} conversations</span>
                          </footer>
                        </aside>

                        {activeInboxThread ? (
                        <section className="completed-chat-panel" aria-label={`Conversation with ${activeInboxThread.name}`}>
                          <header className="completed-chat-header">
                            <div>
                              <h3>{activeInboxThread.name} <span aria-hidden="true"></span> <b className={activeInboxThread.status === "Resolved" ? "is-muted" : ""}>{inboxStatusLabel(activeInboxThread.status)}</b></h3>
                              <p>Live chat · {activeInboxThread.intent} · {activeInboxThread.joined ? "You're in this chat" : "AI is handling it"}</p>
                            </div>
                            <div>
                              <button
                                type="button"
                                className={activeInboxThread.starred ? "is-starred" : ""}
                                aria-label={activeInboxThread.starred ? "Unstar conversation" : "Star conversation"}
                                aria-pressed={activeInboxThread.starred}
                                title={activeInboxThread.starred ? "Unstar" : "Star"}
                                onClick={() => toggleInboxStar(activeInboxThread.id)}
                              >
                                {activeInboxThread.starred ? "★" : "☆"}
                              </button>
                              {!activeInboxThread.joined ? (
                                <button className="is-join" type="button" onClick={() => joinInboxChat(activeInboxThread.id)}>
                                  Take over chat
                                </button>
                              ) : null}
                            </div>
                          </header>
                          <div className="completed-chat-thread" ref={inboxThreadRef}>
                            <time>Today</time>
                            {activeInboxThread.messages.length === 0 ? (
                              <p className="completed-thread-empty">No messages yet - say hello below.</p>
                            ) : null}
                            {activeInboxThread.messages.map((message) => (
                              message.side === "system" ? (
                                <div className="completed-chat-system" key={message.id}><span>{message.text} · {message.time}</span></div>
                              ) : (
                                <article className={`is-${message.side}`} key={message.id}>
                                  <span>{message.initials}</span>
                                  <div>
                                    {message.side === "note" ? <b className="completed-note-label">Private note</b> : null}
                                    {message.text.split("\n").map((line, index) => (
                                      line ? <p key={`${line}-${index}`}>{line}</p> : <br key={index} />
                                    ))}
                                    <small>{message.side === "human" || message.side === "note" ? `${message.author} · ${message.time}` : message.time}</small>
                                  </div>
                                </article>
                              )
                            ))}
                          </div>
                          <footer className="completed-reply-panel">
                            <nav aria-label="Reply tools">
                              <button className={inboxComposerMode === "reply" ? "is-active" : ""} type="button" onClick={() => setInboxComposerMode("reply")}>Reply</button>
                              <button className={inboxComposerMode === "note" ? "is-active" : ""} type="button" onClick={() => setInboxComposerMode("note")}>Private note</button>
                            </nav>
                            <textarea
                              value={inboxDraft}
                              onChange={(event) => setInboxDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  sendInboxMessage();
                                }
                              }}
                              aria-label={inboxComposerMode === "note" ? "Write a private note" : "Write a reply"}
                              placeholder={inboxComposerMode === "note" ? "Private note..." : "Write a reply..."}
                            />
                            <div>
                              <button type="button" onClick={() => insertInboxSuggestion(activeInboxThread.suggestedReplies[0] || "")} disabled={!activeInboxThread.suggestedReplies.length}>Use AI reply</button>
                              <button className="is-primary" type="button" onClick={sendInboxMessage} disabled={!inboxDraft.trim()}>
                                {inboxComposerMode === "note" ? "Add note" : "Send"}
                              </button>
                            </div>
                          </footer>
                        </section>
                        ) : null}

                        {activeInboxThread ? (
                        <aside className="completed-customer-panel" aria-label="Customer details">
                          <section className="completed-side-card completed-profile-card">
                            <div className="completed-profile-head">
                              <span>{activeInboxThread.initials}</span>
                              <div>
                                <strong>{activeInboxThread.name}</strong>
                                <small>{activeInboxThread.email}</small>
                                <small>{activeInboxThread.phone}</small>
                              </div>
                            </div>
                            {showInboxCustomerFacts ? (
                              <div className="completed-detail-table">
                                {activeInboxThread.facts.map(([label, value]) => (
                                  <p key={label}><span>{label}</span><strong>{value}</strong></p>
                                ))}
                              </div>
                            ) : null}
                            <button className="completed-side-link" type="button" onClick={() => setShowInboxCustomerFacts((isOpen) => !isOpen)}>
                              {showInboxCustomerFacts ? "Hide details" : "More details"} <span>{showInboxCustomerFacts ? "⌃" : "⌄"}</span>
                            </button>
                          </section>

                          <section className="completed-side-card">
                            <h3>This chat</h3>
                            <div className="completed-detail-table">
                              <p><span>Topic</span><strong>{activeInboxThread.intent}</strong></p>
                              <p><span>Customer mood</span><strong className={activeInboxThread.mood === "Positive" ? "is-green" : ""}>{activeInboxThread.mood}</strong></p>
                              <p><span>Handled by</span><strong>{activeInboxThread.joined ? `${operatorName} (you)` : "Clarity AI"}</strong></p>
                            </div>
                            <div className="completed-chat-quick-actions">
                              {activeInboxThread.status === "Resolved" ? (
                                <button type="button" onClick={() => reopenInboxChat(activeInboxThread.id)}>Reopen chat</button>
                              ) : (
                                <button className="is-solve" type="button" onClick={() => resolveInboxChat(activeInboxThread.id)}> Mark solved</button>
                              )}
                              <button type="button" onClick={() => escalateInboxChat(activeInboxThread.id)} disabled={activeInboxThread.status === "Needs Review"}>
                                {activeInboxThread.status === "Needs Review" ? "With the team" : "Escalate to teammate"}
                              </button>
                            </div>
                          </section>

                          <section className="completed-side-card completed-ai-suggestions">
                            <header className="completed-ai-suggestions-header">
                              <div>
                                <h3>Suggested replies</h3>
                                <p>Tap to insert.</p>
                              </div>
                              <span>AI</span>
                            </header>
                            <div className="completed-suggestion-list">
                              {activeInboxThread.suggestedReplies.map((reply, index) => (
                                <button className="completed-suggested-reply" type="button" key={reply.slice(0, 24)} onClick={() => insertInboxSuggestion(reply)}>
                                  <small>Reply {index + 1}</small>
                                  <span>{reply}</span>
                                </button>
                              ))}
                            </div>
                            {activeInboxThread.article ? (
                              <button
                                className="completed-suggested-article"
                                type="button"
                                onClick={() => insertInboxSuggestion(`This guide should help: "${activeInboxThread.article?.title}" - I've linked it here for you.`)}
                              >
                                <span>
                                  <small>Help article</small>
                                  <strong>{activeInboxThread.article.title}</strong>
                                  <em>{activeInboxThread.article.note}</em>
                                </span>
                                <b>Share</b>
                              </button>
                            ) : null}
                          </section>
                        </aside>
                        ) : null}
                      </div>
                    </section>
	              ) : activeRoute === "workflows" ? (
                    <section className="completed-agents-page" aria-label="AI agents">
                      <header className="completed-agents-header">
                        <div>
                          <h2>AI Agents</h2>
                          <p>Manage agents handling customer conversations.</p>
                        </div>
                        <div className="completed-agents-actions">
                          <button type="button"><span className="completed-action-icon is-filter" aria-hidden="true"></span> Filter</button>
                          <button type="button"><span aria-hidden="true">Run</span> Run tests</button>
                          <button className="is-primary" type="button"><span className="completed-action-icon is-plus" aria-hidden="true"></span> New Agent</button>
                        </div>
                      </header>

                      <div className="completed-agents-kpi-grid" aria-label="Agent metrics">
                        {aiAgentsKpis.slice(0, 3).map((metric) => (
                          <article className={`is-${metric.tone}`} key={metric.label}>
                            <i className={`is-${metric.icon}`} aria-hidden="true"></i>
                            <div>
                              <span>{metric.label}</span>
                              <strong>{metric.value}</strong>
                              <small>{metric.trend}</small>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="completed-agents-workspace">
                        <section className="completed-agents-roster" aria-label="Agent roster">
                          <div className="completed-agents-search">
                            <label>
                              <span aria-hidden="true">⌕</span>
                              <input type="search" value="" readOnly aria-label="Search agents" placeholder="Search agents..." />
                            </label>
                          </div>
                          <div className="completed-agents-tabs" role="tablist" aria-label="Agent status filter">
                            {aiAgentFilters.map((filter) => (
                              <button
                                className={filter.label === aiAgentFilter ? "is-active" : ""}
                                type="button"
                                role="tab"
                                aria-selected={filter.label === aiAgentFilter}
                                onClick={() => setAiAgentFilter(filter.label)}
                                key={filter.label}
                              >
                                {filter.label}<b>{filter.count}</b>
                              </button>
                            ))}
                          </div>
                          <div className="completed-agents-list">
                            {visibleAiAgents.map((agent) => (
                              <button
                                className={[
                                  agent.id === selectedAiAgent.id ? "is-active" : "",
                                  `is-${agent.tone}`
                                ].filter(Boolean).join(" ")}
                                type="button"
                                onClick={() => setSelectedAiAgentId(agent.id)}
                                key={agent.id}
                              >
                                <span className="completed-agent-avatar" aria-hidden="true">{agent.name.slice(0, 1)}<i></i></span>
                                <div>
                                  <strong>{agent.name}</strong>
                                  <small>{agent.role}</small>
                                  <p>{agent.headline}</p>
                                </div>
                                <aside>
                                  <b className={`is-${agent.tone}`}>{agent.status}</b>
                                  <span>{agent.channels.join(" · ")}</span>
                                </aside>
                              </button>
                            ))}
                          </div>
                          <button className="completed-agents-add" type="button">
                            <span aria-hidden="true">+</span>
                            Create new agent
                          </button>
                        </section>

                        <section className="completed-agent-detail" aria-label={`${selectedAiAgent.name} details`}>
                          <header className="completed-agent-hero">
                            <span className={`completed-agent-avatar is-large is-${selectedAiAgent.tone}`} aria-hidden="true">{selectedAiAgent.name.slice(0, 1)}<i></i></span>
                            <div>
                              <h3>{selectedAiAgent.name} <b className={`is-${selectedAiAgent.tone}`}>{selectedAiAgent.status}</b></h3>
                              <small>{selectedAiAgent.role} · {selectedAiAgent.channels.join(" & ")}</small>
                              <p>{selectedAiAgent.description}</p>
                            </div>
                            <nav aria-label="Agent actions">
                              <button type="button">{selectedAiAgent.status === "Live" ? "Pause" : selectedAiAgent.status === "Paused" ? "Resume" : "Publish"}</button>
                              <button type="button">Test agent</button>
                              <button className="is-primary" type="button">Edit agent</button>
                            </nav>
                          </header>

                          <div className="completed-agent-stats" aria-label={`${selectedAiAgent.name} performance`}>
                            {selectedAiAgent.stats.map((stat) => (
                              <article key={stat.label}>
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                                <small>{stat.detail}</small>
                              </article>
                            ))}
                          </div>

                          <section className="completed-agent-card" aria-label="Routing map">
                            <header>
                              <h3>Routing map</h3>
                              <p>Where {selectedAiAgent.name} sends each customer intent.</p>
                            </header>
                            <div className="completed-agent-routing">
                              {selectedAiAgent.routing.map((route) => (
                                <article key={route.label}>
                                  <strong>{route.label}</strong>
                                  <i aria-hidden="true">→</i>
                                  <b>{route.dest}</b>
                                  <p>{route.note}</p>
                                </article>
                              ))}
                            </div>
                          </section>

                          <section className="completed-agent-card" aria-label="Guardrails">
                            <header>
                              <h3>Guardrails</h3>
                              <p>Hard rules this agent cannot cross.</p>
                            </header>
                            <div className="completed-agent-guardrails">
                              {selectedAiAgent.guardrails.map((rail) => (
                                <article className={rail.state === "Planned" ? "is-planned" : ""} key={rail.label}>
                                  <i aria-hidden="true">{rail.state === "Planned" ? "○" : ""}</i>
                                  <strong>{rail.label}</strong>
                                  <span>{rail.state}</span>
                                </article>
                              ))}
                            </div>
                          </section>

                          <section className="completed-agent-card" aria-label="Recent activity">
                            <header>
                              <h3>Recent activity</h3>
                              <p>The latest moments {selectedAiAgent.name} handled.</p>
                            </header>
                            <div className="completed-agent-activity">
                              {selectedAiAgent.activity.map((item) => (
                                <article key={`${item.time}-${item.title}`}>
                                  <time>{item.time}</time>
                                  <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.detail}</p>
                                  </div>
                                  <span className={`is-${item.tag.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{item.tag}</span>
                                </article>
                              ))}
                            </div>
                          </section>
                        </section>

                        <aside className="completed-agents-side" aria-label="Agent configuration">
                          <section className="completed-agent-card">
                            <header>
                              <h3>Configuration</h3>
                            </header>
                            <div className="completed-agent-config">
                              {selectedAiAgent.config.map(([label, value]) => (
                                <p key={label}><span>{label}</span><strong>{value}</strong></p>
                              ))}
                            </div>
                            <button className="completed-side-link" type="button">Open agent settings <span aria-hidden="true">›</span></button>
                          </section>

                          <section className="completed-agent-card">
                            <header>
                              <h3>Connected tools</h3>
                            </header>
                            <div className="completed-agent-tools">
                              {selectedAiAgent.tools.map((tool) => (
                                <article className={tool.status === "Setup needed" ? "is-pending" : ""} key={tool.name}>
                                  <i aria-hidden="true"></i>
                                  <strong>{tool.name}</strong>
                                  <span>{tool.status}</span>
                                </article>
                              ))}
                            </div>
                            <button className="completed-side-link" type="button" onClick={() => changeActiveRoute("integrations")}>Manage integrations <span aria-hidden="true">›</span></button>
                          </section>

                          <section className="completed-agent-card">
                            <header>
                              <h3>Latest test run</h3>
                              <span className="completed-agent-test-badge">Passed · 9m ago</span>
                            </header>
                            <div className="completed-agent-config">
                              {selectedAiAgent.test.map((check) => (
                                <p key={check.label}><span>{check.label}</span><strong>{check.value}</strong></p>
                              ))}
                            </div>
                            <button className="completed-side-link" type="button">View full report <span aria-hidden="true">›</span></button>
                          </section>

                          <section className="completed-agent-card is-next">
                            <header>
                              <h3>Next actions</h3>
                            </header>
                            <div className="completed-agent-next">
                              {dashboardPages.workflows.next.map((action, index) => (
                                <button type="button" key={action}>
                                  <small>{String(index + 1).padStart(2, "0")}</small>
                                  {action}
                                </button>
                              ))}
                            </div>
                          </section>
                        </aside>
                      </div>
                    </section>
	              ) : activeRoute === "integrations" ? (
                    <section className="completed-intg-page" aria-label="Integrations">
                      <header className="completed-intg-header">
                        <div>
                          <h2>Integrations</h2>
                          <p>Connect the tools agents use.</p>
                        </div>
                        <div className="completed-intg-actions">
                          <button type="button"><span aria-hidden="true">Run</span> Run checks</button>
                          <button
                            className="is-primary"
                            type="button"
                            onClick={() => {
                              setLoginIntegration(null);
                              setIsAddIntegrationModalOpen(true);
                            }}
                          >
                            <span aria-hidden="true">+</span> Add Integration
                          </button>
                        </div>
                      </header>

                      <div className="completed-intg-kpi-grid" aria-label="Integration metrics">
                        {integrationsKpis.map((metric) => (
                          <article className={`is-${metric.tone}`} key={metric.label}>
                            <i className={`is-${metric.icon}`} aria-hidden="true"></i>
                            <div>
                              <span>{metric.label}</span>
                              <strong>{metric.value}</strong>
                              <small>{metric.trend}</small>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="completed-intg-workspace">
                        <section className="completed-intg-list-panel" aria-label="Connected systems">
                          <div className="completed-intg-tabs" role="tablist" aria-label="Integration category">
                            {completedIntegrationCategories.map((category) => (
                              <button
                                className={category.id === selectedCompletedIntegrationCategory ? "is-active" : ""}
                                type="button"
                                role="tab"
                                aria-selected={category.id === selectedCompletedIntegrationCategory}
                                onClick={() => {
                                  setSelectedCompletedIntegrationCategory(category.id);
                                  setLoginIntegration(null);
                                  const firstSystemInCategory = allCompletedIntegrationSystems.find((system) => system.category === category.id);

                                  if (firstSystemInCategory) {
                                    setSelectedCompletedIntegrationId(firstSystemInCategory.id);
                                  }
                                }}
                                key={category.id}
                              >
                                {category.label}
                                <b>{allCompletedIntegrationSystems.filter((system) => system.category === category.id).length}</b>
                              </button>
                            ))}
                          </div>
                          <div className="completed-intg-list">
                            {visibleCompletedIntegrationSystems.map((system) => (
                              <button
                                className={[
                                  system.id === selectedCompletedIntegration.id ? "is-active" : "",
                                  system.status === "Connected" ? "is-connected" : "is-pending"
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
                                <div>
                                  <strong>{system.provider}</strong>
                                  <small>{system.name}</small>
                                </div>
                                <aside>
                                  <b>{system.status === "Connected" ? "Connected" : "Setup"}</b>
                                  <span>{system.lastSync}</span>
                                </aside>
                              </button>
                            ))}
                          </div>
                          <button
                            className="completed-intg-add"
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

                        <section className="completed-intg-detail" aria-label={`${selectedCompletedIntegration.provider} details`}>
                          <header className="completed-intg-hero">
                            <ProviderLogo connector={selectedCompletedConnector} large />
                            <div>
                              <h3>
                                {selectedCompletedIntegration.provider}
                                <b className={selectedIntegrationConnected ? "is-green" : "is-amber"}>
                                  {selectedIntegrationConnected ? "Connected" : "Setup needed"}
                                </b>
                              </h3>
                              <small>{selectedCompletedIntegration.name} · {completedIntegrationCategories.find((category) => category.id === selectedCompletedIntegration.category)?.label}</small>
                              <p>{selectedCompletedIntegration.description}</p>
                            </div>
                            <nav aria-label="Integration actions">
                              {selectedIntegrationConnected ? (
                                <>
                                  <button type="button">Test connection</button>
                                  <button type="button">Sync now</button>
                                  <button type="button">Settings</button>
                                  <button className="is-danger" type="button">Disconnect</button>
                                </>
                              ) : (
                                <>
                                  <button type="button">View setup guide</button>
                                  <button className="is-primary" type="button">Connect</button>
                                </>
                              )}
                            </nav>
                          </header>

                          <div className="completed-intg-stats" aria-label={`${selectedCompletedIntegration.provider} usage`}>
                            {selectedIntegrationUsage.stats.map((stat) => (
                              <article key={stat.label}>
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                                <small>{stat.detail}</small>
                              </article>
                            ))}
                          </div>

                          <section className="completed-intg-card" aria-label="Access and permissions">
                            <header>
                              <h3>Permissions</h3>
                              <p>What agents can read or change.</p>
                            </header>
                            <div className="completed-intg-access">
                              {selectedCompletedIntegration.access.map((item) => (
                                <article key={item.label}>
                                  <i aria-hidden="true"></i>
                                  <div>
                                    <strong>{item.label}</strong>
                                    <small>{item.detail}</small>
                                  </div>
                                </article>
                              ))}
                            </div>
                            <div className="completed-intg-scopes" aria-label="OAuth scopes">
                              {selectedCompletedIntegration.scopes.map((scope) => (
                                <code key={scope}>{scope}</code>
                              ))}
                            </div>
                          </section>

                          <section className="completed-intg-card" aria-label="Health checks">
                            <header>
                              <h3>Health checks</h3>
                              <button className="completed-intg-run" type="button">Run checks</button>
                            </header>
                            <div className="completed-intg-checks">
                              {selectedCompletedIntegration.checks.map((check) => (
                                <article className={selectedIntegrationConnected ? "" : "is-pending"} key={check}>
                                  <i aria-hidden="true">{selectedIntegrationConnected ? "" : "○"}</i>
                                  <strong>{check}</strong>
                                  <span>{selectedIntegrationConnected ? "Passing" : "Pending"}</span>
                                </article>
                              ))}
                            </div>
                          </section>

                          <section className="completed-intg-card" aria-label="Recent activity">
                            <header>
                              <h3>Recent activity</h3>
                              <p>The latest reads, writes, and sync events.</p>
                            </header>
                            <div className="completed-intg-activity">
                              {selectedIntegrationUsage.activity.map((item) => (
                                <article key={`${item.time}-${item.title}`}>
                                  <time>{item.time}</time>
                                  <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.detail}</p>
                                  </div>
                                  <span className={`is-${item.tag.toLowerCase()}`}>{item.tag}</span>
                                </article>
                              ))}
                            </div>
                          </section>
                        </section>

                        <aside className="completed-intg-side" aria-label="Connection information">
                          <section className="completed-intg-card">
                            <header>
                              <h3>Connection details</h3>
                            </header>
                            <div className="completed-intg-table">
                              {selectedIntegrationDetails.map(([label, value]) => (
                                <p key={label}>
                                  <span>{label}</span>
                                  <strong className={value === "Connected" || value === "Passing" ? "is-green" : ""}>{value}</strong>
                                </p>
                              ))}
                            </div>
                          </section>

                          <section className="completed-intg-card">
                            <header>
                              <h3>Used by agents</h3>
                            </header>
                            {agentsUsingSelectedIntegration.length ? (
                              <div className="completed-intg-agents">
                                {agentsUsingSelectedIntegration.map((agent) => (
                                  <button type="button" onClick={() => { setSelectedAiAgentId(agent.id); changeActiveRoute("workflows"); }} key={agent.id}>
                                    <span className={`completed-agent-avatar is-${agent.tone}`} aria-hidden="true">{agent.name.slice(0, 1)}<i></i></span>
                                    <div>
                                      <strong>{agent.name}</strong>
                                      <small>{agent.role}</small>
                                    </div>
                                    <b aria-hidden="true">›</b>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="completed-intg-empty">No agents use this connection yet.</p>
                            )}
                          </section>

                          <section className="completed-intg-card">
                            <header>
                              <h3>Suggested actions</h3>
                            </header>
                            <div className="completed-intg-next">
                              {selectedCompletedIntegration.actions.map((action, index) => (
                                <button type="button" key={action}>
                                  <small>{String(index + 1).padStart(2, "0")}</small>
                                  {action}
                                </button>
                              ))}
                            </div>
                          </section>

                          <section className="completed-intg-card is-cta">
                            <span aria-hidden="true">✳</span>
                            <h3>Need a tool?</h3>
                            <p>Browse the catalog.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setLoginIntegration(null);
                                setIsAddIntegrationModalOpen(true);
                              }}
                            >
                              Browse catalog
                            </button>
                          </section>
                        </aside>
                      </div>

                      <section className="completed-intg-catalog" aria-label="Integration catalog">
                        <header>
                          <div>
                            <h3>Browse the catalog</h3>
                            <p>Popular {completedIntegrationCategories.find((category) => category.id === selectedCompletedIntegrationCategory)?.label.toLowerCase()} tools you can connect in minutes.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginIntegration(null);
                              setIsAddIntegrationModalOpen(true);
                            }}
                          >
                            View all <span aria-hidden="true">›</span>
                          </button>
                        </header>
                        <div className="completed-intg-catalog-grid">
                          {visibleAddIntegrationCatalog.slice(0, 8).map((integration) => (
                            <article key={`${integration.company}-${integration.type}`}>
                              <img
                                src={integration.logoUrl}
                                alt=""
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                              <strong>{integration.company}</strong>
                              <span>{integration.type}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddIntegrationModalOpen(true);
                                  startIntegrationLogin(integration);
                                }}
                              >
                                Connect
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>
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
                  <h1 id="completed-dashboard-title">Agent live.</h1>
                  <motion.span layout>
                    Monitoring calls, handoffs, speed, and knowledge gaps.
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
                      {assistantMessages.map((message, index) => (
                        <motion.div
                          className={`completed-message ${message.role === "agent" ? "is-assistant" : "is-user"}`}
                          key={`${message.role}-${index}`}
                          initial={{ opacity: 0, y: 14, scale: 0.992, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <span>{message.role === "agent" ? "RC" : workspaceInitial}</span>
                          <p>{message.content}{message.role === "agent" && isAssistantTyping && index === assistantMessages.length - 1 ? <b className="completed-type-caret" aria-hidden="true"></b> : null}</p>
                        </motion.div>
                      ))}
                      {workspaceAssistantStatus === "loading" || (isAssistantTyping && assistantMessages.length === 0) ? (
                        <motion.div
                          className="completed-message is-assistant is-thinking"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.35 }}
                        >
                          <span>RC</span>
                          <p><i></i><i></i><i></i></p>
                        </motion.div>
                      ) : null}
                      {workspaceAssistantError ? (
                        <div className="completed-assistant-status" role="status">
                          {workspaceAssistantError}
                        </div>
                      ) : null}
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

                          <div className="completed-insight-visuals">
                            <section aria-label="Hourly customer call volume">
                              <div className="completed-insight-heading">
                                <span>Hourly call volume</span>
                                <strong>{liveMetrics.callsHandled} calls today</strong>
                              </div>
                              <div className="completed-volume-chart">
                                {agentHourlyVolume.map((hour) => (
                                  <div key={hour.label}>
                                    <i style={{ height: `${Math.max(18, hour.value * 8)}px` }}></i>
                                    <span>{hour.label}</span>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section aria-label="Human handoff reasons">
                              <div className="completed-insight-heading">
                                <span>Handoff reasons</span>
                                <strong>{liveMetrics.handoffs} reviews</strong>
                              </div>
                              <div className="completed-handoff-chart">
                                {handoffReasons.map((reason) => (
                                  <article key={reason.label}>
                                    <div>
                                      <span>{reason.label}</span>
                                      <strong>{reason.value}</strong>
                                    </div>
                                    <i><b style={{ width: `${reason.percent}%` }}></b></i>
                                  </article>
                                ))}
                              </div>
                            </section>
                          </div>
                        </motion.section>
                      ) : null}
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
            placeholder={workspaceAssistantStatus === "loading" ? "RelayClarity is reading the workspace data" : "Ask about setup, metrics, calls, or next steps"}
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
	                        ? `Log in to ${loginIntegration.company}`
	                        : loginIntegrationStage === "success"
	                          ? `${loginIntegration.company} connected`
	                          : `Logging in to ${loginIntegration.company}`
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
	                          Email
	                          <input
	                            type="email"
	                            value={loginIntegrationEmail}
	                            onChange={(event) => setLoginIntegrationEmail(event.target.value)}
	                            placeholder="name@company.com"
	                            autoFocus
	                          />
	                        </label>
	                        <label>
	                          Password
	                          <input
	                            type="password"
	                            value={loginIntegrationPassword}
	                            onChange={(event) => setLoginIntegrationPassword(event.target.value)}
	                            placeholder="Enter password"
	                          />
	                        </label>
	                        <button type="submit" disabled={!loginIntegrationEmail.trim() || !loginIntegrationPassword.trim()}>
	                          Continue
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
	                              : `Logging in to ${loginIntegration.company}`}
	                          </strong>
	                          <small>
	                            {loginIntegrationStage === "success"
	                              ? "Connection complete. Updating your workspace."
	                              : "Opening secure authorization for this workspace."}
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

  useEffect(() => {
    setLogoFailed(false);
  }, [connector.logoUrl]);

  return (
    <span className={`connector-logo ${large ? "large" : ""}`} aria-hidden="true">
      {connector.logoUrl && !logoFailed ? (
        <img
          src={connector.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
        />
      ) : null}
      <b>{connector.provider.slice(0, 1)}</b>
    </span>
  );
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

function CountrySelect({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = COUNTRIES.find((country) => country.iso === value) ?? COUNTRIES[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCountries = normalizedQuery
    ? COUNTRIES.filter(
        (country) =>
          country.name.toLowerCase().includes(normalizedQuery) ||
          country.dial.replace("+", "").startsWith(normalizedQuery.replace("+", ""))
      )
    : COUNTRIES;

  return (
    <div className={`country-select ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        className="country-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Country code: ${selected.name} ${selected.dial}`}
        onClick={() => {
          setIsOpen((open) => !open);
          setQuery("");
        }}
      >
        <img
          className="country-select-flag"
          src={`https://flagcdn.com/w40/${selected.iso.toLowerCase()}.png`}
          alt=""
          loading="lazy"
        />
        <span className="country-select-dial">{selected.dial}</span>
        <b aria-hidden="true">⌄</b>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="country-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or code"
              autoFocus
            />
            <ul role="listbox" aria-label="Country codes">
              {visibleCountries.map((country) => (
                <li key={country.iso}>
                  <button
                    className={country.iso === value ? "is-selected" : ""}
                    type="button"
                    role="option"
                    aria-selected={country.iso === value}
                    onClick={() => {
                      onChange(country.iso);
                      setIsOpen(false);
                    }}
                  >
                    <img src={`https://flagcdn.com/w40/${country.iso.toLowerCase()}.png`} alt="" loading="lazy" />
                    <em>{country.name}</em>
                    <small>{country.dial}</small>
                  </button>
                </li>
              ))}
              {visibleCountries.length === 0 ? <li className="country-select-empty">No matches</li> : null}
            </ul>
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
