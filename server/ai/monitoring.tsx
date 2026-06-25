import { loadRiskModel } from './risk-model.js';
import type { RiskClass } from './risk-features.js';
import type { RiskScoringInput, RiskScoringResponse } from '../types.js';

type PredictionRecord = {
  level: RiskClass;
  confidence: number;
  modelVersion: string;
  at: string;
  customerTier: string;
  channel: string;
};

const predictions: PredictionRecord[] = [];
const REVIEW_THRESHOLD = 0.6;
const PSI_WARN = 0.1;
const PSI_ALERT = 0.2;
const MIN_SAMPLE = 30;
// Fairness thresholds: a high-risk-rate gap between protected groups beyond these triggers review.
const FAIRNESS_MIN_TOTAL = 30;
const FAIRNESS_MIN_GROUP = 10;
const FAIRNESS_WARN = 0.2;
const FAIRNESS_ALERT = 0.3;
const PROTECTED_ATTRIBUTES = ['customerTier', 'channel'] as const;
type ProtectedAttribute = (typeof PROTECTED_ATTRIBUTES)[number];

/** Called on every served prediction so drift, fairness, and health can be measured. */
export function recordPrediction(
  result: RiskScoringResponse,
  input?: RiskScoringInput,
  at = new Date().toISOString(),
): void {
  predictions.push({
    level: result.riskLevel,
    confidence: result.confidence,
    modelVersion: result.modelVersion,
    at,
    customerTier: input?.customerTier || 'unknown',
    channel: input?.channel || 'unknown',
  });
}

export function resetPredictions(): void {
  predictions.length = 0;
}

export function buildDriftReport() {
  const model = loadRiskModel();
  const baseline = model?.baselineDistribution || { low: 1 / 3, medium: 1 / 3, high: 1 / 3 };
  const live = liveDistribution();
  // With no live traffic there is nothing to compare; report stable rather than a degenerate PSI.
  const psi = predictions.length ? populationStabilityIndex(baseline, live) : 0;
  // Below the minimum sample the PSI is too noisy to trust, so don't raise alerts on it.
  const status = predictions.length < MIN_SAMPLE
    ? 'insufficient_sample'
    : psi >= PSI_ALERT ? 'alert' : psi >= PSI_WARN ? 'warn' : 'stable';
  const lowConfidenceRate = predictions.length
    ? round(predictions.filter((item) => item.confidence < REVIEW_THRESHOLD).length / predictions.length)
    : 0;
  const meanConfidence = predictions.length
    ? round(predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length)
    : 0;

  return {
    modelVersion: model?.modelVersion || 'heuristic_fallback',
    sampleSize: predictions.length,
    baselineDistribution: baseline,
    liveDistribution: live,
    populationStabilityIndex: psi,
    status,
    lowConfidenceRate,
    meanConfidence,
    thresholds: { warn: PSI_WARN, alert: PSI_ALERT, reviewConfidence: REVIEW_THRESHOLD },
    fairness: buildFairnessReport(),
    operationalHealth: buildOperationalHealth(),
    note: 'PSI compares the live predicted-class mix against the training baseline. Investigate at warn, retrain/rollback consideration at alert.',
  };
}

/**
 * Per protected attribute, the high-risk prediction rate per group and the disparity gap across
 * groups. A large gap means the model flags some groups as high risk far more often than others.
 */
export function buildFairnessReport() {
  const total = predictions.length;
  const attributes = {} as Record<ProtectedAttribute, ReturnType<typeof fairnessForAttribute>>;
  for (const attribute of PROTECTED_ATTRIBUTES) {
    attributes[attribute] = fairnessForAttribute(attribute, total);
  }

  return {
    sampleSize: total,
    thresholds: { warn: FAIRNESS_WARN, alert: FAIRNESS_ALERT, minTotal: FAIRNESS_MIN_TOTAL, minGroup: FAIRNESS_MIN_GROUP },
    attributes,
    note: 'Disparity gap = max minus min high-risk rate across groups (>= minGroup samples). A wide gap warrants a fairness review.',
  };
}

function fairnessForAttribute(attribute: ProtectedAttribute, total: number) {
  const counts = new Map<string, { high: number; count: number }>();
  for (const item of predictions) {
    const group = item[attribute];
    const bucket = counts.get(group) || { high: 0, count: 0 };
    bucket.count += 1;
    if (item.level === 'high') bucket.high += 1;
    counts.set(group, bucket);
  }

  const groups: Record<string, { highRiskRate: number; count: number }> = {};
  const eligibleRates: number[] = [];
  for (const [group, bucket] of counts) {
    const rate = round(bucket.high / bucket.count);
    groups[group] = { highRiskRate: rate, count: bucket.count };
    if (bucket.count >= FAIRNESS_MIN_GROUP) eligibleRates.push(rate);
  }

  const disparityGap = eligibleRates.length >= 2
    ? round(Math.max(...eligibleRates) - Math.min(...eligibleRates))
    : 0;
  const status = total < FAIRNESS_MIN_TOTAL || eligibleRates.length < 2
    ? 'insufficient_sample'
    : disparityGap >= FAIRNESS_ALERT ? 'alert' : disparityGap >= FAIRNESS_WARN ? 'warn' : 'stable';

  return { disparityGap, status, groups };
}

function buildOperationalHealth() {
  const modelVersions = Array.from(new Set(predictions.map((item) => item.modelVersion))).sort();
  const lastPredictionAt = predictions.length ? predictions[predictions.length - 1].at : null;
  return {
    totalPredictions: predictions.length,
    modelVersions,
    lastPredictionAt,
  };
}

function liveDistribution(): Record<RiskClass, number> {
  const counts: Record<RiskClass, number> = { low: 0, medium: 0, high: 0 };
  for (const item of predictions) counts[item.level] += 1;
  const total = predictions.length || 1;
  return { low: round(counts.low / total), medium: round(counts.medium / total), high: round(counts.high / total) };
}

function populationStabilityIndex(
  baseline: Record<RiskClass, number>,
  live: Record<RiskClass, number>,
): number {
  const classes: RiskClass[] = ['low', 'medium', 'high'];
  const psi = classes.reduce((sum, label) => {
    const expected = Math.max(baseline[label] || 0, 0.001);
    const actual = Math.max(live[label] || 0, 0.001);
    return sum + (actual - expected) * Math.log(actual / expected);
  }, 0);
  return round(psi);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
