import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackReport, exportTrainingFeedback, recordRiskDecision, resetRiskDecisions } from './feedback-store.js';

test('records an accepted decision and keeps the predicted level', () => {
  resetRiskDecisions();
  const record = recordRiskDecision({ ticketId: 'tick_1', predictedLevel: 'high', decision: 'accepted' });
  assert.equal(record.finalLevel, 'high');
  assert.match(record.id, /^dec_/);
  assert.ok(!Number.isNaN(Date.parse(record.decidedAt)));
});

test('an override captures the corrected label for retraining', () => {
  resetRiskDecisions();
  recordRiskDecision({ ticketId: 'tick_2', predictedLevel: 'high', decision: 'overridden', correctedLevel: 'medium', reason: 'context resolved on call' });
  const rows = exportTrainingFeedback();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].predictedLevel, 'high');
  assert.equal(rows[0].label, 'medium');
  assert.equal(rows[0].wasOverridden, true);
});

test('feedback report computes override and agreement rates', () => {
  resetRiskDecisions();
  recordRiskDecision({ predictedLevel: 'high', decision: 'accepted' });
  recordRiskDecision({ predictedLevel: 'high', decision: 'accepted' });
  recordRiskDecision({ predictedLevel: 'medium', decision: 'overridden', correctedLevel: 'low' });
  const report = buildFeedbackReport();
  assert.equal(report.total, 3);
  assert.equal(report.overridden, 1);
  assert.equal(report.overrideRate, round(1 / 3));
  assert.equal(report.agreementRate, round(2 / 3));
  assert.equal(report.overrideCountsByPredictedLevel.medium, 1);
});

test('export emits the enriched retraining schema with raw case fields', () => {
  resetRiskDecisions();
  recordRiskDecision({
    ticketId: 'tick_9',
    predictedLevel: 'high',
    decision: 'overridden',
    correctedLevel: 'low',
    channel: 'voice',
    category: 'billing',
    customerTier: 'gold',
    priority: 'urgent',
    sentiment: 'negative',
    callOutcome: 'resolved',
    previousOpenTickets: 2,
    confidence: 0.81,
    escalate: true,
    transcriptText: 'customer was upset about a charge',
    durationSeconds: 320,
  });
  const rows = exportTrainingFeedback();
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    ticketId: 'tick_9',
    channel: 'voice',
    category: 'billing',
    customerTier: 'gold',
    priority: 'urgent',
    sentiment: 'negative',
    callOutcome: 'resolved',
    previousOpenTickets: 2,
    confidence: 0.81,
    escalate: true,
    transcriptText: 'customer was upset about a charge',
    durationSeconds: 320,
    predictedLevel: 'high',
    label: 'low',
    wasOverridden: true,
    decidedAt: rows[0].decidedAt,
  });
});

test('export defaults missing raw fields to null', () => {
  resetRiskDecisions();
  recordRiskDecision({ predictedLevel: 'medium', decision: 'accepted' });
  const [row] = exportTrainingFeedback();
  assert.equal(row.priority, null);
  assert.equal(row.sentiment, null);
  assert.equal(row.callOutcome, null);
  assert.equal(row.previousOpenTickets, null);
  assert.equal(row.confidence, null);
  assert.equal(row.escalate, null);
  assert.equal(row.transcriptText, null);
  assert.equal(row.durationSeconds, null);
  assert.equal(row.label, 'medium');
});

test('invalid decisions are rejected', () => {
  resetRiskDecisions();
  assert.throws(() => recordRiskDecision({ predictedLevel: 'high', decision: 'maybe' as 'accepted' }));
  assert.throws(() => recordRiskDecision({ decision: 'accepted' } as Parameters<typeof recordRiskDecision>[0]));
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
