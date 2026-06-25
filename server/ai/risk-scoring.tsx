import type { Customer, CustomerLookup, RiskScoringInput, RiskScoringResponse, Ticket } from '../types.js';
export type { RiskScoringInput, RiskScoringResponse } from '../types.js';

const MODEL_VERSION = 'risk-scoring-baseline-0.1.0';
export const HIGH_RISK_TERMS = [
  'legal',
  'lawsuit',
  'fraud',
  'unsafe',
  'emergency',
  'chargeback',
  'angry',
  'complaint',
  'cancel',
  'cancellation',
  'vulnerable',
  'threat',
  'breach',
  'unauthorised',
  'unauthorized',
];

export const MEDIUM_RISK_TERMS = [
  'refund',
  'payment',
  'invoice',
  'billing',
  'not arrived',
  'broken',
  'failed',
  'cannot access',
  'manager',
  'human',
];

type ScoreComponent = {
  feature: string;
  value: number;
  reason: string;
  signal?: string;
};

export function scoreRiskCandidate(input: RiskScoringInput = {}): RiskScoringResponse {
  const text = String(input.transcriptText || '').toLowerCase();
  const category = normalizeToken(input.category);
  const priority = normalizeToken(input.priority);
  const sentiment = normalizeToken(input.sentiment);
  const channel = input.channel || 'unknown';
  const confidence = normalizeConfidence(input.confidence);
  const previousOpenTickets = Math.max(0, Math.round(Number(input.previousOpenTickets || 0)));
  const components: ScoreComponent[] = [];

  add(components, 28, 'priority', priority === 'urgent', 'Urgent priority', 'Ticket was marked urgent.');
  add(components, 18, 'priority', priority === 'high', 'High priority', 'Ticket was marked high priority.');
  add(components, 16, 'customer tier', normalizeToken(input.customerTier) === 'vip', 'VIP customer', 'Customer tier increases review urgency.');
  add(components, 15, 'handoff', Boolean(input.escalate), 'Human handoff', 'Conversation was already marked for escalation.');
  add(components, 14, 'sentiment', /negative|angry|frustrated|complaint/.test(sentiment), 'Negative sentiment', 'Customer tone suggests the case needs closer review.');
  add(components, 12, 'category', /billing|payment|policy|fraud|security/.test(category), 'Sensitive topic', 'Billing, policy, fraud, or security issues carry higher risk.');
  add(components, 10, 'category', /technical|delivery/.test(category), 'Operational failure', 'The issue may need an owner to resolve a failed workflow.');
  add(components, 12, 'previous open tickets', previousOpenTickets >= 2, 'Repeat open work', 'Customer already has multiple open tickets.');
  add(components, 7, 'previous open tickets', previousOpenTickets === 1, 'Existing open work', 'Customer already has an open ticket.');
  add(components, 12, 'confidence', confidence < 0.6, 'Low AI confidence', 'The AI confidence is below the review threshold.');
  add(components, 7, 'confidence', confidence >= 0.6 && confidence < 0.75, 'Moderate AI confidence', 'The AI confidence is not strong enough for quiet handling.');
  add(components, 10, 'call outcome', /handoff|review|abandoned|failed/i.test(String(input.callOutcome || '')), 'Call outcome needs review', 'The conversation did not complete cleanly.');
  add(components, 5, 'duration', Number(input.durationSeconds || 0) >= 480, 'Long interaction', 'The call was unusually long.');

  const highTerms = HIGH_RISK_TERMS.filter((term) => text.includes(term));
  const mediumTerms = MEDIUM_RISK_TERMS.filter((term) => text.includes(term));
  if (highTerms.length) {
    components.push({
      feature: 'transcript text',
      value: Math.min(24, 12 + highTerms.length * 4),
      reason: `High-risk wording: ${highTerms.slice(0, 3).join(', ')}`,
      signal: highTerms.slice(0, 3).join(', '),
    });
  }
  if (mediumTerms.length) {
    components.push({
      feature: 'transcript text',
      value: Math.min(14, 6 + mediumTerms.length * 2),
      reason: `Review wording: ${mediumTerms.slice(0, 3).join(', ')}`,
      signal: mediumTerms.slice(0, 3).join(', '),
    });
  }

  const rawScore = 24 + components.reduce((total, component) => total + component.value, 0);
  const riskScore = clamp(Math.round(rawScore), 0, 100);
  const riskLevel = riskScore >= 76 ? 'high' : riskScore >= 52 ? 'medium' : 'low';
  const modelConfidence = round(clamp((62 + Math.abs(riskScore - 50) * 0.55 + components.length * 2) / 100, 0.58, 0.96));
  const classProbabilities = probabilitiesFor(riskScore);
  const scoredAt = new Date().toISOString();
  const mainReasons = components.length
    ? components
        .sort((first, second) => second.value - first.value)
        .slice(0, 4)
        .map((component) => ({
          factor: component.feature,
          impact: component.reason,
        }))
    : [{ factor: 'Baseline case profile', impact: 'No major risk indicators were detected in the ticket or transcript.' }];

  return {
    riskLevel,
    riskScore,
    confidence: modelConfidence,
    classProbabilities,
    mainReasons,
    featureAttributions: components.length
      ? components
          .sort((first, second) => Math.abs(second.value) - Math.abs(first.value))
          .slice(0, 5)
          .map((component) => ({
            feature: component.feature,
            value: round(component.value / 100),
            direction: 'raises_risk',
          }))
      : [{ feature: 'baseline case profile', value: 0.18, direction: 'lowers_risk' }],
    signals: [
      { label: 'Channel', value: channel },
      { label: 'Priority', value: priority || 'normal' },
      { label: 'Category', value: category || 'general' },
      { label: 'Confidence', value: `${Math.round(confidence * 100)}%` },
      ...(components[0]?.signal ? [{ label: 'Terms', value: components[0].signal }] : []),
    ],
    modelVersion: MODEL_VERSION,
    humanReviewRequired: riskLevel === 'high' || modelConfidence < 0.7 || Boolean(input.escalate),
    scoredAt,
  };
}

export function buildRiskInputFromTicket(ticket: Ticket): RiskScoringInput {
  const snapshot = ticket.customerSnapshot as Customer | CustomerLookup | null | undefined;
  const customer = isCustomer(snapshot) ? snapshot : null;

  return {
    channel: ticket.channel,
    category: ticket.category,
    priority: ticket.priority,
    sentiment: ticket.sentiment,
    customerTier: customer?.tier,
    previousOpenTickets: customer?.openTickets.length || 0,
    confidence: ticket.riskConfidence ? ticket.riskConfidence / 100 : undefined,
    escalate: ticket.escalate,
    transcriptText: ticket.transcript || ticket.summary,
    sourceSystem: ticket.channel,
  };
}

export function applyRiskToTicketInput(ticket: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'>, risk: RiskScoringResponse) {
  return {
    ...ticket,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    riskConfidence: Math.round(risk.confidence * 100),
    riskClassProbabilities: risk.classProbabilities,
    riskReasons: risk.mainReasons,
    riskFeatureAttributions: risk.featureAttributions,
    riskSignals: risk.signals,
    riskModelVersion: risk.modelVersion,
    humanReviewRequired: risk.humanReviewRequired,
    scoredAt: risk.scoredAt,
  };
}

export function ticketToRiskQueueItem(ticket: Ticket) {
  const risk = ticket.riskScore
    ? null
    : scoreRiskCandidate(buildRiskInputFromTicket(ticket));
  const riskLevel = ticket.riskLevel || risk?.riskLevel || 'low';
  const riskScore = ticket.riskScore || risk?.riskScore || 0;
  const confidence = ticket.riskConfidence || risk?.confidence || 0;
  const reasons = ticket.riskReasons || risk?.mainReasons || [];
  const signals = ticket.riskSignals || risk?.signals || [];

  return {
    id: `risk-${ticket.id}`,
    ticketId: ticket.id,
    sourceType: ticket.channel === 'voice' || ticket.channel === 'zoom_contact_center' ? 'call' : 'ticket',
    title: ticket.title,
    customer: customerName(ticket.customerSnapshot),
    summary: ticket.summary,
    riskLevel,
    riskScore,
    confidence,
    due: dueFor(riskLevel),
    owner: ownerFor(ticket.category, riskLevel),
    source: `${ticket.channel || 'support'} · ${ticket.category}`,
    reasons: reasons.map((reason) => reason.impact || reason.factor),
    signals,
    nextAction: ticket.humanReviewRequired || riskLevel === 'high'
      ? 'Assign owner and review before customer follow-up'
      : 'Review context and confirm next step',
    transcript: ticket.transcript
      ? transcriptToTurns(ticket.transcript)
      : [],
    modelVersion: ticket.riskModelVersion || risk?.modelVersion || MODEL_VERSION,
    humanReviewRequired: ticket.humanReviewRequired ?? risk?.humanReviewRequired ?? riskLevel === 'high',
    scoredAt: ticket.scoredAt || risk?.scoredAt || ticket.updatedAt,
  };
}

function add(components: ScoreComponent[], value: number, feature: string, condition: boolean, reason: string, impact: string) {
  if (!condition) return;
  components.push({ feature, value, reason: `${reason}. ${impact}` });
}

function normalizeToken(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeConfidence(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.72;
  return numeric > 1 ? clamp(numeric / 100, 0, 1) : clamp(numeric, 0, 1);
}

function probabilitiesFor(score: number): Record<'low' | 'medium' | 'high', number> {
  let raw: Record<'low' | 'medium' | 'high', number>;
  if (score >= 76) {
    raw = { low: 0.05, medium: (100 - score) / 100, high: score / 100 };
  } else if (score >= 52) {
    raw = { low: (76 - score) / 160, medium: 0.5 + (score - 52) / 100, high: (score - 45) / 180 };
  } else {
    raw = { low: 0.58 + (52 - score) / 130, medium: score / 140, high: score / 400 };
  }

  const total = raw.low + raw.medium + raw.high || 1;
  const low = round(raw.low / total);
  const medium = round(raw.medium / total);
  return { low, medium, high: round(1 - low - medium) };
}

function customerName(snapshot: Customer | CustomerLookup | null | undefined) {
  if (isCustomer(snapshot)) return snapshot.name;
  if (snapshot?.email) return snapshot.email;
  if (snapshot?.phone) return snapshot.phone;
  if (snapshot?.customerId) return snapshot.customerId;
  return 'Unknown customer';
}

function isCustomer(value: Customer | CustomerLookup | null | undefined): value is Customer {
  return Boolean(value && 'name' in value && 'tier' in value && Array.isArray((value as Customer).openTickets));
}

function dueFor(riskLevel: string) {
  if (riskLevel === 'high') return 'Due now';
  if (riskLevel === 'medium') return 'Today';
  return 'This week';
}

function ownerFor(category: string, riskLevel: string) {
  const normalized = normalizeToken(category);
  if (/billing|payment|refund|invoice/.test(normalized)) return 'Finance support';
  if (/fraud|security|policy/.test(normalized)) return 'Policy owner';
  if (/technical/.test(normalized)) return riskLevel === 'high' ? 'Support lead' : 'Technical support';
  return riskLevel === 'high' ? 'Support lead' : 'Customer support';
}

function transcriptToTurns(transcript: string) {
  return transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const [rawRole, ...parts] = line.split(':');
      const text = parts.join(':').trim() || line;
      const role = normalizeTranscriptRole(rawRole);
      return { speaker: role, text };
    });
}

function normalizeTranscriptRole(role: string): 'Customer' | 'AI' | 'System' {
  const normalized = normalizeToken(role);
  if (/customer|caller|user/.test(normalized)) return 'Customer';
  if (/assistant|ai|agent|virtual/.test(normalized)) return 'AI';
  return 'System';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
