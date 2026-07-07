import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, clampScore, normalizeClamped, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type CalibrationIntegrityLetter = "A" | "B" | "C" | "D" | "F";
export type CalibrationIntegritySourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface CalibrationIntegrityGradeInput {
  readonly expectedCalibrationError: number;
  readonly brierScore: number;
  readonly reliabilitySlope: number;
  readonly bucketCoverage: number;
  readonly sampleSize: number;
  readonly minimumSampleSize: number;
  readonly reportAgeDays: number;
  readonly reportFreshnessTtlDays: number;
  readonly driftPressure: number;
  readonly calibrationDebt: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface CalibrationIntegrityGradeMetric {
  readonly metricId: "calibration-integrity-grade";
  readonly score: number;
  readonly letterGrade: CalibrationIntegrityLetter;
  readonly calibrationUsable: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "CALIBRATION_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: CalibrationIntegritySourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function calibrationIntegrityGrade(
  input: CalibrationIntegrityGradeInput,
): CalibrationIntegrityGradeMetric {
  const minimumSampleSize = Math.max(1, input.minimumSampleSize);
  const sampleSupport = normalizeClamped(input.sampleSize, minimumSampleSize, minimumSampleSize * 4);
  const eceRisk = normalizeClamped(input.expectedCalibrationError, 0, 0.15);
  const brierRisk = normalizeClamped(input.brierScore, 0.16, 0.34);
  const slopeRisk = normalizeClamped(Math.abs(input.reliabilitySlope - 1), 0, 0.5);
  const bucketCoverage = clamp01(input.bucketCoverage);
  const ttlDays = Math.max(1, input.reportFreshnessTtlDays);
  const staleRisk = normalizeClamped(input.reportAgeDays, 0, ttlDays);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const blockReasons = hardBlockReasons({
    calibrationDebt: input.calibrationDebt,
    driftPressure: input.driftPressure,
    expectedCalibrationError: input.expectedCalibrationError,
    reportAgeDays: input.reportAgeDays,
    reportFreshnessTtlDays: ttlDays,
    sampleSize: input.sampleSize,
    minimumSampleSize,
    sourceAllowed,
  });
  const quality = weightedMean([
    { value: 1 - eceRisk, weight: 0.24 },
    { value: 1 - brierRisk, weight: 0.16 },
    { value: 1 - slopeRisk, weight: 0.14 },
    { value: sampleSupport, weight: 0.13 },
    { value: bucketCoverage, weight: 0.1 },
    { value: 1 - staleRisk, weight: 0.08 },
    { value: 1 - drift, weight: 0.07 },
    { value: 1 - calibrationDebt, weight: 0.05 },
    { value: 1 - sourceRisk, weight: 0.03 },
  ]);
  const rawScore = clampScore(100 * quality);
  const score = round(blockReasons.length > 0 ? Math.min(24, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, staleRisk * 100, sourceRisk * 100),
    proxyCount: 0,
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("calibration-integrity-grade"),
    blockReasons,
    calibrationUsable: blockReasons.length === 0,
    confidenceMeaning: "CALIBRATION_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY",
    confidenceScore: confidenceFromEvidence(sampleSupport, uncertaintyBand, Math.max(staleRisk, sourceRisk, drift)),
    drivers: sortedDrivers([
      metricDriver({
        contribution: -(eceRisk * 24),
        direction: eceRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Expected calibration error lowers calibration integrity.",
        name: "expected_calibration_error",
      }),
      metricDriver({
        contribution: -(brierRisk * 16),
        direction: brierRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Weak Brier performance lowers calibration integrity.",
        name: "brier_score_risk",
      }),
      metricDriver({
        contribution: -(slopeRisk * 14),
        direction: slopeRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Reliability-curve slope drifting from 1.0 lowers calibration integrity.",
        name: "reliability_slope_risk",
      }),
      metricDriver({
        contribution: sampleSupport * 13,
        direction: sampleSupport > 0 ? "UP" : "NEUTRAL",
        explanation: "Sufficient settled calibration samples support integrity.",
        name: "sample_support",
      }),
      metricDriver({
        contribution: bucketCoverage * 10,
        direction: bucketCoverage > 0 ? "UP" : "NEUTRAL",
        explanation: "Broader probability-bucket coverage reduces blind spots.",
        name: "bucket_coverage",
      }),
      metricDriver({
        contribution: -(staleRisk * 8),
        direction: staleRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Older calibration reports lose decision usefulness.",
        name: "calibration_report_staleness",
      }),
      metricDriver({
        contribution: -(drift * 7 + calibrationDebt * 5),
        direction: drift + calibrationDebt > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Drift pressure and calibration debt suppress calibration integrity.",
        name: "calibration_pressure",
      }),
      metricDriver({
        contribution: -(sourceRisk * 3),
        direction: sourceRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Unclear or blocked source posture lowers calibration confidence.",
        name: "source_posture_review_pressure",
      }),
    ]),
    letterGrade: letterGrade(score),
    metricId: "calibration-integrity-grade",
    probability: null,
    score,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(sourceRisk, sourceAllowed),
    status: "SHADOW",
    uncertaintyBand: blockReasons.length > 0 ? "HIGH" : uncertaintyBand,
  };
}

function hardBlockReasons(input: {
  readonly calibrationDebt: number;
  readonly driftPressure: number;
  readonly expectedCalibrationError: number;
  readonly reportAgeDays: number;
  readonly reportFreshnessTtlDays: number;
  readonly sampleSize: number;
  readonly minimumSampleSize: number;
  readonly sourceAllowed: boolean;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.sourceAllowed) reasons.push("Source policy blocks calibration use.");
  if (input.sampleSize < input.minimumSampleSize) reasons.push("Calibration sample is below minimum.");
  if (input.expectedCalibrationError >= 0.22) reasons.push("Expected calibration error is too high.");
  if (input.reportAgeDays >= input.reportFreshnessTtlDays * 2) reasons.push("Calibration report is stale.");
  if (input.driftPressure >= 85) reasons.push("Drift pressure is too high.");
  if (input.calibrationDebt >= 85) reasons.push("Calibration debt is too high.");
  return reasons;
}

function letterGrade(score: number): CalibrationIntegrityLetter {
  if (score >= 85) return "A";
  if (score >= 72) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

function confidenceFromEvidence(
  sampleSupport: number,
  uncertaintyBand: MetricUncertaintyBand,
  reviewRisk: number,
): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(Math.max(0, Math.min(100, base + sampleSupport * 12 - reviewRisk * 12)), 2);
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
): CalibrationIntegritySourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
