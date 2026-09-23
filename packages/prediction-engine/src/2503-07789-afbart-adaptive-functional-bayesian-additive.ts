/**
 * arXiv:2503.07789 — AFBART: Adaptive Functional Bayesian Additive Regression Trees for Shot Intensity Surfaces
 *
 * Adaptive-basis functional regression for target-diet surfaces: data-driven knot placement concentrates
 * bases where the intensity surface curves most, with ridge-regularized fitting and RMSPE/MCRPS scoring
 * (the AFBART evaluation protocol, BART replaced by a deterministic adaptive-basis surrogate).
 *
 * Improvement: Adopt AFBART adaptive-basis functional BART as GSE's nonparametric target-diet regression (route/target-intensity surfaces) with calibrated uncertainty, upgrading to single-stage joint LGCP+AFBART inference and half-court-geometry-aware bases for the field.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Gate (ADAPT): wins all 6 simulation settings on all 3 metrics (e.g., RMSPE 0.07 vs. 0.68) and wins the real-data 4-fold CV on both RMSPE and MCRPS. Improvement success = RMSPE ≤ 0.30 on Case 3 (vs. paper's 0.34) with no degradation in MIS/MCRPS.
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
/** Place knots adaptively: quantiles of |second-difference| mass. */
export function adaptiveKnots(x: readonly number[], y: readonly number[], k: number): number[] {
  if (k < 2) throw new Error("adaptiveKnots: k >= 2");
  if (x.length !== y.length || x.length < 3) throw new Error("adaptiveKnots: need >= 3 points");
  const curv: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    curv.push(Math.abs((y[i + 1] ?? 0) - 2 * (y[i] ?? 0) + (y[i - 1] ?? 0)));
  }
  const total = curv.reduce((a, b) => a + b, 0);
  const knots: number[] = [x[0]!];
  if (total < 1e-12) {
    for (let i = 1; i < k; i++) knots.push(x[0]! + ((x[x.length - 1]! - x[0]!) * i) / k);
    return knots;
  }
  let acc = 0;
  let ki = 1;
  for (let i = 0; i < curv.length && ki < k; i++) {
    acc += (curv[i] ?? 0) / total;
    while (ki < k && acc >= ki / k) {
      knots.push(x[i + 1]!);
      ki++;
    }
  }
  while (knots.length < k) knots.push(x[x.length - 1]!);
  if ((knots[knots.length - 1] ?? 0) < (x[x.length - 1] ?? 0)) {
    knots[knots.length - 1] = x[x.length - 1]!; // cover the right endpoint
  }
  return knots;
}

/** Hat-basis design matrix over knots. */
export function hatBasis(x: readonly number[], knots: readonly number[]): number[][] {
  return x.map((xi) => {
    const row = new Array<number>(knots.length).fill(0);
    for (let j = 0; j < knots.length - 1; j++) {
      const a = knots[j]!;
      const b = knots[j + 1]!;
      if (xi >= a && xi <= b && b > a) {
        row[j] = (b - xi) / (b - a);
        row[j + 1] = (xi - a) / (b - a);
        break;
      }
    }
    return row;
  });
}

/** Ridge fit of basis coefficients. */
export function ridgeBasisFit(X: number[][], y: number[], l2: number): number[] {
  const p = X[0]?.length ?? 0;
  if (p === 0) throw new Error("ridgeBasisFit: empty design");
  // Normal equations with Cholesky-free Gauss-Jordan
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const row = X[i]!;
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] ?? 0) + row[a]! * (y[i] ?? 0);
      for (let b = 0; b < p; b++) XtX[a]![b] = (XtX[a]?.[b] ?? 0) + (row[a] ?? 0) * (row[b] ?? 0);
    }
  }
  for (let a = 0; a < p; a++) XtX[a]![a] = (XtX[a]?.[a] ?? 0) + l2;
  return solveLinear(XtX, Xty);
}

/** RMSPE of predictions. */
export function rmspe(pred: readonly number[], actual: readonly number[]): number {
  if (pred.length !== actual.length || pred.length === 0) throw new Error("rmspe: length mismatch");
  return Math.sqrt(pred.reduce((s, p, i) => s + ((p - (actual[i] ?? 0)) ** 2), 0) / pred.length);
}
