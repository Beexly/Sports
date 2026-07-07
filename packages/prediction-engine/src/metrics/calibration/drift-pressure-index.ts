import { metricDriver, sortedDrivers, type MetricDriver, type MetricDriverInput } from "../core/driver.js";
import { clamp01, clampScore, normalizeClamped, round, weightedMean } from "../core/math.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type DriftPressureBand = "STABLE" | "WATCH" | "SEVERE" | "BLOCKED";
export type DriftPressureSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface DriftPressureIndexInput {
  readonly featurePopulationStabilityIndex: number;
  readonly calibrationBrierDelta: number;
  readonly calibrationErrorDelta: number;
  readonly schemaChangeRate: number;
  readonly predictionVolumeShift: number;
  readonly modelDisagreement: number;
  readonly sourceContradictionPressure: number;
  readonly reportAgeDays: number;
  readonly reportFreshnessTtlDays: number;
  readonly sampleSize: number;
  readonly minimumSampleSize: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface DriftPressureIndexMetric {
  readonly metricId: "drift-pressure-index";
  readonly score: number;
  readonly band: DriftPressureBand;
  readonly downstreamVetoRecommended: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "DRIFT_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: DriftPressureSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function driftPressureIndex(input: DriftPressureIndexInput): DriftPressureIndexMetric {
  const minimumSampleSize = Math.max(1, input.minimumSampleSize);
  const ttlDays = Math.max(1, input.reportFreshnessTtlDays);
  const sampleSupport = normalizeClamped(input.sampleSize, minimumSampleSize, minimumSampleSize * 4);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const pressure = pressureComponents(input, minimumSampleSize, ttlDays, sourceRisk);
  const blockReasons = hardBlockReasons({
    brierDelta: input.calibrationBrierDelta,
    calibrationErrorDelta: input.calibrationErrorDelta,
    featurePopulationStabilityIndex: input.featurePopulationStabilityIndex,
    minimumSampleSize,
    reportAgeDays: input.reportAgeDays,
    reportFreshnessTtlDays: ttlDays,
    sampleSize: input.sampleSize,
    schemaChangeRate: input.schemaChangeRate,
    sourceAllowed,
  });
  const rawScore = clampScore(100 * weightedMean([
    { value: pressure.psiRisk, weight: 0.24 },
    { value: pressure.brierRisk, weight: 0.16 },
    { value: pressure.calibrationErrorRisk, weight: 0.13 },
    { value: pressure.schemaRisk, weight: 0.12 },
    { value: pressure.volumeRisk, weight: 0.09 },
    { value: pressure.modelDisagreementRisk, weight: 0.08 },
    { value: pressure.sourceContradictionRisk, weight: 0.08 },
    { value: pressure.staleRisk, weight: 0.06 },
    { value: pressure.sampleRisk, weight: 0.03 },
    { value: sourceRisk, weight: 0.01 },
  ]));
  const score = round(blockReasons.length > 0 ? Math.max(85, rawScore) : rawScore, 2);
  const band = driftBand(score, blockReasons.length > 0);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(score, pressure.staleRisk * 100, sourceRisk * 100),
    proxyCount: 0,
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    band,
    birthCertificate: requireMetricBirthCertificate("drift-pressure-index"),
    blockReasons,
    confidenceMeaning: "DRIFT_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY",
    confidenceScore: confidenceFromEvidence(sampleSupport, uncertaintyBand, Math.max(sourceRisk, pressure.staleRisk, pressure.schemaRisk)),
    downstreamVetoRecommended: band === "SEVERE" || band === "BLOCKED",
    drivers: buildDrivers(pressure, sourceRisk),
    metricId: "drift-pressure-index",
    probability: null,
    score,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(sourceRisk, sourceAllowed),
    status: "SHADOW",
    uncertaintyBand: band === "BLOCKED" ? "HIGH" : uncertaintyBand,
  };
}

interface DriftPressureComponents {
  readonly brierRisk: number;
  readonly calibrationErrorRisk: number;
  readonly modelDisagreementRisk: number;
  readonly psiRisk: number;
  readonly sampleRisk: number;
  readonly schemaRisk: number;
  readonly sourceContradictionRisk: number;
  readonly staleRisk: number;
  readonly volumeRisk: number;
}

function pressureComponents(
  input: DriftPressureIndexInput,
  minimumSampleSize: number,
  ttlDays: number,
  sourceRisk: number,
): DriftPressureComponents {
  return {
    brierRisk: normalizeClamped(input.calibrationBrierDelta, 0, 0.06),
    calibrationErrorRisk: normalizeClamped(input.calibrationErrorDelta, 0, 0.12),
    modelDisagreementRisk: clamp01(input.modelDisagreement),
    psiRisk: normalizeClamped(input.featurePopulationStabilityIndex, 0.02, 0.3),
    sampleRisk: 1 - normalizeClamped(input.sampleSize, minimumSampleSize, minimumSampleSize * 4),
    schemaRisk: Math.max(clamp01(input.schemaChangeRate), sourceRisk),
    sourceContradictionRisk: normalizeScore(input.sourceContradictionPressure),
    staleRisk: normalizeClamped(input.reportAgeDays, 0, ttlDays),
    volumeRisk: normalizeClamped(input.predictionVolumeShift, 0.05, 0.45),
  };
}

function hardBlockReasons(input: {
  readonly brierDelta: number;
  readonly calibrationErrorDelta: number;
  readonly featurePopulationStabilityIndex: number;
  readonly minimumSampleSize: number;
  readonly reportAgeDays: number;
  readonly reportFreshnessTtlDays: number;
  readonly sampleSize: number;
  readonly schemaChangeRate: number;
  readonly sourceAllowed: boolean;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.sourceAllowed) reasons.push("Source policy blocks drift-pressure use.");
  if (input.sampleSize < input.minimumSampleSize) reasons.push("Drift sample is below minimum.");
  if (input.reportAgeDays >= input.reportFreshnessTtlDays * 2) reasons.push("Drift report is stale.");
  if (input.featurePopulationStabilityIndex >= 0.45) reasons.push("Feature distribution drift is severe.");
  if (input.brierDelta >= 0.1) reasons.push("Calibration Brier drift is severe.");
  if (input.calibrationErrorDelta >= 0.2) reasons.push("Calibration error drift is severe.");
  if (input.schemaChangeRate >= 0.6) reasons.push("Schema-change drift is severe.");
  return reasons;
}

function buildDrivers(pressure: DriftPressureComponents, sourceRisk: number): readonly MetricDriver[] {
  return sortedDrivers([
    pressureDriver("feature_distribution_drift", pressure.psiRisk, 24, "Feature distribution movement raises drift pressure."),
    pressureDriver("brier_drift", pressure.brierRisk, 16, "Worsening Brier performance raises drift pressure."),
    pressureDriver("calibration_error_drift", pressure.calibrationErrorRisk, 13, "Calibration error movement raises drift pressure."),
    pressureDriver("schema_change_pressure", pressure.schemaRisk, 12, "Schema or source-posture changes raise drift pressure."),
    pressureDriver("prediction_volume_shift", pressure.volumeRisk, 9, "Prediction-volume shifts can hide changed model operating conditions."),
    pressureDriver("model_disagreement", pressure.modelDisagreementRisk, 8, "Model disagreement raises drift review pressure."),
    pressureDriver("source_contradiction", pressure.sourceContradictionRisk, 8, "Contradictory sources raise drift review pressure."),
    pressureDriver("drift_report_staleness", pressure.staleRisk, 6, "Older drift reports carry less review confidence."),
    pressureDriver("sample_shortfall", pressure.sampleRisk, 3, "Thin drift samples raise uncertainty."),
    pressureDriver("source_posture", sourceRisk, 1, "Unclear or blocked source posture raises drift-pressure review risk."),
  ]);
}

function pressureDriver(
  name: string,
  value: number,
  scale: number,
  explanation: string,
): MetricDriver {
  const input: MetricDriverInput = {
    contribution: value * scale,
    direction: value > 0 ? "UP" : "NEUTRAL",
    explanation,
    name,
  };
  return metricDriver(input);
}

function driftBand(score: number, blocked: boolean): DriftPressureBand {
  if (blocked) return "BLOCKED";
  if (score >= 70) return "SEVERE";
  if (score >= 32) return "WATCH";
  return "STABLE";
}

function confidenceFromEvidence(
  sampleSupport: number,
  uncertaintyBand: MetricUncertaintyBand,
  reviewRisk: number,
): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 32;
  return round(Math.max(0, Math.min(100, base + sampleSupport * 12 - reviewRisk * 14)), 2);
}

function normalizeScore(value: number): number {
  return clampScore(value) / 100;
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}

function sourcePosture(
  sourceRisk: number,
  sourceAllowed: boolean,
): DriftPressureSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
