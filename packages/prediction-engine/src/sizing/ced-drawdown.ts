/**
 * Coherent drawdown-risk attribution (CED_0.9) with Euler decomposition.
 *
 * Treats the engine's cumulative pick P&L as the return process, computes
 * Conditional Expected Drawdown over rolling 6-month paths of daily settled
 * P&L, attributes it via the Euler decomposition (paper Prop 4.2) to bet
 * categories (spread/moneyline/total × NFL/NCAAF × model version), then
 * risk-budgets by capping exposure to the highest drawdown-contributing
 * category. Also formalizes a drawdown trigger: cut stakes to a fraction when
 * realized drawdown exceeds DT_0.9 until recovery.
 *
 * @see arXiv:1404.7493v5 — "Drawdown: From Practice to Theory and Back Again"
 *
 * ACCEPTANCE GATE: ADAPT iff the CED attribution identifies a concentrated
 * drawdown source (e.g. one bet type contributing > 50% of CED) that survives
 * a category-ablation check, OR the drawdown-trigger rule improves Calmar
 * ratio on the holdout without sacrificing > 10% of ROI. The gate is a
 * backtest concern; this module is the pure risk kernel, not wired live.
 */

export interface CategoryPnl {
  category: string;
  /** Per-period P&L contributions for this category. */
  pnl: readonly number[];
}

/**
 * Maximum drawdown of a cumulative P&L path (≥ 0).
 */
export function maxDrawdown(cumulativePnl: readonly number[]): number {
  let peak = 0;
  let mdd = 0;
  for (const v of cumulativePnl) {
    if (v > peak) peak = v;
    mdd = Math.max(mdd, peak - v);
  }
  return mdd;
}

/** Cumulative sum of per-period P&L. */
export function cumulative(pnl: readonly number[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of pnl) {
    run += v;
    out.push(run);
  }
  return out;
}

/**
 * CED_α: mean of the worst (1−α) fraction of path drawdowns.
 * @param pathDrawdowns one max-drawdown per simulated/rolling path
 * @param alpha e.g. 0.9
 */
export function conditionalExpectedDrawdown(
  pathDrawdowns: readonly number[],
  alpha = 0.9,
): number {
  if (pathDrawdowns.length === 0) return 0;
  if (!(alpha > 0 && alpha < 1)) throw new Error("conditionalExpectedDrawdown: alpha ∈ (0,1)");
  const sorted = [...pathDrawdowns].sort((a, b) => b - a); // worst first
  const tail = Math.max(1, Math.floor((1 - alpha) * sorted.length));
  const worst = sorted.slice(0, tail);
  return worst.reduce((a, b) => a + b, 0) / worst.length;
}

/**
 * Euler attribution of CED to categories (paper Prop 4.2): each category's
 * contribution = E[ category drawdown | portfolio drawdown in the α-tail ].
 * Approximated here by leave-one-out: contribution_i = CED(full) − CED(without i),
 * normalized to sum to CED(full). Returns per-category contributions.
 */
export function eulerDrawdownAttribution(
  categories: ReadonlyArray<CategoryPnl>,
  alpha = 0.9,
): Array<{ category: string; contribution: number; share: number }> {
  if (categories.length === 0) return [];
  const n = categories[0]?.pnl.length ?? 0;
  const fullPnl = new Array<number>(n).fill(0);
  categories.forEach((c) =>
    c.pnl.forEach((v, t) => {
      fullPnl[t] = (fullPnl[t] ?? 0) + v;
    }),
  );
  const fullCed = conditionalExpectedDrawdown(rollingDrawdowns(fullPnl), alpha);
  const marginal = categories.map((c, ci) => {
    const rest = new Array<number>(n).fill(0);
    categories.forEach((o, oi) => {
      if (oi !== ci) o.pnl.forEach((v, t) => {
        rest[t] = (rest[t] ?? 0) + v;
      });
    });
    return fullCed - conditionalExpectedDrawdown(rollingDrawdowns(rest), alpha);
  });
  const mTotal = marginal.reduce((a, b) => a + b, 0);
  return categories.map((c, i) => ({
    category: c.category,
    contribution: marginal[i] ?? 0,
    share: mTotal > 0 ? (marginal[i] ?? 0) / mTotal : 0,
  }));
}

/** Rolling-window max drawdowns of a single P&L path (window in periods). */
export function rollingDrawdowns(pnl: readonly number[], window = 180): number[] {
  const out: number[] = [];
  for (let start = 0; start < pnl.length; start++) {
    out.push(maxDrawdown(cumulative(pnl.slice(start, start + window))));
  }
  return out;
}

/**
 * Drawdown trigger: cut stakes to `cutFraction` while realized drawdown
 * exceeds the DT_α threshold; full stakes otherwise.
 */
export function drawdownTriggerStakeScale(
  currentDrawdown: number,
  thresholdDt: number,
  cutFraction = 0.25,
): number {
  if (!(thresholdDt >= 0)) throw new Error("drawdownTriggerStakeScale: threshold must be ≥ 0");
  return currentDrawdown > thresholdDt ? cutFraction : 1;
}
