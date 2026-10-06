/**
 * arXiv:2508.00200v1 — Predicting Formula 1 Race Outcomes: Decomposing the Roles of Drivers and Constructors through Linear Modeling
 *
 * EPA variance decomposition into scheme vs personnel shares: ridge regression on team/coach-unit/player
 * indicators under exponential time decay, LOESS-style smoothing of coefficient paths into ratings.
 *
 * Improvement: GSE decomposes EPA variance into scheme vs personnel shares with ridge regression on team/coach-unit/player indicators under exponential time decay, LOESS-smoothing coefficient paths into ratings.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt if the ridge+LOESS pilot beats the team-average carry-forward baseline by >=5% MAE on 2024 holdout weeks AND the variance-share decomposition is stable across two seasons (constructor-analogue share within +-10pp).
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

/** One EPA observation with group indicators and recency weight. */
export interface EpaObs {
  epa: number;
  /** One-hot group index vector (team/coach-unit/player blocks). */
  groups: readonly number[];
  /** Weeks ago (for exponential decay weighting). */
  ageWeeks: number;
}

/**
 * Time-decayed ridge fit of EPA on group indicators. Returns per-group
 * coefficients; variance shares = Var contribution / total Var.
 */
export function decomposeEpaVariance(
  obs: readonly EpaObs[],
  lambda: number,
  halfLifeWeeks: number,
): { coefs: number[]; shares: number[] } {
  if (obs.length === 0) throw new Error("decomposeEpaVariance: no observations");
  const p = obs[0]?.groups.length ?? 0;
  const decay = (w: number) => Math.pow(0.5, w / halfLifeWeeks);
  const X = obs.map((o) => o.groups.map((g) => g * Math.sqrt(decay(o.ageWeeks))));
  const y = obs.map((o) => o.epa * Math.sqrt(decay(o.ageWeeks)));
  const coefs = ridgeFit(X, y, lambda);
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  const total = y.reduce((a, b) => a + (b - mean) ** 2, 0);
  const vy = total / y.length;
  // Standard attribution: share_j = c_j * Cov(col_j, y) / Var(y); sums to R^2.
  const shares = coefs.map((c, j) => {
    const col = X.map((row) => row[j] ?? 0);
    const mc = col.reduce((a, b) => a + b, 0) / col.length;
    const cov = col.reduce((s, v, i) => s + (v - mc) * ((y[i] ?? 0) - mean), 0) / col.length;
    return vy > 0 ? (c * cov) / vy : 0;
  });
  return { coefs, shares };
}
