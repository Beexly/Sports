/**
 * qb-turnover-worthy-play-regression.ts — Factor A7: QB Turnover-Worthy Play (TWP) vs Actual Interception Regression.
 *
 * Decomposes quarterback interception totals into underlying turnover-worthy plays (TWPs)
 * versus actual realized interceptions to isolate luck-driven turnover distortion.
 *
 * Theoretical & Empirical Foundation:
 * - Actual interceptions exhibit high short-term variance: dropped interceptions, receiver-deflected
 *   balls, and hail mary passes distort box-score stats.
 * - Historical empirical studies show TWP rate has a far higher predictive correlation (R^2 ~ 0.38)
 *   to future turnovers and offensive EPA than raw past interception counts (R^2 ~ 0.09).
 * - A QB whose actual INT count is substantially lower than their TWP count (Lucky) faces an imminent
 *   negative regression spike, increasing prospective turnover risk and depressing spread edge.
 */

export interface QbTwpContext {
  readonly passAttempts: number;
  readonly actualInterceptions: number;
  readonly turnoverWorthyPlays: number;
  readonly opponentDefensiveInterceptionRate: number; // League avg ~0.022 (2.2%)
}

export interface QbTwpResult {
  readonly actualIntRate: number;
  readonly twpRate: number;
  readonly turnoverLuckDifferential: number; // positive = lucky (fewer INTs than TWPs deserve)
  readonly expectedFutureIntRate: number;
  readonly offensiveEpaAdjustment: number;
  readonly turnoverRiskMultiplier: number;
  readonly confidence: number;
  readonly explanation: string;
}

export function evaluateQbTwpRegression(ctx: QbTwpContext): QbTwpResult {
  if (ctx.passAttempts < 40) {
    return {
      actualIntRate: ctx.actualInterceptions / Math.max(1, ctx.passAttempts),
      twpRate: ctx.turnoverWorthyPlays / Math.max(1, ctx.passAttempts),
      turnoverLuckDifferential: 0.0,
      expectedFutureIntRate: 0.022,
      offensiveEpaAdjustment: 0.0,
      turnoverRiskMultiplier: 1.0,
      confidence: 0.35,
      explanation: `Sample size too thin (${ctx.passAttempts} pass attempts). Regressed to league baseline.`,
    };
  }

  const actualIntRate = ctx.actualInterceptions / ctx.passAttempts;
  const twpRate = ctx.turnoverWorthyPlays / ctx.passAttempts;

  // Expected conversion rate: historically ~50-55% of TWPs materialize as actual turnovers
  const expectedIntFromTwp = ctx.turnoverWorthyPlays * 0.52;
  const luckDiff = expectedIntFromTwp - ctx.actualInterceptions; // >0 means lucky (should have more INTs)

  // Future regressed INT rate combines 60% TWP expectation + 25% past INT rate + 15% opponent defense
  const expectedFutureIntRate = Number(
    (0.60 * (twpRate * 0.52) + 0.25 * actualIntRate + 0.15 * ctx.opponentDefensiveInterceptionRate).toFixed(4)
  );

  // Each unregressed turnover expectation swings passing EPA by approx -4.2 EPA
  const epaImpact = Number((-(luckDiff / (ctx.passAttempts / 35)) * 0.12).toFixed(3));
  const epaAdj = Math.max(-0.25, Math.min(0.25, epaImpact));

  const turnoverRiskMultiplier = Number(
    Math.max(0.6, Math.min(1.7, expectedFutureIntRate / Math.max(0.01, actualIntRate))).toFixed(2)
  );

  const confidence = Math.min(0.92, 0.50 + Math.log10(ctx.passAttempts) * 0.18);

  const explanation =
    luckDiff > 1.5
      ? `QB exhibits substantial positive turnover luck (Actual INTs: ${ctx.actualInterceptions}, TWPs: ${ctx.turnoverWorthyPlays}, Luck Diff: +${luckDiff.toFixed(1)}). Regression expects future INT rate to elevate to ${(expectedFutureIntRate * 100).toFixed(1)}% (Offensive EPA impact: ${epaAdj}).`
      : luckDiff < -1.5
      ? `QB exhibits bad turnover luck / bad bounces (Actual INTs: ${ctx.actualInterceptions}, TWPs: ${ctx.turnoverWorthyPlays}, Luck Diff: ${luckDiff.toFixed(1)}). Positive mean-reversion expects future turnover rate to drop to ${(expectedFutureIntRate * 100).toFixed(1)}% (Offensive EPA lift: +${Math.abs(epaAdj)}).`
      : `QB turnover production matches underlying turnover-worthy play volume (Actual INTs: ${ctx.actualInterceptions}, TWPs: ${ctx.turnoverWorthyPlays}). Neutral regression.`;

  return {
    actualIntRate,
    twpRate,
    turnoverLuckDifferential: luckDiff,
    expectedFutureIntRate,
    offensiveEpaAdjustment: epaAdj,
    turnoverRiskMultiplier,
    confidence,
    explanation,
  };
}
