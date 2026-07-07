import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type QbBurdenBand = "LOW" | "ELEVATED" | "HIGH" | "EXTREME";
export type QbBurdenSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface QbBurdenIndexInput {
  readonly expectedCompletionProbability: number;
  readonly airYards: number;
  readonly down?: number;
  readonly yardsToGo: number;
  readonly pressureProxy?: number;
  readonly timeToThrowStressProxy?: number;
  readonly weatherPenalty?: number;
  readonly receiverSeparationDeficit?: number;
  readonly offensiveLineDisruptionProxy?: number;
  readonly passRateOverExpected?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface QbBurdenIndexMetric {
  readonly metricId: "qb-burden-index";
  readonly burdenIndex: number;
  readonly burdenBand: QbBurdenBand;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: QbBurdenSourcePosture;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function qbBurdenIndex(input: QbBurdenIndexInput): QbBurdenIndexMetric {
  const completionDifficulty = 1 - clamp01(input.expectedCompletionProbability);
  const depthBurden = normalizeClamped(input.airYards, 0, 45);
  const downStress = normalizeClamped(clamp(input.down ?? 3, 1, 4), 1, 4);
  const distanceStress = normalizeClamped(clamp(input.yardsToGo, 1, 25), 1, 18);
  const downDistanceFriction = clamp01(0.45 * downStress + 0.55 * distanceStress);
  const pressure = clamp01(input.pressureProxy ?? 0);
  const timeStress = clamp01(input.timeToThrowStressProxy ?? 0);
  const weather = clamp01(input.weatherPenalty ?? 0);
  const separationDeficit = clamp01(input.receiverSeparationDeficit ?? 0.5);
  const lineDisruption = clamp01(input.offensiveLineDisruptionProxy ?? 0.5);
  const passRatePressure = normalizeClamped(input.passRateOverExpected ?? 0, -0.2, 0.35);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);

  const burden = weightedMean([
    { value: completionDifficulty, weight: 0.24 },
    { value: pressure, weight: 0.2 },
    { value: depthBurden, weight: 0.14 },
    { value: downDistanceFriction, weight: 0.12 },
    { value: lineDisruption, weight: 0.1 },
    { value: separationDeficit, weight: 0.07 },
    { value: timeStress, weight: 0.05 },
    { value: weather, weight: 0.04 },
    { value: passRatePressure, weight: 0.03 },
    { value: sourceRisk, weight: 0.01 },
  ]);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: sourceRisk * 100,
    proxyCount:
      proxyCount([
        input.pressureProxy,
        input.timeToThrowStressProxy,
        input.weatherPenalty,
        input.passRateOverExpected,
      ]) +
      // Absent receiverSeparationDeficit / offensiveLineDisruptionProxy fall back to a
      // fabricated 0.5 prior that drives ~45% of a clean-context burden. Count that
      // reliance so defaulted (unmeasured) data cannot report LOW uncertainty, and so
      // supplying the real measurements does not raise uncertainty.
      defaultedReliance([input.receiverSeparationDeficit, input.offensiveLineDisruptionProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });
  const burdenIndexValue = round(burden * 100, 2);

  return {
    birthCertificate: requireMetricBirthCertificate("qb-burden-index"),
    burdenBand: classifyBurden(burdenIndexValue),
    burdenIndex: burdenIndexValue,
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand, sourceRisk),
    drivers: sortedDrivers([
      metricDriver({
        contribution: completionDifficulty * 24,
        direction: "UP",
        explanation: "Lower expected completion raises quarterback contextual burden.",
        name: "completion_difficulty",
      }),
      metricDriver({
        contribution: pressure * 20,
        direction: pressure > 0 ? "UP" : "NEUTRAL",
        explanation: "Pressure proxy raises the amount of context the quarterback must overcome.",
        name: "pressure_burden",
      }),
      metricDriver({
        contribution: depthBurden * 14,
        direction: depthBurden > 0 ? "UP" : "NEUTRAL",
        explanation: "Deeper throw depth raises quarterback burden.",
        name: "air_yards_depth",
      }),
      metricDriver({
        contribution: downDistanceFriction * 12,
        direction: downDistanceFriction > 0 ? "UP" : "NEUTRAL",
        explanation: "Late-down and long-distance situations increase decision and execution friction.",
        name: "down_distance_friction",
      }),
      metricDriver({
        contribution: lineDisruption * 10,
        direction: lineDisruption > 0 ? "UP" : "NEUTRAL",
        explanation: "Offensive-line disruption proxy raises quarterback burden.",
        name: "offensive_line_disruption",
      }),
      metricDriver({
        contribution: sourceRisk,
        direction: sourceRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Unclear or blocked source posture raises review pressure and uncertainty.",
        name: "source_posture_review_pressure",
      }),
    ]),
    metricId: "qb-burden-index",
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(input.sourcePolicy, sourceRisk),
    status: "SHADOW",
    uncertaintyBand,
  };
}

function classifyBurden(score: number): QbBurdenBand {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "ELEVATED";
  return "LOW";
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand, sourceRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(clamp(base + Math.min(12, sampleSize / 100) - sourceRisk * 12, 0, 100), 2);
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}

function sourcePosture(policies: readonly MetricSourcePolicy[], sourceRisk: number): QbBurdenSourcePosture {
  if (!sourcePoliciesAllowed(policies)) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}

function defaultedReliance(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value === undefined).length;
}
