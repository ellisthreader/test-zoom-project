import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { HIGH_RISK_TERMS, MEDIUM_RISK_TERMS, scoreRiskCandidate } from './risk-scoring.js';
import { CLASS_ORDER, FEATURE_ORDER, vectorize } from './risk-features.js';
import type { RiskClass } from './risk-features.js';
import type { RiskFeatureAttribution, RiskReason, RiskScoringInput, RiskScoringResponse } from '../types.js';

type RiskModelArtifact = {
  modelName: string;
  modelVersion: string;
  trainedAt: string;
  framework: string;
  featureOrder: string[];
  classOrder: string[];
  scaler: { mean: number[]; scale: number[] };
  coefficients: number[][];
  intercepts: number[];
  baselineDistribution: Record<RiskClass, number>;
  reviewThreshold: number;
  scoreWeights: Record<RiskClass, number>;
  calibration?: { method: string; temperature: number };
};

const ARTIFACT_PATH = process.env.RISK_MODEL_PATH
  || path.join(process.cwd(), 'ml', 'artifacts', 'risk_model.json');

const EVALUATION_PATH = process.env.RISK_EVALUATION_PATH
  || path.join(path.dirname(ARTIFACT_PATH), 'evaluation.json');

const FEATURE_LABELS: Record<string, string> = {
  priority_urgent: 'Urgent priority', priority_high: 'High priority', priority_low: 'Low priority',
  tier_vip: 'VIP customer', escalate: 'Marked for human handoff', sentiment_negative: 'Negative sentiment',
  category_sensitive: 'Sensitive topic (billing, fraud, security)', category_operational: 'Operational failure',
  prev_open_tickets: 'Existing open work', confidence: 'AI confidence', low_confidence: 'Low AI confidence',
  outcome_unresolved: 'Conversation did not resolve cleanly', duration_long: 'Long interaction',
  high_term_count: 'High-risk wording', medium_term_count: 'Review wording', channel_voice: 'Voice / contact-centre channel',
};

let cached: RiskModelArtifact | null | undefined;

export function loadRiskModel(): RiskModelArtifact | null {
  if (cached !== undefined) return cached;
  try {
    if (!existsSync(ARTIFACT_PATH)) {
      cached = null;
      return cached;
    }
    const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as RiskModelArtifact;
    cached = isValidArtifact(artifact) ? artifact : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function getModelInfo() {
  const model = loadRiskModel();
  return model
    ? {
        served: 'trained_model' as const,
        modelName: model.modelName,
        modelVersion: model.modelVersion,
        framework: model.framework,
        trainedAt: model.trainedAt,
        features: model.featureOrder.length,
        reviewThreshold: model.reviewThreshold,
        baselineDistribution: model.baselineDistribution,
        calibration: model.calibration ?? null,
      }
    : {
        served: 'heuristic_fallback' as const,
        modelVersion: 'risk-scoring-baseline-0.1.0',
        note: 'No trained artifact found at ml/artifacts/risk_model.json; using deterministic heuristic.',
      };
}

/** Offline evaluation report (accuracy, calibration, latency, fairness, gate). */
export function getModelEvaluation(): Record<string, unknown> | null {
  try {
    if (!existsSync(EVALUATION_PATH)) return null;
    return JSON.parse(readFileSync(EVALUATION_PATH, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Single entry point: trained model when available, deterministic heuristic otherwise. */
export function scoreRisk(input: RiskScoringInput = {}): RiskScoringResponse {
  const model = loadRiskModel();
  return model ? predictWithModel(model, input) : scoreRiskCandidate(input);
}

function predictWithModel(model: RiskModelArtifact, input: RiskScoringInput): RiskScoringResponse {
  const raw = vectorize(input);
  const scaled = raw.map((value, index) => (value - model.scaler.mean[index]) / (model.scaler.scale[index] || 1));

  const logits = model.classOrder.map((_, classIndex) =>
    model.intercepts[classIndex] + scaled.reduce((sum, value, i) => sum + value * model.coefficients[classIndex][i], 0));
  // Temperature scaling (post-hoc calibration); T=1 is a no-op for old artifacts.
  const t = model.calibration?.temperature && model.calibration.temperature > 0 ? model.calibration.temperature : 1;
  const probabilities = softmax(logits.map((l) => l / t));
  const classProbabilities = Object.fromEntries(
    CLASS_ORDER.map((label, index) => [label, round(probabilities[index])]),
  ) as Record<RiskClass, number>;

  const riskLevel = CLASS_ORDER[argmax(probabilities)];
  const confidence = round(Math.max(...probabilities));
  const riskScore = clamp(Math.round(100 * CLASS_ORDER.reduce(
    (sum, label, index) => sum + model.scoreWeights[label] * probabilities[index], 0)), 0, 100);

  // Per-feature contribution to the "high" logit = transparent, SHAP-style attribution.
  const highIndex = CLASS_ORDER.indexOf('high');
  const contributions = FEATURE_ORDER.map((feature, i) => ({
    feature,
    label: FEATURE_LABELS[feature] || feature,
    value: scaled[i] * model.coefficients[highIndex][i],
  }));
  const ranked = [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const text = String(input.transcriptText || '').toLowerCase();
  const matchedTerms = [...HIGH_RISK_TERMS, ...MEDIUM_RISK_TERMS].filter((term) => text.includes(term));

  const featureAttributions: RiskFeatureAttribution[] = ranked.slice(0, 5).map((item) => ({
    feature: item.label,
    value: round(item.value),
    direction: item.value >= 0 ? 'raises_risk' : 'lowers_risk',
  }));
  const mainReasons: RiskReason[] = ranked
    .filter((item) => item.value > 0)
    .slice(0, 4)
    .map((item) => ({ factor: item.label, impact: reasonText(item.feature, riskLevel, matchedTerms) }));

  const humanReviewRequired = riskLevel === 'high' || confidence < model.reviewThreshold || Boolean(input.escalate);

  return {
    riskLevel,
    riskScore,
    confidence,
    classProbabilities,
    mainReasons: mainReasons.length ? mainReasons : [{ factor: 'Baseline case profile', impact: 'No strong risk drivers were detected.' }],
    featureAttributions,
    signals: [
      { label: 'Channel', value: input.channel || 'unknown' },
      { label: 'Priority', value: input.priority || 'normal' },
      { label: 'Category', value: input.category || 'general' },
      ...(matchedTerms.length ? [{ label: 'Terms', value: matchedTerms.slice(0, 3).join(', ') }] : []),
      { label: 'Model', value: model.modelVersion },
    ],
    modelVersion: model.modelVersion,
    humanReviewRequired,
    scoredAt: new Date().toISOString(),
  };
}

function reasonText(feature: string, level: RiskClass, matchedTerms: string[]): string {
  const base = FEATURE_LABELS[feature] || feature;
  if ((feature === 'high_term_count' || feature === 'medium_term_count') && matchedTerms.length) {
    return `${base} (${matchedTerms.slice(0, 3).join(', ')}) raised the risk estimate.`;
  }
  return level === 'high'
    ? `${base} pushed this case toward high risk and an owner should review it.`
    : `${base} contributed to the risk estimate.`;
}

function isValidArtifact(artifact: RiskModelArtifact): boolean {
  return Boolean(
    artifact
    && Array.isArray(artifact.featureOrder) && artifact.featureOrder.length === FEATURE_ORDER.length
    && Array.isArray(artifact.coefficients) && artifact.coefficients.length === CLASS_ORDER.length
    && artifact.scaler && Array.isArray(artifact.scaler.mean) && Array.isArray(artifact.scaler.scale),
  );
}

function softmax(values: number[]): number[] {
  const largest = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - largest));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
}

function argmax(values: number[]): number {
  return values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
