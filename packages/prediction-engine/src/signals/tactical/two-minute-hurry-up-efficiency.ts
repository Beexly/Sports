/**
 * two-minute-hurry-up-efficiency.ts — Factor A9: Two-Minute Drill & No-Huddle Hurry-Up Tactical Efficiency.
 *
 * Models an offense's operational scoring efficiency and play execution in high-leverage,
 * clock-compressed situations (final 2:00 of 2nd quarter and 4th quarter).
 *
 * Tactical Mechanics & Domain Edge:
 * - Two-minute situations generate 12-18% of all NFL points despite consuming under 7% of game clock.
 * - Teams operating efficient hurry-up attacks deny defensive substitutions, exhausting defensive linemen
 *   and exploiting static zone coverages (prevent/cover 3/cover 4 shells).
 * - "Middle 8" scoring leverage: Scoring in the final 2 minutes of the first half followed by receiving
 *   the 2nd half opening kickoff swings game win probability by an average of +19.4%.
 */

export interface TwoMinuteHurryUpContext {
  readonly twoMinuteDrillDrives: number;
  readonly twoMinuteScoringDrives: number; // Drives resulting in TD or FG
  readonly twoMinutePointsPerMinute: number; // League average is ~1.85 pts/min
  readonly qbPasserRatingInTwoMinute: number;
  readonly opponentDefensiveTwoMinuteEpaAllowed: number; // Positive = allows high scoring
  readonly receivesSecondHalfKickoff: boolean;
}

export interface TwoMinuteHurryUpResult {
  readonly scoringDriveConversionRate: number;
  readonly middleEightLeverageScore: number;
  readonly expectedPointsAddedPerTwoMinuteOpportunity: number;
  readonly spreadPointAdjustment: number;
  readonly confidence: number;
  readonly explanation: string;
}

export function evaluateTwoMinuteHurryUpEfficiency(ctx: TwoMinuteHurryUpContext): TwoMinuteHurryUpResult {
  if (ctx.twoMinuteDrillDrives < 5) {
    return {
      scoringDriveConversionRate: 0.38,
      middleEightLeverageScore: 0.50,
      expectedPointsAddedPerTwoMinuteOpportunity: 0.0,
      spreadPointAdjustment: 0.0,
      confidence: 0.30,
      explanation: `Limited two-minute drill sample (${ctx.twoMinuteDrillDrives} drives). Regressed to league median.`,
    };
  }

  const conversionRate = ctx.twoMinuteScoringDrives / ctx.twoMinuteDrillDrives;
  const leagueAvgConversion = 0.385;
  const conversionDifferential = conversionRate - leagueAvgConversion;

  // Middle-eight leverage boost: if this team receives 2nd half kickoff, their end-of-half 2-minute scoring has double value
  let middleEightLeverage = 0.50;
  if (ctx.receivesSecondHalfKickoff) {
    middleEightLeverage += 0.25 * (conversionRate / leagueAvgConversion);
  } else {
    middleEightLeverage -= 0.10 * (1.0 - conversionRate / leagueAvgConversion);
  }
  middleEightLeverage = Math.max(0.15, Math.min(0.95, middleEightLeverage));

  // Points added calculation: combining conversion differential, QB rating, and opponent defensive vulnerability
  const qbMultiplier = Math.max(0.7, Math.min(1.35, ctx.qbPasserRatingInTwoMinute / 88.0));
  const defenseMultiplier = Math.max(0.75, Math.min(1.4, 1.0 + ctx.opponentDefensiveTwoMinuteEpaAllowed * 2.0));

  const pointsAdded = Number(
    (conversionDifferential * 4.2 * qbMultiplier * defenseMultiplier).toFixed(2)
  );

  // Spread point adjustment reflects 2 anticipated two-minute opportunities per game
  const spreadAdj = Number(
    (pointsAdded * (ctx.receivesSecondHalfKickoff ? 1.35 : 1.0) * 0.40).toFixed(2)
  );

  const confidence = Math.min(0.90, 0.40 + Math.log10(ctx.twoMinuteDrillDrives) * 0.30);

  const explanation = `Offense achieves ${(conversionRate * 100).toFixed(1)}% two-minute drill scoring conversion (vs ${leagueAvgConversion * 100}% league avg) with ${ctx.qbPasserRatingInTwoMinute.toFixed(1)} QB rating.${ctx.receivesSecondHalfKickoff ? " Synergizes with Middle-8 2nd-half kickoff reception." : ""} Net spread impact: ${spreadAdj >= 0 ? "+" : ""}${spreadAdj} pts.`;

  return {
    scoringDriveConversionRate: Number(conversionRate.toFixed(3)),
    middleEightLeverageScore: Number(middleEightLeverage.toFixed(3)),
    expectedPointsAddedPerTwoMinuteOpportunity: pointsAdded,
    spreadPointAdjustment: spreadAdj,
    confidence,
    explanation,
  };
}
