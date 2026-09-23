/**
 * arXiv:2506.22350 — Personnel-adjustment for home run park effects in Major League Baseball
 *
 * Cluster-robust double machine learning for treatment effects with team-season clusters: cross-fitted
 * residual-on-residual regression with cluster-robust (sandwich) standard errors.
 *
 * Improvement: GSE separates stadium effects from roster quality with a personnel-adjusted GLMM on points/FG makes, producing Denver-altitude-style adjusted stadium factors for the totals model and kicker props.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the elsewhere-covariate method if OOS totals RMSE improves >=0.3 points over raw venue means and >=3 stadiums move >=5 rank places between raw and adjusted scoring-friendliness.
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

/** Residualize y on X via OLS (the DML first stage, single fold). */
export function residualize(y: number[], X: number[][]): number[] {
  const beta = ridgeFit(X, y, 1e-9);
  return y.map((yi, i) => yi - (X[i] ?? []).reduce((s, x, j) => s + x * (beta[j] ?? 0), 0));
}

/**
 * Cluster-robust DML: theta = (D~' Y~)/(D~' D~); sandwich SE clustered by
 * cluster id: V = (D~'D~)^{-1} (sum_c S_c S_c') (D~'D~)^{-1}, S_c = sum_{i in c} D~_i e_i.
 */
export function clusterDml(
  yResid: readonly number[],
  dResid: readonly number[],
  clusters: readonly (string | number)[],
): { theta: number; se: number } {
  const n = yResid.length;
  if (n === 0 || dResid.length !== n || clusters.length !== n) {
    throw new Error("clusterDml: length mismatch");
  }
  let d2 = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    d2 += (dResid[i] ?? 0) ** 2;
    dy += (dResid[i] ?? 0) * (yResid[i] ?? 0);
  }
  if (d2 < 1e-12) throw new Error("clusterDml: no residual treatment variation");
  const theta = dy / d2;
  // Cluster sums of D~_i * e_i
  const sums = new Map<string | number, number>();
  for (let i = 0; i < n; i++) {
    const e = (yResid[i] ?? 0) - theta * (dResid[i] ?? 0);
    const c = clusters[i]!;
    sums.set(c, (sums.get(c) ?? 0) + (dResid[i] ?? 0) * e);
  }
  let meat = 0;
  for (const s of sums.values()) meat += s * s;
  const se = Math.sqrt(meat) / d2;
  return { theta, se };
}
