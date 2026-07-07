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

export type PortfolioFitBand = "BLOCKED" | "POOR" | "THIN" | "FIT" | "PRIME";
export type PortfolioFitSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface PortfolioFitScoreInput {
  readonly edgeQualityScore: number;
  readonly playableWindowScore: number;
  readonly slateExposurePercent: number;
  readonly teamExposurePercent: number;
  readonly playerExposurePercent: number;
  readonly marketTypeExposurePercent: number;
  readonly correlationRisk: number;
  readonly duplicateThesisRisk: number;
  readonly liquidityFit: number;
  readonly bankrollFit: number;
  readonly noBetPressure: number;
  readonly driftPressure: number;
  readonly calibrationDebt: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface PortfolioFitScoreMetric {
  readonly metricId: "portfolio-fit-score";
  readonly score: number;
  readonly band: PortfolioFitBand;
  readonly portfolioActionAllowed: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "PORTFOLIO_COMPOSITION_QUALITY_NOT_WIN_PROBABILITY_OR_STAKE_ADVICE";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: PortfolioFitSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function portfolioFitScore(input: PortfolioFitScoreInput): PortfolioFitScoreMetric {
  const edgeQuality = normalizeScore(input.edgeQualityScore);
  const playableWindow = normalizeScore(input.playableWindowScore);
  const concentration = maxExposureRisk(input);
  const correlation = normalizeScore(input.correlationRisk);
  const duplicateThesis = normalizeScore(input.duplicateThesisRisk);
  const liquidity = normalizeScore(input.liquidityFit);
  const bankroll = normalizeScore(input.bankrollFit);
  const noBet = normalizeScore(input.noBetPressure);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const blockReasons = hardBlockReasons({
    calibrationDebt: input.calibrationDebt,
    concentration,
    driftPressure: input.driftPressure,
    noBetPressure: input.noBetPressure,
    playableWindowScore: input.playableWindowScore,
    sourceAllowed,
  });
  const support = weightedMean([
    { value: edgeQuality, weight: 0.18 },
    { value: playableWindow, weight: 0.2 },
    { value: liquidity, weight: 0.12 },
    { value: bankroll, weight: 0.12 },
    { value: 1 - concentration, weight: 0.15 },
    { value: 1 - correlation, weight: 0.1 },
    { value: 1 - duplicateThesis, weight: 0.07 },
    { value: 1 - sourceRisk, weight: 0.06 },
  ]);
  const pressure = weightedMean([
    { value: concentration, weight: 0.22 },
    { value: correlation, weight: 0.18 },
    { value: duplicateThesis, weight: 0.16 },
    { value: noBet, weight: 0.16 },
    { value: drift, weight: 0.12 },
    { value: calibrationDebt, weight: 0.1 },
    { value: sourceRisk, weight: 0.06 },
  ]);
  const rawScore = clampScore(100 * support - 32 * pressure);
  const score = round(blockReasons.length > 0 ? Math.min(24, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, sourceRisk * 100),
    proxyCount: 2,
    sampleSize: Math.max(1, 100 - input.noBetPressure) * 3,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    band: blockReasons.length > 0 ? "BLOCKED" : classifyPortfolioFit(score),
    birthCertificate: requireMetricBirthCertificate("portfolio-fit-score"),
    blockReasons,
    confidenceMeaning: "PORTFOLIO_COMPOSITION_QUALITY_NOT_WIN_PROBABILITY_OR_STAKE_ADVICE",
    confidenceScore: confidenceFromEvidence(uncertaintyBand, Math.max(concentration, correlation, sourceRisk, drift)),
    drivers: sortedDrivers([
      metricDriver({
        contribution: playableWindow * 20,
        direction: playableWindow > 0 ? "UP" : "NEUTRAL",
        explanation: "Playable-window readiness supports portfolio fit.",
        name: "playable_window_readiness",
      }),
      metricDriver({
        contribution: edgeQuality * 18,
        direction: edgeQuality > 0 ? "UP" : "NEUTRAL",
        explanation: "Edge quality can support fit only after portfolio and refusal checks.",
        name: "edge_quality_support",
      }),
      metricDriver({
        contribution: -(concentration * 22),
        direction: concentration > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Concentrated slate, team, player, or market exposure lowers portfolio fit.",
        name: "concentration_risk",
      }),
      metricDriver({
        contribution: -(correlation * 18),
        direction: correlation > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Correlated positions increase portfolio fragility.",
        name: "correlation_risk",
      }),
      metricDriver({
        contribution: -(duplicateThesis * 16),
        direction: duplicateThesis > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Duplicate thesis risk means the portfolio may be repeating one fragile idea.",
        name: "duplicate_thesis_risk",
      }),
      metricDriver({
        contribution: liquidity * 12 + bankroll * 12,
        direction: liquidity + bankroll > 0 ? "UP" : "NEUTRAL",
        explanation: "Liquidity and bankroll fit support operationally realistic portfolio use.",
        name: "execution_fit",
      }),
      metricDriver({
        contribution: -(noBet * 16 + drift * 12 + calibrationDebt * 10),
        direction: noBet + drift + calibrationDebt > 0 ? "DOWN" : "NEUTRAL",
        explanation: "No-bet, drift, and calibration pressures override attractive standalone edges.",
        name: "refusal_pressure",
      }),
      metricDriver({
        contribution: -(sourceRisk * 6),
        direction: sourceRisk > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Unclear or blocked source posture lowers portfolio fit.",
        name: "source_posture_review_pressure",
      }),
    ]),
    metricId: "portfolio-fit-score",
    portfolioActionAllowed: blockReasons.length === 0,
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
  readonly concentration: number;
  readonly driftPressure: number;
  readonly noBetPressure: number;
  readonly playableWindowScore: number;
  readonly sourceAllowed: boolean;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.sourceAllowed) reasons.push("Source policy blocks portfolio use.");
  if (input.playableWindowScore < 25) reasons.push("Playable window is closed.");
  if (input.concentration >= 0.9) reasons.push("Portfolio exposure is too concentrated.");
  if (input.noBetPressure >= 85) reasons.push("No-bet pressure is too high.");
  if (input.driftPressure >= 80) reasons.push("Drift pressure is too high.");
  if (input.calibrationDebt >= 80) reasons.push("Calibration debt is too high.");
  return reasons;
}

function classifyPortfolioFit(score: number): PortfolioFitBand {
  if (score >= 82) return "PRIME";
  if (score >= 66) return "FIT";
  if (score >= 48) return "THIN";
  return "POOR";
}

function confidenceFromEvidence(uncertaintyBand: MetricUncertaintyBand, reviewRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 32;
  return round(Math.max(0, Math.min(100, base - reviewRisk * 14)), 2);
}

function maxExposureRisk(input: PortfolioFitScoreInput): number {
  return Math.max(
    normalizeScore(input.slateExposurePercent),
    normalizeScore(input.teamExposurePercent),
    normalizeScore(input.playerExposurePercent),
    normalizeScore(input.marketTypeExposurePercent),
  );
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

function sourcePosture(sourceRisk: number, sourceAllowed: boolean): PortfolioFitSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
