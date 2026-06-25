import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreRiskCandidate } from './risk-scoring.js';
import type { RiskScoringInput, RiskScoringResponse } from './risk-scoring.js';

function assertRiskEnvelope(result: RiskScoringResponse) {
  assert.ok(result.riskScore >= 0 && result.riskScore <= 100);
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
  assert.deepEqual(Object.keys(result.classProbabilities).sort(), ['high', 'low', 'medium']);
  assert.ok(Object.values(result.classProbabilities).every((value) => value >= 0 && value <= 1));

  assert.ok(result.mainReasons.length > 0);
  assert.ok(Array.isArray(result.featureAttributions));
  assert.ok(result.signals.length > 0);
  assert.match(result.modelVersion, /risk.*\d+\.\d+\.\d+/);
  assert.ok(!Number.isNaN(Date.parse(result.scoredAt)));
}

test('risk scoring classifies urgent fraud and legal cases as high risk', () => {
  const candidate = {
    channel: 'voice',
    category: 'billing',
    priority: 'urgent',
    sentiment: 'negative',
    customerTier: 'vip',
    previousOpenTickets: 3,
    confidence: 0.31,
    escalate: true,
    transcriptText: 'The customer says this is fraud, threatens legal action, and asks for a manager.',
    callOutcome: 'handoff',
    durationSeconds: 620,
    sourceSystem: 'zoom_contact_center',
  } satisfies RiskScoringInput;

  const result = scoreRiskCandidate(candidate);

  assertRiskEnvelope(result);
  assert.equal(result.riskLevel, 'high');
  assert.ok(result.riskScore >= 75);
  assert.equal(result.humanReviewRequired, true);
  assert.ok(result.classProbabilities.high > result.classProbabilities.medium);
  assert.ok(result.classProbabilities.high > result.classProbabilities.low);
  assert.ok(result.mainReasons.some((reason) => /fraud|legal|vip|urgent|escalat/i.test(`${reason.factor} ${reason.impact}`)));
  assert.ok(result.featureAttributions.some((feature) => feature.direction === 'raises_risk' && feature.value > 0));
});

test('risk scoring keeps routine high-confidence resolved support low risk', () => {
  const candidate = {
    channel: 'chat',
    category: 'general_support',
    priority: 'low',
    sentiment: 'neutral',
    customerTier: 'standard',
    previousOpenTickets: 0,
    confidence: 0.94,
    escalate: false,
    transcriptText: 'Customer asked whether the office is open on Saturday and accepted the approved answer.',
    callOutcome: 'resolved',
    durationSeconds: 85,
    sourceSystem: 'web_chat',
  } satisfies RiskScoringInput;

  const result = scoreRiskCandidate(candidate);

  assertRiskEnvelope(result);
  assert.equal(result.riskLevel, 'low');
  assert.ok(result.riskScore <= 30);
  assert.equal(result.humanReviewRequired, false);
  assert.ok(result.classProbabilities.low > result.classProbabilities.high);
  assert.ok(result.mainReasons.some((reason) => /baseline|no major risk/i.test(`${reason.factor} ${reason.impact}`)));
});

test('risk scoring preserves monotonic ordering as severity signals accumulate', () => {
  const low = scoreRiskCandidate({
    priority: 'low',
    sentiment: 'neutral',
    previousOpenTickets: 0,
    confidence: 0.91,
    transcriptText: 'Customer asked a routine policy question and accepted the answer.',
    callOutcome: 'resolved',
  });

  const medium = scoreRiskCandidate({
    priority: 'normal',
    sentiment: 'negative',
    previousOpenTickets: 1,
    confidence: 0.62,
    transcriptText: 'Customer is frustrated about a delayed delivery and wants a follow-up.',
    callOutcome: 'ticket_created',
  });

  const high = scoreRiskCandidate({
    priority: 'urgent',
    sentiment: 'negative',
    previousOpenTickets: 4,
    confidence: 0.26,
    escalate: true,
    transcriptText: 'Customer reports a chargeback, fraud concern, and possible legal complaint.',
    callOutcome: 'handoff',
  });

  assert.ok(low.riskScore < medium.riskScore);
  assert.ok(medium.riskScore < high.riskScore);
  assert.equal(low.humanReviewRequired, false);
  assert.equal(high.humanReviewRequired, true);
});
