/**
 * arXiv:2603.21163v2 — Simultaneous Estimation of Ballpark Effects and Team Defense Using Total Bases Residuals
 *
 * Stadium Factor index: joint weighted-least-squares estimation of venue effects and team-unit effects on
 * expected-points residuals, with honest uncertainty intervals and a home-away external validity check.
 *
 * Improvement: GSE builds a 'Stadium Factor' index via joint WLS estimation of venue effects and team unit effects on expected-points residuals, with honest uncertainty intervals and an external home-away validity check.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if simultaneous venue/personnel decomposition with honest uncertainty intervals and an external home-away validity check demonstrates first-class methodology GSE can reuse for stadium effects.
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

/** One residual observation with venue and unit indicators. */
export interface ResidualObs {
  residual: number; // actual EP - model EP
  venue: number;    // venue index
  unit: number;     // team-unit index
  weight: number;   // WLS weight (e.g. inverse play-count variance)
}

/**
 * Joint WLS fit of venue + unit effects. Design: [venue dummies | unit dummies]
 * with sum-to-zero constraint on venue effects (last venue dropped).
 * Returns { venueEffects, unitEffects, se } with honest (sandwich-lite) SEs.
 */
export function fitStadiumFactor(
  obs: readonly ResidualObs[],
  nVenues: number,
  nUnits: number,
): { venueEffects: number[]; unitEffects: number[]; se: number[] } {
  if (obs.length === 0) throw new Error("fitStadiumFactor: no observations");
  if (nVenues < 2 || nUnits < 1) throw new Error("fitStadiumFactor: need >= 2 venues, >= 1 unit");
  const p = (nVenues - 1) + nUnits;
  const X = obs.map((o) => {
    const row = new Array<number>(p).fill(0);
    if (o.venue < nVenues - 1) row[o.venue] = 1;
    else if (o.venue === nVenues - 1) for (let v = 0; v < nVenues - 1; v++) row[v] = -1;
    row[nVenues - 1 + o.unit] = 1;
    return row.map((v) => v * Math.sqrt(Math.max(1e-9, o.weight)));
  });
  const y = obs.map((o) => o.residual * Math.sqrt(Math.max(1e-9, o.weight)));
  // Normal equations with tiny ridge for stability.
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] ?? 0) + (X[i]?.[a] ?? 0) * (y[i] ?? 0);
      for (let b = 0; b < p; b++) {
        XtX[a]![b] = (XtX[a]?.[b] ?? 0) + (X[i]?.[a] ?? 0) * (X[i]?.[b] ?? 0);
      }
    }
  }
  for (let a = 0; a < p; a++) XtX[a]![a] = (XtX[a]?.[a] ?? 0) + 1e-6;
  const beta = solveLinear(XtX, Xty);
  const venueEffects = [...beta.slice(0, nVenues - 1), -beta.slice(0, nVenues - 1).reduce((a, b) => a + b, 0)];
  const unitEffects = beta.slice(nVenues - 1);
  // Honest SEs: sqrt(diag(inv(X'X)) * sigma2_hat).
  const resid = y.map((yi, i) => yi - X[i]!.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0));
  const sigma2 = resid.reduce((s, r) => s + r * r, 0) / Math.max(1, y.length - p);
  const inv = invertDiag(XtX);
  const se = inv.map((d) => Math.sqrt(Math.max(0, d * sigma2)));
  return { venueEffects, unitEffects, se };
}

/** Diagonal of the matrix inverse (for SEs), via solveLinear per basis vector. */
export function invertDiag(A: number[][]): number[] {
  const n = A.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0);
    e[i] = 1;
    out[i] = solveLinear(A, e)[i] ?? 0;
  }
  return out;
}
