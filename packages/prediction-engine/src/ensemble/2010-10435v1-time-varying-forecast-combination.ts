/**
 * arXiv 2010.10435v1: Time-varying Forecast Combination for High-Dimensional Data
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Time-varying model combination for the engine (gse_tvcombine.py): inputs = per-game component forecasts (engine v5.2.7 prob, market-implied prob, Elo prob, situational-model prob); local-linear time-varying weights with reflection at the current-week boundary (combine for this week's games using only past weeks), Epanechnikov kernel, bandwidth by leave-one-out CV; two-stage group-SCAD pruning when the component pool is large; online weight updating within a week as lines move.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Time-varying model combination for the engine (gse_tvcombine.py): inputs = per-game component forecasts (engine v5.2.7 prob, market-implied prob, Elo prob, situational-model prob); target = outcome/cover indicator; local-linear time-varying weights with reflection at the current-week boundary (combine for this week's games using only past weeks), Epanechnikov kernel, bandwidth by leave-one-out CV; two-stage group-SCAD pruning when the component pool is large; online weight updating within a week as lines move.
 *
 * ACCEPTANCE GATE (verbatim):
 * Time-varying combination must beat equal weights and static OLS on OOS Brier/ASCFE with DM p<0.10 on a >=2-season backtest; if weights collapse to near-constant (no time variation found), fall back to static combination and record the negative.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: mixed | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

/** SCAD penalty value. */
export function scadPenalty(b: number, lambda: number, a = 3.7): number {
  const ab = Math.abs(b);
  if (ab <= lambda) return lambda * ab;
  if (ab <= a * lambda) return (2 * a * lambda * ab - ab * ab - lambda * lambda) / (2 * (a - 1));
  return ((a + 1) * lambda * lambda) / 2;
}

/** SCAD thresholding operator (Fan & Li). */
export function scadThreshold(z: number, lambda: number, a = 3.7): number {
  const az = Math.abs(z);
  const sgn = z >= 0 ? 1 : -1;
  if (az <= 2 * lambda) return sgn * Math.max(0, az - lambda);
  if (az <= a * lambda) return sgn * ((a - 1) * az - a * lambda) / (a - 2);
  return z;
}

/** SCAD-penalized coordinate descent (standardized X, centered y). */
export function scadFit(
  X: number[][],
  y: number[],
  lambda: number,
  a = 3.7,
  iters = 150,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const beta = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < p; j++) {
      let rho = 0;
      let norm = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) if (k !== j) pred += X[i]![k]! * beta[k]!;
        rho += X[i]![j]! * (y[i]! - pred);
        norm += X[i]![j]! ** 2;
      }
      beta[j] = scadThreshold(rho / Math.max(1e-12, norm), lambda / Math.max(1e-12, norm), a);
    }
  }
  return beta;
}
