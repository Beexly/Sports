/**
 * arXiv 2212.11041v1: What Should Clubs Monitor to Predict Future Value of Football Players
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build NFL future-value models: per-position Lasso + RF predicting log(DK salary or projected fantasy points) N weeks ahead from per-snap/per-route normalized nflverse + FTN charting stats, with a team-strength anchor (log team implied total or unit grade) as the league-average-value analogue; rolling-origin time splits (fixing the paper's non-temporal CV), 5-fold within each origin; applications = dynasty trade value charts, award futures (OROY odds vs model), 'buy-low' flags where model value >> market salary -- then fit age as a spline (not age + age^2) within each position model and test whether the spline beats the quadratic on veteran (age 29+) out-of-sample R2, since the spline should capture the late-career cliff fantasy markets misprice most.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build NFL future-value models: per-position Lasso + RF predicting log(DK salary or projected fantasy points) N weeks ahead from per-snap/per-route normalized nflverse + FTN charting stats, with a team-strength anchor (log team implied total or unit grade) as the league-average-value analogue; rolling-origin time splits (fixing the paper's non-temporal CV), 5-fold within each origin; applications = dynasty trade value charts, award futures (OROY odds vs model), 'buy-low' flags where model value >> market salary — then fit age as a spline (not age + age^2) within each position model and test whether the spline beats the quadratic on veteran (age 29+) out-of-sample R2, since the spline should capture the late-career cliff fantasy markets misprice most.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT the recipe iff per-position log-value models beat pooled + naive baselines on the §12 gate (per-position R2 >=3 points above pooled on >=3 of 4 skill positions AND beat the current-salary naive) with time-ordered validation; REJECT any claim that crowd-style valuations are the right target — use realized fantasy points/salaries, not crowd valuations.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Soft-thresholding operator. */
export function softThreshold(z: number, t: number): number {
  if (z > t) return z - t;
  if (z < -t) return z + t;
  return 0;
}

/** Lasso via cyclic coordinate descent (assumes standardized X, centered y). */
export function lassoCoordDescent(
  X: number[][],
  y: number[],
  lambda: number,
  iters = 200,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const beta = new Array<number>(p).fill(0);
  const colNorm = new Array<number>(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i]![j]! ** 2;
    colNorm[j] = s;
  }
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < p; j++) {
      let rho = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) if (k !== j) pred += X[i]![k]! * beta[k]!;
        rho += X[i]![j]! * (y[i]! - pred);
      }
      beta[j] = softThreshold(rho, lambda) / Math.max(1e-12, colNorm[j]!);
    }
  }
  return beta;
}

/** BIC for a fitted subset (k = nonzero count). */
export function bicScore(rss: number, n: number, k: number): number {
  return n * Math.log(Math.max(1e-300, rss / n)) + k * Math.log(n);
}

/** Lambda-grid selection by BIC along the lasso path. */
export function lassoBicSelect(
  X: number[][],
  y: number[],
  lambdas: number[],
): { lambda: number; beta: number[]; bic: number } {
  const n = y.length;
  let best = { lambda: lambdas[0]!, beta: [] as number[], bic: Infinity };
  for (const lam of lambdas) {
    const beta = lassoCoordDescent(X, y, lam, 120);
    let rss = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < beta.length; j++) pred += X[i]![j]! * beta[j]!;
      rss += (y[i]! - pred) ** 2;
    }
    const k = beta.filter((b) => Math.abs(b) > 1e-10).length;
    const bic = bicScore(rss, n, k);
    if (bic < best.bic) best = { lambda: lam, beta, bic };
  }
  return best;
}
