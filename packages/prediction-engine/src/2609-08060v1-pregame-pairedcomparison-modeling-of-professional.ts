/**
 * arXiv:2609.08060v1 — Pre-game paired-comparison modeling of professional League of Legends map outcomes
 *
 * One-stage stable+dynamic paired comparison: team form as EWMA of past same-venue signed results, stable
 * team strengths with a ridge penalty, logistic link on spread-adjusted win, exogenous fixed effects (home,
 * rest, division), (lambda, tau) by inner chronological split.
 *
 * Improvement: Port the paper's one-stage stable+dynamic paired-comparison architecture to NFL pregame modeling: team form as EWMA of past same-venue signed results, stable team strengths with a ridge penalty, logistic link on spread-adjusted win, with home indicator, rest differential, and division-game indicator as exogenous fixed effects, selecting (lambda, tau) by inner chronological split and fitting by L-BFGS.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Accept the port if: the combined stable+dynamic model beats both boundaries on walk-forward Brier with paired p<0.05 AND calibration slope in [0.9,1.1]; if the EWMA form term adds nothing over the static ridge block, reject the form term and keep only the static block - the paper's own lesson is that parsimony wins ties.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
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

/** Signed same-venue result for the EWMA form tracker. */
export interface FormObs { signedMargin: number; venue: "home" | "away" | "neutral" }

/** EWMA of past same-venue signed results (the dynamic form component). */
export function ewmaForm(obs: readonly FormObs[], venue: "home" | "away" | "neutral", tau: number): number {
  if (tau <= 0) throw new Error("ewmaForm: tau > 0");
  const rel = obs.filter((o) => o.venue === venue || o.venue === "neutral");
  if (rel.length === 0) return 0;
  const alpha = 1 - Math.exp(-1 / tau);
  let e = 0;
  for (const o of rel) e = alpha * o.signedMargin + (1 - alpha) * e;
  return e;
}

/** Game row for the stable+dynamic fit. */
export interface SdGame {
  home: number;
  away: number;
  /** Spread-adjusted win (1 = beat the spread-adjusted expectation). */
  y: number;
  homeForm: number;
  awayForm: number;
  /** Exogenous fixed effects [home, restDiff, division]. */
  x: number[];
}

/**
 * Ridge-penalized logistic fit of the stable strengths + form + fixed effects.
 * Design: [team dummies (sum-zero) | homeForm-awayForm | x]. Few Newton steps.
 */
export function fitStableDynamic(
  games: readonly SdGame[],
  nTeams: number,
  lambda: number,
): { strengths: number[]; formCoef: number; fixedFx: number[] } {
  if (games.length === 0) throw new Error("fitStableDynamic: no games");
  const p = (nTeams - 1) + 1 + (games[0]?.x.length ?? 0);
  const row = (g: SdGame): number[] => {
    const r = new Array<number>(p).fill(0);
    if (g.home < nTeams - 1) r[g.home] = 1;
    else for (let t = 0; t < nTeams - 1; t++) r[t] = -1;
    if (g.away < nTeams - 1) r[g.away] = -1;
    else for (let t = 0; t < nTeams - 1; t++) r[t] = 1;
    r[nTeams - 1] = g.homeForm - g.awayForm;
    g.x.forEach((v, i) => { r[nTeams + i] = v; });
    return r;
  };
  let beta = new Array<number>(p).fill(0);
  for (let step = 0; step < 25; step++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (const g of games) {
      const r = row(g);
      const eta = r.reduce((s, v, i) => s + v * (beta[i] ?? 0), 0);
      const ph = logistic(eta);
      const res = g.y - ph;
      const wgt = ph * (1 - ph);
      for (let a = 0; a < p; a++) {
        grad[a] = (grad[a] ?? 0) + res * (r[a] ?? 0);
        for (let b = 0; b < p; b++) H[a]![b] = (H[a]?.[b] ?? 0) - wgt * (r[a] ?? 0) * (r[b] ?? 0);
      }
    }
    for (let a = 0; a < nTeams - 1; a++) {
      grad[a] = (grad[a] ?? 0) - lambda * (beta[a] ?? 0);
      H[a]![a] = (H[a]?.[a] ?? 0) - lambda;
    }
    for (let a = 0; a < p; a++) H[a]![a] = (H[a]?.[a] ?? 0) - 1e-6; // numerical ridge
    const delta = solveLinear(H, grad.map((v) => -v));
    let mx = 0;
    for (let a = 0; a < p; a++) {
      beta[a] = (beta[a] ?? 0) + (delta[a] ?? 0);
      mx = Math.max(mx, Math.abs(delta[a] ?? 0));
    }
    if (mx < 1e-9) break;
  }
  const strengths = [...beta.slice(0, nTeams - 1), -beta.slice(0, nTeams - 1).reduce((a, b) => a + b, 0)];
  return { strengths, formCoef: beta[nTeams - 1] ?? 0, fixedFx: beta.slice(nTeams) };
}
