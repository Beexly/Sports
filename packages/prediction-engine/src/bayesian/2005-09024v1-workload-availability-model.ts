/**
 * arXiv 2005.09024v1: Distributed lag models to identify the cumulative effects of training and recovery in athletes using multivariate ordinal wellness data
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Per-player availability model: snap counts x intensity proxy (workload), days since last game + travel + short-week flags (recovery), 10-game rolling lags, hierarchical partial pooling across players within position group; target = binary availability / ordinal practice participation; availability signals weighted by posterior relative importance R_j; high-risk workload-lag profiles flag picks to adjust or withhold.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a per-player availability model: inputs = snap counts x intensity proxy (workload), days since last game + travel + short-week flags (recovery), 10-game rolling lags, hierarchical partial pooling across players within position group; target = binary availability / ordinal practice-participation (full/limited/DNP); weight availability signals by posterior relative importance R_j; flag players whose workload-lag profile sits in the high-risk region to adjust or withhold picks on their games.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if held-out 2025 availability AUC beats the pooled baseline by >=3 pp AND individual lag curves show meaningful heterogeneity (psi_ml significantly >0). REJECT if lag curves collapse to a single global curve with no individual signal.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  if (n === 0) throw new Error("solveLinear: empty system");
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

/** Ridge regression: (X'X + lI)^-1 X'y. X rows = observations (include intercept col). */
export function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty: number[] = new Array<number>(p).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i]!;
    for (let j = 0; j < p; j++) {
      Xty[j]! += xi[j]! * y[i]!;
      for (let k = 0; k < p; k++) XtX[j]![k]! += xi[j]! * xi[k]!;
    }
  }
  for (let j = 0; j < p; j++) XtX[j]![j]! += lambda;
  return solveLinear(XtX, Xty);
}

/** Linear prediction. */
export function ridgePredict(X: number[][], beta: number[]): number[] {
  return X.map((xi) => xi.reduce((s, x, j) => s + x * beta[j]!, 0));
}

/** ARX(p) fit via ridge on lagged design (Y[t] on Y[t-1..t-p] and exog). */
export function arxFit(Y: number[], Xexog: number[][], p: number, lambda: number): number[] {
  const rows: number[][] = [];
  const tgt: number[] = [];
  for (let t = p; t < Y.length; t++) {
    const row = [1];
    for (let l = 1; l <= p; l++) row.push(Y[t - l]!);
    for (const xe of Xexog) row.push(xe[t]!);
    rows.push(row);
    tgt.push(Y[t]!);
  }
  return ridgeFit(rows, tgt, lambda);
}

/** Adjusted plus-minus: ridge of segment point-differential on player presence. */
export function adjustedPlusMinus(
  presence: number[][],
  margin: number[],
  lambda: number,
): number[] {
  const X = presence.map((row) => [1, ...row]);
  return ridgeFit(X, margin, lambda).slice(1);
}

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
