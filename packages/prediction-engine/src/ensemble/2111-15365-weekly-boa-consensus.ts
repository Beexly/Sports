/**
 * arXiv 2111.15365: Expert Aggregation for Financial Forecasting
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Stand up a weekly BOA (Bernstein Online Aggregation) consensus layer over the K engine sub-models: each Tuesday update simplex weights via the BOA rule with the second-order correction on realized weekly losses, publish the weighted consensus as the week's official forecast; run separate aggregations for favorites vs underdogs; add regime-conditional parallel BOA instances (early season/midseason/playoff push, high-vs-low totals) under a meta-BOA for faster adaptation at regime boundaries.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Stand up a weekly BOA (Bernstein Online Aggregation) consensus layer over the K engine sub-models: each Tuesday update simplex weights via the BOA rule with the second-order correction on realized weekly losses, publish the weighted consensus as the week's official forecast; run separate aggregations for favorites vs underdogs; add regime-conditional parallel BOA instances (early season/midseason/playoff push, high-vs-low totals) under a meta-BOA for faster adaptation at regime boundaries.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff on 2024-2025 the BOA consensus beats the static equal-weight baseline by >=1.5% relative Brier AND the Kelly-staked max drawdown is <=70% of the best single expert's (the paper's tail-risk signature), with week-to-week weight churn not exceeding 2x the uniform baseline's.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Exponentially weighted average (Hedge) update on the simplex. */
export function ewaUpdate(w: number[], losses: number[], eta: number): number[] {
  const n = w.length;
  const un = w.map((wi, i) => wi * Math.exp(-eta * losses[i]!));
  const s = un.reduce((a, b) => a + b, 0);
  return un.map((u) => u / Math.max(1e-300, s));
}

/**
 * Bernstein Online Aggregation update with second-order correction:
 * eta_t adaptive via cumulative variance V.
 */
export function boaUpdate(
  w: number[],
  losses: number[],
  V: number[],
  eta: number,
): { w: number[]; V: number[] } {
  const n = w.length;
  const m = losses.reduce((a, b) => a + b * w[losses.indexOf(b)]!, 0);
  void m;
  const avg = losses.reduce((a, b, i) => a + b * w[i]!, 0);
  const V2 = V.map((v, i) => v + (losses[i]! - avg) ** 2);
  const etaT = eta / Math.sqrt(Math.max(1e-9, V2.reduce((a, b) => a + b, 0) / n));
  const un = w.map((wi, i) => wi * Math.exp(-etaT * (losses[i]! - avg) - etaT * etaT * (losses[i]! - avg) ** 2));
  const s = un.reduce((a, b) => a + b, 0);
  return { w: un.map((u) => u / Math.max(1e-300, s)), V: V2 };
}

/** Project a vector onto the probability simplex. */
export function simplexProject(v: number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let j = 0; j < n; j++) {
    css += u[j]!;
    const t = (css - 1) / (j + 1);
    if (u[j]! - t > 0) rho = j;
  }
  const theta = (u.slice(0, rho + 1).reduce((a, b) => a + b, 0) - 1) / (rho + 1);
  return v.map((x) => Math.max(0, x - theta));
}

/** Smoothed BOA: exponential smoothing of weights toward neighbors (2-D grid). */
export function smoothWeights(w: number[], lambda: number): number[] {
  const n = w.length;
  const out = w.slice();
  for (let i = 0; i < n; i++) {
    const left = w[Math.max(0, i - 1)]!;
    const right = w[Math.min(n - 1, i + 1)]!;
    out[i] = (w[i]! + lambda * (left + right) / 2) / (1 + lambda);
  }
  const s = out.reduce((a, b) => a + b, 0);
  return out.map((x) => x / Math.max(1e-300, s));
}
