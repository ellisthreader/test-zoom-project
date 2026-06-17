import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import chatoraLogoUrl from "../assets/chatoraai-logo.svg";
import demoAgentAvatarUrl from "../assets/demo-agent-avatar.png";
import workflowConfigureUrl from "../assets/workflow-configure.png";
import workflowEvaluateUrl from "../assets/workflow-evaluate.png";
import workflowMonitorUrl from "../assets/workflow-monitor.png";
import workflowHandoffUrl from "../assets/workflow-handoff.png";
import launchPhotoTestUrl from "../assets/launch-photo-test.png";
import launchPhotoControlUrl from "../assets/launch-photo-control.png";
import launchPhotoObserveUrl from "../assets/launch-photo-observe.png";
import launchPhotoLaunchUrl from "../assets/launch-photo-launch.png";
import "./styles.css";

type ScenarioKey = "billing" | "handoff" | "injection";

type Scenario = {
  title: string;
  label: string;
  score: number;
  result: string;
};

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

type GoalOption = {
  title: string;
  detail: string;
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
      title: "Virtual Agent",
      detail: `Handle ${businessLabel} conversations through ${primaryChannel} with consistent customer support.`
    },
    {
      title: "Intent Detection",
      detail: `Identify whether callers need ${primaryGoal}, ${secondaryGoal}, or a specialist handoff.`
    },
    {
      title: "Knowledge Answers",
      detail: `Answer from ${knowledgeSource}, approved policies, service details, and company FAQs.`
    },
    {
      title: "Task Automation",
      detail: `Automate structured actions such as ${primaryAction.toLowerCase()} and follow-up requests.`
    },
    {
      title: "System Workflows",
      detail: `Use ${systemOfRecord}, ${ticketingSystem}, billing, and service systems during the conversation.`
    },
    {
      title: "Live Agent Handoff",
      detail: "Transfer complex or urgent conversations with customer context and conversation history."
    },
    {
      title: "AI Expert Assist",
      detail: `Surface relevant guidance, next best actions, and ${playbook.label.toLowerCase()} context for staff.`
    },
    {
      title: "Auto Wrap-Up",
      detail: "Generate summaries, dispositions, notes, and follow-up actions after every contact."
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
    title: "Tell it what your business does",
    example: "Bookings, emergencies, FAQs, opening hours.",
    outcome: "A tailored agent brief in seconds.",
    image: workflowConfigureUrl
  },
  {
    title: "Try realistic customer questions",
    example: "Emergency appointment, order update, new lead.",
    outcome: "See exactly how the agent responds.",
    image: workflowEvaluateUrl
  },
  {
    title: "Keep an eye on every conversation",
    example: "Chats, calls, handoffs, and missed requests.",
    outcome: "The important activity stays visible.",
    image: workflowMonitorUrl
  },
  {
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

const testimonials = [
  {
    quote: "The first demo finally felt like something the operations team could trust. We could see the agent's answers, the handoff logic, and the exact launch risks in one place.",
    name: "Maya Chen",
    role: "Head of Customer Operations",
    company: "Northstar Health Support",
    metric: "42%",
    metricLabel: "fewer routine calls reaching reception",
    status: "Pilot team"
  },
  {
    quote: "ChatoraAI made the pilot review practical. Instead of debating the demo, we reviewed the scenarios, fixed the weak paths, and handed production a clear owner list.",
    name: "Daniel Brooks",
    role: "Service Delivery Lead",
    company: "Harbour Financial Group",
    metric: "3 weeks",
    metricLabel: "from test workspace to approved launch pack",
    status: "Launch review"
  },
  {
    quote: "The best part was being able to test real customer language before launch. It gave our agents confidence because every escalation arrived with context instead of noise.",
    name: "Amara Patel",
    role: "CX Transformation Manager",
    company: "Luma Retail",
    metric: "91%",
    metricLabel: "scenario readiness before go-live",
    status: "Production-ready"
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
const voiceProviderOptions = ["ElevenLabs expressive support voice", "Cartesia low-latency voice", "Azure enterprise neural voice"];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const apiBaseCandidates = Array.from(new Set([
  import.meta.env.DEV ? "http://127.0.0.1:8787" : apiBaseUrl,
  apiBaseUrl
])).filter((candidate) => candidate !== null && candidate !== undefined);

function apiPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchJsonFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const errors: string[] = [];

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(apiPath(baseUrl, path), init);
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
      errors.push(error instanceof Error ? error.message : "Request failed");
    }
  }

  throw new Error(errors[errors.length - 1] || "Integration API is unavailable");
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
  return current.map((connector) => ({
    ...connector,
    ...providerMetadata(playbook.connectorProviders[connector.key] || connector.provider, connector.key),
    provider: playbook.connectorProviders[connector.key] || connector.provider
  }));
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
  const demoChatThreadRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<"home" | "dashboard">(() =>
    new URLSearchParams(window.location.search).get("view") === "dashboard" ? "dashboard" : "home"
  );
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
  const [activeLaunchStep, setActiveLaunchStep] = useState(0);
  const { scrollY, scrollYProgress } = useScroll();
  const { scrollYProgress: workflowProgress } = useScroll({
    target: platformRef,
    offset: ["start start", "end end"]
  });
  const heroY = useTransform(scrollY, [0, 820], [0, 96]);
  const heroScale = useTransform(scrollY, [0, 820], [1.06, 1.16]);
  const heroOpacity = useTransform(scrollY, [0, 720], [1, 0.6]);
  const heroGridY = useTransform(scrollY, [0, 820], [0, -64]);
  const workflowX = useTransform(workflowProgress, [0, 1], ["0%", "-45%"]);
  const selectedScenario = scenarios[scenarioKey];
  const demoPlaybook = useMemo(() => getBusinessPlaybook(demoBusinessType), [demoBusinessType]);

  useEffect(() => {
    const thread = demoChatThreadRef.current;
    if (!thread) {
      return;
    }

    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [demoMessages, isDemoTyping]);

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
    return <Dashboard onSignOut={() => setView("home")} />;
  }

  const generateReport = () => {
    setReport(
      [
        "ChatoraAI launch readiness summary",
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
        <a className="brand" href="#home" aria-label="ChatoraAI home">
          <img src={chatoraLogoUrl} alt="ChatoraAI" />
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
          <button className="primary-button" type="button" onClick={() => setView("dashboard")}>
            Open dashboard
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <motion.div className="hero-media" style={{ y: heroY, scale: heroScale, opacity: heroOpacity }} aria-hidden="true" />
          <motion.div className="hero-grid" style={{ y: heroGridY }} aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow">Voice agent deployment platform</p>
            <h1>ChatoraAI</h1>
            <p className="hero-lede">
              Launch AI phone and chat agents that answer customers, qualify requests, and hand off when it matters.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={() => setView("dashboard")}>
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
              <motion.div className="workflow-grid" style={{ x: workflowX }}>
                {workflow.map((step, index) => (
                  <Reveal className="workflow-card" key={step.title}>
                    <div className="workflow-image">
                      <img src={step.image} alt="" loading="lazy" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
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

        <section className="section marketing-video-section">
          <Reveal className="marketing-video-copy">
            <p className="eyebrow">Launch confidence</p>
            <h2>Launch AI voice agents with proof, not guesswork.</h2>
            <p>
              A short ChatoraAI launch story: from unclear demo risk to a clean
              readiness review your team can approve.
            </p>
          </Reveal>

          <Reveal className="marketing-video-shell">
            <video
              className="marketing-video"
              src="/chatoraai-launch-video.mp4"
              aria-label="ChatoraAI launch confidence marketing video"
              autoPlay
              controls
              loop
              muted
              playsInline
            />
          </Reveal>
        </section>

        <section className="section demo-section" id="demo">
          <Reveal className="demo-copy">
            <p className="eyebrow">Try it yourself</p>
            <h2>See how ChatoraAI would work for your business.</h2>
            <p>
              Add a few business details and test the agent straight away in chat or by phone.
            </p>
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
                      <span>Step 1</span>
                      <strong>Tell us about the business.</strong>
                    </div>
                    <b>Draft</b>
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
                  <button className="secondary-button" type="button" onClick={() => setView("dashboard")}>
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

        <section className="section testimonials-section" id="testimonials">
          <Reveal className="testimonials-heading">
            <p className="eyebrow">Customer reviews</p>
            <h2>Teams trust the launch workflow before customers ever hear the agent.</h2>
            <p>
              Realistic launch stories you can replace later with approved customer quotes and production outcomes.
            </p>
          </Reveal>

          <div className="testimonials-stream" aria-label="Customer testimonials">
            {testimonials.map((testimonial, index) => (
              <motion.article
                className="testimonial-row"
                key={testimonial.name}
                initial={{ opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-16% 0px" }}
                transition={{ duration: 0.72, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="testimonial-outcome"
                  animate={{ y: index % 2 === 0 ? [0, -8, 0] : [0, 8, 0] }}
                  transition={{ duration: 5.8 + index, repeat: Infinity, ease: "easeInOut" }}
                >
                  <strong>{testimonial.metric}</strong>
                  <span>{testimonial.metricLabel}</span>
                </motion.div>

                <div className="testimonial-copy">
                  <div className="testimonial-kicker">
                    <span>{testimonial.status}</span>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </div>
                  <blockquote>{testimonial.quote}</blockquote>
                  <p>
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}, {testimonial.company}</span>
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [businessTypeDraft, setBusinessTypeDraft] = useState("");
  const [confirmedBusinessType, setConfirmedBusinessType] = useState("");
  const [launchOwner] = useState("");
  const hasBusinessType = confirmedBusinessType.trim().length > 0;
  const canConfirmBusiness = businessTypeDraft.trim().length > 0;
  const draftMatch = useMemo(() => canConfirmBusiness ? getBusinessMatch(businessTypeDraft) : null, [businessTypeDraft, canConfirmBusiness]);
  const confirmedMatch = useMemo(() => hasBusinessType ? getBusinessMatch(confirmedBusinessType) : null, [confirmedBusinessType, hasBusinessType]);
  const playbook = confirmedMatch?.playbook || fallbackPlaybook;
  const [connectors, setConnectors] = useState(() => tailorConnectors(fallbackPlaybook));
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [latency, setLatency] = useState(720);
  const [bargeIn, setBargeIn] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [useCase, setUseCase] = useState(playbook.missions[0]);
  const [agentName, setAgentName] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [agentKnowledge, setAgentKnowledge] = useState("");
  const [agentHandoff, setAgentHandoff] = useState("");
  const [workflowLayout, setWorkflowLayout] = useState<Record<string, { x: number; y: number }>>({
    trigger: { x: 32, y: 220 },
    agent: { x: 300, y: 190 },
    condition: { x: 610, y: 220 },
    actionTeam: { x: 880, y: 110 },
    actionRecord: { x: 880, y: 360 }
  });
  const [customAgents, setCustomAgents] = useState<{ id: string; name: string; job: string }[]>([]);
  const [customApps, setCustomApps] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [customActions, setCustomActions] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [workflowDrag, setWorkflowDrag] = useState<{ id: string; width: number } | null>(null);
  const workflowCanvasRef = useRef<HTMLDivElement | null>(null);
  const [launchChannel, setLaunchChannel] = useState(playbook.channels[0]);
  const [voiceProvider, setVoiceProvider] = useState(voiceProviderOptions[0]);
  const [connectorCategory, setConnectorCategory] = useState<ConnectorGroup>("core");
  const [activeConnectorKey, setActiveConnectorKey] = useState("crm");
  const [report, setReport] = useState("Prepare the launch pack when setup, connectors, voice tuning, and evaluation evidence are ready.");
  const [isTailoring, setIsTailoring] = useState(false);
  const [integrationCatalog, setIntegrationCatalog] = useState<IntegrationProvider[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [demoAuthConnector, setDemoAuthConnector] = useState<Connector | null>(null);
  const [demoAuthEmail, setDemoAuthEmail] = useState("");
  const [demoApprovalCode, setDemoApprovalCode] = useState("");
  const isConfirmedWorkspaceStep = step === 0 && hasBusinessType;
  const confirmedWorkspaceName = workspaceName.trim() || confirmedBusinessType;
  const zoomAiCapabilities = useMemo(
    () => zoomAiCapabilitiesFor(playbook, confirmedBusinessType),
    [playbook, confirmedBusinessType]
  );
  const selectedZoomCapabilityCount = selectedCapabilities.length;
  const canContinue = step !== 0 || (hasBusinessType && selectedZoomCapabilityCount > 0);

  const connectedCount = connectors.filter((connector) => connector.connected).length;
  const requiredConnectedCount = connectors.filter((connector) => isRequiredConnector(connector.key) && connector.connected).length;
  const readiness = Math.min(98, 28 + Math.round((connectedCount / connectors.length) * 48) + (latency <= 800 && bargeIn ? 18 : 10));
  const selectedScenario = playbook.tests[scenarioIndex] || playbook.tests[0] || fallbackPlaybook.tests[0];
  const setupSteps = ["Workspace", "Systems", "Agent", "Voice", "Tests", "Launch"];
  const visibleConnectors = connectors.filter((connector) => connectorGroup(connector.key) === connectorCategory);
  const activeConnector = connectors.find((connector) => connector.key === activeConnectorKey) || connectors[0];

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
  }, [playbook]);

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
      if (event.data?.type !== "chatoraai.integration.connected" || !event.data.provider) {
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
        window.open(connection.authUrl, "chatoraai-integration-oauth", "width=720,height=760");
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

    setReport(
      [
        "ChatoraAI production launch pack",
        `Customer: ${workspaceName.trim() || "New customer workspace"}`,
        `Business type: ${confirmedBusinessType.trim() || "Unspecified business"}`,
        `Matched playbook: ${playbook.label}`,
        `Launch owner: ${launchOwner.trim() || "Unassigned"}`,
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
        `Next action: ${playbook.launchFocus}`
      ].join("\n")
    );
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

  const activeStatusMessage = activeConnector.connectionMessage || connectionStatus || connectorDescriptions[activeConnector.key];
  const activeConnectionLabel = activeConnector.connected
    ? "Connected"
    : "Not linked";
  const activeTestLabel = activeConnector.testStatus
    ? activeConnector.testStatus === "Setup required" || activeConnector.testStatus === "Awaiting OAuth" || activeConnector.testStatus === "Checking" || activeConnector.testStatus === "Connected"
      ? activeConnector.testStatus
      : `Test ${activeConnector.testStatus}`
    : "Ready to link";
  const activeTestChecks = activeConnector.connectionMode === "demo" ? [] : activeConnector.testChecks || [];
  const primaryKnowledgeSource = playbook.connectorProviders.knowledge || "Knowledge base";
  const crmSystem = playbook.connectorProviders.crm || "CRM";
  const helpdeskSystem = playbook.connectorProviders.helpdesk || "Helpdesk";
  const agentDisplayName = agentName.trim() || `${playbook.label} assistant`;
  const workflowIntegrations = connectors
    .filter((connector) => ["crm", "knowledge", "helpdesk", "telephony"].includes(connector.key))
    .slice(0, 4);
  const selectedWorkflowSuggestions = selectedCapabilities.slice(0, 5);

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
    const index = customAgents.length + 2;
    const id = `agent-${Date.now()}`;
    const x = 48 + (customAgents.length % 4) * 192;
    const y = 456 + Math.floor(customAgents.length / 4) * 132;
    setCustomAgents((current) => [...current, {
      id,
      name: `Agent ${index}`,
      job: selectedWorkflowSuggestions[customAgents.length % Math.max(1, selectedWorkflowSuggestions.length)] || playbook.goals[0]?.title || "Handle a new workflow"
    }]);
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

  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <a className="brand" href="/" aria-label="ChatoraAI home">
          <img src={chatoraLogoUrl} alt="ChatoraAI" />
        </a>
        <div className="onboarding-topbar-actions">
          <button className="quiet-button" type="button" onClick={onSignOut}>
            Back to site
          </button>
          <button className="dark-button" type="button" onClick={generateLaunchPack}>
            Launch pack
          </button>
        </div>
      </header>

      <section className="onboarding-card" aria-label="Account setup wizard">
        <div className="onboarding-main">
          <div className="onboarding-progress" aria-label="Setup progress">
            {setupSteps.map((item, index) => (
              <button
                className={index === step ? "is-active" : index < step ? "is-complete" : ""}
                type="button"
                onClick={() => setStep(index)}
                key={item}
              >
                <span>{index + 1}</span>
                <b>{item}</b>
              </button>
            ))}
          </div>

          <div className={`onboarding-heading ${isConfirmedWorkspaceStep ? "is-confirmed-workspace" : ""}`}>
            <p className="eyebrow">{isConfirmedWorkspaceStep ? "Workspace ready" : `Step ${step + 1} of ${setupSteps.length}`}</p>
            <h2>{isConfirmedWorkspaceStep ? confirmedWorkspaceName : setupSteps[step]}</h2>
            <p>
              {isConfirmedWorkspaceStep
                ? `${playbook.label} workspace shaped around ${confirmedBusinessType.trim()} calls.`
                : wizardDescription(step, requiredConnectedCount, requiredConnectorKeys.length, playbook)}
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
		                                  Best match: <strong>{draftMatch.playbook.label}</strong>
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
	                          <div className="workspace-confirmation-grid" aria-label="Select Zoom AI capabilities">
	                            {zoomAiCapabilities.map((goal, index) => (
	                              <motion.button
	                                className={`workspace-confirmation-card ${selectedCapabilities.includes(goal.title) ? "is-selected" : ""}`}
	                                type="button"
	                                aria-pressed={selectedCapabilities.includes(goal.title)}
	                                onClick={() => toggleCapability(goal.title)}
	                                initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
	                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
	                                transition={{ delay: 0.32 + index * 0.14, duration: 0.82, ease: [0.16, 1, 0.3, 1] }}
	                                key={goal.title}
	                              >
	                                <span className="workspace-card-index">{String(index + 1).padStart(2, "0")}</span>
	                                <strong>{goal.title}</strong>
	                                <p>{goal.detail}</p>
	                                <small>{selectedCapabilities.includes(goal.title) ? "Selected" : "Select"}</small>
	                              </motion.button>
	                            ))}
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
	                        <div className="connection-actions">
	                          <button className="dark-button" type="button" onClick={connectActiveConnector} disabled={isConnecting}>
	                            {isConnecting ? "Connecting..." : activeConnector.connected ? "Reconnect" : `Connect ${activeConnector.provider}`}
	                          </button>
                          <button className="quiet-button" type="button" onClick={testActiveConnector} disabled={!activeConnector.connected}>
                            Test link
                          </button>
                        </div>
                        <div className={`connection-status-panel ${activeConnector.connected ? "is-linked" : ""}`} aria-live="polite">
	                          <div>
	                            <span>{activeConnectionLabel}</span>
	                            <strong>{activeTestLabel}</strong>
	                          </div>
                          <p>{activeStatusMessage}</p>
	                          {activeConnector.connectionMode !== "demo" && activeConnector.scopes?.length ? (
                            <div className="integration-scope-list" aria-label={`${activeConnector.provider} account scopes`}>
                              {activeConnector.scopes.slice(0, 3).map((scope) => <span key={scope}>{scope}</span>)}
                            </div>
                          ) : null}
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
                            <ProviderLogo connector={demoAuthConnector} large />
                            <div>
                              <span>Sandbox authorization</span>
                              <strong id="demo-auth-title">{demoAuthConnector.provider}</strong>
                            </div>
                          </div>
                          <p>
                            This creates a dashboard-only demo connection for testing the setup flow. It does not sign in to {demoAuthConnector.provider} or access live account data.
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
                        <div className="agent-workflow-header">
                          <div>
                            <span>Workflow builder</span>
                            <strong>Create a custom agent for {confirmedBusinessType || playbook.label}</strong>
                          </div>
                          <div className="workflow-builder-actions">
                            <button type="button" onClick={addWorkflowAgent}>+ Agent</button>
                            <button type="button" onClick={addWorkflowApp}>+ App</button>
                            <button type="button" onClick={addWorkflowAction}>+ Action</button>
                          </div>
                        </div>
                        <div className="workflow-quick-setup">
                          <label>
                            Agent name
                            <input
                              type="text"
                              value={agentName}
                              onChange={(event) => setAgentName(event.target.value)}
                              placeholder={`${playbook.label} assistant`}
                            />
                          </label>
                          <label>
                            Agent job
                            <input
                              type="text"
                              value={agentPurpose}
                              onChange={(event) => {
                                setAgentPurpose(event.target.value);
                                setUseCase(event.target.value || playbook.missions[0]);
                              }}
                              placeholder={playbook.missions[0]}
                            />
                          </label>
                          <label>
                            Knowledge
                            <input
                              type="text"
                              value={agentKnowledge}
                              onChange={(event) => setAgentKnowledge(event.target.value)}
                              placeholder={`Use ${primaryKnowledgeSource}, policies, FAQs, and customer records`}
                            />
                          </label>
                        </div>
                        {selectedWorkflowSuggestions.length ? (
                          <div className="workflow-suggestion-row" aria-label="Workspace-selected agent capabilities">
                            {selectedWorkflowSuggestions.map((suggestion) => <span key={suggestion}>{suggestion}</span>)}
                          </div>
                        ) : null}
                        <div className="agent-workflow-canvas" ref={workflowCanvasRef} onMouseMove={continueWorkflowMouseDrag} onMouseUp={stopWorkflowMouseDrag} onMouseLeave={stopWorkflowMouseDrag}>
                          <article className="workflow-node workflow-trigger" onMouseDown={(event) => startWorkflowMouseDrag("trigger", event)} onPointerDown={(event) => startWorkflowDrag("trigger", event)} onPointerMove={(event) => continueWorkflowDrag("trigger", event)} style={workflowPositionStyle("trigger")}>
                            <b>Trigger</b>
                            <strong>Customer message</strong>
                            <p>{confirmedBusinessType || playbook.label} request starts the agent.</p>
                            <button type="button">Change</button>
                          </article>

                          <article className="workflow-node workflow-agent" onMouseDown={(event) => startWorkflowMouseDrag("agent", event, 180)} onPointerDown={(event) => startWorkflowDrag("agent", event, 180)} onPointerMove={(event) => continueWorkflowDrag("agent", event, 180)} style={workflowPositionStyle("agent")}>
                            <b>AI agent</b>
                            <strong>{agentDisplayName}</strong>
                            <p>{agentPurpose.trim() || playbook.missions[0]}</p>
                            <button type="button">Edit prompt</button>
                          </article>

                          <div className="workflow-tool-stack" aria-label="Connected app tools">
                            {workflowIntegrations.map((connector) => (
                              <article className="workflow-tool-node" key={connector.key}>
                                <ProviderLogo connector={connector} />
                                <div>
                                  <strong>{connector.provider}</strong>
                                  <p>{connector.connected ? "Connected" : "Add app"}</p>
                                </div>
                              </article>
                            ))}
                            <button className="workflow-add-tool" type="button" onClick={addWorkflowApp}>+ Add integration</button>
                          </div>

                          <article className="workflow-node workflow-condition" onMouseDown={(event) => startWorkflowMouseDrag("condition", event)} onPointerDown={(event) => startWorkflowDrag("condition", event)} onPointerMove={(event) => continueWorkflowDrag("condition", event)} style={workflowPositionStyle("condition")}>
                            <b>Condition</b>
                            <strong>Needs human?</strong>
                            <input
                              type="text"
                              value={agentHandoff}
                              onChange={(event) => setAgentHandoff(event.target.value)}
                              placeholder="When should this agent hand off?"
                            />
                          </article>

                          <article className="workflow-node workflow-action-a" onMouseDown={(event) => startWorkflowMouseDrag("actionTeam", event)} onPointerDown={(event) => startWorkflowDrag("actionTeam", event)} onPointerMove={(event) => continueWorkflowDrag("actionTeam", event)} style={workflowPositionStyle("actionTeam")}>
                            <b>Action</b>
                            <strong>Send to team</strong>
                            <p>Route with summary and customer context.</p>
                          </article>

                          <article className="workflow-node workflow-action-b" onMouseDown={(event) => startWorkflowMouseDrag("actionRecord", event)} onPointerDown={(event) => startWorkflowDrag("actionRecord", event)} onPointerMove={(event) => continueWorkflowDrag("actionRecord", event)} style={workflowPositionStyle("actionRecord")}>
                            <b>Action</b>
                            <strong>Update record</strong>
                            <p>Save notes in {crmSystem} or {helpdeskSystem}.</p>
                          </article>
                          {customAgents.map((agent) => (
                            <article className="workflow-node workflow-custom-agent" onMouseDown={(event) => startWorkflowMouseDrag(agent.id, event, 180)} onPointerDown={(event) => startWorkflowDrag(agent.id, event, 180)} onPointerMove={(event) => continueWorkflowDrag(agent.id, event, 180)} style={workflowPositionStyle(agent.id)} key={agent.id}>
                              <b>AI agent</b>
                              <strong>{agent.name}</strong>
                              <p>{agent.job}</p>
                              <button type="button">Edit prompt</button>
                            </article>
                          ))}
                          {customApps.map((app) => (
                            <article className="workflow-tool-node workflow-floating-tool" onMouseDown={(event) => startWorkflowMouseDrag(app.id, event, 180)} onPointerDown={(event) => startWorkflowDrag(app.id, event, 180)} onPointerMove={(event) => continueWorkflowDrag(app.id, event, 180)} style={workflowPositionStyle(app.id)} key={app.id}>
                              <span className="connector-logo"><b>{app.name.slice(0, 1)}</b></span>
                              <div>
                                <strong>{app.name}</strong>
                                <p>{app.detail}</p>
                              </div>
                            </article>
                          ))}
                          {customActions.map((action) => (
                            <article className="workflow-node workflow-custom-action" onMouseDown={(event) => startWorkflowMouseDrag(action.id, event)} onPointerDown={(event) => startWorkflowDrag(action.id, event)} onPointerMove={(event) => continueWorkflowDrag(action.id, event)} style={workflowPositionStyle(action.id)} key={action.id}>
                              <b>Action</b>
                              <strong>{action.name}</strong>
                              <p>{action.detail}</p>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="voice-step">
                      <div className="voice-preview">
                        <span>Voice preview</span>
                        <strong>{playbook.label} voice: clear, useful, and careful around risk.</strong>
                        <div className="voice-wave" aria-hidden="true">
                          <i /><i /><i /><i /><i /><i /><i />
                        </div>
                      </div>
                      <div className="voice-controls">
                        <label>
                          TTS provider
                          <CustomSelect value={voiceProvider} options={voiceProviderOptions} onChange={setVoiceProvider} />
                        </label>
                        <label>
                          Response start <strong>{latency}ms</strong>
                          <input
                            type="range"
                            min="450"
                            max="1200"
                            value={latency}
                            step="10"
                            onChange={(event) => setLatency(Number(event.target.value))}
                          />
                        </label>
                        <label className="premium-toggle">
                          <input type="checkbox" checked={bargeIn} onChange={(event) => setBargeIn(event.target.checked)} />
                          <span>Let callers interrupt naturally</span>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="test-step">
                      <div className="premium-test-grid">
                        {playbook.tests.map((scenario, index) => (
                          <button
                            className={scenarioIndex === index ? "is-active" : ""}
                            type="button"
                            onClick={() => setScenarioIndex(index)}
                            key={scenario.title}
                          >
                            <span>{scenario.label}</span>
                            <strong>{scenario.title}</strong>
                          </button>
                        ))}
                      </div>
                      <div className="test-run-panel">
                        <div>
                          <span>Selected test</span>
                          <strong>{selectedScenario.title}</strong>
                        </div>
                        <div className="test-score">
                          <span>Score</span>
                          <strong>{selectedScenario.score}%</strong>
                        </div>
                        <p>{selectedScenario.result}</p>
                      </div>
                    </div>
                  ) : null}

                  {step === 5 ? <pre className="premium-report">{report}</pre> : null}
                </motion.div>
              </AnimatePresence>

              <div className="onboarding-actions">
                <button className="quiet-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
                  Back
                </button>
                <button className="dark-button" type="button" onClick={nextStep} disabled={!canContinue}>
                  {step === setupSteps.length - 1 ? "Generate launch pack" : "Continue"}
                </button>
              </div>
          </motion.section>
        </div>
      </section>
    </main>
  );
}

function wizardDescription(step: number, connectedCount: number, connectorTotal: number, playbook: BusinessPlaybook): string {
  const descriptions = [
    `Type the actual business type so ChatoraAI can shape the workspace around ${playbook.label.toLowerCase()} calls.`,
    `Connect the systems this ${playbook.label.toLowerCase()} setup needs. ${connectedCount} of ${connectorTotal} are connected.`,
    "Set up what the agent handles, what it can do, and when it should hand off.",
    "Tune the voice experience before a real caller reaches the agent.",
    "Run launch gates that match realistic caller situations for this business.",
    "Generate the final pack for the production owner."
  ];

  return descriptions[step] || descriptions[0];
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
      initial={{ opacity: 0, y: 26 }}
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
  const [displayValue, setDisplayValue] = useState(0);
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
      initial={{ opacity: 0, y: 34, scale: 0.97 }}
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
