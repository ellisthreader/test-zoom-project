import test from 'node:test';
import assert from 'node:assert/strict';
import { getModelInfo, scoreRisk } from './risk-model.js';
import type { RiskScoringInput, RiskScoringResponse } from '../types.js';

function assertEnvelope(result: RiskScoringResponse) {
  assert.ok(result.riskScore >= 0 && result.riskScore <= 100);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
  assert.deepEqual(Object.keys(result.classProbabilities).sort(), ['high', 'low', 'medium']);
  const total = Object.values(result.classProbabilities).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 0.05, 'class probabilities should sum to ~1');
  assert.ok(result.mainReasons.length > 0);
  assert.ok(result.featureAttributions.length > 0);
  assert.match(result.modelVersion, /\d+\.\d+\.\d+/);
  assert.ok(!Number.isNaN(Date.parse(result.scoredAt)));
}

test('trained model artifact is loaded and served', () => {
  const info = getModelInfo();
  assert.equal(info.served, 'trained_model');
  assert.match(info.modelVersion, /logreg/);
});

test('model classifies a severe fraud/legal case as high risk', () => {
  const candidate: RiskScoringInput = {
    channel: 'zoom_contact_center',
    category: 'billing',
    priority: 'urgent',
    sentiment: 'negative',
    customerTier: 'vip',
    previousOpenTickets: 3,
    confidence: 0.31,
    escalate: true,
    transcriptText: 'The customer says this is fraud, threatens legal action, and demands a manager.',
    callOutcome: 'handoff',
    durationSeconds: 620,
  };

  const result = scoreRisk(candidate);
  assertEnvelope(result);
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.humanReviewRequired, true);
  assert.ok(result.classProbabilities.high > result.classProbabilities.low);
});

test('model keeps a routine resolved case low risk', () => {
  const candidate: RiskScoringInput = {
    channel: 'chat',
    category: 'general_support',
    priority: 'low',
    sentiment: 'neutral',
    customerTier: 'standard',
    previousOpenTickets: 0,
    confidence: 0.94,
    escalate: false,
    transcriptText: 'Customer asked whether the office is open on Saturday and accepted the answer.',
    callOutcome: 'resolved',
    durationSeconds: 80,
  };

  const result = scoreRisk(candidate);
  assertEnvelope(result);
  assert.equal(result.riskLevel, 'low');
  assert.ok(result.classProbabilities.low > result.classProbabilities.high);
});

test('risk score increases monotonically with severity', () => {
  const low = scoreRisk({ priority: 'low', sentiment: 'neutral', confidence: 0.92, callOutcome: 'resolved', transcriptText: 'routine policy question, answer accepted' });
  const high = scoreRisk({ priority: 'urgent', sentiment: 'negative', escalate: true, confidence: 0.26, previousOpenTickets: 4, callOutcome: 'handoff', customerTier: 'vip', category: 'fraud', transcriptText: 'chargeback, fraud and legal complaint, unsafe and angry' });
  assert.ok(high.riskScore > low.riskScore);
});
