/**
 * arXiv:2608.09586 — ICM Out! Better Tournament Strategy from Computed Continuations, vs. Solvers and LLMs
 *
 * ICM tournament strategy with computed continuations: expected-prize objective priced off the payout
 * ladder and the field score distribution, with enumerate-perturb-score-shift local search for payout-aware
 * lineup construction.
 *
 * Improvement: Replace the max-expected-score objective in GSE's DFS GPP lineup construction with an expected-prize objective priced off the payout ladder and the field score distribution, using the enumerate-perturbations-to-score-shift-to-expected-prize pipeline for payout-aware local search.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the expected-prize objective if on 2024 GPP backtests the max-expected-prize lineups beat max-expected-score lineups on realized prize by >=15% across >=15 GPPs AND the simulation shows the gap comes from payout-ladder positioning (not just variance); reject if the field-distribution estimate is too noisy.
 */

/**
 * ICM expected prize for one lineup: sum over paid ranks of
 * P(finish = k+1) * payout_k. Each of the n paid opponents beats the lineup
 * independently with q = Phi((fieldMean - lineupScore)/fieldSd), so the
 * number of opponents finishing ahead is Binomial(n, q).
 */
export function icmExpectedPrize(
  lineupScore: number,
  fieldMean: number,
  fieldSd: number,
  payouts: readonly number[], // payout per rank, descending
): number {
  if (fieldSd <= 0) throw new Error("icmExpectedPrize: fieldSd > 0");
  if (payouts.length === 0) throw new Error("icmExpectedPrize: no payouts");
  const Phi = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-0.5 * x * x);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
  };
  const n = payouts.length;
  const q = Phi((fieldMean - lineupScore) / fieldSd);
  let ev = 0;
  // Binomial pmf via the multiplicative recurrence
  let pmf = Math.pow(1 - q, n); // k = 0
  for (let k = 0; k < n; k++) {
    ev += pmf * (payouts[k] ?? 0);
    pmf = (pmf * (n - k)) / (k + 1) * (q / Math.max(1e-12, 1 - q));
  }
  return ev;
}

/**
 * Enumerate-perturb local search: try single-player swaps from the pool and
 * keep the swap that most improves expected prize (one pass).
 */
export function prizeLocalSearch(
  lineup: string[],
  pool: readonly { id: string; proj: number }[],
  projOf: (lineup: readonly string[]) => { mean: number; sd: number },
  fieldMean: number,
  fieldSd: number,
  payouts: readonly number[],
): string[] {
  const val = (lu: readonly string[]): number => {
    const { mean } = projOf(lu);
    return icmExpectedPrize(mean, fieldMean, fieldSd, payouts);
  };
  let best = [...lineup];
  let bestVal = val(best);
  for (let i = 0; i < lineup.length; i++) {
    for (const cand of pool) {
      if (best.includes(cand.id)) continue;
      const trial = [...best];
      trial[i] = cand.id;
      const v = val(trial);
      if (v > bestVal) { bestVal = v; best = trial; }
    }
  }
  return best;
}
