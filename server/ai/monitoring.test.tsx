import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDriftReport, buildFairnessReport, recordPrediction, resetPredictions } from './monitoring.js';
import type { RiskScoringInput, RiskScoringResponse } from '../types.js';

function prediction(level: 'low' | 'medium' | 'high', confidence: number): RiskScoringResponse {
  return {
    riskLevel: level,
    riskScore: level === 'high' ? 85 : level === 'medium' ? 55 : 15,
    confidence,
    classProbabilities: { low: 0, medium: 0, high: 0 },
    mainReasons: [],
    featureAttributions: [],
    signals: [],
    modelVersion: 'risk-scoring-logreg-1.0.0',
    humanReviewRequired: level === 'high',
    scoredAt: new Date().toISOString(),
  };
}

test('empty drift report reports insufficient sample', () => {
  resetPredictions();
  const report = buildDriftReport();
  assert.equal(report.sampleSize, 0);
  assert.equal(report.status, 'insufficient_sample');
  assert.equal(report.populationStabilityIndex, 0);
});

test('drift report tracks live distribution and confidence', () => {
  resetPredictions();
  recordPrediction(prediction('high', 0.9));
  recordPrediction(prediction('high', 0.8));
  recordPrediction(prediction('low', 0.4));
  const report = buildDriftReport();
  assert.equal(report.sampleSize, 3);
  assert.equal(report.liveDistribution.high, round(2 / 3));
  assert.equal(report.lowConfidenceRate, round(1 / 3));
  assert.ok(report.populationStabilityIndex >= 0);
  assert.ok(['insufficient_sample', 'stable', 'warn', 'alert'].includes(report.status));
});

test('a heavily skewed live mix raises PSI above the baseline', () => {
  resetPredictions();
  for (let i = 0; i < 50; i += 1) recordPrediction(prediction('high', 0.95));
  const report = buildDriftReport();
  assert.ok(report.populationStabilityIndex > report.thresholds.warn || report.status !== 'stable' || report.liveDistribution.high === 1);
});

test('operational health tracks totals, versions, and last prediction time', () => {
  resetPredictions();
  const at = '2026-06-25T10:00:00.000Z';
  recordPrediction(prediction('low', 0.9), undefined, at);
  recordPrediction(prediction('high', 0.9));
  const report = buildDriftReport();
  assert.equal(report.operationalHealth.totalPredictions, 2);
  assert.deepEqual(report.operationalHealth.modelVersions, ['risk-scoring-logreg-1.0.0']);
  assert.ok(report.operationalHealth.lastPredictionAt);
  assert.equal(report.operationalHealth.totalPredictions, report.sampleSize);
});

test('fairness report is insufficient_sample below the minimum total', () => {
  resetPredictions();
  recordPrediction(prediction('high', 0.9), { customerTier: 'gold' });
  const report = buildFairnessReport();
  assert.equal(report.attributes.customerTier.status, 'insufficient_sample');
  assert.equal(report.attributes.channel.status, 'insufficient_sample');
});

test('fairness report flags a high-risk disparity gap across groups', () => {
  resetPredictions();
  const gold: RiskScoringInput = { customerTier: 'gold', channel: 'voice' };
  const basic: RiskScoringInput = { customerTier: 'basic', channel: 'voice' };
  // gold: all high risk; basic: all low risk -> gap of 1.0 -> alert.
  for (let i = 0; i < 20; i += 1) recordPrediction(prediction('high', 0.9), gold);
  for (let i = 0; i < 20; i += 1) recordPrediction(prediction('low', 0.9), basic);
  const report = buildDriftReport();
  const tierFairness = report.fairness.attributes.customerTier;
  assert.equal(tierFairness.groups.gold.highRiskRate, 1);
  assert.equal(tierFairness.groups.basic.highRiskRate, 0);
  assert.equal(tierFairness.groups.gold.count, 20);
  assert.equal(tierFairness.disparityGap, 1);
  assert.equal(tierFairness.status, 'alert');
  // channel was the same ('voice') for everyone, so there is only one comparable group: no disparity.
  assert.equal(report.fairness.attributes.channel.disparityGap, 0);
  assert.equal(report.fairness.attributes.channel.status, 'insufficient_sample');
});

test('predictions without input attributes bucket into unknown', () => {
  resetPredictions();
  recordPrediction(prediction('high', 0.9));
  const report = buildFairnessReport();
  assert.ok(report.attributes.customerTier.groups.unknown);
  assert.equal(report.attributes.customerTier.groups.unknown.count, 1);
});

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
