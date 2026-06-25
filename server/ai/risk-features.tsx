import { HIGH_RISK_TERMS, MEDIUM_RISK_TERMS } from './risk-scoring.js';
import type { RiskScoringInput } from '../types.js';

// Canonical feature order. MUST match ml/features.py FEATURE_ORDER so the model
// trained in Python and the model served here cannot drift apart.
export const FEATURE_ORDER = [
  'priority_urgent',
  'priority_high',
  'priority_low',
  'tier_vip',
  'escalate',
  'sentiment_negative',
  'category_sensitive',
  'category_operational',
  'prev_open_tickets',
  'confidence',
  'low_confidence',
  'outcome_unresolved',
  'duration_long',
  'high_term_count',
  'medium_term_count',
  'channel_voice',
] as const;

export const CLASS_ORDER = ['low', 'medium', 'high'] as const;
export type RiskClass = (typeof CLASS_ORDER)[number];

function token(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.72;
  return numeric > 1 ? clamp(numeric / 100, 0, 1) : clamp(numeric, 0, 1);
}

function countTerms(text: string, terms: readonly string[]): number {
  const lowered = text.toLowerCase();
  return terms.reduce((total, term) => (lowered.includes(term) ? total + 1 : total), 0);
}

export function buildFeatureMap(input: RiskScoringInput): Record<string, number> {
  const text = String(input.transcriptText || '');
  const category = token(input.category);
  const priority = token(input.priority);
  const sentiment = token(input.sentiment);
  const tier = token(input.customerTier);
  const outcome = token(input.callOutcome);
  const channel = token(input.channel);
  const confidence = normalizeConfidence(input.confidence);
  const prevOpen = clamp(Math.round(Number(input.previousOpenTickets || 0)), 0, 5);
  const duration = Number(input.durationSeconds || 0);

  return {
    priority_urgent: priority === 'urgent' ? 1 : 0,
    priority_high: priority === 'high' ? 1 : 0,
    priority_low: priority === 'low' ? 1 : 0,
    tier_vip: tier === 'vip' ? 1 : 0,
    escalate: input.escalate ? 1 : 0,
    sentiment_negative: /negative|angry|frustrated|complaint/.test(sentiment) ? 1 : 0,
    category_sensitive: /billing|payment|policy|fraud|security/.test(category) ? 1 : 0,
    category_operational: /technical|delivery/.test(category) ? 1 : 0,
    prev_open_tickets: prevOpen,
    confidence,
    low_confidence: confidence < 0.6 ? 1 : 0,
    outcome_unresolved: /handoff|review|abandoned|failed/.test(outcome) ? 1 : 0,
    duration_long: duration >= 480 ? 1 : 0,
    high_term_count: Math.min(5, countTerms(text, HIGH_RISK_TERMS)),
    medium_term_count: Math.min(5, countTerms(text, MEDIUM_RISK_TERMS)),
    channel_voice: channel === 'voice' || channel === 'zoom_contact_center' || channel === 'phone' ? 1 : 0,
  };
}

export function vectorize(input: RiskScoringInput): number[] {
  const map = buildFeatureMap(input);
  return FEATURE_ORDER.map((name) => map[name]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
