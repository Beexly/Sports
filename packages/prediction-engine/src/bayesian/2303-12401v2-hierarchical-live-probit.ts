/**
 * arXiv 2303.12401v2: Real-time forecasting within soccer matches through a Bayesian lens
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Port the live Bayesian probit to NFL: replace the 90 independent minute-models with a hierarchical Bayesian structure (minute-level coefficients shrunk toward neighbors), play-indexed probits on nflverse (down/distance/yardline/score/time covariates), and add market odds as a covariate to test whether live events add information beyond the price.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port the live Bayesian probit to NFL: replace the 90 independent minute-models with a hierarchical Bayesian structure (minute-level coefficients shrunk toward neighbors), play-indexed probits on nflverse (down/distance/yardline/score/time covariates), and add market odds as a covariate to test whether live events add information beyond the price.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT iff the architecture survives chronological evaluation: under rolling-origin validation, the play-indexed Bayesian probit must beat a static pre-match-probability-plus-score baseline on log-loss; if the live model adds nothing once the split is chronological, the adaptation fails.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Binary logistic regression via IRLS with L2 penalty (X rows include intercept). */
export function irlsFit(
  X: number[][],
  y: number[],
  lambda: number,
  iters = 50,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  let beta = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let z = 0;
      for (let j = 0; j < p; j++) z += beta[j]! * xi[j]!;
      const mu = logistic(z);
      const w = Math.max(1e-9, mu * (1 - mu));
      const r = y[i]! - mu;
      for (let j = 0; j < p; j++) {
        grad[j]! += xi[j]! * r;
        for (let k = 0; k < p; k++) H[j]![k]! += xi[j]! * w * xi[k]!;
      }
    }
    for (let j = 0; j < p; j++) {
      grad[j]! -= lambda * beta[j]!;
      H[j]![j]! += lambda;
    }
    const step = solveLinearLocal(H, grad);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      beta[j]! += step[j]!;
      maxStep = Math.max(maxStep, Math.abs(step[j]!));
    }
    if (maxStep < 1e-8) break;
  }
  return beta;
}

function solveLinearLocal(A: number[][], b: number[]): number[] {
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

/** Logistic log-loss of a fitted model. */
export function logisticLogLoss(X: number[][], y: number[], beta: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    let z = 0;
    const xi = X[i]!;
    for (let j = 0; j < beta.length; j++) z += beta[j]! * xi[j]!;
    const p = Math.min(1 - 1e-12, Math.max(1e-12, logistic(z)));
    s += y[i]! === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / X.length;
}

/**
 * Penalized stadium-factor fit: P(event|off i, def j, stadium k) =
 * sigma(o_i - d_j - s_k) with sum-to-zero identifiability via recentering.
 */
export function stadiumFactorFit(
  off: number[],
  def: number[],
  stad: number[],
  y: number[],
  nStad: number,
  lambda: number,
): number[] {
  const n = y.length;
  const p = 2 * nStad; // simplified: offense/defense per stadium-slot; recentered below
  void off; void def;
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(p).fill(0);
    row[stad[i]!] = 1;
    row[nStad + stad[i]!] = -1;
    X.push([1, ...row]);
  }
  const beta = irlsFit(X, y, lambda, 40);
  const s = beta.slice(1, 1 + nStad);
  const mean = s.reduce((a, b) => a + b, 0) / nStad;
  return s.map((v) => v - mean); // sum-to-zero identifiability
}
