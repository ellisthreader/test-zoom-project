import { config, hasOpenAI } from '../config.js';
import { createJsonResponse } from './client.js';

type WorkspaceMetricSnapshot = {
  callsHandled?: number;
  activeCalls?: number;
  containedCalls?: number;
  handoffs?: number;
  openRisks?: number;
  p95LatencyMs?: number;
  csat?: number;
  firstContactResolution?: number;
  recontactRate?: number;
  humanHoursSaved?: number;
  citationCoverage?: number;
  retrievalMisses?: number;
  staleSources?: number;
  draftAnswers?: number;
  policyViolations?: number;
  lowConfidenceAnswers?: number;
  sensitiveEscalations?: number;
  crmLookupSuccess?: number;
  ticketWriteSuccess?: number;
  webhookErrors?: number;
  knowledgeSyncMinutes?: number;
  hourlyVolume?: number[];
};

type WorkspaceAssistantRequest = {
  message: string;
  project?: {
    id?: string;
    name?: string;
    meta?: string;
    businessType?: string;
  };
  metrics?: WorkspaceMetricSnapshot;
  history?: { role?: string; content?: string; text?: string }[];
  mockAi?: boolean;
};

type WorkspaceChart = {
  id: string;
  title: string;
  kind: 'bar' | 'progress';
  data: { label: string; value: number; display: string; percent?: number }[];
};

type WorkspaceAssistantResponse = {
  reply: string;
  summary: string;
  nextActions: string[];
  focusArea: string;
  model: string;
  mode: 'openai' | 'mock';
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
  charts: WorkspaceChart[];
};

const workspaceAssistantSchema = {
  name: 'workspace_assistant_reply',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'summary', 'nextActions', 'focusArea'],
    properties: {
      reply: { type: 'string' },
      summary: { type: 'string' },
      nextActions: { type: 'array', items: { type: 'string' } },
      focusArea: { type: 'string' },
    },
  },
};

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanMetrics(metrics: WorkspaceMetricSnapshot = {}) {
  const callsHandled = Math.max(0, Math.round(numberOr(metrics.callsHandled, 0)));
  const containedCalls = clamp(Math.round(numberOr(metrics.containedCalls, Math.round(callsHandled * 0.8))), 0, Math.max(1, callsHandled));
  const handoffs = Math.max(0, Math.round(numberOr(metrics.handoffs, Math.max(0, callsHandled - containedCalls))));
  const hourlyVolume = Array.isArray(metrics.hourlyVolume)
    ? metrics.hourlyVolume.slice(0, 8).map((value) => Math.max(0, Math.round(numberOr(value, 0))))
    : [];

  return {
    callsHandled,
    activeCalls: Math.max(0, Math.round(numberOr(metrics.activeCalls, 0))),
    containedCalls,
    handoffs,
    openRisks: Math.max(0, Math.round(numberOr(metrics.openRisks, 0))),
    p95LatencyMs: Math.max(0, Math.round(numberOr(metrics.p95LatencyMs, 0))),
    csat: clamp(numberOr(metrics.csat, 0), 0, 5),
    firstContactResolution: clamp(Math.round(numberOr(metrics.firstContactResolution, 0)), 0, 100),
    recontactRate: clamp(Math.round(numberOr(metrics.recontactRate, 0)), 0, 100),
    humanHoursSaved: Math.max(0, numberOr(metrics.humanHoursSaved, 0)),
    citationCoverage: clamp(Math.round(numberOr(metrics.citationCoverage, 0)), 0, 100),
    retrievalMisses: Math.max(0, Math.round(numberOr(metrics.retrievalMisses, 0))),
    staleSources: Math.max(0, Math.round(numberOr(metrics.staleSources, 0))),
    draftAnswers: Math.max(0, Math.round(numberOr(metrics.draftAnswers, 0))),
    policyViolations: Math.max(0, Math.round(numberOr(metrics.policyViolations, 0))),
    lowConfidenceAnswers: Math.max(0, Math.round(numberOr(metrics.lowConfidenceAnswers, 0))),
    sensitiveEscalations: Math.max(0, Math.round(numberOr(metrics.sensitiveEscalations, 0))),
    crmLookupSuccess: clamp(Math.round(numberOr(metrics.crmLookupSuccess, 0)), 0, 100),
    ticketWriteSuccess: clamp(Math.round(numberOr(metrics.ticketWriteSuccess, 0)), 0, 100),
    webhookErrors: Math.max(0, Math.round(numberOr(metrics.webhookErrors, 0))),
    knowledgeSyncMinutes: Math.max(0, Math.round(numberOr(metrics.knowledgeSyncMinutes, 0))),
    hourlyVolume,
  };
}

function buildCharts(metrics: ReturnType<typeof cleanMetrics>): WorkspaceChart[] {
  const hourLabels = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 'Now'];
  const hourly = hourLabels.map((label, index) => ({
    label,
    value: metrics.hourlyVolume[index] || 0,
    display: String(metrics.hourlyVolume[index] || 0),
  }));
  const maxHandoff = Math.max(1, metrics.handoffs);
  const sensitive = Math.min(metrics.sensitiveEscalations, metrics.handoffs);
  const knowledgeGap = Math.min(metrics.retrievalMisses, Math.max(0, metrics.handoffs - sensitive));
  const billing = Math.max(0, metrics.handoffs - sensitive - knowledgeGap);
  const containmentRate = Math.round((metrics.containedCalls / Math.max(1, metrics.callsHandled)) * 100);
  const handoffRate = Math.round((metrics.handoffs / Math.max(1, metrics.callsHandled)) * 100);
  const openRiskRate = Math.min(100, Math.round((metrics.openRisks / Math.max(1, metrics.callsHandled)) * 100));

  return [
    {
      id: 'hourly-volume',
      title: 'Hourly call volume',
      kind: 'bar',
      data: hourly,
    },
    {
      id: 'outcome-mix',
      title: 'Customer outcome mix',
      kind: 'progress',
      data: [
        { label: 'Solved by AI', value: metrics.containedCalls, display: `${containmentRate}%`, percent: containmentRate },
        { label: 'Human handoff', value: metrics.handoffs, display: `${handoffRate}%`, percent: handoffRate },
        { label: 'Open risk', value: metrics.openRisks, display: String(metrics.openRisks), percent: openRiskRate },
      ],
    },
    {
      id: 'handoff-reasons',
      title: 'Handoff reasons',
      kind: 'progress',
      data: [
        { label: 'Billing exception', value: billing, display: String(billing), percent: Math.round((billing / maxHandoff) * 100) },
        { label: 'Sensitive policy', value: sensitive, display: String(sensitive), percent: Math.round((sensitive / maxHandoff) * 100) },
        { label: 'Knowledge gap', value: knowledgeGap, display: String(knowledgeGap), percent: Math.round((knowledgeGap / maxHandoff) * 100) },
      ],
    },
    {
      id: 'knowledge-quality',
      title: 'Knowledge quality',
      kind: 'progress',
      data: [
        { label: 'Source coverage', value: metrics.citationCoverage, display: `${metrics.citationCoverage}%`, percent: metrics.citationCoverage },
        { label: 'Lookup misses', value: metrics.retrievalMisses, display: String(metrics.retrievalMisses), percent: Math.min(100, metrics.retrievalMisses * 8) },
        { label: 'Draft updates', value: metrics.draftAnswers, display: String(metrics.draftAnswers), percent: Math.min(100, metrics.draftAnswers * 12) },
      ],
    },
  ];
}

function buildMetricSummary(metrics: ReturnType<typeof cleanMetrics>) {
  const containmentRate = Math.round((metrics.containedCalls / Math.max(1, metrics.callsHandled)) * 100);
  const handoffRate = Math.round((metrics.handoffs / Math.max(1, metrics.callsHandled)) * 100);

  return {
    callsHandled: metrics.callsHandled,
    activeCalls: metrics.activeCalls,
    containmentRate,
    handoffRate,
    handoffs: metrics.handoffs,
    openRisks: metrics.openRisks,
    latencySeconds: Number((metrics.p95LatencyMs / 1000).toFixed(1)),
    citationCoverage: metrics.citationCoverage,
    policyViolations: metrics.policyViolations,
  };
}

function fallbackWorkspaceReply(message: string, metrics: ReturnType<typeof cleanMetrics>, projectName: string) {
  const summary = buildMetricSummary(metrics);
  const normalized = message.toLowerCase();
  const focusArea = normalized.includes('handoff')
    ? 'handoffs'
    : normalized.includes('knowledge') || normalized.includes('answer')
      ? 'knowledge'
      : normalized.includes('launch') || normalized.includes('ready')
        ? 'launch'
        : 'metrics';

  const reply = focusArea === 'handoffs'
    ? `${projectName} has ${summary.handoffs} handoff${summary.handoffs === 1 ? '' : 's'} today, with ${summary.openRisks} item${summary.openRisks === 1 ? '' : 's'} needing review. I would check billing exceptions first, then sensitive policy cases.`
    : focusArea === 'knowledge'
      ? `The workspace is at ${summary.citationCoverage}% source coverage with ${metrics.retrievalMisses} lookup miss${metrics.retrievalMisses === 1 ? '' : 'es'} and ${metrics.draftAnswers} draft answer update${metrics.draftAnswers === 1 ? '' : 's'} ready. The next useful move is to approve or add the sources behind the top customer questions.`
      : focusArea === 'launch'
        ? `${projectName} is close to launch if safety stays clean: ${summary.policyViolations} critical rule break${summary.policyViolations === 1 ? '' : 's'}, ${summary.containmentRate}% containment, and ${summary.latencySeconds}s typical response time. Clear open risks before switching on wider traffic.`
        : `${projectName} has handled ${summary.callsHandled} calls today, ${summary.containmentRate}% without staff, with ${summary.handoffs} handoff${summary.handoffs === 1 ? '' : 's'} and ${summary.latencySeconds}s typical response time. The graph data is loaded from the current workspace snapshot.`;

  return {
    reply,
    summary: `${summary.callsHandled} calls, ${summary.containmentRate}% contained, ${summary.handoffs} handoffs.`,
    nextActions: ['Review open risks', 'Check handoff reasons', 'Approve top knowledge updates'],
    focusArea,
  };
}

export async function runWorkspaceAssistant({
  message,
  project = {},
  metrics = {},
  history = [],
  mockAi = false,
}: WorkspaceAssistantRequest): Promise<WorkspaceAssistantResponse> {
  if (!message) throw new Error('message is required');

  const cleanedMetrics = cleanMetrics(metrics);
  const projectName = project.name || 'this workspace';
  const fallback = () => fallbackWorkspaceReply(message, cleanedMetrics, projectName);
  const ai = mockAi
    ? fallback()
    : await createJsonResponse<ReturnType<typeof fallback>>({
        schema: workspaceAssistantSchema,
        system:
          'You are RelayClarity AI workspace assistant. Answer using only the provided workspace metrics, graph data, project context, and conversation history. Be concise, operational, and specific. Do not invent unavailable integrations, customers, dates, or hidden data. If the user asks for a graph, describe the graph already provided by the backend.',
        user: JSON.stringify({
          project,
          message,
          history: history.slice(-10),
          metrics: cleanedMetrics,
          charts: buildCharts(cleanedMetrics),
        }),
        fallback,
        maxOutputTokens: 420,
        timeoutMs: 7000,
      });

  return {
    ...ai,
    model: config.openaiModel,
    mode: hasOpenAI() && !mockAi ? 'openai' : 'mock',
    metrics: buildMetricSummary(cleanedMetrics),
    charts: buildCharts(cleanedMetrics),
  };
}
