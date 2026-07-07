import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, clampScore, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type PlayableWindowBand = "CLOSED" | "WATCH" | "NARROW" | "OPEN";
export type PlayableWindowSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface PlayableWindowScoreInput {
  readonly marketGravityIndex: number;
  readonly staleLineRiskScore: number;
  readonly marketSignalAllowed: boolean;
  readonly noBetPressure: number;
  readonly driftPressure: number;
  readonly calibrationDebt: number;
  readonly signalIntegrityIndex: number;
  readonly evidenceHealth: number;
  readonly modelAgreement?: number;
  readonly roleVolatilityIndex?: number;
  readonly qbBurdenIndex?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface PlayableWindowScoreMetric {
  readonly metricId: "playable-window-score";
  readonly score: number;
  readonly band: PlayableWindowBand;
  readonly decisionWindowAllowed: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: PlayableWindowSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function playableWindowScore(input: PlayableWindowScoreInput): PlayableWindowScoreMetric {
  const market = normalizeScore(input.marketGravityIndex);
  const staleRisk = normalizeScore(input.staleLineRiskScore);
  const noBet = normalizeScore(input.noBetPressure);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const signalIntegrity = normalizeScore(input.signalIntegrityIndex);
  const evidenceHealth = normalizeScore(input.evidenceHealth);
  const modelAgreement = clamp01(input.modelAgreement ?? 0.65);
  const roleVolatility = normalizeScore(input.roleVolatilityIndex ?? 0);
  const qbBurden = normalizeScore(input.qbBurdenIndex ?? 0);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const blockReasons = hardBlockReasons({
    calibrationDebt: input.calibrationDebt,
    driftPressure: input.driftPressure,
    marketSignalAllowed: input.marketSignalAllowed,
    noBetPressure: input.noBetPressure,
    sourceAllowed,
    staleLineRiskScore: input.staleLineRiskScore,
  });
  const support = weightedMean([
    { value: market, weight: 0.24 },
    { value: signalIntegrity, weight: 0.22 },
    { value: evidenceHealth, weight: 0.2 },
    { value: modelAgreement, weight: 0.14 },
    { value: 1 - staleRisk, weight: 0.08 },
    { value: 1 - roleVolatility, weight: 0.07 },
    { value: 1 - qbBurden, weight: 0.05 },
  ]);
  const pressure = weightedMean([
    { value: noBet, weight: 0.28 },
    { value: staleRisk, weight: 0.2 },
    { value: drift, weight: 0.18 },
    { value: calibrationDebt, weight: 0.18 },
    { value: roleVolatility, weight: 0.08 },
    { value: qbBurden, weight: 0.04 },
    { value: sourceRisk, weight: 0.04 },
  ]);
  const rawScore = clampScore(100 * support - 62 * pressure);
  const score = round(blockReasons.length > 0 ? Math.min(24, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, sourceRisk * 100),
    proxyCount: proxyCount([input.roleVolatilityIndex, input.qbBurdenIndex]),
    sampleSize: Math.max(1, input.evidenceHealth) * 4,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    band: blockReasons.length > 0 ? "CLOSED" : classifyPlayableWindow(score),
    birthCertificate: requireMetricBirthCertificate("playable-window-score"),
    blockReasons,
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE",
    confidenceScore: confidenceFromEvidence(input.evidenceHealth, uncertaintyBand, Math.max(sourceRisk, staleRisk, drift)),
    decisionWindowAllowed: blockReasons.length === 0,
    drivers: sortedDrivers([
      metricDriver({
        contribution: market * 24,
        direction: market > 0 ? "UP" : "NEUTRAL",
        explanation: "Market gravity can support readiness only when freshness and rights gates survive.",
        name: "market_gravity_readiness",
      }),
      metricDriver({
        contribution: signalIntegrity * 22,
        direction: "UP",
        explanation: "Signal integrity supports decision-window readiness.",
        name: "signal_integrity",
      }),
      metricDriver({
        contribution: -noBet * 28,
        direction: noBet > 0 ? "DOWN" : "NEUTRAL",
        explanation: "No-bet pressure suppresses or closes the window.",
        name: "no_bet_pressure",
      }),
      metricDriver({
        contribution: -staleRisk * 20,
        direction: staleRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Stale line risk suppresses or closes market interpretation.",
        name: "stale_line_risk",
      }),
      metricDriver({
        contribution: -calibrationDebt * 18,
        direction: calibrationDebt > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Calibration debt suppresses readiness until probability claims are earned.",
        name: "calibration_debt",
      }),
      metricDriver({
        contribution: -drift * 18,
        direction: drift > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Drift pressure suppresses readiness.",
        name: "drift_pressure",
      }),
      metricDriver({
        contribution: -roleVolatility * 8,
        direction: roleVolatility > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Role volatility narrows player-context decision windows.",
        name: "role_volatility",
      }),
      metricDriver({
        contribution: -sourceRisk * 4,
        direction: sourceRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Unclear or blocked source posture raises review pressure.",
        name: "source_posture_review_pressure",
      }),
    ]),
    metricId: "playable-window-score",
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
  readonly marketSignalAllowed: boolean;
  readonly noBetPressure: number;
  readonly sourceAllowed: boolean;
  readonly staleLineRiskScore: number;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.marketSignalAllowed || input.staleLineRiskScore >= 85) {
    reasons.push("Market signal is stale or blocked.");
  }
  if (!input.sourceAllowed) {
    reasons.push("Source policy blocks modeling.");
  }
  if (input.noBetPressure >= 85) {
    reasons.push("No-bet pressure is too high.");
  }
  if (input.driftPressure >= 80) {
    reasons.push("Drift pressure is too high.");
  }
  if (input.calibrationDebt >= 80) {
    reasons.push("Calibration debt is too high.");
  }
  return reasons;
}

function classifyPlayableWindow(score: number): PlayableWindowBand {
  if (score >= 72) return "OPEN";
  if (score >= 55) return "NARROW";
  if (score >= 35) return "WATCH";
  return "CLOSED";
}

function confidenceFromEvidence(
  evidenceHealth: number,
  uncertaintyBand: MetricUncertaintyBand,
  reviewRisk: number,
): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 32;
  return round(Math.max(0, Math.min(100, base + clampScore(evidenceHealth) * 0.12 - reviewRisk * 12)), 2);
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

function sourcePosture(sourceRisk: number, sourceAllowed: boolean): PlayableWindowSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
