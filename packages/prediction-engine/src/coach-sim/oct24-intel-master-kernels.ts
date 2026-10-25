/**
 * @file oct24-intel-master-kernels.ts
 * Pure Class A Quantitative Kernels from GSE-INTEL-MASTER-2026-10-24.md.
 *
 * Bridges and unifies the Open Source Football (OSF) mathematical models and
 * Oct 20-24 X-Research situational kernels for direct consumption in the
 * Coach-First Markov Simulator and Week 7 Player Prop / Game Script Pipeline:
 *
 *  - OSF #4: Student-t Hierarchical Offense/Defense EPA Ability (nu = 4..6)
 *  - OSF #2: QB Shifted Gini Volatility & VOLoe Tail Dispersion Multiplier
 *  - OSF #3: Empirical-Bayes Defense vs. WR1 Suppression & WR2/WR3/TE Funnel
 *  - OSF #10: Penalty-EPA Decomposition (coverage r=0.08 vs. procedural r=0.35)
 *  - OSF #11: Shrunk Individual Home-Field Advantage (iHFA, 0 on neutral site)
 *  - OSF #16: Neutral-Script Pass Tendency Over Expected (Stan xPass / PROE)
 *  - OSF #17: RERUN Punting Expected Return & Net Field-Position Delta
 *  - OSF #19: Full Receiver Yardage Quantile Distribution via CP(x,y) * xYAC
 *  - OSF #25: Running Back TRAP (High-Value Touches: targets + inside-10 carries)
 *  - @FantasyProsLabs (Oct 24): Backup-QB & WR-Room Attrition Target/Efficiency Reallocation
 *  - @timo_nfl (Oct 22): Single-Game Variance Compression on Static Season Ratings
 *
 * Zero book/market imports (Class A fence compliant).
 */

import { clamp, clamp01, normalCdf, quantile, shiftedGini } from "../nfl/osf-math-core.js";
import {
  evaluateDynamicHomeFieldAdvantage,
  type HfaInput,
  type HfaResult,
} from "../nfl/osf-team-ability-hfa-and-ewma.js";
import {
  computeQbEpaGiniAndVolOe,
  type QbEpaGiniInput,
  type QbEpaGiniResult,
} from "../nfl/osf-qb-volatility-and-prospects.js";
import {
  evaluateDefenseAgainstWr1,
  evaluatePenaltyStabilityAndPredictiveWeight,
  computeExpectedPassAndProe,
  type Wr1SuppressionInput,
  type Wr1SuppressionResult,
  type PenaltyStabilityInput,
  type PenaltyStabilityResult,
  type XPassInput,
} from "../nfl/osf-defense-penalties-and-proe.js";
import {
  computeRerunPunterMetric,
  type PuntObservation,
  type RerunResult,
} from "../nfl/osf-special-teams-ep-wp-and-cv.js";
import {
  computeReceiverExpectedFantasyPoints,
  type ReceiverXfpInput,
  type ReceiverXfpResult,
} from "../nfl/osf-receiving-xfp-and-spatial-surfaces.js";

// ── 1. OSF #4: Student-t EPA Ability ──────────────────────────────────────────

/**
 * Computes single-team heavy-tailed Student-t (nu = 5) shrunk EPA per play
 * from weekly game EPA observations via iteratively reweighted least squares.
 */
export function estimateStudentTEpaAbility(
  weeklyEpaObservations: readonly number[],
  nu = 5,
  priorMean = 0,
  priorShrinkage = 2.0,
): { shrunkEpa: number; sampleMean: number; downweightedOutlierGames: number; weights: number[] } {
  if (weeklyEpaObservations.length === 0) {
    return { shrunkEpa: priorMean, sampleMean: priorMean, downweightedOutlierGames: 0, weights: [] };
  }
  const n = weeklyEpaObservations.length;
  const sampleMean = weeklyEpaObservations.reduce((a, b) => a + b, 0) / n;
  let mu = sampleMean;
  const scale2 = Math.max(
    weeklyEpaObservations.reduce((acc, x) => acc + (x - sampleMean) ** 2, 0) / Math.max(n - 1, 1),
    0.005,
  );
  let weights = weeklyEpaObservations.map(() => 1);
  for (let iter = 0; iter < 15; iter += 1) {
    weights = weeklyEpaObservations.map((x) => {
      const r2 = (x - mu) ** 2 / scale2;
      return (nu + 1) / (nu + r2);
    });
    const wSum = weights.reduce((a, b) => a + b, 0);
    const wDot = weeklyEpaObservations.reduce((acc, x, i) => acc + weights[i]! * x, 0);
    mu = (wDot + priorShrinkage * priorMean) / (wSum + priorShrinkage);
  }
  const downweightedOutlierGames = weights.filter((w) => w < 0.75).length;
  return {
    shrunkEpa: mu,
    sampleMean,
    downweightedOutlierGames,
    weights,
  };
}

// ── 2. OSF #2: QB Gini Volatility & VOLoe Multiplier ─────────────────────────

export { computeQbEpaGiniAndVolOe, shiftedGini };
export type { QbEpaGiniInput, QbEpaGiniResult };

export interface QbVolatilityAdjustment {
  readonly gini: number;
  readonly volOe: number;
  readonly gameScriptSdMultiplier: number;
  readonly classification: "stable" | "volatile" | "insufficient-sample";
}

/**
 * Evaluates QB EPA dispersion via the shifted Gini coefficient and returns
 * a game-script standard deviation multiplier for tail outcome pricing.
 */
export function evaluateQbGiniVolatilityMultiplier(
  dropbackEpaSample: readonly number[],
  gamma0 = 0.42,
  gamma1 = -0.18,
): QbVolatilityAdjustment {
  const res = computeQbEpaGiniAndVolOe({
    epa: dropbackEpaSample,
    gamma0,
    gamma1,
  });
  const gameScriptSdMultiplier = clamp(1 + res.volOe * 0.65, 0.88, 1.22);
  return {
    gini: res.shiftedGini,
    volOe: res.volOe,
    gameScriptSdMultiplier,
    classification: res.interpretation,
  };
}

// ── 3. OSF #3: WR1-Split Defensive EPA & Funnel Multiplier ───────────────────

export { evaluateDefenseAgainstWr1 };
export type { Wr1SuppressionInput, Wr1SuppressionResult };

export interface Wr1SplitDefensiveProfile {
  readonly wr1TargetShareMultiplier: number;
  readonly wr1EpaDelta: number;
  readonly secondaryAncillaryFunnelBoost: number;
  readonly rawResult: Wr1SuppressionResult;
}

/**
 * Computes the Empirical-Bayes defensive suppression against WR1s and the
 * resulting target funnel boost to WR2/WR3/TE options.
 */
export function computeDefensiveWr1SplitAdjustment(
  wr1TargetsAllowed: number,
  teamPassAttemptsFaced: number,
  wr1EpaAllowedPerTarget: number,
): Wr1SplitDefensiveProfile {
  const league = {
    wr1TargetShare: 0.245,
    wr1EpaPerTarget: 0.16,
    targetShareVariance: 35,
    epaVariance: 45,
  };
  const rawResult = evaluateDefenseAgainstWr1({
    wr1Targets: wr1TargetsAllowed,
    teamPassAttempts: teamPassAttemptsFaced,
    wr1EpaPerTarget: wr1EpaAllowedPerTarget,
    league,
  });
  const wr1TargetShareMultiplier = clamp(rawResult.shrunkTargetShare / league.wr1TargetShare, 0.78, 1.22);
  const wr1EpaDelta = rawResult.shrunkEpaPerTarget - league.wr1EpaPerTarget;
  const secondaryAncillaryFunnelBoost = clamp(1 + (1 - wr1TargetShareMultiplier) * 0.55, 0.88, 1.18);
  return {
    wr1TargetShareMultiplier,
    wr1EpaDelta,
    secondaryAncillaryFunnelBoost,
    rawResult,
  };
}

// ── 4. OSF #10: Penalty-EPA Decomposition (Coverage r=0.08 vs Procedural r=0.35)

export { evaluatePenaltyStabilityAndPredictiveWeight };
export type { PenaltyStabilityInput, PenaltyStabilityResult };

export function decomposePenaltyEpaShrinkage(input: {
  coveragePenaltyEpaPerSnap: number;
  proceduralPenaltyRate: number;
  coverageSnaps: number;
  defensiveSnaps: number;
}): PenaltyStabilityResult {
  return evaluatePenaltyStabilityAndPredictiveWeight({
    ...input,
    league: {
      coveragePenaltyEpaPerSnap: -0.018,
      proceduralPenaltyRate: 0.032,
    },
    coverageReliability: 0.08,
    proceduralReliability: 0.35,
  });
}

// ── 5. OSF #11: Shrunk Individual Home-Field Advantage (iHFA) ─────────────────

export { evaluateDynamicHomeFieldAdvantage };
export type { HfaInput, HfaResult };

/**
 * Computes empirical-Bayes shrunk individual HFA in points.
 * Returns 0.0 automatically for neutral-site international games (e.g. PIT vs NO in Paris).
 */
export function computeShrunkIndividualHfa(input: {
  team: string;
  observedHfaPoints: number;
  homeGamesSample: number;
  isNeutralSite?: boolean;
  leagueMeanHfaPoints?: number;
  withinVar?: number;
  betweenVar?: number;
}): { effectiveHfaPoints: number; shrinkageWeight: number; isNeutralSite: boolean } {
  if (input.isNeutralSite) {
    return { effectiveHfaPoints: 0, shrinkageWeight: 0, isNeutralSite: true };
  }
  const leagueMean = input.leagueMeanHfaPoints ?? 1.85;
  const withinVar = input.withinVar ?? 169.0; // ~13 pt single-game margin SD^2
  const betweenVar = input.betweenVar ?? 0.45;
  const n = Math.max(1, input.homeGamesSample);
  const samplePrecision = n / withinVar;
  const priorPrecision = 1 / betweenVar;
  const shrinkageWeight = samplePrecision / (samplePrecision + priorPrecision);
  const effectiveHfaPoints =
    shrinkageWeight * input.observedHfaPoints + (1 - shrinkageWeight) * leagueMean;
  return {
    effectiveHfaPoints,
    shrinkageWeight,
    isNeutralSite: false,
  };
}

// ── 6. OSF #16: Neutral-Script Pass Tendency Over Expected (Stan PROE) ────────

export { computeExpectedPassAndProe };
export type { XPassInput };

export function computeNeutralPassTendencyOverExpected(
  observedNeutralPassRate: number,
  down: 1 | 2 | 3 = 1,
  distance = 10,
  yardline100 = 65,
  scoreDifferential = 0,
  halfSecondsRemaining = 1200,
): { xPass: number; proe: number; shrunkProe: number } {
  const res = computeExpectedPassAndProe(
    {
      down,
      distance,
      yardline100,
      scoreDifferential,
      halfSecondsRemaining,
      coefficients: {
        intercept: -0.95,
        down: 0.38,
        distance: 0.065,
        yardline100: -0.002,
        scoreDifferential: -0.028,
        halfSecondsRemaining: 0.00005,
      },
    },
    clamp01(observedNeutralPassRate),
  );
  // Stan hierarchical shrinkage factor r = 0.72 after 6 weeks
  const shrunkProe = res.proe * 0.72;
  return { xPass: res.xPass, proe: res.proe, shrunkProe };
}

// ── 7. OSF #17: RERUN Punting Field-Position Delta ───────────────────────────

export { computeRerunPunterMetric };
export type { PuntObservation, RerunResult };

export function computeRerunPuntFieldPositionDelta(input: {
  offensePuntNetOverExpectedYards: number;
  defensePuntReturnOverExpectedYards: number;
  expectedPuntsPerTeam?: number;
}): { netFieldPositionDeltaYards: number; expectedPointsDelta: number } {
  const punts = input.expectedPuntsPerTeam ?? 4.1;
  const netYards = (input.offensePuntNetOverExpectedYards - input.defensePuntReturnOverExpectedYards) * punts;
  // 1 yard of starting field position = ~0.042 expected points
  return {
    netFieldPositionDeltaYards: netYards,
    expectedPointsDelta: netYards * 0.042,
  };
}

// ── 8. OSF #19: Full Receiver Prop Quantile Distribution (CP * xYAC) ─────────

export { computeReceiverExpectedFantasyPoints };
export type { ReceiverXfpInput, ReceiverXfpResult };

export interface ReceiverPropQuantileDistribution {
  readonly expectedTargets: number;
  readonly expectedReceptions: number;
  readonly meanYards: number;
  readonly sdYards: number;
  readonly p10Yards: number;
  readonly p25Yards: number;
  readonly p50Yards: number;
  readonly p75Yards: number;
  readonly p90Yards: number;
  readonly probOverLine: (line: number) => number;
}

/**
 * Generates a full receiver yardage quantile distribution (P10, P25, P50, Mean, P75, P90)
 * from expected targets, catch probability (CP), air yards (aDOT), and expected YAC (xYAC),
 * accounting for positive right-skew of explosive pass plays.
 */
export function buildReceiverPropQuantileDistribution(input: {
  expectedTargets: number;
  catchProbability: number;
  adot: number;
  expectedYacPerCatch: number;
  yacSdPerCatch?: number;
}): ReceiverPropQuantileDistribution {
  const targets = Math.max(0, input.expectedTargets);
  const cp = clamp01(input.catchProbability);
  const expectedReceptions = targets * cp;
  const yardsPerCatch = Math.max(1, input.adot * 0.88 + input.expectedYacPerCatch);
  const meanYards = expectedReceptions * yardsPerCatch;

  // Compound Poisson-Gamma / Binomial-Lognormal variance law:
  // Var(Y) = E[N_rec] * Var(Y_single) + Var(N_rec) * (E[Y_single])^2
  const singleCatchSd = input.yacSdPerCatch ?? Math.max(6.5, yardsPerCatch * 0.72);
  const varRec = targets * cp * (1 - cp) + targets * 0.18 * cp * cp; // target count overdispersion
  const varYards = expectedReceptions * singleCatchSd ** 2 + varRec * yardsPerCatch ** 2;
  const sdYards = Math.sqrt(Math.max(varYards, 9));

  // Right-skewed Gamma/Lognormal quantile approximation (median < mean for football receiving yards)
  const cv = meanYards > 1 ? clamp(sdYards / meanYards, 0.18, 1.35) : 0.65;
  const sigmaLog = Math.sqrt(Math.log(1 + cv * cv));
  const muLog = Math.log(Math.max(meanYards, 1)) - 0.5 * sigmaLog * sigmaLog;

  const lognormalQuantile = (z: number): number => {
    if (meanYards <= 0.5) return 0;
    return Math.max(0, Math.round(Math.exp(muLog + z * sigmaLog) * 10) / 10);
  };

  const p10Yards = lognormalQuantile(-1.28155);
  const p25Yards = lognormalQuantile(-0.67449);
  const p50Yards = lognormalQuantile(0);
  const p75Yards = lognormalQuantile(0.67449);
  const p90Yards = lognormalQuantile(1.28155);

  const probOverLine = (line: number): number => {
    if (line <= 0) return 0.99;
    if (meanYards <= 0.5) return 0.01;
    const z = (Math.log(line) - muLog) / sigmaLog;
    return clamp(1 - normalCdf(z), 0.01, 0.99);
  };

  return {
    expectedTargets: Math.round(targets * 100) / 100,
    expectedReceptions: Math.round(expectedReceptions * 100) / 100,
    meanYards: Math.round(meanYards * 10) / 10,
    sdYards: Math.round(sdYards * 10) / 10,
    p10Yards,
    p25Yards,
    p50Yards,
    p75Yards,
    p90Yards,
    probOverLine,
  };
}

// ── 9. OSF #25: Running Back TRAP (High-Value Touches) ───────────────────────

export interface RbTouchBreakdown {
  readonly totalCarries: number;
  readonly insideTenCarries: number;
  readonly targets: number;
}

export interface TrapResult {
  readonly totalTouches: number;
  readonly highValueTouches: number;
  readonly trivialRushes: number;
  readonly trap: number;
}

export function computeTrivialRushAvoidedPercentage(input: RbTouchBreakdown): TrapResult {
  const totalCarries = Math.max(0, input.totalCarries);
  const insideTenCarries = clamp(input.insideTenCarries, 0, totalCarries);
  const targets = Math.max(0, input.targets);
  const totalTouches = totalCarries + targets;
  const highValueTouches = insideTenCarries + targets;
  const trivialRushes = totalCarries - insideTenCarries;
  const trap = totalTouches > 0 ? highValueTouches / totalTouches : 0;
  return {
    totalTouches,
    highValueTouches,
    trivialRushes,
    trap: Math.round(trap * 10000) / 10000,
  };
}

export function evaluateRbHighValueTouchTrap(input: RbTouchBreakdown): TrapResult & {
  roleClassification: "elite-bellcow" | "high-value-satellite" | "empty-calorie-grinder" | "balanced-committee";
} {
  const res = computeTrivialRushAvoidedPercentage(input);
  let roleClassification: "elite-bellcow" | "high-value-satellite" | "empty-calorie-grinder" | "balanced-committee";
  if (res.totalTouches >= 15 && res.trap >= 0.35) {
    roleClassification = "high-value-satellite";
  } else if (res.totalTouches >= 15 && res.trap >= 0.22) {
    roleClassification = "elite-bellcow";
  } else if (res.trap >= 0.30) {
    roleClassification = "high-value-satellite";
  } else if (res.trap < 0.14) {
    roleClassification = "empty-calorie-grinder";
  } else {
    roleClassification = "balanced-committee";
  }
  return { ...res, roleClassification };
}

// ── 10. @FantasyProsLabs (Oct 24): Backup-QB & WR-Room Attrition Reallocation ─

export interface ReceiverAttritionInput {
  readonly baseTargets: number;
  readonly baseCatchProbability: number;
  readonly baseAdot: number;
  readonly baseExpectedYac: number;
  /** True when QB1 is OUT and backup QB starts (e.g., Lamar Jackson OUT -> Tyler Huntley). */
  readonly startingQbOut: boolean;
  /** Backup-to-starter dropback efficiency delta in EPA/play (negative when backup is worse). */
  readonly backupQbEpaDelta?: number;
  /** Total team target share (0..1) vacated by injured WR/TE teammates (e.g. Evans+Deebo, Egbuka, Rice, Warren). */
  readonly vacatedTeammateTargetShare: number;
  /** Receiver's share (0..1) of the remaining healthy receiving room's baseline weight. */
  readonly healthyRoomAbsorptionWeight: number;
  /** True if the receiver is now elevated into primary CB1 shadow/bracket coverage due to WR1 absence. */
  readonly elevatedToPrimaryBracket?: boolean;
}

export interface ReceiverAttritionResult {
  readonly adjustedTargets: number;
  readonly adjustedCatchProbability: number;
  readonly adjustedAdot: number;
  readonly adjustedExpectedYac: number;
  readonly targetDeltaPct: number;
  readonly distribution: ReceiverPropQuantileDistribution;
}

/**
 * Reallocates receiver target volume and efficiency under QB1 absence and/or
 * WR/TE room attrition (@FantasyProsLabs Oct 24 + Bipartite Sinkhorn conservation):
 *  - Backup QB active: reduces catch probability and aDOT proportionally to the
 *    backup QB's dropback EPA drop-off, and trims deep-target conversion.
 *  - Vacated teammate target share: redistributes vacated targets to healthy
 *    pass-catchers weighted by `healthyRoomAbsorptionWeight` (with a 0.78
 *    elasticity factor since offenses also shift slightly toward run/checkdowns).
 *  - Primary bracket elevation: applies a small catch-rate haircut (-3.5% CP)
 *    when a WR2/WR3 is forced into primary #1 coverage.
 */
export function applyQuarterbackAndRoomAttritionToReceiver(
  input: ReceiverAttritionInput,
): ReceiverAttritionResult {
  const vacatedBoost =
    1 + clamp(input.vacatedTeammateTargetShare, 0, 0.55) * clamp01(input.healthyRoomAbsorptionWeight) * 2.15;
  const qbVolumeFactor = input.startingQbOut ? 0.91 : 1.0;
  const adjustedTargets = Math.max(0, input.baseTargets * vacatedBoost * qbVolumeFactor);

  const backupDelta = input.startingQbOut ? clamp(input.backupQbEpaDelta ?? -0.14, -0.35, 0.05) : 0;
  const qbCpPenalty = input.startingQbOut ? backupDelta * 0.35 : 0;
  const bracketCpPenalty = input.elevatedToPrimaryBracket ? -0.035 : 0;

  const adjustedCatchProbability = clamp(
    input.baseCatchProbability + qbCpPenalty + bracketCpPenalty,
    0.35,
    0.88,
  );
  const adjustedAdot = Math.max(
    2.5,
    input.baseAdot * (input.startingQbOut ? 0.90 : 1.0) * (input.elevatedToPrimaryBracket ? 0.96 : 1.0),
  );
  const adjustedExpectedYac = Math.max(
    1.5,
    input.baseExpectedYac * (input.startingQbOut ? 0.94 : 1.0),
  );

  const targetDeltaPct =
    input.baseTargets > 0 ? (adjustedTargets - input.baseTargets) / input.baseTargets : 0;

  const distribution = buildReceiverPropQuantileDistribution({
    expectedTargets: adjustedTargets,
    catchProbability: adjustedCatchProbability,
    adot: adjustedAdot,
    expectedYacPerCatch: adjustedExpectedYac,
  });

  return {
    adjustedTargets: distribution.expectedTargets,
    adjustedCatchProbability: Math.round(adjustedCatchProbability * 1000) / 1000,
    adjustedAdot: Math.round(adjustedAdot * 100) / 100,
    adjustedExpectedYac: Math.round(adjustedExpectedYac * 100) / 100,
    targetDeltaPct: Math.round(targetDeltaPct * 1000) / 1000,
    distribution,
  };
}

// ── 11. @timo_nfl (Oct 22): Single-Game Variance Compression on Static Ratings

/**
 * Compresses static season-level power-rating / DVOA spread edges toward the
 * matchup-specific trench & injury edge so that season-long averages cannot
 * override acute single-game structural reality (e.g. QB1 OUT or extreme trench mismatch).
 */
export function applySingleGameVarianceCompressionToRatingEdge(input: {
  staticSeasonSpreadMargin: number;
  matchupTrenchAndInjuryMargin: number;
  acuteInjuryShockMagnitudePts?: number;
}): { blendedSpreadMargin: number; staticWeight: number; matchupWeight: number } {
  const shock = Math.abs(input.acuteInjuryShockMagnitudePts ?? 0);
  // Base static weight is 0.45; under an acute QB/cluster injury shock (>3 pts),
  // static season ratings are compressed further down to 0.25.
  const staticWeight = clamp(0.45 - shock * 0.04, 0.22, 0.50);
  const matchupWeight = 1 - staticWeight;
  const blendedSpreadMargin =
    staticWeight * input.staticSeasonSpreadMargin +
    matchupWeight * input.matchupTrenchAndInjuryMargin;
  return {
    blendedSpreadMargin: Math.round(blendedSpreadMargin * 1000) / 1000,
    staticWeight: Math.round(staticWeight * 1000) / 1000,
    matchupWeight: Math.round(matchupWeight * 1000) / 1000,
  };
}
