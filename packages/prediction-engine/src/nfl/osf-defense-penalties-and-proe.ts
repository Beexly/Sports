/**
 * Stream 12 — nflverse/open-source-football defense, penalties, and PROE
 * modules (Posts #3, #19, #11, #17). RT-06 hardened.
 *
 * Post #3: empirical-Bayes WR1 target/EPA suppression with a WR2/WR3/TE
 * funnel multiplier. Post #19: drive-rest regression controlling for the
 * team's intrinsic offense/defense EPA. Post #11: coverage-penalty EPA is
 * heavily shrunk toward league average because it repeats at about r=0.08,
 * while pre-snap/procedural rates are retained because they repeat at
 * about r=0.35. Post #17: situational xPass and PROE conditioned on down,
 * distance, yardline, score differential, and half seconds remaining.
 *
 * The regression coefficients and league baselines are arguments. The
 * 0.08 and 0.35 reliability values are published in the post and are used
 * as the default reliability multipliers with that provenance noted.
 */

import { clamp01, logit, mean, sigmoid, variance } from "./osf-math-core.js";

export interface Wr1SuppressionInput {
  /** Targets to the opposing WR1 in the sample. */
  wr1Targets: number;
  /** Total pass attempts in the sample. */
  teamPassAttempts: number;
  /** EPA per target to the WR1 in the sample. */
  wr1EpaPerTarget: number;
  /** League-average WR1 target share and EPA per target. Required. */
  league: {
    wr1TargetShare: number;
    wr1EpaPerTarget: number;
    /** Between-team variance of WR1 target share; used for EB shrinkage. */
    targetShareVariance: number;
    /** Between-team variance of WR1 EPA per target. */
    epaVariance: number;
  };
}

export interface Wr1SuppressionResult {
  observedTargetShare: number;
  shrunkTargetShare: number;
  observedEpaPerTarget: number;
  shrunkEpaPerTarget: number;
  suppressionIndex: number;
  funnelMultiplier: number;
}

/**
 * Post #3. Both the target share and the EPA per target are shrunk toward
 * the league mean with the standard empirical-Bayes weight
 * n/(n + sigma^2/tau^2). The suppression index is the negated shrunk EPA
 * relative to league, and the funnel multiplier splits the remaining
 * target share across WR2/WR3/TE in proportion to their league shares.
 */
export function evaluateDefenseAgainstWr1(input: Wr1SuppressionInput): Wr1SuppressionResult {
  const { wr1Targets, teamPassAttempts, wr1EpaPerTarget, league } = input;
  if (!Number.isFinite(wr1Targets) || wr1Targets < 0) throw new Error("wr1Targets must be non-negative");
  if (!Number.isFinite(teamPassAttempts) || teamPassAttempts <= 0) {
    throw new Error("teamPassAttempts must be positive");
  }
  if (wr1Targets > teamPassAttempts) throw new Error("wr1Targets cannot exceed teamPassAttempts");
  if (!Number.isFinite(wr1EpaPerTarget)) throw new Error("wr1EpaPerTarget must be finite");
  const { wr1TargetShare: leagueShare, wr1EpaPerTarget: leagueEpa } = league;
  if (!(leagueShare > 0 && leagueShare < 1)) throw new Error("league wr1TargetShare must be in (0, 1)");
  if (!Number.isFinite(leagueEpa)) throw new Error("league wr1EpaPerTarget must be finite");
  if (league.targetShareVariance <= 0 || league.epaVariance <= 0) {
    throw new Error("league variances must be positive");
  }
  const observedShare = wr1Targets / teamPassAttempts;
  const shareWeight = wr1Targets / (wr1Targets + league.targetShareVariance);
  const epaWeight = wr1Targets / (wr1Targets + league.epaVariance);
  const shrunkShare = shareWeight * observedShare + (1 - shareWeight) * leagueShare;
  const shrunkEpa = epaWeight * wr1EpaPerTarget + (1 - epaWeight) * leagueEpa;
  const suppressionIndex = leagueEpa - shrunkEpa;
  const funnelMultiplier = clamp01(1 - shrunkShare / Math.max(leagueShare, 1e-6));
  return {
    observedTargetShare: observedShare,
    shrunkTargetShare: shrunkShare,
    observedEpaPerTarget: wr1EpaPerTarget,
    shrunkEpaPerTarget: shrunkEpa,
    suppressionIndex,
    funnelMultiplier,
  };
}

export interface DriveRestInput {
  /** EPA per drive observed after the rest differential. */
  observedEpaPerDrive: number;
  /** The team's intrinsic offense or defense EPA per drive. */
  intrinsicEpaPerDrive: number;
  /** Rest days differential versus the opponent (positive = more rest). */
  restDaysDifferential: number;
  /** Published drive-rest regression slope in EPA per rest day. Required. */
  restSlope: number;
  /** Published intercept of the drive-rest regression. Required. */
  intercept: number;
}

export interface DriveRestResult {
  expectedEpaPerDrive: number;
  restEffectEpa: number;
  residualEpa: number;
  restDaysDifferential: number;
}

/**
 * Post #19. The regression controls for intrinsic team offense/defense EPA
 * by including it as a level term; the rest effect is the slope times the
 * rest-day differential. The residual is the observed minus expected.
 */
export function evaluateDefensiveDriveRestImpact(input: DriveRestInput): DriveRestResult {
  const {
    observedEpaPerDrive,
    intrinsicEpaPerDrive,
    restDaysDifferential,
    restSlope,
    intercept,
  } = input;
  if (![observedEpaPerDrive, intrinsicEpaPerDrive, restDaysDifferential, restSlope, intercept].every(Number.isFinite)) {
    throw new Error("drive-rest inputs must be finite");
  }
  const expectedEpaPerDrive = intercept + intrinsicEpaPerDrive + restSlope * restDaysDifferential;
  const restEffectEpa = restSlope * restDaysDifferential;
  return {
    expectedEpaPerDrive,
    restEffectEpa,
    residualEpa: observedEpaPerDrive - expectedEpaPerDrive,
    restDaysDifferential,
  };
}

export interface PenaltyStabilityInput {
  /** Observed coverage-penalty EPA per coverage snap. */
  coveragePenaltyEpaPerSnap: number;
  /** Observed pre-snap/procedural penalty rate per snap. */
  proceduralPenaltyRate: number;
  /** Number of coverage snaps in the sample. */
  coverageSnaps: number;
  /** Number of total defensive snaps in the sample. */
  defensiveSnaps: number;
  /** League means. Required. */
  league: {
    coveragePenaltyEpaPerSnap: number;
    proceduralPenaltyRate: number;
  };
  /** Published repeatability. Defaults to the post's 0.08 and 0.35. */
  coverageReliability?: number;
  proceduralReliability?: number;
}

export interface PenaltyStabilityResult {
  coverageWeight: number;
  proceduralWeight: number;
  shrunkCoverageEpa: number;
  shrunkProceduralRate: number;
  stableComponent: number;
  noiseComponent: number;
}

/**
 * Post #11. Reliability is treated as the share of the observed deviation
 * that is expected to repeat. Coverage penalties are shrunk hard
 * (r=0.08); procedural/pre-snap penalties retain r=0.35. A zero-snap sample
 * returns the league mean with zero weight rather than dividing by zero.
 */
export function evaluatePenaltyStabilityAndPredictiveWeight(
  input: PenaltyStabilityInput,
): PenaltyStabilityResult {
  const {
    coveragePenaltyEpaPerSnap,
    proceduralPenaltyRate,
    coverageSnaps,
    defensiveSnaps,
    league,
    coverageReliability = 0.08,
    proceduralReliability = 0.35,
  } = input;
  if (!Number.isFinite(coveragePenaltyEpaPerSnap) || !Number.isFinite(proceduralPenaltyRate)) {
    throw new Error("penalty observations must be finite");
  }
  if (coverageSnaps < 0 || defensiveSnaps < 0) throw new Error("snap counts must be non-negative");
  if (!(coverageReliability >= 0 && coverageReliability <= 1)) throw new Error("coverageReliability must be in [0,1]");
  if (!(proceduralReliability >= 0 && proceduralReliability <= 1)) {
    throw new Error("proceduralReliability must be in [0,1]");
  }
  const coverageWeight = coverageSnaps === 0 ? 0 : coverageReliability;
  const proceduralWeight = defensiveSnaps === 0 ? 0 : proceduralReliability;
  const shrunkCoverageEpa =
    coverageWeight * coveragePenaltyEpaPerSnap + (1 - coverageWeight) * league.coveragePenaltyEpaPerSnap;
  const shrunkProceduralRate =
    proceduralWeight * proceduralPenaltyRate + (1 - proceduralWeight) * league.proceduralPenaltyRate;
  return {
    coverageWeight,
    proceduralWeight,
    shrunkCoverageEpa,
    shrunkProceduralRate,
    stableComponent: shrunkProceduralRate,
    noiseComponent: shrunkCoverageEpa,
  };
}

export interface XPassInput {
  down: 1 | 2 | 3 | 4;
  distance: number;
  yardline100: number;
  scoreDifferential: number;
  halfSecondsRemaining: number;
  /** Published logistic coefficients. Required: this is not fit here. */
  coefficients: {
    intercept: number;
    down: number;
    distance: number;
    yardline100: number;
    scoreDifferential: number;
    halfSecondsRemaining: number;
  };
}

export interface XPassResult {
  xPass: number;
  logit: number;
}

/**
 * Post #17. Situational expected pass rate. The published model is a
 * logistic on down, distance, yardline, score differential, and half
 * seconds remaining. Coefficients must be supplied; the function does not
 * fit them and does not hide a coefficient table.
 */
export function computeExpectedPassAndProe(
  input: XPassInput,
  actualPassRate: number,
): { xPass: number; proe: number; logit: number } {
  const { down, distance, yardline100, scoreDifferential, halfSecondsRemaining, coefficients } = input;
  if (![1, 2, 3, 4].includes(down)) throw new Error("down must be 1-4");
  if (![distance, yardline100, scoreDifferential, halfSecondsRemaining].every(Number.isFinite)) {
    throw new Error("xPass inputs must be finite");
  }
  if (!(actualPassRate >= 0 && actualPassRate <= 1)) throw new Error("actualPassRate must be in [0,1]");
  const z =
    coefficients.intercept +
    coefficients.down * down +
    coefficients.distance * distance +
    coefficients.yardline100 * yardline100 +
    coefficients.scoreDifferential * scoreDifferential +
    coefficients.halfSecondsRemaining * halfSecondsRemaining;
  const xPass = sigmoid(z);
  return { xPass, proe: actualPassRate - xPass, logit: z };
}

export { mean, variance, logit };
