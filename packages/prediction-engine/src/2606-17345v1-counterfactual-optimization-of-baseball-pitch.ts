/**
 * arXiv:2606.17345v1 — Counterfactual Optimization of Baseball Pitch Sequences and Estimation of Its Impact on Season-Level Statistics
 *
 * DR-Learner for heterogeneous treatment effects: doubly-robust pseudo-outcomes from cross-fitted
 * nuisances, then a final-stage regression of pseudo-outcomes on effect modifiers (rest, travel, surface) —
 * the per-team rest-day edge curve.
 *
 * Improvement: Port the micro-counterfactual to macro-stat bridge to NFL 4th downs: train a drive-outcome/WP model on pre-play state + decision, swap each historical 4th-down decision counterfactually holding context fixed, aggregate per-coach mean gaps, and regress coach season EPA-per-drive on the gap as a coach decision-quality metric; then run the multi-objective Pareto (WP, EPA, coverage risk) version for game-plan cards.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the framework if, on the nflverse 4th-down test: (a) the per-coach optimal-vs-actual output gap correlates with season EPA/drive at |r| ≥ 0.5 on the held-out 2025 window, and (b) the estimated Δwin upper bound is stable across two adjacent held-out windows (2024, 2025).
 */

/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  if (n === 0) throw new Error("solveLinear: empty system");
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]?.[c] ?? 0) > Math.abs(M[piv]?.[c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]?.[c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]?.[c] ?? 0) / d;
      for (let k = c; k <= n; k++) {
        M[r]![k] = (M[r]?.[k] ?? 0) - f * (M[c]?.[k] ?? 0);
      }
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}

/** Ridge regression: (X'X + lI)^-1 X'y. X rows = observations. */
export function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const p = X[0]?.length ?? 0;
  if (p === 0) throw new Error("ridgeFit: no features");
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] ?? 0) + (X[i]?.[a] ?? 0) * (y[i] ?? 0);
      for (let b2 = 0; b2 < p; b2++) {
        XtX[a]![b2] = (XtX[a]?.[b2] ?? 0) + (X[i]?.[a] ?? 0) * (X[i]?.[b2] ?? 0);
      }
    }
  }
  for (let a = 0; a < p; a++) XtX[a]![a] = (XtX[a]?.[a] ?? 0) + lambda;
  return solveLinear(XtX, Xty);
}

/**
 * Doubly-robust pseudo-outcome for binary D:
 * phi = mu1 - mu0 + D*(Y-mu1)/e - (1-D)*(Y-mu0)/(1-e).
 */
export function drPseudoOutcome(
  y: number,
  d: 0 | 1,
  mu1: number,
  mu0: number,
  e: number,
): number {
  const ec = Math.min(1 - 1e-6, Math.max(1e-6, e));
  return mu1 - mu0 + (d === 1 ? (y - mu1) / ec : -(y - mu0) / (1 - ec));
}

/**
 * DR-Learner CATE: cross-fitted pseudo-outcomes regressed (OLS) on the
 * modifier matrix Z. Returns the coefficient vector over [1, ...Z].
 */
export function drCate(
  Y: readonly number[],
  D: readonly (0 | 1)[],
  X: number[][],
  Z: number[][],
  K = 5,
): number[] {
  const n = Y.length;
  if (n === 0 || D.length !== n || X.length !== n || Z.length !== n) {
    throw new Error("drCate: length mismatch");
  }
  const folds: number[][] = Array.from({ length: K }, () => []);
  for (let i = 0; i < n; i++) folds[i % K]!.push(i);
  const phi = new Array<number>(n).fill(0);
  for (const te of folds) {
    const tr = folds.flat().filter((i) => !te.includes(i));
    const Xtr = tr.map((i) => X[i]!);
    const mu1 = ridgeFit(Xtr.filter((_, k) => D[tr[k]!] === 1), tr.filter((i) => D[i] === 1).map((i) => Y[i]!), 1e-6);
    const mu0 = ridgeFit(Xtr.filter((_, k) => D[tr[k]!] === 0), tr.filter((i) => D[i] === 0).map((i) => Y[i]!), 1e-6);
    const eB = ridgeFit(Xtr, tr.map((i) => D[i]!), 1e-6);
    const logit = (v: number) => 1 / (1 + Math.exp(-v));
    for (const i of te) {
      const xi = X[i]!;
      const m1 = xi.reduce((s, x, j) => s + x * (mu1[j] ?? 0), 0);
      const m0 = xi.reduce((s, x, j) => s + x * (mu0[j] ?? 0), 0);
      const e = logit(xi.reduce((s, x, j) => s + x * (eB[j] ?? 0), 0));
      phi[i] = drPseudoOutcome(Y[i]!, D[i]!, m1, m0, e);
    }
  }
  const Z1 = Z.map((z) => [1, ...z]);
  return ridgeFit(Z1, phi, 1e-6);
}
