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

export type MarketMirageBand = "LOW" | "WATCH" | "HIGH" | "BLOCK";
export type MarketMirageSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface MarketMirageScoreInput {
  readonly marketGravityIndex: number;
  readonly staleLineRiskScore: number;
  readonly marketSignalAllowed: boolean;
  readonly publicNarrativeHeat: number;
  readonly sourceContradictionPressure: number;
  readonly bookDispersionIndex: number;
  readonly explainabilityScore: number;
  readonly noBetPressure: number;
  readonly driftPressure: number;
  readonly calibrationDebt: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface MarketMirageScore {
  readonly metricId: "market-mirage-score";
  readonly score: number;
  readonly band: MarketMirageBand;
  readonly marketInterpretationAllowed: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: MarketMirageSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function marketMirageScore(input: MarketMirageScoreInput): MarketMirageScore {
  const marketGravity = normalizeScore(input.marketGravityIndex);
  const staleRisk = normalizeScore(input.staleLineRiskScore);
  const narrativeHeat = normalizeScore(input.publicNarrativeHeat);
  const contradiction = normalizeScore(input.sourceContradictionPressure);
  const dispersion = normalizeScore(input.bookDispersionIndex);
  const explainability = normalizeScore(input.explainabilityScore);
  const noBet = normalizeScore(input.noBetPressure);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const unexplainedGravity = marketGravity * (1 - explainability);
  const blockReasons = hardBlockReasons({
    calibrationDebt: input.calibrationDebt,
    driftPressure: input.driftPressure,
    marketSignalAllowed: input.marketSignalAllowed,
    noBetPressure: input.noBetPressure,
    sourceAllowed,
    staleLineRiskScore: input.staleLineRiskScore,
  });

  const pressure = weightedMean([
    { value: staleRisk, weight: 0.22 },
    { value: narrativeHeat, weight: 0.16 },
    { value: contradiction, weight: 0.14 },
    { value: dispersion, weight: 0.12 },
    { value: noBet, weight: 0.12 },
    { value: unexplainedGravity, weight: 0.1 },
    { value: drift, weight: 0.06 },
    { value: calibrationDebt, weight: 0.05 },
    { value: sourceRisk, weight: 0.03 },
  ]);
  const explainableMarketCredit = marketGravity * explainability * (1 - Math.max(staleRisk, contradiction, dispersion));
  const rawScore = clampScore(100 * clamp01(pressure - 0.18 * explainableMarketCredit));
  const score = round(blockReasons.length > 0 ? Math.max(85, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, sourceRisk * 100),
    proxyCount: 4,
    sampleSize: Math.max(1, 100 - input.staleLineRiskScore) * 3,
    sourcePolicy: input.sourcePolicy,
  });
  return {
    band: blockReasons.length > 0 ? "BLOCK" : classifyMirage(score),
    birthCertificate: requireMetricBirthCertificate("market-mirage-score"),
    blockReasons,
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK",
    confidenceScore: confidenceFromEvidence(uncertaintyBand, Math.max(sourceRisk, staleRisk, contradiction, dispersion)),
    drivers: sortedDrivers([
      metricDriver({
        contribution: staleRisk * 22,
        direction: staleRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Stale line risk can make market movement look cleaner than it is.",
        name: "stale_line_mirage_pressure",
      }),
      metricDriver({
        contribution: narrativeHeat * 16,
        direction: narrativeHeat > 0 ? "UP" : "NEUTRAL",
        explanation: "Public narrative heat can create attention without verified signal.",
        name: "public_narrative_heat",
      }),
      metricDriver({
        contribution: contradiction * 14,
        direction: contradiction > 0 ? "UP" : "NEUTRAL",
        explanation: "Contradictory sources raise mirage risk.",
        name: "source_contradiction_pressure",
      }),
      metricDriver({
        contribution: dispersion * 12,
        direction: dispersion > 0 ? "UP" : "NEUTRAL",
        explanation: "Book dispersion raises risk that a single line is not a clean market signal.",
        name: "book_dispersion_mirage_pressure",
      }),
      metricDriver({
        contribution: noBet * 12,
        direction: noBet > 0 ? "UP" : "NEUTRAL",
        explanation: "No-bet pressure means the market look should not override decision discipline.",
        name: "no_bet_pressure",
      }),
      metricDriver({
        contribution: unexplainedGravity * 10,
        direction: unexplainedGravity > 0 ? "UP" : "NEUTRAL",
        explanation: "Strong market gravity without clear explanation can be mirage-prone.",
        name: "unexplained_market_gravity",
      }),
      metricDriver({
        contribution: -explainableMarketCredit * 18,
        direction: explainableMarketCredit > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Explainable, fresh, corroborated market movement reduces mirage risk.",
        name: "explainable_market_credit",
      }),
      metricDriver({
        contribution: sourceRisk * 3,
        direction: sourceRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Unclear or blocked source posture increases review pressure.",
        name: "source_posture_review_pressure",
      }),
    ]),
    marketInterpretationAllowed: blockReasons.length === 0,
    metricId: "market-mirage-score",
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
  if (!input.marketSignalAllowed || input.staleLineRiskScore >= 85) reasons.push("Market signal is stale or blocked.");
  if (!input.sourceAllowed) reasons.push("Source policy blocks modeling.");
  if (input.noBetPressure >= 85) reasons.push("No-bet pressure is too high.");
  if (input.driftPressure >= 80) reasons.push("Drift pressure is too high.");
  if (input.calibrationDebt >= 80) reasons.push("Calibration debt is too high.");
  return reasons;
}

function classifyMirage(score: number): MarketMirageBand {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "WATCH";
  return "LOW";
}

function confidenceFromEvidence(uncertaintyBand: MetricUncertaintyBand, reviewRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(Math.max(0, Math.min(100, base - reviewRisk * 16)), 2);
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
function sourcePosture(sourceRisk: number, sourceAllowed: boolean): MarketMirageSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
