/**
 * arXiv:2608.13886 — A Forecast Combination Framework for Hierarchical and Grouped Time Series Reconciliation
 *
 * Per-target Bates-Granger forecast combination: optimal weights from the error covariance with
 * factor-shrinkage toward a structured covariance plus egalitarian ridge toward equal weights; coherent
 * reconciliation of season win totals from game win probs.
 *
 * Improvement: Replace the engine's final probability layer with per-target Bates-Granger weights (factor-shrinkage covariance plus egalitarian ridge toward equal weights) over engine, de-vigged market, and Elo probabilities, with coherent reconciliation of season win totals from game win probs.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if the held-out 2026 test shows the shrunk Bates-Granger combination beating both equal weights and the best single source by >=0.002 Brier in at least 2 of 3 markets — then wire it as the engine's final probability layer. Reject if combination <= equal weights (the classic result reasserts itself).
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
 * Shrink an error covariance toward its diagonal (factor-shrinkage-lite):
 * Sigma_s = delta * diag(Sigma) + (1 - delta) * Sigma.
 */
export function shrinkCovariance(Sigma: number[][], delta: number): number[][] {
  if (delta < 0 || delta > 1) throw new Error("shrinkCovariance: delta in [0,1]");
  const n = Sigma.length;
  return Sigma.map((row, i) =>
    row.map((v, j) => (i === j ? v : delta * 0 + (1 - delta) * v)),
  );
}

/**
 * Bates-Granger weights with egalitarian ridge: solve
 * (Sigma_s + ridge*I) w = 1, then normalize. Minimizes combined error var.
 */
export function batesGrangerWeights(
  Sigma: number[][],
  delta: number,
  ridge: number,
): number[] {
  const n = Sigma.length;
  if (n === 0) throw new Error("batesGrangerWeights: empty covariance");
  const S = shrinkCovariance(Sigma, delta).map((row, i) =>
    row.map((v, j) => (i === j ? v + ridge : v)),
  );
  const ones = new Array<number>(n).fill(1);
  const w = solveLinear(S, ones);
  const z = w.reduce((a, b) => a + b, 0);
  if (Math.abs(z) < 1e-12) throw new Error("batesGrangerWeights: degenerate");
  return w.map((v) => v / z);
}

/**
 * Coherent reconciliation: season win total = sum of game win probs,
 * rescaled so the total matches the direct season-total forecast.
 */
export function reconcileSeasonTotal(
  gameProbs: readonly number[],
  directSeasonTotal: number,
): number[] {
  const s = gameProbs.reduce((a, b) => a + b, 0);
  if (s <= 0) throw new Error("reconcileSeasonTotal: positive game probs");
  return gameProbs.map((p) => (p / s) * directSeasonTotal);
}
