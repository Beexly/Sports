/**
 * redzone-te-leverage.ts — NFL Red Zone TE Leverage & Situational Scoring Efficiency.
 *
 * Grounded in:
 *  - 77.2% of NFL touchdowns originate inside the red zone (67-69% of passing TDs).
 *  - TE positional leverage: Tight ends command 20-33% of red-zone targets vs ~15% overall share.
 *  - Exploitable defensive matchups: Specific schemes hemorrhage red-zone scores to TEs.
 */

export interface RedZoneEfficiencyContext {
  readonly teamRedZoneDrivesPerGame: number;
  readonly teamRedZoneTdConversionRate: number; // e.g. 0.65 (65%)
  readonly tightEndRedZoneTargetShare: number; // e.g. 0.28 (28%)
  readonly opponentAllowedRedZoneTdRate: number; // e.g. 0.68
  readonly opponentTeAllowedDvoaRank: number; // 1 (best pass defense vs TE) to 32 (worst)
}

export interface RedZoneTeLeverageResult {
  readonly projectedTeamRedZoneTouchdowns: number;
  readonly tightEndTouchdownProbability: number;
  readonly anytimeTdFairValueDecimal: number;
  readonly targetShareLeverageRatio: number; // RZ share divided by baseline 15% league share
  readonly matchupAdvantageGrade: "ELITE" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";
}

/**
 * Evaluates red-zone scoring environment and TE target leverage.
 */
export function evaluateRedZoneTeLeverage(ctx: RedZoneEfficiencyContext): RedZoneTeLeverageResult {
  const rzDrives = Math.max(0.5, ctx.teamRedZoneDrivesPerGame);
  const offConv = Math.max(0.20, Math.min(0.85, ctx.teamRedZoneTdConversionRate));
  const defAllowed = Math.max(0.25, Math.min(0.85, ctx.opponentAllowedRedZoneTdRate));

  // Blended TD conversion expectation inside 20
  const blendedTdRate = 0.55 * offConv + 0.45 * defAllowed;
  const projectedTeamRzTds = rzDrives * blendedTdRate;

  // TE Leverage Calculation
  const teRzShare = Math.max(0.05, Math.min(0.50, ctx.tightEndRedZoneTargetShare));
  const baselineShare = 0.15;
  const leverageRatio = teRzShare / baselineShare;

  // Opponent defensive vulnerability against TEs (Rank 32 = worst defense = highest boost)
  const defRank = Math.max(1, Math.min(32, ctx.opponentTeAllowedDvoaRank));
  const defVulnerabilityFactor = 0.85 + (defRank / 32) * 0.35; // 0.86 (vs Rank 1) to 1.20 (vs Rank 32)

  // Expected TE touchdowns per game
  const expectedTeTds = projectedTeamRzTds * teRzShare * defVulnerabilityFactor;

  // Poisson approximation for P(TE TD >= 1)
  const teTdProb = 1.0 - Math.exp(-expectedTeTds);
  const fairDecimal = teTdProb > 0.01 ? Number((1.0 / teTdProb).toFixed(2)) : 99.0;

  let grade: RedZoneTeLeverageResult["matchupAdvantageGrade"] = "NEUTRAL";
  if (leverageRatio >= 1.6 && defRank >= 24) grade = "ELITE";
  else if (leverageRatio >= 1.3 || defRank >= 20) grade = "FAVORABLE";
  else if (defRank <= 8) grade = "UNFAVORABLE";

  return {
    projectedTeamRedZoneTouchdowns: Number(projectedTeamRzTds.toFixed(2)),
    tightEndTouchdownProbability: Number(teTdProb.toFixed(3)),
    anytimeTdFairValueDecimal: fairDecimal,
    targetShareLeverageRatio: Number(leverageRatio.toFixed(2)),
    matchupAdvantageGrade: grade,
  };
}
