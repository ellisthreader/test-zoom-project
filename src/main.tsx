import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, animate, motion, useInView, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
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

const marketStats = [
  {
    value: 85,
    suffix: "%",
    label: "of service leaders are exploring conversational AI.",
    source: "Gartner",
    href: "https://www.gartner.com/en/newsroom/press-releases/2024-12-09-gartner-survey-reveals-85-percent-of-customer-service-leaders-will-explore-or-pilot-customer-facing-conversational-genai-in-2025"
  },
  {
    value: 14,
    prefix: "+",
    suffix: "%",
    label: "more issues resolved per hour by support teams.",
    source: "NBER",
    href: "https://www.nber.org/papers/w31161"
  },
  {
    value: 47.82,
    prefix: "$",
    suffix: "B",
    decimals: 2,
    label: "AI customer-service market forecast by 2030.",
    source: "MarketsandMarkets",
    href: "https://www.marketsandmarkets.com/PressReleases/ai-for-customer-service.asp"
  }
];

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

const businessTypeOptions = [
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
  "SaaS support team",
  "IT help desk",
  "Estate agency",
  "Lettings agency",
  "Property management",
  "Restaurant group",
  "Hotel reservations",
  "Event venue"
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
const apiBaseCandidates = Array.from(new Set([
  import.meta.env.DEV ? "" : apiBaseUrl,
  import.meta.env.DEV ? "http://127.0.0.1:8787" : "",
  apiBaseUrl
])).filter((candidate) => candidate !== null && candidate !== undefined);

function apiPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchJsonFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const errors: string[] = [];

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(apiPath(baseUrl, path), {
        credentials: "include",
        ...init,
        headers: {
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...init?.headers,
        },
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
  { code: "5415", title: "Computer Systems Design and IT Services", playbookId: "saas", terms: ["it support", "it help desk", "managed service provider", "msp", "technology consultancy", "systems integrator", "digital agency support", "technical support team", "support desk"] },
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

function normalizeBusinessInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesBusinessTerm(normalizedInput: string, term: string): boolean {
  const normalizedTerm = normalizeBusinessInput(term);
  const exactPhraseMatch = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}($|\\s)`, "i").test(normalizedInput);

  if (exactPhraseMatch) {
    return true;
  }

  const inputWords = normalizedInput.split(" ").filter(Boolean);
  const termWords = normalizedTerm.split(" ").filter(Boolean);

  if (termWords.length < 2) {
    return false;
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
  const fallbackKey = Object.keys(providerLogoFallbacks).find((item) => normalized.includes(normalizeProviderName(item)));
  const fallbackLogo = providerLogoFallbacks[normalized] || providerLogoFallbacks[fallbackKey || ""];

  return {
    providerId: catalogMatch?.id || providerIdFromName(provider, key),
    logoUrl: catalogMatch?.logoUrl || fallbackLogo || "",
    scopes: catalogMatch?.scopes || []
  };
}

function connectedStateForConnector(connector: Connector, connected: IntegrationConnectResult[]) {
  const connection = connected.find((item) => item.providerId === connector.providerId || item.category === connector.key);

  if (!connection) {
    return {};
  }

  return {
    providerId: connection.providerId,
    provider: connection.name,
    logoUrl: connection.logoUrl,
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

  if (normalized.includes("hubspot")) return "hubspot";
  if (normalized.includes("salesforce")) return "salesforce";
  if (normalized.includes("notion")) return "notion";
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
  const [projects, setProjects] = useState<Project[]>([
    { id: "northstar-dental", name: "Northstar Dental", meta: "Live customer agent", businessType: "Dental clinic" },
    { id: "cleardbs", name: "ClearDBS", meta: "DBS support pilot", businessType: "Compliance checks" },
    { id: "harbour-financial", name: "Harbour Financial", meta: "Client service desk", businessType: "Financial services" }
  ]);
  const [activeProjectId, setActiveProjectId] = useState("northstar-dental");
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
  const customerStoriesX = useTransform(customerStoriesProgress, [0, 1], ["0%", "-72%"]);
  const selectedScenario = scenarios[scenarioKey];
  const demoPlaybook = useMemo(() => getBusinessPlaybook(demoBusinessType), [demoBusinessType]);

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
          <a href="#proof">Proof</a>
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

        <section className="stats-strip" id="proof" aria-label="Customer service AI statistics">
          {marketStats.map((stat, index) => (
            <AnimatedStatCard stat={stat} index={index} key={stat.source} />
          ))}
        </section>

        <section className="section platform-section" id="platform" ref={platformRef}>
          <div className="platform-sticky">
            <Reveal className="section-heading platform-heading">
              <p className="eyebrow">How it works</p>
              <h2>Build, test, and launch your AI agent.</h2>
              <p>
                Set it up, test real calls, monitor performance, and hand off when needed.
              </p>
            </Reveal>

            <div className="workflow-viewport">
              <motion.div className="workflow-grid">
                {workflow.slice(0, 3).map((step) => (
                  <Reveal className="workflow-card" key={step.title}>
                    <div className="workflow-image">
                      <img src={step.image} alt="" loading="lazy" />
                      <a className="workflow-arrow" href="#demo" aria-label={`${step.phase}: open demo`}>
                        <span aria-hidden="true" />
                      </a>
                    </div>
                    <div className="workflow-card-copy">
                      <h3>{step.title}</h3>
                      <p>{step.example}</p>
                      <small>{step.outcome}</small>
                    </div>
                  </Reveal>
                ))}
              </motion.div>
            </div>
          </div>
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
              <h2>Try a live agent preview.</h2>
              <p>
                Add your business details and test how the first conversation feels.
              </p>
              <div className="demo-proof-row" aria-label="Demo preview includes">
                <span>Tailored answers</span>
                <span>Chat preview</span>
                <span>Call flow</span>
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
	                      <span>Step 1 of 3</span>
	                      <strong>Tell us about the business.</strong>
                        <p>This helps us create a tailored preview experience for your business.</p>
	                    </div>
	                    <b>Draft saved</b>
	                  </div>

                  <div className="demo-form-grid">
                    <label>
                      <span>Business name</span>
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
                      <span>Business type</span>
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
                      <span>What should the agent know?</span>
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
                    <p>This creates a tailored preview workspace with a live chat test and phone call test.</p>
                    <button className="demo-generate-button" type="button" onClick={generateDemoAgent}>
                      Generate preview workspace
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

            <div className="customer-stories-viewport">
              <motion.div className="customer-stories-rail" style={{ x: customerStoriesX }} aria-label="Customer stories">
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
                      <span className="customer-story-action" aria-hidden="true">↗</span>
                    </div>
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
  const canConfirmBusiness = businessTypeDraft.trim().length > 1;
  const draftMatch = useMemo(() => canConfirmBusiness ? getBusinessMatch(businessTypeDraft) : null, [businessTypeDraft, canConfirmBusiness]);
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
  const [workflowDrag, setWorkflowDrag] = useState<{ id: string; width: number } | null>(null);
  const workflowCanvasRef = useRef<HTMLDivElement | null>(null);
  const [launchChannel, setLaunchChannel] = useState(playbook.channels[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(elevenLabsVoices[0].id);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceStability, setVoiceStability] = useState(58);
  const [voiceStyle, setVoiceStyle] = useState(16);
  const [previewText, setPreviewText] = useState(elevenLabsVoices[0].sample);
  const [voicePreviewStatus, setVoicePreviewStatus] = useState("Ready to preview with ElevenLabs.");
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voicePreviewCompleted, setVoicePreviewCompleted] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const isConfirmedWorkspaceStep = step === 0 && hasBusinessType;
  const confirmedBusinessLabel = confirmedBusinessType.trim().length > 2 ? confirmedBusinessType.trim() : "business";
  const confirmedWorkspaceName = workspaceName.trim() || confirmedBusinessLabel;
  const zoomAiCapabilities = useMemo(
    () => zoomAiCapabilitiesFor(playbook, confirmedBusinessType),
    [playbook, confirmedBusinessType]
  );
  const groupedZoomAiCapabilities = useMemo(() => {
    const groups: { title: string; detail: string; items: GoalOption[] }[] = [];

    zoomAiCapabilities.forEach((capability) => {
      const title = capability.category || "Zoom AI capabilities";
      const detail = capability.categoryDetail || "Choose the capabilities this agent should use.";
      const existingGroup = groups.find((group) => group.title === title);

      if (existingGroup) {
        existingGroup.items.push(capability);
        return;
      }

      groups.push({ title, detail, items: [capability] });
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
  const stepCompletion = [
    hasBusinessType && selectedZoomCapabilityCount > 0,
    systemsComplete,
    agentsComplete,
    true,
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
    "Review the voice settings.",
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
  }, [playbook]);

  const clearTestRunTimers = () => {
    testRunTimers.current.forEach((timer) => window.clearTimeout(timer));
    testRunTimers.current = [];
  };

  useEffect(() => clearTestRunTimers, []);

  useEffect(() => {
    setPreviewText(selectedVoice.sample);
    setVoicePreviewStatus(`Ready to preview ${selectedVoice.name} with ElevenLabs.`);
    setVoicePreviewCompleted(false);
  }, [selectedVoice]);

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

  const confirmBusinessType = () => {
    const nextBusinessType = businessTypeDraft.trim();

    if (!nextBusinessType) {
      return;
    }

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
      setConnectionStatus(message);
      setDemoAuthConnector(activeConnector);
      setDemoAuthEmail("");
      setConnectors((current) =>
        current.map((connector) =>
          connector.key === activeConnector.key ? {
            ...connector,
            connected: false,
            connectionMessage: message,
            testStatus: "Setup required"
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
  const workflowIntegrations = connectors
    .filter((connector) => ["crm", "knowledge", "helpdesk", "telephony"].includes(connector.key))
    .slice(0, 4);
  const selectedWorkflowSuggestions = selectedCapabilities.slice(0, 5);
  const workflowAgents = [
    {
      id: "agentIntake",
      label: "Intake agent",
      name: agentDisplayName,
      trigger: "New customer request",
      job: agentPurpose.trim() || playbook.missions[0],
      tools: [crmSystem, "Zoom voice"],
      outcome: "Captures the request and confirms the next step."
    },
    {
      id: "agentAnswer",
      label: "Knowledge agent",
      name: "Answer agent",
      trigger: "Routine question",
      job: `Checks ${primaryKnowledgeSource} and customer context.`,
      tools: [primaryKnowledgeSource, crmSystem],
      outcome: "Answers from approved information."
    },
    {
      id: "agentHandoff",
      label: "Handoff agent",
      name: "Escalation agent",
      trigger: "Sensitive or urgent case",
      job: agentHandoff.trim() || "Summarises urgent or sensitive requests for the team.",
      tools: [helpdeskSystem, "Team alert"],
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
      tools: [crmSystem, helpdeskSystem],
      outcome: "Runs the configured workflow path."
    }))
  ];
  const activeWorkspaceAgent = workspaceAgents.find((agent) => agent.id === selectedWorkflowAgentId) || workspaceAgents[0];

  const gridSize = 24;
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

  const addWorkflowApp = () => {
    const nextConnector = connectors[(customApps.length + workflowIntegrations.length) % connectors.length];
    const id = `app-${Date.now()}`;
    const x = 456 + (customApps.length % 3) * 192;
    const y = 456 + Math.floor(customApps.length / 3) * 108;
    setCustomApps((current) => [...current, {
      id,
      name: nextConnector?.provider || "New app",
      detail: nextConnector?.name || "Connect an app"
    }]);
    setWorkflowLayout((current) => ({ ...current, [id]: { x, y } }));
  };

  const addWorkflowAction = () => {
    const id = `action-${Date.now()}`;
    const action = playbook.actions[(customActions.length + 1) % playbook.actions.length] || "New workflow action";
    const x = 792 + (customActions.length % 2) * 168;
    const y = 456 + Math.floor(customActions.length / 2) * 116;
    setCustomActions((current) => [...current, { id, name: action, detail: "Configure this action" }]);
    setWorkflowLayout((current) => ({ ...current, [id]: { x, y } }));
  };

  const playBrowserVoiceFallback = () => {
    if (!("speechSynthesis" in window)) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.rate = voiceSpeed;
    utterance.pitch = selectedVoice.id === "adam" ? 0.92 : 1;
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const previewVoice = async () => {
    const text = previewText.trim();

    if (!text) {
      setVoicePreviewStatus("Add a short line for the voice to read.");
      return;
    }

    setIsPreviewingVoice(true);
    setVoicePreviewStatus(`Generating ${selectedVoice.name} in ElevenLabs...`);

    try {
      const payload = await fetchJsonFromApi<SpeechPayload>("/api/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice.voiceId,
          modelId: "eleven_multilingual_v2",
          speed: voiceSpeed,
          stability: voiceStability / 100,
          similarityBoost: 0.78,
          style: voiceStyle / 100
        })
      });

      if (payload.mode === "audio" && payload.audioBase64) {
        const binary = window.atob(payload.audioBase64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: payload.contentType || "audio/mpeg" }));

        if (activeAudioUrl) {
          URL.revokeObjectURL(activeAudioUrl);
        }

        setActiveAudioUrl(audioUrl);
        setVoicePreviewCompleted(true);
        setVoicePreviewStatus(`${selectedVoice.name} preview is playing.`);
        window.setTimeout(() => {
          audioRef.current?.play().catch(() => setVoicePreviewStatus("Preview generated. Press play in the audio control."));
        }, 0);
        return;
      }

      const fallbackPlayed = playBrowserVoiceFallback();
      setVoicePreviewCompleted(fallbackPlayed);
      setVoicePreviewStatus(fallbackPlayed
        ? "ElevenLabs API key is not set. Playing browser preview instead."
        : payload.message || "ElevenLabs API key is not set.");
    } catch (error) {
      const fallbackPlayed = playBrowserVoiceFallback();
      setVoicePreviewCompleted(fallbackPlayed);
      setVoicePreviewStatus(fallbackPlayed
        ? "Voice API is offline. Playing browser preview instead."
        : error instanceof Error ? error.message : "Voice preview failed.");
    } finally {
      setIsPreviewingVoice(false);
    }
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
          <div className={`onboarding-heading ${isConfirmedWorkspaceStep ? "is-confirmed-workspace" : ""}`}>
            <p className="eyebrow">{isConfirmedWorkspaceStep ? "Workspace ready" : `Step ${step + 1} of ${setupSteps.length}`}</p>
            <h2>{isConfirmedWorkspaceStep ? confirmedWorkspaceName : setupSteps[step]}</h2>
            <p>
              {isConfirmedWorkspaceStep
                ? `${playbook.label} workspace shaped around ${confirmedBusinessLabel} calls.`
                : wizardDescription(step, connectedCount, connectors.length, playbook)}
            </p>
          </div>

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
	                        <div className="simple-workspace-form">
	                          <label className="workspace-field">
	                            Business name
	                            <input
	                              type="text"
	                              value={workspaceName}
                              onChange={(event) => setWorkspaceName(event.target.value)}
	                              placeholder="e.g. Bear Lane"
	                            />
	                          </label>
		                          <label className="workspace-field">
		                            Business type
	                            <input
	                              type="text"
	                              value={businessTypeDraft}
	                              onChange={(event) => setBusinessTypeDraft(event.target.value)}
	                              onKeyDown={(event) => {
	                                if (event.key === "Enter") {
	                                  event.preventDefault();
	                                  confirmBusinessType();
	                                }
	                              }}
		                                list="dashboard-business-type-examples"
		                                placeholder="e.g. dental clinic, estate agency, SaaS support team"
		                              />
		                              {draftMatch ? (
		                                <span className="business-match-preview">
		                                  Best match: <strong>{draftMatch?.playbook.label}</strong>
	                                </span>
		                              ) : null}
		                          </label>
	                          <button className="confirm-business-button" type="button" onClick={confirmBusinessType} disabled={!canConfirmBusiness}>
	                            Confirm
	                          </button>
	                          <datalist id="dashboard-business-type-examples">
	                            {businessTypeOptions.map((option) => <option value={option} key={option} />)}
	                          </datalist>
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
	                                      <p>{group.detail}</p>
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
                                  <button
                                    className={[
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
                                    <span>{agent.label}</span>
                                    <strong>{agent.name}</strong>
                                    <small>{agent.trigger}</small>
                                  </button>
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
                                  <button type="button" onClick={addWorkflowAgent}>+ Agent</button>
                                  <button type="button" onClick={addWorkflowApp}>+ App</button>
                                  <button type="button" onClick={addWorkflowAction}>+ Action</button>
                                  <button type="button">Edit prompt</button>
                                </div>
                              </div>
                              <div className="workflow-workspace-board">
                                <article className="workflow-node workflow-trigger">
                                  <b>Trigger</b>
                                  <strong>{activeWorkspaceAgent.trigger}</strong>
                                  <p>{confirmedBusinessType || playbook.label} request enters this agent.</p>
                                </article>
                                <i aria-hidden="true" />
                                <article className="workflow-node workflow-agent">
                                  <b>Instructions</b>
                                  <strong>{activeWorkspaceAgent.name}</strong>
                                  <p>{activeWorkspaceAgent.job}</p>
                                </article>
                                <i aria-hidden="true" />
                                <div className="workflow-tool-panel" aria-label={`${activeWorkspaceAgent.label} tools`}>
                                  <b>Tools</b>
                                  <div>
                                    {activeWorkspaceAgent.tools.map((tool) => (
                                      <span key={tool}>{tool}</span>
                                    ))}
                                  </div>
                                </div>
                                <i aria-hidden="true" />
                                <article className="workflow-node workflow-action-a">
                                  <b>Outcome</b>
                                  <strong>{activeWorkspaceAgent.outcome}</strong>
                                  <p>{activeWorkspaceAgent.label === "Handoff agent" ? `Uses ${helpdeskSystem} for escalation.` : `Keeps ${crmSystem} updated.`}</p>
                                </article>
                              </div>
                            </section>
                          </div>
                          {(customApps.length || customActions.length) ? (
                            <div className="workflow-addon-list" aria-label="Added workflow items">
                              {customApps.map((app) => (
                                <article className="workflow-tool-node" key={app.id}>
                                  <span className="connector-logo"><b>{app.name.slice(0, 1)}</b></span>
                                  <div>
                                    <strong>{app.name}</strong>
                                    <p>{app.detail}</p>
                                  </div>
                                </article>
                              ))}
                              {customActions.map((action) => (
                                <article className="workflow-node workflow-custom-action" key={action.id}>
                                  <b>Action</b>
                                  <strong>{action.name}</strong>
                                  <p>{action.detail}</p>
                                </article>
                              ))}
                            </div>
                          ) : null}
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
                            <span>Voice lab</span>
                            <strong>ElevenLabs preview</strong>
                          </div>
                          <b>{selectedVoice.role}</b>
                        </div>

                        <div className="voice-lab-grid">
                          <aside className="voice-rail" aria-label="ElevenLabs voices">
                            {elevenLabsVoices.map((voice, index) => (
                              <motion.button
                                className={voice.id === selectedVoice.id ? "is-active" : ""}
                                type="button"
                                onClick={() => setSelectedVoiceId(voice.id)}
                                initial={{ opacity: 0, x: -14 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.28, delay: index * 0.04 }}
                                key={voice.id}
                              >
                                <span>{voice.name.slice(0, 1)}</span>
                                <div>
                                  <strong>{voice.name}</strong>
                                  <small>{voice.tone}</small>
                                </div>
                              </motion.button>
                            ))}
                          </aside>

                          <section className="voice-console" aria-label={`${selectedVoice.name} preview`}>
                            <div className="voice-console-head">
                              <div>
                                <span>Selected voice</span>
                                <h3>{selectedVoice.name}</h3>
                              </div>
                              <button className="voice-preview-button" type="button" onClick={previewVoice} disabled={isPreviewingVoice}>
                                {isPreviewingVoice ? "Generating" : "Preview voice"}
                              </button>
                            </div>

                            <div className={`voice-signal ${isPreviewingVoice ? "is-loading" : ""}`} aria-hidden="true">
                              <div className="voice-wave">
                                <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
                              </div>
                            </div>

                            <label className="voice-script">
                              <span>Preview line</span>
                              <textarea
                                value={previewText}
                                onChange={(event) => setPreviewText(event.target.value)}
                                rows={3}
                              />
                            </label>

                            <div className="voice-playback">
                              <span>{voicePreviewStatus}</span>
                              {activeAudioUrl ? <audio ref={audioRef} src={activeAudioUrl} controls /> : <audio ref={audioRef} controls />}
                            </div>
                          </section>

                          <aside className="voice-settings" aria-label="Voice tuning">
                            <label>
                              <span>Speed</span>
                              <strong>{voiceSpeed.toFixed(2)}x</strong>
                              <input
                                type="range"
                                min="0.7"
                                max="1.2"
                                value={voiceSpeed}
                                step="0.01"
                                onChange={(event) => setVoiceSpeed(Number(event.target.value))}
                              />
                            </label>
                            <label>
                              <span>Stability</span>
                              <strong>{voiceStability}%</strong>
                              <input
                                type="range"
                                min="30"
                                max="85"
                                value={voiceStability}
                                step="1"
                                onChange={(event) => setVoiceStability(Number(event.target.value))}
                              />
                            </label>
                            <label>
                              <span>Expression</span>
                              <strong>{voiceStyle}%</strong>
                              <input
                                type="range"
                                min="0"
                                max="45"
                                value={voiceStyle}
                                step="1"
                                onChange={(event) => setVoiceStyle(Number(event.target.value))}
                              />
                            </label>
                            <label>
                              <span>Response</span>
                              <strong>{latency}ms</strong>
                              <input
                                type="range"
                                min="450"
                                max="1200"
                                value={latency}
                                step="10"
                                onChange={(event) => setLatency(Number(event.target.value))}
                              />
                            </label>
                            <label className="voice-switch">
                              <input type="checkbox" checked={bargeIn} onChange={(event) => setBargeIn(event.target.checked)} />
                              <span>Natural interruption</span>
                            </label>
                          </aside>
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
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const workspaceInitial = user.name?.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase();
  const routes = [
    { id: "ai", title: "AI workspace", meta: "Ask anything" },
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
  const openingAssistantMessage =
    `I have checked today's ${activeProject.name} workspace data. Your AI customer agent handled 42 calls, resolved 82% without a human handoff, and kept median voice response start at 640ms. The main thing worth your attention is a small cluster of billing exceptions and sensitive-policy escalations. I can walk you through the numbers, show the calls behind them, or draft the next action plan.`;
  const agentInsightMetrics = [
    { label: "Calls handled", value: "42", detail: "+18% vs yesterday" },
    { label: "Resolved by AI", value: "82%", detail: "34 calls contained" },
    { label: "Median response", value: "640ms", detail: "Stable voice start" },
    { label: "Review needed", value: "3", detail: "2 billing, 1 policy" }
  ];
  const agentHourlyVolume = [
    { label: "08:00", value: 7 },
    { label: "09:00", value: 11 },
    { label: "10:00", value: 8 },
    { label: "11:00", value: 6 },
    { label: "12:00", value: 10 }
  ];
  const handoffReasons = [
    { label: "Billing exception", value: 2, percent: 67 },
    { label: "Sensitive policy", value: 1, percent: 33 },
    { label: "Knowledge gap", value: 0, percent: 0 }
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
    chart?: { label: string; value: number }[];
    bars?: { label: string; value: number; percent: number }[];
    timeline?: { time: string; title: string; detail: string; tag: string }[];
    items?: { label: string; value: string; note: string }[];
    next: string[];
  };
  const dashboardPages: Record<string, CompletedDashboardPage> = {
    metrics: {
      eyebrow: "Performance today",
      title: "Customer agent health is steady.",
      summary: "Containment, speed, and review volume are all inside the launch target for the current workspace.",
      status: "On target",
      metrics: [
        { label: "Resolved by AI", value: "82%", detail: "+4 pts this week" },
        { label: "Calls handled", value: "42", detail: "12 live now" },
        { label: "Median response", value: "640ms", detail: "Voice start" },
        { label: "CSAT signal", value: "4.7", detail: "From 18 rated calls" }
      ],
      primaryTitle: "Volume by hour",
      primaryMeta: "Peak demand is still concentrated before midday.",
      chart: agentHourlyVolume.map((hour) => ({ ...hour, value: Math.max(42, hour.value * 14) })),
      items: [
        { label: "Containment target", value: "80%", note: "Current result is above launch threshold." },
        { label: "Handoff rate", value: "7%", note: "Three conversations need owner review." },
        { label: "Knowledge confidence", value: "91%", note: "Two draft answers are ready to approve." }
      ],
      next: ["Review the three handoffs", "Approve knowledge updates", "Export launch report"]
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
  type DashboardPage = (typeof dashboardPages)[keyof typeof dashboardPages];
  type DashboardChartBar = { label: string; value: number };
  type DashboardProgressBar = { label: string; value: number; percent: number };
  const hasChart = (page: DashboardPage): page is DashboardPage & { chart: DashboardChartBar[] } => "chart" in page;
  const hasBars = (page: DashboardPage): page is DashboardPage & { bars: DashboardProgressBar[] } => "bars" in page;
  const activeDashboardPage = activeRoute === "ai" ? null : dashboardPages[activeRoute];

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

  const sendAssistantMessage = (message: string) => {
    const prompt = message.trim();

    if (!prompt) {
      return;
    }

    const normalizedPrompt = prompt.toLowerCase();
    const reply = normalizedPrompt.includes("setup")
      ? "I can help finish setup. The fastest path is to confirm the business type, connect CRM or helpdesk, choose the handoff rules, then run the launch evaluation pack."
      : normalizedPrompt.includes("metric") || normalizedPrompt.includes("today")
        ? "Today's metrics are stable: 82% containment, 42 customer calls handled, 3 handoffs needing review, and 640ms median voice response start."
        : normalizedPrompt.includes("handoff")
          ? "There are 3 handoffs needing owner review. Two are billing exceptions and one is a sensitive policy question that should be checked before tomorrow's launch report."
          : "I can help with setup, metrics, calls, handoffs, knowledge gaps, workflow routing, integrations, launch reports, or agent tuning. Tell me the outcome you want and I will map the next steps.";

    setAssistantMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "agent", content: reply }
    ]);
    setAssistantInput("");
  };

  return (
    <main className="completed-dashboard" aria-label="Completed onboarding dashboard">
      <aside className="completed-sidebar">
        <a className="completed-brand" href="/" aria-label="RelayClarity home">
          <img src={relayclarityLogoUrl} alt="RelayClarity" />
        </a>

        <button
          className="completed-new-chat"
          type="button"
          onClick={() => {
            setActiveRoute("ai");
            sendAssistantMessage("Help me set up a new customer workspace");
          }}
        >
          <span aria-hidden="true">+</span>
          New workspace check
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
                  <div className="completed-metrics-kpi-rail" aria-label={`${activeRouteData.title} metrics`}>
                    {activeDashboardPage.metrics.map((metric, index) => (
                      <article className={index === 0 ? "is-primary" : ""} key={metric.label}>
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
                          <span>{activeDashboardPage.primaryMeta}</span>
                          <h2 id="completed-metrics-trend-title">{activeDashboardPage.primaryTitle}</h2>
                        </div>
                        <strong>42 total</strong>
                      </div>

                      {hasChart(activeDashboardPage) ? (
                        <div className="completed-metrics-chart" aria-label={activeDashboardPage.primaryTitle}>
                          {activeDashboardPage.chart.map((bar) => (
                            <div key={bar.label}>
                              <i style={{ height: `${bar.value}px` }}></i>
                              <span>{bar.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>

                    <aside className="completed-metrics-summary" aria-label="Health summary">
                      <div className="completed-metrics-panel-heading">
                        <div>
                          <span>Operating checks</span>
                          <h2>Launch health</h2>
                        </div>
                      </div>

                      {activeDashboardPage.items ? (
                        <div className="completed-metrics-health-list">
                          {activeDashboardPage.items.map((item) => (
                            <article key={item.label}>
                              <span>{item.value}</span>
                              <div>
                                <strong>{item.label}</strong>
                                <p>{item.note}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : null}

                      <div className="completed-metrics-actions">
                        <span>Next</span>
                        {activeDashboardPage.next.map((action) => (
                          <button type="button" key={action}>{action}</button>
                        ))}
                      </div>
                    </aside>
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
                      {isAssistantTyping && assistantMessages.length === 0 ? (
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
                                <strong>42 calls today</strong>
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
                                <strong>3 reviews</strong>
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
            placeholder="Ask RelayClarity anything about setup, metrics, calls, or next actions"
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
          />
          <button type="submit" aria-label="Send">
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

function wizardDescription(step: number, connectedCount: number, connectorTotal: number, playbook: BusinessPlaybook): string {
  const descriptions = [
    `Type the actual business type so RelayClarity can shape the workspace around ${playbook.label.toLowerCase()} calls.`,
    `Connect at least one system now. ${connectedCount} of ${connectorTotal} available systems are connected.`,
    "Set up what the agent handles, what it can do, and when it should hand off.",
    "Tune the voice experience before a real caller reaches the agent.",
    "Run launch gates that match realistic caller situations for this business.",
    "Generate the final pack for the production owner."
  ];

  return descriptions[step] || descriptions[0];
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
  const isZoom = connector.providerId === "zoom" || normalizeProviderName(connector.provider).includes("zoom");

  useEffect(() => {
    setLogoFailed(false);
  }, [connector.logoUrl]);

  return (
    <span className={`connector-logo ${large ? "large" : ""}`} aria-hidden="true">
      {isZoom && logoFailed ? (
        <svg className="connector-logo-wordmark" viewBox="0 0 92 28" role="img">
          <text x="46" y="20" textAnchor="middle">zoom</text>
        </svg>
      ) : null}
      {connector.logoUrl && !logoFailed ? (
        <img
          src={connector.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
        />
      ) : null}
      {isZoom && logoFailed ? null : <b>{connector.provider.slice(0, 1)}</b>}
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

function AnimatedStatCard({
  stat,
  index
}: {
  stat: (typeof marketStats)[number];
  index: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-18% 0px" });
  const [displayValue, setDisplayValue] = useState(stat.value);
  const decimals = stat.decimals || 0;

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const controls = animate(0, stat.value, {
      duration: 1.55 + index * 0.18,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplayValue
    });

    return () => controls.stop();
  }, [decimals, index, isInView, stat.value]);

  const formattedValue = displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <motion.a
      ref={ref}
      className="animated-stat-card"
      href={stat.href}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-18% 0px" }}
      transition={{ duration: 0.72, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <strong>
        {stat.prefix}
        {formattedValue}
        {stat.suffix}
      </strong>
      <span>{stat.label}</span>
    </motion.a>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
