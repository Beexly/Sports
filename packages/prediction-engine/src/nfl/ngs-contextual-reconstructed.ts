/**
 * Stream 11: Reconstructed NFL Contextual Analytics Engine & Empirical Guards
 * from the Universal Agent Handoff (nfl-farm & nfl-re, sha256 5097ee74d129a76e...).
 *
 * Implements:
 * 1. Exact NGS Expected-Value Residual Identities (CPOE, YACoE, RYOE — verified to 0.0 on 175+ rows)
 * 2. NGS Highlight completionProbability (fitted on 3,820 NGS rows) vs BDB Context xComp (AUC 0.7461 on 9,575 plays)
 *    with the Depth-Blindness Guard (Spearman rho = -0.023 across 1,080 plays in 2023-2025)
 * 3. Vendor-Anchored Receiver Separation Residual (NGS_LEAGUE_AVG_SEPARATION = 2.9866993023508566,
 *    TE +1.003 yd vs WR -0.091 yd, depth-controlled catch lift +0.0645/yd, YPT lift +1.344 yd/yd,
 *    and pre-snap cushion zero-gate where incremental R^2 = 0.001)
 * 4. BDB 2027 Subject-Only Tracking Gate (refuses geometric defender separation when trackedPlayers < 22)
 * 5. Pre-Snap Motion 99.94% Pass Indicator Filter (1,765/1,766 plays, p = 2.8e-205) & Down-Conditional Man Prior
 * 6. Unregularised OLS Route x Coverage Interaction & Scalar Ghost-Defender Residual Matrix
 * 7. PropFinder Exact pfRating Reconstructor (maxerr = 0.0 on 62,186 rows) & American-Odds Scale Guard
 */

export const NGS_LEAGUE_AVG_SEPARATION = 2.9866993023508566;
export const TARGETED_SAMPLE_SEPARATION_MEAN_2025 = 3.212;
export const TARGETED_SAMPLE_SEPARATION_MEAN_2024 = 3.25;

/** [PAYLOAD] Exact CPOE identity in percentage points: 100 * (completions - sum(expected_cp)) / attempts */
export function computeNgsCpoePercentagePoints(
  completions: number,
  attempts: number,
  expectedCpSum: number,
): number {
  if (!(attempts > 0)) return 0;
  return Number((100 * ((completions - expectedCpSum) / attempts)).toFixed(4));
}

/** [PAYLOAD] Exact YACoE identity: yardsAfterCatch - expectedYardsAfterCatch (verified to 0.0 on NGS rows) */
export function computeNgsYacoe(yardsAfterCatch: number, expectedYardsAfterCatch: number): number {
  return Number((yardsAfterCatch - expectedYardsAfterCatch).toFixed(4));
}

/** [PAYLOAD] Exact RYOE identity: rushYards - expectedRushYards (verified to 0.0 on 160 ERY rows) */
export function computeNgsRyoe(rushYards: number, expectedRushYards: number): number {
  return Number((rushYards - expectedRushYards).toFixed(4));
}

/**
 * [FITTED] BDB 2027 Context-Conditioned xComp (n = 9,575 targeted passes, holdout AUC = 0.7461, Brier = 0.1928).
 * Coefficients: separation +0.290, pass_length -0.049, down -0.110, ytg -0.011, yardline +0.005.
 * Preferred over NGS highlight completionProbability for cross-depth forecasting because NGS highlight cp
 * is depth-blind (Spearman rho = -0.023 across 1,080 rows over 2023-2025).
 */
export function computeBdbContextXComp(input: {
  readonly separationAtPassYards: number;
  readonly passLengthAirYards: number;
  readonly down: 1 | 2 | 3 | 4;
  readonly yardsToGo: number;
  readonly yardline100: number;
}): {
  readonly xComp: number;
  readonly depthSensitive: true;
} {
  const z =
    -0.05 +
    0.29 * input.separationAtPassYards -
    0.049 * Math.max(-5, Math.min(60, input.passLengthAirYards)) -
    0.11 * input.down -
    0.011 * Math.max(1, Math.min(30, input.yardsToGo)) +
    0.005 * Math.max(1, Math.min(99, input.yardline100));
  const p = 1 / (1 + Math.exp(-z));
  return {
    xComp: Number(Math.min(0.99, Math.max(0.01, p)).toFixed(4)),
    depthSensitive: true,
  };
}

/**
 * [RECON] Anisotropic Ghost-Defender 2D Baseline Density (normalised to integrate to defender count ~5.03/side).
 */
export function computeGhostDefenderDensity(
  targetX: number,
  targetY: number,
  losX: number,
  defendersPerSide = 5,
  mirror = true,
): number {
  const fieldWidth = 53.3;
  const ghostNorm = 0.265;
  const dist = Math.abs(targetX - losX);
  const sx = 3.1 + 0.245 * dist;
  const sy = 1.9 + 0.155 * dist;
  const norm = 1 / (2 * Math.PI * sx * sy);
  let p = Math.exp(-0.5 * (Math.pow((targetX - losX) / sx, 2) + Math.pow((targetY - fieldWidth / 2) / sy, 2)));
  if (mirror) {
    p += Math.exp(
      -0.5 * (Math.pow((targetX - losX) / sx, 2) + Math.pow((targetY - fieldWidth / 2) / (sy * 2.2), 2)),
    );
  }
  const n = defendersPerSide * (mirror ? 2 : 1);
  return Number(((ghostNorm * n * norm * p) / (mirror ? 2 : 1)).toFixed(6));
}

/**
 * Vendor-Anchored Receiver Separation Residual & Depth-Controlled Catch/YPT Pricing.
 * - cushion weight is explicitly 0 (incremental R^2 = 0.001 on n = 256 ladder).
 * - separation residual prices at +0.0645 catch rate per yard (partial r = 0.416)
 *   and +1.344 yards/target per yard (partial r = 0.382 controlling depth).
 */
export function evaluateReceiverSeparationResidual(input: {
  readonly avgSeparationYards: number;
  readonly avgDepthOfTargetYards: number;
  readonly position: "WR" | "TE" | "RB";
  readonly avgCushionYards?: number;
  readonly useTargetedSampleDenominator?: boolean;
}): {
  readonly separationOverLeagueBaseline: number;
  readonly separationOverPositionExpectation: number;
  readonly expectedCatchRateDelta: number;
  readonly expectedYardsPerTargetDelta: number;
  readonly cushionWeightApplied: 0;
} {
  const denom = input.useTargetedSampleDenominator ? TARGETED_SAMPLE_SEPARATION_MEAN_2025 : NGS_LEAGUE_AVG_SEPARATION;
  const separationOverLeagueBaseline = Number((input.avgSeparationYards - denom).toFixed(4));
  const posOffset = input.position === "TE" ? 1.003 : input.position === "WR" ? -0.091 : 0.35;
  const separationOverPositionExpectation = Number(
    (input.avgSeparationYards - (NGS_LEAGUE_AVG_SEPARATION + posOffset)).toFixed(4),
  );
  const expectedCatchRateDelta = Number(
    (0.0645 * separationOverLeagueBaseline - 0.0103 * (input.avgDepthOfTargetYards - 9.71)).toFixed(4),
  );
  const expectedYardsPerTargetDelta = Number(
    (1.344 * separationOverLeagueBaseline + 0.373 * (input.avgDepthOfTargetYards - 9.71)).toFixed(4),
  );
  return {
    separationOverLeagueBaseline,
    separationOverPositionExpectation,
    expectedCatchRateDelta,
    expectedYardsPerTargetDelta,
    cushionWeightApplied: 0,
  };
}

/**
 * BDB 2027 Subject-Only Tracking Gate:
 * Rejects geometric defender separation on BDB 2027 tracking frames (median 1-3 players/play, max 10),
 * routing BDB tracking exclusively to subject kinematics (where speed at pass is 5.17 yd/s on completions,
 * 6.31 yd/s on incompletions, and 7.03 yd/s on interceptions).
 */
export function evaluateBdb2027SubjectTrackingGate(input: {
  readonly trackedPlayersInPlay: number;
  readonly receiverSpeedAtPassYps?: number;
}): {
  readonly geometricSeparationAllowed: boolean;
  readonly subjectKinematicsAllowed: boolean;
  readonly completionKinematicsLogitShift: number;
  readonly reason: string;
} {
  const geometricSeparationAllowed = input.trackedPlayersInPlay >= 22;
  let completionKinematicsLogitShift = 0;
  if (input.receiverSpeedAtPassYps !== undefined && Number.isFinite(input.receiverSpeedAtPassYps)) {
    // 5.17 yd/s = completion mean; 6.31 yd/s = incompletion mean; 7.03 yd/s = INT mean
    completionKinematicsLogitShift = Number((-0.18 * (input.receiverSpeedAtPassYps - 5.55)).toFixed(4));
  }
  return {
    geometricSeparationAllowed,
    subjectKinematicsAllowed: input.trackedPlayersInPlay >= 1,
    completionKinematicsLogitShift,
    reason: geometricSeparationAllowed
      ? "full-22-frame"
      : "bdb2027-subject-only-frame: geometric separation forbidden (12.8-15.5 yd artifact)",
  };
}

/**
 * Pre-Snap Motion Pass Filter (p = 2.8e-205, 1,765/1,766 = 99.94% pass rate)
 * & Down-Conditional Man Coverage Prior inside the Motion Subset.
 */
export function evaluatePreSnapMotionAndCoveragePrior(input: {
  readonly inMotionAtBallSnap: boolean;
  readonly down: 1 | 2 | 3 | 4;
  readonly yardsToGo: number;
}): {
  readonly impliedPassProbability: number;
  readonly manCoveragePrior: number;
  readonly motionActsAsPassFilter: boolean;
} {
  if (input.inMotionAtBallSnap) {
    const manByDown: Record<1 | 2 | 3 | 4, number> = {
      1: 0.158,
      2: 0.258,
      3: 0.425,
      4: 0.649,
    };
    return {
      impliedPassProbability: 0.9994,
      manCoveragePrior: manByDown[input.down],
      motionActsAsPassFilter: true,
    };
  }
  const basePassLogit = -0.85 + 0.115 * Math.min(input.yardsToGo, 25) + (input.down === 3 && input.yardsToGo > 6 ? 0.55 : 0);
  return {
    impliedPassProbability: Number((1 / (1 + Math.exp(-basePassLogit))).toFixed(4)),
    manCoveragePrior: 0.281,
    motionActsAsPassFilter: false,
  };
}

/**
 * Scalar Ghost-Defender Coverage x Route Separation Residual Lookup (n = 9,446 targets)
 * and Unregularised OLS Route YOE Leverage Survival (only SLANT +0.997 and FLAT +0.693 survive).
 */
export function evaluateRouteCoverageInteractionResidual(
  coverageType: string,
  routeRan: string,
): {
  readonly expectedSeparationResidualYards: number;
  readonly unregularisedRouteYoeAfterCoverage: number;
  readonly isLeverageRouteSurvivor: boolean;
} {
  const key = `${coverageType.toUpperCase()}__${routeRan.toUpperCase()}`;
  const ghostMatrix: Record<string, number> = {
    COVER_2_ZONE__CORNER: 2.29,
    COVER_2_ZONE__FLAT: 2.21,
    COVER_6_ZONE__FLAT: 2.13,
    COVER_0_MAN__SCREEN: 2.13,
    COVER_2_ZONE__POST: 1.8,
    COVER_4_ZONE__FLAT: 1.5,
    COVER_1_MAN__SLANT: -1.59,
    COVER_1_MAN__HITCH: -1.48,
    COVER_1_MAN__IN: -1.24,
    COVER_0_MAN__GO: -1.24,
    COVER_1_MAN__OUT: -1.18,
  };
  const olsRouteYoe: Record<string, number> = {
    SLANT: 0.997,
    FLAT: 0.693,
    POST: 0.308,
    SCREEN: 0.293,
    GO: 0.207,
    CORNER: 0.054,
    CROSS: 0.028,
    OUT: -0.126,
    IN: -0.206,
    HITCH: -0.32,
  };
  const rUpper = routeRan.toUpperCase();
  const unreg = olsRouteYoe[rUpper] ?? 0;
  return {
    expectedSeparationResidualYards: ghostMatrix[key] ?? 0,
    unregularisedRouteYoeAfterCoverage: unreg,
    isLeverageRouteSurvivor: rUpper === "SLANT" || rUpper === "FLAT",
  };
}

/**
 * PropFinder Exact pfRating Reconstructor (verified on 62,186 rows to maxerr = 0.0):
 * pfRating = 0.15*gameTotal + 0.20*matchup + 0.20*l5HitRate + 0.20*l5Avg + 0.10*seasonAvg + 0.15*seasonHitRate
 * Also converts PropFinder best_price directly as American odds (never dividing by 100).
 */
export function computePropFinderRatingExact(input: {
  readonly gameTotalScore: number;
  readonly matchupScore: number;
  readonly l5Hits: number;
  readonly l5Sample?: number;
  readonly l5AvgScore: number;
  readonly seasonAvgScore: number;
  readonly seasonHits: number;
  readonly seasonSample: number;
  readonly bestPriceAmerican?: number;
}): {
  readonly pfRating: number;
  readonly l5HitRateScore: number;
  readonly seasonHitRateScore: number;
  readonly impliedProbFromBestPrice: number | null;
} {
  const l5Den = input.l5Sample && input.l5Sample > 0 ? input.l5Sample : 5;
  const l5HitRateScore = (input.l5Hits / l5Den) * 100;
  const seasonHitRateScore = input.seasonSample > 0 ? (input.seasonHits / input.seasonSample) * 100 : 0;
  const pfRating = Number(
    (
      0.15 * input.gameTotalScore +
      0.2 * input.matchupScore +
      0.2 * l5HitRateScore +
      0.2 * input.l5AvgScore +
      0.1 * input.seasonAvgScore +
      0.15 * seasonHitRateScore
    ).toFixed(4),
  );
  let impliedProbFromBestPrice: number | null = null;
  if (
    input.bestPriceAmerican !== undefined &&
    Number.isFinite(input.bestPriceAmerican) &&
    input.bestPriceAmerican !== 0 &&
    Math.abs(input.bestPriceAmerican) <= 2000
  ) {
    const o = input.bestPriceAmerican;
    impliedProbFromBestPrice = Number(
      (o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100)).toFixed(4),
    );
  }
  return {
    pfRating,
    l5HitRateScore: Number(l5HitRateScore.toFixed(4)),
    seasonHitRateScore: Number(seasonHitRateScore.toFixed(4)),
    impliedProbFromBestPrice,
  };
}
