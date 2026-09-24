// @ts-nocheck
/**
 * arXiv 2606.29203: Bayesian Best-Arm Identification with Abstention: A Polynomial-to-Exponential Phase Transition.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Bayesian best-arm identification with abstention for engine-version evaluation: inverse-gap-weighted allocation (PGWS) of backtest/paper-trade weeks across the production engine + challenger configs (p_i proportional to 1/gap^2), gating shipment on the Bayesian abstention rule â€” keep the incumbent iff R_T < r-hat_{T,alpha} â€” with an adaptive abstention budget alpha_t tied to the cost of a bad ship vs the cost of another evaluation week.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Evaluate engine versions with inverse-gap-weighted allocation (PGWS): allocate backtest/paper-trade weeks p_i proportional to 1/gap^2 across the production engine + challenger configs, and gate shipping on the Bayesian abstention rule â€” keep the incumbent iff R_T < r-hat_{T,alpha}, with an adaptive abstention budget alpha_t tied to the cost of a bad ship vs the cost of another evaluation week.
 *
 * ACCEPTANCE GATE:
 * ADAPT the allocation rule iff inverse-gap weighting reaches the same ship-decision confidence with â‰¥20% fewer evaluation weeks than equal-split on historical version comparisons.
 *
 * ENABLED=false: evaluation-allocation policy for version shipment; needs a human call.
 */


export const ENABLED = false;

/** Inverse-gap weights: p_i proportional to 1/gap_i^2 (PGWS allocation). */
export function inverseGapWeights(gaps: readonly number[]): number[] {
  const inv = gaps.map((g) => 1 / Math.max(g * g, 1e-12));
  const s = inv.reduce((a, b) => a + b, 0);
  return inv.map((x) => x / s);
}

/** Allocate eval weeks across configs by the PGWS weights. */
export function allocateEvalWeeks(
  gaps: readonly number[],
  totalWeeks: number,
): number[] {
  const w = inverseGapWeights(gaps);
  const raw = w.map((x) => x * totalWeeks);
  const floored = raw.map(Math.floor);
  const remainder = totalWeeks - floored.reduce((a, b) => a + b, 0);
  const frac = raw.map((x, i) => ({ i, f: x - floored[i] })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < remainder; k++) floored[frac[k % frac.length].i]++;
  return floored;
}

/**
 * Bayesian abstention rule for shipment: keep the incumbent iff R_T < r-hat.
 * R_T = posterior probability the challenger is worse than the incumbent by
 * more than the practical-equivalence margin; r-hat = adaptive threshold.
 */
export function shouldShipChallenger(
  probChallengerWorse: number,
  rHat: number,
): boolean {
  return probChallengerWorse < rHat;
}

/**
 * Adaptive abstention budget alpha_t: scales with the cost ratio
 * (cost of a bad ship) / (cost of one more evaluation week). Higher ratio ->
 * more conservative (lower alpha_t).
 */
export function adaptiveAbstentionBudget(
  costBadShip: number,
  costEvalWeek: number,
  baseAlpha = 0.05,
): number {
  const ratio = costBadShip / Math.max(costEvalWeek, 1e-9);
  return baseAlpha / (1 + Math.log1p(ratio));
}

/**
 * Gate helper: PGWS reaches the ship decision with >= 20% fewer eval weeks
 * than equal-split. Sample complexity of resolving every gap scales like
 * n * max_i(1/gap_i^2) under equal-split vs sum_i(1/gap_i^2) under PGWS.
 */
export function evalWeeksSavedFraction(gaps: readonly number[]): number {
  const inv2 = gaps.map((g) => 1 / Math.max(g * g, 1e-12));
  const pgwsWeeks = inv2.reduce((a, b) => a + b, 0);
  const equalWeeks = gaps.length * Math.max(...inv2);
  return equalWeeks > 0 ? 1 - pgwsWeeks / equalWeeks : 0;
}
