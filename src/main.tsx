import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { businessCategorySeeds } from "./business-category-data";
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
  voiceId: string;
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
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Virtual Agent",
      detail: `Answer ${businessLabel} conversations through ${primaryChannel} with consistent customer support.`
    },
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Intent Detection",
      detail: `Classify whether callers need ${primaryGoal}, ${secondaryGoal}, or specialist support.`
    },
    {
      category: "Resolve customer questions",
      categoryDetail: "Conversation skills that answer, classify, and keep support consistent.",
      title: "Knowledge Answers",
      detail: `Answer from ${knowledgeSource}, approved policies, service details, and company FAQs.`
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
      detail: `Complete approved FAQs, structured requests, and follow-up tasks automatically.`
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "System Workflows",
      detail: `Use ${systemOfRecord}, ${ticketingSystem}, billing, and service systems during the conversation.`
    },
    {
      category: "Take action",
      categoryDetail: "Operational tools that update systems and complete structured requests.",
      title: "Ticket Creation",
      detail: `Create, update, and tag ${ticketingSystem} records with the right customer context.`
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
      detail: `Surface relevant guidance, next best actions, and ${playbook.label.toLowerCase()} context for staff.`
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
    title: "Tell it what your business does",
    example: "Bookings, emergencies, FAQs, opening hours.",
    outcome: "A tailored agent brief in seconds.",
    image: workflowConfigureCardUrl
  },
  {
    phase: "Simulate",
    title: "Try realistic customer questions",
    example: "Emergency appointment, order update, new lead.",
    outcome: "See exactly how the agent responds.",
    image: workflowSimulateCardUrl
  },
  {
    phase: "Observe",
    title: "Keep an eye on every conversation",
    example: "Chats, calls, handoffs, and missed requests.",
    outcome: "The important activity stays visible.",
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
    sample: "Thanks for calling. I can help with booking, account questions, or getting you to the right person."
  },
  {
    id: "antoni",
    name: "Antoni",
    role: "Support lead",
    tone: "Calm, precise",
    voiceId: "ErXwobaYiN019PkySvjV",
    sample: "I can look that up for you now. Before I continue, can I confirm the name on the account?"
  },
  {
    id: "adam",
    name: "Adam",
    role: "Operations",
    tone: "Steady, direct",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    sample: "I have the details in front of me. I will summarize the next step and send this to the team if needed."
  },
  {
    id: "bella",
    name: "Bella",
    role: "Concierge",
    tone: "Bright, friendly",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    sample: "Absolutely. I can check availability, answer common questions, and make sure the handoff is clear."
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
      return <AuthScreen googleAuthAvailable={googleAuthAvailable} onBack={backToHome} onSignedIn={handleSignedIn} />;
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

        <section className="section platform-section" id="platform" ref={platformRef}>
          <motion.div className="platform-sticky">
            <motion.div className="section-heading platform-heading">
              <motion.h2 className="platform-heading-line platform-word-heading" aria-label="Build. Test. Launch Clara, your AI agent.">
                {[
                  { text: "Build", tone: "is-quiet" },
                  { text: "Test", tone: "is-quiet" },
                  { text: "Launch", tone: "is-command" },
                  { text: "Clara", tone: "is-agent" },
                  { text: "your AI agent", tone: "is-resolution" }
                ].map((line, index) => (
                  <motion.span
                    className={`platform-title-line ${line.tone}`}
                    style={shouldReduceMotion ? visibleWordStyle : platformWordStyles[index]}
                    aria-hidden="true"
                    key={line.text}
                  >
                    {line.text}
                  </motion.span>
                ))}
              </motion.h2>
            </motion.div>

            <motion.div className="workflow-viewport" style={shouldReduceMotion ? visibleViewportStyle : workflowViewportStyle}>
              <motion.div className="workflow-grid">
                {workflow.slice(0, 3).map((step, index) => (
                  <motion.article
                    className="workflow-card"
                    style={shouldReduceMotion ? visibleCardStyle : workflowCardStyles[index]}
                    key={step.title}
                  >
                    <motion.div className="workflow-image" style={shouldReduceMotion ? visibleImageStyle : workflowImageStyles[index]}>
                      <motion.img src={step.image} alt="" loading="lazy" style={shouldReduceMotion ? visiblePhotoStyle : workflowPhotoStyles[index]} />
                      <motion.span className="workflow-image-glow" style={shouldReduceMotion ? hiddenGlowStyle : workflowGlowStyles[index]} aria-hidden="true" />
                      <a className="workflow-arrow" href="#demo" aria-label={`${step.phase}: open demo`}>
                        <span aria-hidden="true" />
                      </a>
                    </motion.div>
                    <motion.div className="workflow-card-copy" style={shouldReduceMotion ? visibleLineStyle : workflowCopyStyles[index]}>
                      <h3>{step.title}</h3>
                      <p>{step.example}</p>
                      <small>{step.outcome}</small>
                    </motion.div>
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
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
}: {
  googleAuthAvailable: boolean;
  onBack: () => void;
  onSignedIn: (payload: AuthPayload) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const payload = await fetchJsonFromApi<AuthPayload>("/api/auth/email", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
            <h1>Welcome back.</h1>
            <p>
              Sign in to continue building and launching your AI agent workspace.
            </p>
          </div>

        </div>

        <div className="auth-form-panel">
          <button className="quiet-button auth-back" type="button" onClick={onBack}>
            Back to site
          </button>
          <img className="auth-logo" src={relayclarityLogoUrl} alt="RelayClarity" />
          <div className="auth-form-heading">
            <span className="auth-kicker">Sign in</span>
            <h2>Open dashboard</h2>
            <p>Use Google or continue with your email and password.</p>
          </div>

          <button className="google-button" type="button" onClick={startGoogleLogin}>
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.53 5.53 0 0 1-2.39 3.63v2.96h3.87c2.26-2.08 3.55-5.15 3.55-8.69Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-2.96c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.05A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.25 14.31a7.21 7.21 0 0 1 0-4.62V6.64H1.26a12 12 0 0 0 0 10.72l3.99-3.05Z" />
              <path fill="#EA4335" d="M12 4.72c1.76 0 3.34.61 4.59 1.79l3.43-3.43A11.51 11.51 0 0 0 12 0 12 12 0 0 0 1.26 6.64l3.99 3.05C6.2 6.84 8.86 4.72 12 4.72Z" />
            </svg>
            Continue with Google
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
                autoComplete="current-password"
                required
              />
            </label>
            <button className="dark-button auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Opening dashboard..." : "Continue with email and password"}
            </button>
          </form>

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
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [latency, setLatency] = useState(720);
  const [bargeIn, setBargeIn] = useState(true);
  const [step, setStep] = useState(() => {
    const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
    return Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= 5 ? requestedStep : 0;
  });
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
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
  const [launchChannel, setLaunchChannel] = useState(playbook.channels[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(elevenLabsVoices[0].id);
  const [confirmedVoiceId, setConfirmedVoiceId] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceStability, setVoiceStability] = useState(58);
  const [voiceStyle, setVoiceStyle] = useState(16);
  const [previewText, setPreviewText] = useState("Hello, I am your virtual agent. I can help answer questions and get you to the right person.");
  const [voicePreviewStatus, setVoicePreviewStatus] = useState("Ready to preview with ElevenLabs.");
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voicePreviewCompleted, setVoicePreviewCompleted] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicePreviewRequestRef = useRef(0);
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
  const [reviewedAgentIds, setReviewedAgentIds] = useState<string[]>(["agentIntake"]);
  const testRunTimers = useRef<number[]>([]);
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
  const selectedZoomCapabilityCount = selectedCapabilities.length;
  const hasLaunchRequestDetails = websiteUrl.trim().length > 0 && phoneContactNumber.trim().length > 0;

  const connectedCount = connectors.filter((connector) => connector.connected).length;
  const systemsComplete = connectedCount > 0;
  const agentsComplete = true;
  const testsComplete = testRunState === "complete" && completedRunCount >= playbook.tests.length;
  const voiceConfirmed = confirmedVoiceId === selectedVoiceId;
  const stepCompletion = [
    hasBusinessType && selectedZoomCapabilityCount > 0,
    systemsComplete,
    agentsComplete,
    voiceConfirmed,
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
    "Review the generated agent workflow.",
    "Choose and confirm a voice for callers.",
    "Run the launch tests before continuing.",
    "Enter the website URL and phone contact number."
  ][step];
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

  useEffect(() => {
    setVoicePreviewCompleted(false);
  }, [previewText, voiceSpeed, voiceStability, voiceStyle, latency, bargeIn]);

  useEffect(() => {
    return () => {
      if (activeAudioUrl) {
        URL.revokeObjectURL(activeAudioUrl);
      }
    };
  }, [activeAudioUrl]);

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

    playbook.tests.forEach((_, index) => {
      const startTimer = window.setTimeout(() => {
        setActiveRunIndex(index);
        setScenarioIndex(index);
      }, index * 1150);

      const completeTimer = window.setTimeout(() => {
        setCompletedRunCount(index + 1);

        if (index === playbook.tests.length - 1) {
          setTestRunState("complete");
        }
      }, index * 1150 + 880);

      testRunTimers.current.push(startTimer, completeTimer);
    });
  };

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
  const activeTestChecks = activeConnector.connected || activeConnector.connectionMode === "demo" ? [] : activeConnector.testChecks || [];
  const primaryKnowledgeSource = playbook.connectorProviders.knowledge || "Knowledge base";
  const crmSystem = playbook.connectorProviders.crm || "CRM";
  const helpdeskSystem = playbook.connectorProviders.helpdesk || "Helpdesk";
  const testProgress = testRunState === "complete" ? 100 : Math.round((completedRunCount / Math.max(1, playbook.tests.length)) * 100);
  const agentDisplayName = agentName.trim() || `${playbook.label} assistant`;
  const connectedWorkflowConnectors = connectors.filter((connector) => connector.connected);
  const workflowIntegrations = connectors
    .filter((connector) => connector.connected && ["crm", "knowledge", "helpdesk", "telephony"].includes(connector.key))
    .slice(0, 4);
  const selectedWorkflowSuggestions = selectedCapabilities.slice(0, 5);
  const workflowAgents = [
    {
      id: "agentIntake",
      label: "Intake agent",
      name: agentDisplayName,
      trigger: "New customer request",
      job: agentPurpose.trim() || playbook.missions[0],
      connectorKeys: ["crm", "telephony"],
      outcome: "Captures the request and confirms the next step."
    },
    {
      id: "agentAnswer",
      label: "Knowledge agent",
      name: "Answer agent",
      trigger: "Routine question",
      job: `Checks ${primaryKnowledgeSource} and customer context.`,
      connectorKeys: ["knowledge", "crm"],
      outcome: "Answers from approved information."
    },
    {
      id: "agentHandoff",
      label: "Handoff agent",
      name: "Escalation agent",
      trigger: "Sensitive or urgent case",
      job: agentHandoff.trim() || "Summarises urgent or sensitive requests for the team.",
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
  }, [step]);

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

      if (payload.type === "agent") {
        addWorkflowAgent();
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

  const generateVoicePreview = async (voice = selectedVoice, textToRead = previewText) => {
    const text = textToRead.trim();
    const requestId = voicePreviewRequestRef.current + 1;
    voicePreviewRequestRef.current = requestId;

    if (!text) {
      setVoicePreviewStatus("Add a short line for the voice to read.");
      return;
    }

    setIsPreviewingVoice(true);
    setVoicePreviewCompleted(false);
    setVoicePreviewStatus(`Generating ${voice.name} preview...`);

    try {
      const payload = await fetchJsonFromApi<SpeechPayload>("/api/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: voice.voiceId,
          modelId: "eleven_multilingual_v2",
          speed: voiceSpeed,
          stability: voiceStability / 100,
          similarityBoost: 0.78,
          style: voiceStyle / 100
        })
      });

      if (requestId !== voicePreviewRequestRef.current) {
        return;
      }

      if (payload.mode === "audio" && payload.audioBase64) {
        const binary = window.atob(payload.audioBase64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: payload.contentType || "audio/mpeg" }));

        setActiveAudioUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }

          return audioUrl;
        });
        setVoicePreviewCompleted(true);
        setVoicePreviewStatus(`${voice.name} preview is playing.`);
        window.setTimeout(() => {
          audioRef.current?.play().catch(() => setVoicePreviewStatus("Preview generated. Press play in the audio control."));
        }, 0);
        return;
      }

      setVoicePreviewCompleted(false);
      setVoicePreviewStatus(payload.message || "ElevenLabs preview is unavailable. Add an API key to hear this voice.");
    } catch (error) {
      if (requestId !== voicePreviewRequestRef.current) {
        return;
      }

      setVoicePreviewCompleted(false);
      setVoicePreviewStatus(error instanceof Error ? error.message : "ElevenLabs preview failed.");
    } finally {
      if (requestId === voicePreviewRequestRef.current) {
        setIsPreviewingVoice(false);
      }
    }
  };

  const selectVoice = (voice: VoicePreset) => {
    setSelectedVoiceId(voice.id);
    setConfirmedVoiceId("");
    setPreviewText(voiceIntroLine);
    generateVoicePreview(voice, voiceIntroLine);
  };

  const confirmVoice = () => {
    if (!voicePreviewCompleted) {
      setVoicePreviewStatus("Listen to the ElevenLabs preview before confirming this voice.");
      return;
    }

    setConfirmedVoiceId(selectedVoice.id);
    setVoicePreviewStatus(`${selectedVoice.name} is confirmed.`);
    setStep(4);
  };

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
	                          <div className="workspace-confirmation-hero">
	                            <div>
	                              <span>Step 1 setup</span>
	                              <strong>Choose what the AI agent should do first.</strong>
	                              <p>
	                                Start with the conversation skills your {confirmedBusinessLabel} team needs most. Select one capability or combine several into the first launch scope.
	                              </p>
	                            </div>
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
                                  <button type="button" onClick={addWorkflowAgent}>+ Agent</button>
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
                                  className="workflow-node workflow-trigger"
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
                                  className="workflow-node workflow-agent"
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
                                  className="workflow-tool-panel"
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
                                  className="workflow-node workflow-action-a"
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
                                    className="workflow-node workflow-board-app"
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
                                    className="workflow-node workflow-board-action"
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
                            </section>
                          </div>
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="voice-step">
                      <motion.section
                        className="voice-lab"
                        initial={{ opacity: 0, y: 18, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="voice-lab-top">
                          <div>
                            <span>Step 4</span>
                            <strong>Pick your voice.</strong>
                          </div>
                          <b>{isPreviewingVoice ? "Playing sample" : voicePreviewCompleted ? `${selectedVoice.name} selected` : "Choose a voice"}</b>
                        </div>

                        <div className="voice-lab-grid">
                          <section className="voice-rail" aria-label="Choose a voice agent">
                            {elevenLabsVoices.map((voice, index) => (
                              <motion.button
                                className={[
                                  voice.id === selectedVoice.id ? "is-active" : "",
                                  confirmedVoiceId === voice.id ? "is-confirmed" : ""
                                ].filter(Boolean).join(" ")}
                                type="button"
                                onClick={() => selectVoice(voice)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.28, delay: index * 0.04 }}
                                key={voice.id}
                              >
                                <span aria-hidden="true"></span>
                                <div>
                                  <strong>{voice.name}</strong>
                                  <small>{voice.tone}</small>
                                </div>
                              </motion.button>
                            ))}
                          </section>

                          <section className="voice-console" aria-label={`${selectedVoice.name} voice preview`}>
                            <div className={`voice-signal ${isPreviewingVoice ? "is-loading" : ""}`}>
                              <span aria-hidden="true"></span>
                              <div>
                                <strong>{isPreviewingVoice ? `Playing ${selectedVoice.name}` : voicePreviewCompleted ? `${selectedVoice.name} sounds good.` : "Select a voice to hear it."}</strong>
                                <small>{voicePreviewStatus}</small>
                              </div>
                            </div>

                            <div className="voice-playback">
                              {activeAudioUrl ? <audio ref={audioRef} src={activeAudioUrl} controls /> : <audio ref={audioRef} controls />}
                            </div>

                            <div className="voice-confirm-panel">
                              <div>
                                <span>Selected voice</span>
                                <strong>{selectedVoice.name}</strong>
                              </div>
                              <button type="button" onClick={confirmVoice} disabled={isPreviewingVoice || !voicePreviewCompleted}>
                                Confirm voice
                              </button>
                            </div>
                          </section>
                        </div>
                      </motion.section>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="test-step">
                      <div className="premium-test-grid">
                        {playbook.tests.map((scenario, index) => (
                          <button
                            className={[
                              scenarioIndex === index ? "is-active" : "",
                              testRunState === "running" && activeRunIndex === index ? "is-running" : "",
                              completedRunCount > index ? "is-complete" : ""
                            ].filter(Boolean).join(" ")}
                            type="button"
                            onClick={() => {
                              setScenarioIndex(index);
                              if (testRunState !== "running") {
                                setActiveRunIndex(index);
                              }
                            }}
                            key={scenario.title}
                          >
                            <span>{scenario.label}</span>
                            <strong>{scenario.title}</strong>
                            <small>{completedRunCount > index ? "Passed" : testRunState === "running" && activeRunIndex === index ? "Running" : "Queued"}</small>
                          </button>
                        ))}
                      </div>

                      <section className={`test-run-panel ${testRunState === "running" ? "is-running" : ""} ${testRunState === "complete" ? "is-complete" : ""}`} aria-live="polite">
                        <div className="test-run-main">
                          <div className="test-run-header">
                            <div>
                              <span>{testRunState === "complete" ? "Launch gate passed" : testRunState === "running" ? "Live evaluation" : "Evaluation ready"}</span>
                              <strong>{testRunState === "running" ? selectedScenario.title : "Run caller scenario tests"}</strong>
                            </div>
                            <button className="test-run-button" type="button" onClick={runLaunchTests} disabled={testRunState === "running"}>
                              {testRunState === "running" ? "Running" : testRunState === "complete" ? "Run again" : "Run tests"}
                            </button>
                          </div>

                          <div className="test-engine-strip" aria-label="Evaluation checks">
                            <span className={testRunState === "running" ? "is-active" : testRunState === "complete" ? "is-complete" : ""}>
                              <b>Call path</b>
                              {testRunState === "running" ? selectedScenario.label : "Ready"}
                            </span>
                            <span className={completedRunCount > 0 ? "is-complete" : ""}>
                              <b>Handoff</b>
                              {completedRunCount > 0 ? "Checked" : "Queued"}
                            </span>
                            <span className={testRunState === "complete" ? "is-complete" : ""}>
                              <b>Guardrails</b>
                              {testRunState === "complete" ? "Passed" : "Queued"}
                            </span>
                          </div>

                          <div className="test-live-line" aria-hidden="true">
                            <i style={{ width: `${testProgress}%` }} />
                          </div>

                          <div className="test-check-stream">
                            {playbook.tests.map((scenario, index) => (
                              <div
                                className={[
                                  completedRunCount > index ? "is-complete" : "",
                                  testRunState === "running" && activeRunIndex === index ? "is-active" : ""
                                ].filter(Boolean).join(" ")}
                                key={scenario.title}
                              >
                                <b>{index + 1}</b>
                                <span>{scenario.label}</span>
                                <strong>{completedRunCount > index ? `${scenario.score}%` : testRunState === "running" && activeRunIndex === index ? "Checking" : "Queued"}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <aside className="test-score">
                          <span>{testRunState === "complete" ? "Launch score" : "Projected score"}</span>
                          <strong>{testRunState === "complete" ? launchGateScore : selectedScenario.score}%</strong>
                          <small>{testRunState === "complete" ? scoreLabel(launchGateScore) : `${Math.max(0, completedRunCount)} of ${playbook.tests.length} complete`}</small>
                        </aside>
                      </section>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <section className={`launch-request-panel ${launchRequestSubmitted ? "is-submitted" : ""}`}>
                      <div className="launch-request-copy">
                        <span>Engineer setup</span>
                        <strong>{launchRequestSubmitted ? "Your setup request is in." : "Send this to an engineer."}</strong>
                        <p>
                          {launchRequestSubmitted
                            ? "An engineer will be in touch within 48 hours to help connect the agent to your website, phone line, and launch workflow."
                            : "Share the live website and best phone contact so an engineer can help finish the production setup."}
                        </p>
                      </div>

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

                      {launchRequestSubmitted ? (
                        <div className="launch-request-confirmation">
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
  const [launchGateRunState, setLaunchGateRunState] = useState<"idle" | "running" | "complete">("idle");
  const workspaceInitial = user.name?.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase();
  const routes = [
    { id: "ai", title: "AI workspace", meta: "Ask anything" },
    { id: "launch", title: "Launch Gate", meta: "Required tests" },
    { id: "metrics", title: "Metrics", meta: "Today and trends" },
    { id: "calls", title: "Customer calls", meta: "Live conversations" },
    { id: "handoffs", title: "Handoffs", meta: "Owner review" },
    { id: "knowledge", title: "Knowledge", meta: "Answers and gaps" },
    { id: "workflows", title: "Workflows", meta: "Agent routing" },
    { id: "integrations", title: "Integrations", meta: "Connected stack" }
  ];
  const activeRouteData = routes.find((route) => route.id === activeRoute) || routes[0];
  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0] || {
    id: "project",
    name: "Project",
    meta: "Workspace"
  };
  const [liveMetrics, setLiveMetrics] = useState<LiveWorkspaceMetrics>(() => createInitialLiveMetrics(activeProject));
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
  const allCompletedIntegrationSystems = [...completedIntegrationSystems, ...addedCompletedIntegrations];
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
    calls: {
      eyebrow: "Customer conversations",
      title: "Live call activity is easy to scan.",
      summary: "Recent conversations are grouped by status so teams can see what was solved, what escalated, and what needs follow-up.",
      status: "12 active",
      metrics: [
        { label: "Active now", value: "12", detail: "7 voice, 5 chat" },
        { label: "Solved today", value: "34", detail: "No human needed" },
        { label: "Avg duration", value: "3m 12s", detail: "Down 18 sec" },
        { label: "Follow-ups", value: "5", detail: "Queued for CRM" }
      ],
      primaryTitle: "Recent calls",
      primaryMeta: "Latest customer moments with intent, outcome, and owner.",
      timeline: [
        { time: "12:44", title: "Invoice copy requested", detail: "AI verified account and sent the latest invoice.", tag: "Resolved" },
        { time: "12:31", title: "Policy exception question", detail: "Sensitive guidance detected and moved to review.", tag: "Review" },
        { time: "12:18", title: "Booking change", detail: "Captured new time preference and updated CRM.", tag: "Resolved" },
        { time: "11:57", title: "Billing dispute", detail: "Transferred with summary and account context.", tag: "Handoff" }
      ],
      next: ["Open review calls", "Check CRM follow-ups", "Listen to flagged recording"]
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
      title: "Knowledge is current enough to launch.",
      summary: "RelayClarity is tracking answer coverage, stale sources, and the gaps most likely to affect customer trust.",
      status: "91% confident",
      metrics: [
        { label: "Coverage", value: "91%", detail: "Approved sources" },
        { label: "Draft answers", value: "2", detail: "Ready to review" },
        { label: "Stale docs", value: "1", detail: "Pricing policy" },
        { label: "Top intents", value: "8", detail: "Fully covered" }
      ],
      primaryTitle: "Knowledge gaps",
      primaryMeta: "Small set of updates that would improve answer confidence.",
      timeline: [
        { time: "High", title: "Billing exception limits", detail: "Add what the agent can promise before finance review.", tag: "Draft" },
        { time: "Med", title: "Holiday opening hours", detail: "Confirm the latest customer-facing schedule.", tag: "Needs source" },
        { time: "Low", title: "Refund status wording", detail: "Tighten answer for pending bank transfers.", tag: "Improve" }
      ],
      next: ["Approve draft answers", "Upload policy source", "Retest top intents"]
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
  type DashboardPage = (typeof dashboardPages)[keyof typeof dashboardPages];
  type DashboardChartBar = { label: string; value: number };
  type DashboardProgressBar = { label: string; value: number; percent: number };
  const hasChart = (page: DashboardPage): page is DashboardPage & { chart: DashboardChartBar[] } => "chart" in page;
  const hasBars = (page: DashboardPage): page is DashboardPage & { bars: DashboardProgressBar[] } => "bars" in page;
  const activeDashboardPage = activeRoute === "ai" ? null : dashboardPages[activeRoute];

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

  return (
    <main className="completed-dashboard" aria-label="Completed onboarding dashboard">
      <aside className="completed-sidebar">
        <a className="completed-brand" href="/" aria-label="RelayClarity home">
          <img src={relayclarityLogoUrl} alt="RelayClarity" />
        </a>

        <button
          className={`completed-launch-sidebar-card ${launchGateAllowed ? "is-ready" : "is-locked"}`}
          type="button"
          onClick={() => setActiveRoute("launch")}
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
              onClick={() => setActiveRoute(route.id)}
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
      </aside>

      <section className="completed-main">
        <header className="completed-topbar">
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
                activeRoute === "launch" ? "is-launch" : "",
                activeRoute === "metrics" ? "is-metrics" : "",
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

              {activeRoute === "metrics" ? (
		                <section className="completed-metrics-studio" aria-label="Metrics overview">
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
	                          {index === 0 ? "✓" : index === 1 ? "⌕" : index === 2 ? "ϟ" : index === 3 ? "☆" : "•"}
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
		                <section className="completed-launch-gate" aria-label="Launch gate decision">
		                  <div className="completed-launch-decision">
		                    <div>
		                      <span>Launchgate</span>
		                      <h2>{launchGateAllowed ? "Launch or make final fixes." : "Fix before launch."}</h2>
		                      <p>{launchGateAllowed ? "Everything required for launch is passing. You can still open the fix path if you want to review the final checklist." : launchGateStatusDetail}</p>
		                    </div>
		                    <div className="completed-launch-score" aria-label={`Launch score ${launchGateScore}%`}>
		                      <strong>{launchGateRunState === "running" ? "Checking" : `${launchGateScore}%`}</strong>
		                      <small>{launchGateAllowed ? "Ready" : "Needs fixes"}</small>
		                    </div>
		                  </div>

		                  <div className="completed-launch-choice-grid" aria-label="Launchgate actions">
		                    <button className="completed-launch-choice is-launch" type="button" disabled={!launchGateAllowed}>
		                      <span>Launch</span>
		                      <strong>Launch agent</strong>
		                      <small>{launchGateAllowed ? "Move this agent into production." : "Available after fixes pass."}</small>
		                    </button>
		                    <button className="completed-launch-choice is-fix" type="button" onClick={runLaunchGateTests} disabled={launchGateRunState === "running"}>
		                      <span>Fix</span>
		                      <strong>{launchGateRunState === "running" ? "Checking fixes" : "Fix blockers"}</strong>
		                      <small>{launchGateRunState === "running" ? "Refreshing the launch check." : launchGateFixSummary}</small>
		                    </button>
		                  </div>

		                  <aside className="completed-launch-fix-list" aria-label="Launchgate fix list">
		                    <span>{launchGateAllowed ? "Ready" : "Fix first"}</span>
		                    <h2>{launchGateAllowed ? "No required fixes." : "What needs fixing"}</h2>
		                    <div>
		                      {launchGateFixItems.map((item) => (
		                        <article className={launchGateAllowed ? "is-clear" : "is-blocked"} key={item}>
		                          <strong>{item}</strong>
		                        </article>
		                      ))}
		                    </div>
		                  </aside>
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
			                              <button type="button">Connect</button>
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
            placeholder={workspaceAssistantStatus === "loading" ? "RelayClarity is reading the workspace data" : "Ask RelayClarity anything about setup, metrics, calls, or next actions"}
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
