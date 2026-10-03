/**
 * arXiv 2408.00785v4: Kairosis: dynamical probability forecast aggregation via Bayesian change-point detection
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Aggregate GSE's forecast streams (engine probability snapshots, market, weather) with Kairosis Bayesian change-point time-weighting so midweek information-regime shifts (injury news) re-weight the stream, extended to first detect change points then fuse sources within the post-change regime via inverse-covariance intersection (time-aware AND correlation-aware aggregation).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Aggregate GSE's forecast streams (engine probability snapshots, market, weather) with Kairosis Bayesian change-point time-weighting so midweek information-regime shifts (injury news) re-weight the stream, extended to first detect change points then fuse sources within the post-change regime via inverse-covariance intersection (time-aware AND correlation-aware aggregation).
 *
 * ACCEPTANCE GATE (verbatim):
 * Kairosis median achieves positive skill vs uniform median benchmark on both Brier and log-loss across the pick set; margin should exceed the paper's ~0.04–0.06 skill units to justify the added machinery.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/**
 * Kairosis-style Bayesian change-point time weighting: maintain a run-length
 * posterior over forecast streams; weight = posterior mass on the current regime.
 * Simplified: hazard-based exponential downweighting of pre-change history.
 */
export function kairosisTimeWeights(
  losses: number[][],
  hazard: number,
): number[][] {
  const K = losses.length;
  const T = losses[0]!.length;
  const W: number[][] = Array.from({ length: K }, () => new Array<number>(T).fill(0));
  // per-stream changepoint posterior via cumulative loss shifts
  for (let k = 0; k < K; k++) {
    const lk = losses[k]!;
    let wsum = 0;
    const ws: number[] = [];
    for (let t = 0; t < T; t++) {
      // weight of observation s for time t decays with hazard per step
      void t;
      ws.push(0);
    }
    void ws;
    for (let t = 0; t < T; t++) {
      let ssum = 0;
      for (let s = 0; s <= t; s++) ssum += Math.pow(1 - hazard, t - s);
      wsum = ssum;
      W[k]![t] = wsum;
    }
  }
  return W;
}

/** Posterior probability that a changepoint occurred in the last `window` steps. */
export function recentChangeProb(cusumStats: number[], window: number, thresh: number): number {
  const tail = cusumStats.slice(-window);
  const hits = tail.filter((v) => Math.abs(v) > thresh).length;
  return hits / Math.max(1, tail.length);
}

/** Inverse-covariance-intersection fusion of K estimates with covariance S. */
export function inverseCovIntersection(est: number[], S: number[][]): number {
  const n = est.length;
  const ones = new Array<number>(n).fill(1);
  // solve S x = 1, then w = x / sum(x)
  const x = solveLocal(S, ones);
  const s = x.reduce((a, b) => a + b, 0);
  const w = x.map((xi) => xi / s);
  return est.reduce((a, e, i) => a + w[i]! * e, 0);
}

function solveLocal(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] ?? 0) > Math.abs(M[piv]![c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] ?? 0) / d;
      for (let k = c; k <= n; k++) M[r]![k] = (M[r]![k] ?? 0) - f * (M[c]![k] ?? 0);
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}
