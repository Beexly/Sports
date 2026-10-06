/**
 * early-down-pass-rate-momentum.ts — Factor A8: Early-Down Pass Rate Over Expected (PROE) Tactical Momentum.
 *
 * Quantifies offensive play-calling aggressiveness on early downs (1st & 10, 2nd & 1-6)
 * in neutral game scripts (win probability 20% to 80%).
 *
 * Empirical Analytic Foundation:
 * - Passing on early downs generates +0.065 to +0.082 EPA/play higher than early-down rushing,
 *   which frequently creates 2nd-and-long or 3rd-and-long high-variance situations.
 * - Offensive play-callers with sustained positive PROE (> +4.0%) generate higher passing yardage,
 *   longer drive durations, and lower 3-and-out percentages.
 * - Facing a defense that forces high pass rates or allows high passing efficiency amplifies the PROE edge.
 */

export interface EarlyDownProeContext {
  readonly earlyDownPassRate: number; // Actual early down pass % (e.g. 0.58)
  readonly expectedPassRate: number; // Situation-expected pass % (e.g. 0.51 based on score/time/distance)
  readonly opponentPassDefenseEpaRank: number; // 1 (best) to 32 (worst)
  readonly offensivePaceSecondsPerPlay: number; // e.g. 24.5 (fast) vs 30.2 (slow)
  readonly playCountSample: number; // Number of early down plays evaluated
}

export interface EarlyDownProeResult {
  readonly proeDifferential: number; // e.g. +0.07 = +7.0% pass rate over expected
  readonly playCallingAggressivenessTier: "HYPER_PASS_HEAVY" | "MODERATE_PASS" | "NEUTRAL" | "RUN_HEAVY" | "HYPER_CONSERVATIVE";
  readonly driveEfficiencyMultiplier: number;
  readonly projectedPassingVolumeShiftPercent: number;
  readonly gameTotalPointsImpact: number;
  readonly confidence: number;
  readonly explanation: string;
}

export function evaluateEarlyDownProeMomentum(ctx: EarlyDownProeContext): EarlyDownProeResult {
  const proe = ctx.earlyDownPassRate - ctx.expectedPassRate;

  let tier: EarlyDownProeResult["playCallingAggressivenessTier"] = "NEUTRAL";
  if (proe >= 0.08) tier = "HYPER_PASS_HEAVY";
  else if (proe >= 0.03) tier = "MODERATE_PASS";
  else if (proe <= -0.08) tier = "HYPER_CONSERVATIVE";
  else if (proe <= -0.03) tier = "RUN_HEAVY";

  // Matchup synergy: high PROE against a bottom-12 pass defense creates massive explosive potential
  const defensePassVulnMultiplier = Math.max(0.7, Math.min(1.4, ctx.opponentPassDefenseEpaRank / 16));

  const driveEfficiencyMult = Number(
    (1.0 + proe * 0.45 * defensePassVulnMultiplier).toFixed(3)
  );

  // Passing volume shift: +5% PROE translates into approximately +8-10% more passing volume
  const volumeShift = Number((proe * 1.65 * 100).toFixed(1));

  // Game total point impact: passing stops the clock on incompletions, increases scoring efficiency and play count
  const paceFactor = ctx.offensivePaceSecondsPerPlay < 26.0 ? 1.2 : 0.9;
  const totalImpact = Number((proe * 22.0 * paceFactor * defensePassVulnMultiplier).toFixed(2));

  const confidence = Math.min(0.92, 0.45 + Math.log10(Math.max(10, ctx.playCountSample)) * 0.20);

  const explanation = `Early down play-calling exhibits ${proe >= 0 ? "+" : ""}${(proe * 100).toFixed(1)}% PROE (${tier}). Combined with opponent pass defense rank #${ctx.opponentPassDefenseEpaRank} and ${ctx.offensivePaceSecondsPerPlay}s pace, yields a ${driveEfficiencyMult}x drive efficiency multiplier (${totalImpact >= 0 ? "+" : ""}${totalImpact} pts total impact).`;

  return {
    proeDifferential: proe,
    playCallingAggressivenessTier: tier,
    driveEfficiencyMultiplier: driveEfficiencyMult,
    projectedPassingVolumeShiftPercent: volumeShift,
    gameTotalPointsImpact: totalImpact,
    confidence,
    explanation,
  };
}
