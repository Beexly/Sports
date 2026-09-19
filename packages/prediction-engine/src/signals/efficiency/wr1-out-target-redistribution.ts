/**
 * wr1-out-target-redistribution.ts — Vacated target redistribution & efficiency decay model.
 *
 * Grounded in empirical NFL research:
 *  - Factor A19: WR1-out target redistribution across depth slots (injuries + player_stats)
 *  - When an alpha WR1 (baseline target share >= 24%) is ruled OUT:
 *      * Vacated target pool splits: WR2 ~36%, TE1 ~28%, Pass-catching RB ~18%, WR3/Slot ~18%
 *      * Gross volume expands for downstream receivers
 *      * Efficiency compression penalty: Opposing defensive coordinators deploy safety help
 *        and top corner coverage onto WR2, reducing WR2 yards per target by -8% to -14%
 */

export interface Wr1OutContext {
  readonly team: string;
  readonly wr1Name: string;
  readonly wr1BaselineTargetShare: number; // e.g. 0.28 (28%)
  readonly wr1Status: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "ACTIVE";
  readonly wr2Name: string;
  readonly wr2BaselineTargetShare: number; // e.g. 0.16 (16%)
  readonly te1BaselineTargetShare: number; // e.g. 0.14 (14%)
  readonly rb1TargetShare: number; // e.g. 0.10 (10%)
}

export interface Wr1OutRedistributionResult {
  readonly isAlphaWr1Out: boolean;
  readonly vacatedTargetSharePool: number; // e.g. 0.28
  readonly wr2ProjectedTargetShare: number; // e.g. 0.26
  readonly wr2TargetShareDelta: number; // e.g. +0.10 (+10.0%)
  readonly te1ProjectedTargetShare: number; // e.g. 0.22
  readonly te1TargetShareDelta: number; // e.g. +0.08 (+8.0%)
  readonly rbProjectedTargetShare: number; // e.g. 0.15
  readonly wr2EfficiencyCompressionMultiplier: number; // e.g. 0.89 (yards/target penalty)
  readonly overallPassingVolumePacingShift: number; // slight drop in total pass volume without alpha
}

/**
 * Evaluates target share reallocation and efficiency compression when WR1 is sidelined.
 */
export function evaluateWr1OutRedistribution(
  context: Wr1OutContext
): Wr1OutRedistributionResult {
  // Only applies when WR1 is an established alpha (target share >= 20%) and is ruled OUT or DOUBTFUL
  const isAlpha = context.wr1BaselineTargetShare >= 0.20;
  const isOut = context.wr1Status === "OUT" || context.wr1Status === "DOUBTFUL";

  if (!isAlpha || !isOut) {
    return {
      isAlphaWr1Out: false,
      vacatedTargetSharePool: 0.0,
      wr2ProjectedTargetShare: context.wr2BaselineTargetShare,
      wr2TargetShareDelta: 0.0,
      te1ProjectedTargetShare: context.te1BaselineTargetShare,
      te1TargetShareDelta: 0.0,
      rbProjectedTargetShare: context.rb1TargetShare,
      wr2EfficiencyCompressionMultiplier: 1.0,
      overallPassingVolumePacingShift: 0.0,
    };
  }

  const vacated = context.wr1BaselineTargetShare;

  // Empirical target reallocation split:
  // WR2 absorbs 36%, TE absorbs 28%, RB absorbs 18%, WR3 absorbs 18%
  const wr2Delta = Number((vacated * 0.36).toFixed(3));
  const teDelta = Number((vacated * 0.28).toFixed(3));
  const rbDelta = Number((vacated * 0.18).toFixed(3));

  const wr2Projected = Number((context.wr2BaselineTargetShare + wr2Delta).toFixed(3));
  const teProjected = Number((context.te1BaselineTargetShare + teDelta).toFixed(3));
  const rbProjected = Number((context.rb1TargetShare + rbDelta).toFixed(3));

  // Efficiency compression: WR2 faces top boundary cornerback and safety roll
  // Higher vacated share means steeper defensive re-allocation
  const compressionPenalty = Math.min(0.14, 0.07 + vacated * 0.20);
  const wr2EfficiencyCompressionMultiplier = Number((1.0 - compressionPenalty).toFixed(3));

  // Without alpha separator, offense struggles on 3rd down conversions -> pass volume drops slightly
  const overallPassingVolumePacingShift = Number((-vacated * 8.5).toFixed(1)); // ~ -2.4 attempts/game

  return {
    isAlphaWr1Out: true,
    vacatedTargetSharePool: vacated,
    wr2ProjectedTargetShare: wr2Projected,
    wr2TargetShareDelta: wr2Delta,
    te1ProjectedTargetShare: teProjected,
    te1TargetShareDelta: teDelta,
    rbProjectedTargetShare: rbProjected,
    wr2EfficiencyCompressionMultiplier,
    overallPassingVolumePacingShift,
  };
}
