import type { RiskClass } from './risk-features.js';
import type { RiskDecisionInput, RiskDecisionRecord } from '../types.js';

// In-memory human-oversight ledger (mirrors the in-memory helpdesk store).
// Every officer accept/override of a model recommendation is captured here so we
// can report agreement, monitor override rate, and export labelled rows for the
// next retraining cycle — the field-to-model feedback loop.
const decisions: RiskDecisionRecord[] = [];

export function recordRiskDecision(input: RiskDecisionInput): RiskDecisionRecord {
  if (!input || !input.predictedLevel) throw new Error('predictedLevel is required');
  if (input.decision !== 'accepted' && input.decision !== 'overridden') {
    throw new Error('decision must be "accepted" or "overridden"');
  }

  const finalLevel = input.decision === 'overridden'
    ? (input.correctedLevel || input.predictedLevel)
    : input.predictedLevel;

  const record: RiskDecisionRecord = {
    ...input,
    id: `dec_${String(decisions.length + 1)}`,
    finalLevel,
    decidedAt: new Date().toISOString(),
  };
  decisions.push(record);
  return record;
}

export function listRiskDecisions(): RiskDecisionRecord[] {
  return decisions;
}

export function resetRiskDecisions(): void {
  decisions.length = 0;
}

export function buildFeedbackReport() {
  const total = decisions.length;
  const overrides = decisions.filter((item) => item.decision === 'overridden');
  const byLevel = tally(decisions, (item) => item.predictedLevel);
  const overridesByLevel = tally(overrides, (item) => item.predictedLevel);

  return {
    total,
    accepted: total - overrides.length,
    overridden: overrides.length,
    overrideRate: total ? round(overrides.length / total) : 0,
    agreementRate: total ? round((total - overrides.length) / total) : 0,
    predictedLevelCounts: byLevel,
    overrideCountsByPredictedLevel: overridesByLevel,
    retrainingRowsAvailable: total,
    note: 'Override rate by predicted level highlights where the model and officers disagree most. Overridden rows carry the corrected label for supervised retraining.',
  };
}

/**
 * Labelled rows for the next training run. Carries the raw case fields (not just the levels) so the
 * trainer can rebuild feature vectors and learn from officer-corrected labels — the field-to-model loop.
 */
export function exportTrainingFeedback() {
  return decisions.map((item) => ({
    ticketId: item.ticketId ?? null,
    channel: item.channel ?? null,
    category: item.category ?? null,
    customerTier: item.customerTier ?? null,
    priority: item.priority ?? null,
    sentiment: item.sentiment ?? null,
    callOutcome: item.callOutcome ?? null,
    previousOpenTickets: item.previousOpenTickets ?? null,
    confidence: item.confidence ?? null,
    escalate: item.escalate ?? null,
    transcriptText: item.transcriptText ?? null,
    durationSeconds: item.durationSeconds ?? null,
    predictedLevel: item.predictedLevel,
    label: item.finalLevel,
    wasOverridden: item.decision === 'overridden',
    decidedAt: item.decidedAt,
  }));
}

function tally(items: RiskDecisionRecord[], pick: (item: RiskDecisionRecord) => RiskClass) {
  return items.reduce(
    (counts, item) => {
      counts[pick(item)] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0 } as Record<RiskClass, number>,
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
