/**
 * arXiv:2507.11739v1 — Sparse Identification of Nonlinear Dynamics with Conformal Prediction
 *
 * SINDy 'laws of the game' with conformal bands: sparse identification of nonlinear dynamics via
 * thresholded least squares on a candidate library, EnbPI 90% bands on win-prob trajectories, and
 * feature-conformal intervals per coefficient (zero-exclusion = term survives).
 *
 * Improvement: GSE adds EnbPI 90% conformal bands to per-game win-prob trajectory forecasts with a 4-week sliding calibration window, and reports feature-conformal intervals per coefficient on the SINDy-discovered 'laws of the game' equations.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if EnbPI 90% bands achieve empirical coverage in [88%, 95%] on the 2025 rolling-origin test with mean width <= the naive baseline AND >=80% of SINDy equation terms survive the feature-CP zero-exclusion check across all 2025 windows.
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

/** Fit OLS coefficients for the SINDy library (normal equations). */
export function olsFit(X: number[][], y: number[]): number[] {
  return ridgeFit(X, y, 1e-9);
}

/**
 * Thresholded least squares (the SINDy sparsification core): iterate OLS,
 * zeroing coefficients below the threshold, refit on the active set.
 */
export function sindyFit(
  X: number[][],
  y: number[],
  threshold: number,
  iters = 10,
): number[] {
  const p = X[0]?.length ?? 0;
  let active = new Array<boolean>(p).fill(true);
  let coefs = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const idx = active.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) break;
    const Xs = X.map((row) => idx.map((j) => row[j] ?? 0));
    const fit = olsFit(Xs, y);
    const next = new Array<number>(p).fill(0);
    idx.forEach((j, k) => { next[j] = fit[k] ?? 0; });
    coefs = next;
    const newActive = coefs.map((c) => Math.abs(c) >= threshold);
    if (newActive.every((a, i) => a === active[i])) break;
    active = newActive;
  }
  return coefs;
}

/**
 * Feature-conformal interval per coefficient: [coef - q, coef + q] where q is
 * the (1-alpha) quantile of absolute leave-one-out residuals projected on the
 * coefficient. Simplified: symmetric band from the residual quantile.
 */
export function featureConformalInterval(
  coef: number,
  absResiduals: readonly number[],
  alpha: number,
): [number, number] {
  if (absResiduals.length === 0) throw new Error("featureConformalInterval: no residuals");
  const s = [...absResiduals].sort((a, b) => a - b);
  const q = s[Math.min(s.length - 1, Math.ceil((1 - alpha) * s.length)) - 1] ?? 0;
  return [coef - q, coef + q];
}

/** Zero-exclusion check: does the interval exclude 0 (term survives)? */
export function survivesZeroExclusion(interval: readonly [number, number]): boolean {
  const [lo, hi] = interval;
  return lo > 0 || hi < 0;
}
