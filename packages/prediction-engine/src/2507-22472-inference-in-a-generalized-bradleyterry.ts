/**
 * arXiv:2507.22472 — Inference in a generalized Bradley-Terry model for paired comparisons with covariates and a growing number of subjects
 *
 * Generalized (covariate) Bradley-Terry for team ratings: merits plus home/rest/travel/QB-change/dome
 * covariates, refit weekly with joint Newton-Raphson on the merit vector and the covariate block.
 *
 * Improvement: GSE replaces its plain Bradley-Terry/Elo win-probability core with CBTM: team merits plus covariates (home, rest differential, travel miles, QB-change flag, dome/outdoor mismatch), refit weekly with Ford fixed-point + Newton-Raphson sweeps.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: On the NFL 2019-2023 walk-forward test, CBTM log-loss must beat plain BT by >=0.01 and must not lose to the current rating model; home-effect coefficient significant (|gamma|/SE>3) in >=4 of 5 seasons.
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

/** One game for the covariate Bradley-Terry fit. */
export interface BtGame {
  home: number; // team index
  away: number;
  homeWin: boolean;
  /** Covariate vector (home, restDiff, travelMiles/1000, qbChange, domeMismatch). */
  x: number[];
}

/**
 * Joint Newton-Raphson fit of merits and covariate coefficients gamma.
 * The logistic log-likelihood is concave; merits[0] is pinned at 0 for
 * identifiability and the returned merits are mean-centered.
 */
export function fitCovariateBt(
  games: readonly BtGame[],
  nTeams: number,
  iters = 60,
): { merits: number[]; gamma: number[] } {
  if (games.length === 0) throw new Error("fitCovariateBt: no games");
  const p = games[0]?.x.length ?? 0;
  const d = nTeams - 1 + p; // free params: merits[1..], gamma
  const theta = new Array<number>(d).fill(0);
  const meritOf = (t: number): number => (t === 0 ? 0 : theta[t - 1] ?? 0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(d).fill(0);
    const H: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
    for (const g of games) {
      let eta = meritOf(g.home) - meritOf(g.away);
      for (let a = 0; a < p; a++) eta += (g.x[a] ?? 0) * (theta[nTeams - 1 + a] ?? 0);
      const ph = logistic(eta);
      const r = (g.homeWin ? 1 : 0) - ph;
      const wgt = ph * (1 - ph);
      const idx: number[] = [];
      const val: number[] = [];
      if (g.home !== 0) { idx.push(g.home - 1); val.push(1); }
      if (g.away !== 0) { idx.push(g.away - 1); val.push(-1); }
      for (let a = 0; a < p; a++) { idx.push(nTeams - 1 + a); val.push(g.x[a] ?? 0); }
      for (let i = 0; i < idx.length; i++) {
        grad[idx[i]!] = (grad[idx[i]!] ?? 0) + r * (val[i] ?? 0);
        for (let j = 0; j < idx.length; j++) {
          H[idx[i]!]![idx[j]!] =
            (H[idx[i]!]?.[idx[j]!] ?? 0) - wgt * (val[i] ?? 0) * (val[j] ?? 0);
        }
      }
    }
    for (let a = 0; a < d; a++) H[a]![a] = (H[a]?.[a] ?? 0) - 1e-6;
    const delta = solveLinear(H, grad.map((v) => -v));
    let maxD = 0;
    for (let a = 0; a < d; a++) {
      theta[a] = (theta[a] ?? 0) + (delta[a] ?? 0);
      maxD = Math.max(maxD, Math.abs(delta[a] ?? 0));
    }
    if (maxD < 1e-8) break;
  }
  const merits = Array.from({ length: nTeams }, (_, t) => meritOf(t));
  const mean = merits.reduce((a, b) => a + b, 0) / nTeams;
  return { merits: merits.map((m) => m - mean), gamma: theta.slice(nTeams - 1) };
}

/** Win probability for a matchup under the covariate BT model. */
export function covariateBtProb(
  merits: readonly number[],
  gamma: readonly number[],
  home: number,
  away: number,
  x: readonly number[],
): number {
  const lin = x.reduce((s, v, i) => s + v * (gamma[i] ?? 0), 0);
  return logistic((merits[home] ?? 0) - (merits[away] ?? 0) + lin);
}
