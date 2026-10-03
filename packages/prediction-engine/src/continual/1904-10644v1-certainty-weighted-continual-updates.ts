/**
 * arXiv 1904.10644v1: Facilitating Bayesian Continual Learning by Natural Gradients and Stein Gradients
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Certainty-weighted continual updates: per-parameter natural-gradient steps scaled by uncertainty (uncertain effects adapt fastest, Delta_i ~ sigma_i^2 * gradient_i). The reservoir replay buffer is replaced by a ~200-game Stein coreset: greedy kernel-herding selection refreshed quarterly, minimizing MMD to the full history.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Replace the flat weekly update gating with certainty-weighted updates (Delta_i proportional to sigma_i^2 * gradient_i, uncertain effects adapt fastest) and replace reservoir sampling with a ~200-game Stein coreset replay buffer refreshed quarterly.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT certainty-weighted updates if (B) beats (A) on >=2 of 1887's 4 metrics with worst-week Brier improving >=0.001. ADOPT the Stein coreset buffer if (C) beats the reservoir buffer on worst-week Brier by >=0.002 and on anytime Brier.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: continual_online_learning | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Natural-gradient step for logistic regression: F^{-1} g via damped solve. */
export function naturalGradLogistic(
  X: number[][],
  y: number[],
  theta: number[],
  damp: number,
): number[] {
  const n = X.length;
  const p = theta.length;
  const probs = X.map((row) => {
    const z = row.reduce((s, x, j) => s + x * theta[j]!, 0);
    return 1 / (1 + Math.exp(-z));
  });
  const F: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const g = new Array<number>(p).fill(0);
  for (let i = 0; i < n; i++) {
    const w = probs[i]! * (1 - probs[i]!);
    const r = probs[i]! - y[i]!;
    for (let j = 0; j < p; j++) {
      g[j]! += X[i]![j]! * r;
      for (let k = 0; k < p; k++) F[j]![k]! += w * X[i]![j]! * X[i]![k]!;
    }
  }
  for (let j = 0; j < p; j++) {
    g[j]! /= n;
    F[j]![j]! = F[j]![j]! / n + damp;
    for (let k = 0; k < p; k++) if (k !== j) F[j]![k]! /= n;
  }
  return solveNat(F, g);
}

function solveNat(A: number[][], b: number[]): number[] {
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

/** Compare one natural-gradient step vs plain gradient step (log-loss improvement). */
export function logLossLogistic(X: number[][], y: number[], theta: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    const z = X[i]!.reduce((a, x, j) => a + x * theta[j]!, 0);
    const p = 1 / (1 + Math.exp(-z));
    s -= y[i]! * Math.log(Math.max(1e-12, p)) + (1 - y[i]!) * Math.log(Math.max(1e-12, 1 - p));
  }
  return s / X.length;
}

/** RBF kernel. */
export function rbfKernel(x: number[], y: number[], h: number): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i]! - y[i]!) ** 2;
  return Math.exp(-s / (2 * h * h));
}

/**
 * Stein-coreset-style greedy selection via kernel herding: iteratively add the
 * point maximizing mean kernel similarity to the pool minus similarity to the
 * already-selected set (Stein discrepancy proxy with score-function-free kernel).
 */
export function steinCoresetGreedy(X: number[][], m: number, h: number): number[] {
  const n = X.length;
  const selected: number[] = [];
  const inSel = new Array<boolean>(n).fill(false);
  // mean kernel similarity of each point to the full pool
  const poolSim = X.map((xi) => {
    let s = 0;
    for (const xj of X) s += rbfKernel(xi, xj, h);
    return s / n;
  });
  for (let t = 0; t < m; t++) {
    let best = -1;
    let bestV = -Infinity;
    for (let i = 0; i < n; i++) {
      if (inSel[i]) continue;
      let pen = 0;
      for (const j of selected) pen += rbfKernel(X[i]!, X[j]!, h);
      const v = poolSim[i]! - pen / (selected.length + 1);
      if (v > bestV) { bestV = v; best = i; }
    }
    if (best < 0) break;
    selected.push(best);
    inSel[best] = true;
  }
  return selected;
}

/** Maximum mean discrepancy between a coreset and the full pool. */
export function mmdCoreset(X: number[][], sel: number[], h: number): number {
  const n = X.length;
  const m = sel.length;
  let t1 = 0;
  let t2 = 0;
  let t3 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) t1 += rbfKernel(X[i]!, X[j]!, h);
  for (const i of sel) for (const j of sel) t2 += rbfKernel(X[i]!, X[j]!, h);
  for (const i of sel) for (let j = 0; j < n; j++) t3 += rbfKernel(X[i]!, X[j]!, h);
  return t1 / (n * n) + t2 / (m * m) - (2 * t3) / (n * m);
}
