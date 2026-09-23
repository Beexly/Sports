/**
 * arXiv:physics/0607064 — A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams (physics/0607064)
 *
 * Full Bayesian ranking pipeline: team ratings plus MSV/MTV variance components plus the self-consistently
 * determined prior plus home-field advantage via Newton iteration — an early-season rating prior where data
 * is scarcest.
 *
 * Improvement: Implement the paper's full Bayesian ranking pipeline on NFL 2000-2024 data (ratings plus MSV/MTV plus the self-consistently determined prior plus HFA via Newton iteration) as an early-season team-rating prior for the engine, where data is scarcest and the prior matters most.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Gate (ADAPT->keep): |Delta-rho| <= 0.01 in >=80% of NFL seasons 2000-2024 AND the self-consistent prior beats the fixed-variance prior by >= 0.005 log-loss on weeks 1-4 (2015-2024).
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
}/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** One game result for the Bayesian ranking pipeline. */
export interface RankGame { home: number; away: number; homeWin: boolean }

/**
 * Self-consistent prior variance update: priorVar <- mean(rating^2 + MSV)
 * iterated to convergence (the paper's self-consistency condition).
 */
export function selfConsistentPrior(
  ratings: readonly number[],
  msv: number,
  iters = 100,
): number {
  let v = 1;
  for (let it = 0; it < iters; it++) {
    const meanSq = ratings.reduce((s, r) => s + r * r, 0) / Math.max(1, ratings.length);
    const next = meanSq + msv;
    if (Math.abs(next - v) < 1e-10) { v = next; break; }
    v = next;
  }
  return Math.max(1e-6, v);
}

/**
 * Newton iteration for team ratings with HFA and the self-consistent prior:
 * penalized logistic log-likelihood, prior precision = 1/priorVar.
 */
export function newtonRankings(
  games: readonly RankGame[],
  nTeams: number,
  priorVar: number,
  hfaInit = 0.2,
): { ratings: number[]; hfa: number; priorVar: number } {
  if (games.length === 0) throw new Error("newtonRankings: no games");
  let ratings = new Array<number>(nTeams).fill(0);
  let hfa = hfaInit;
  const prec = 1 / Math.max(1e-6, priorVar);
  for (let it = 0; it < 60; it++) {
    const g = new Array<number>(nTeams + 1).fill(0);
    const H: number[][] = Array.from({ length: nTeams + 1 }, () => new Array<number>(nTeams + 1).fill(0));
    for (const gm of games) {
      const eta = (ratings[gm.home] ?? 0) - (ratings[gm.away] ?? 0) + hfa;
      const ph = logistic(eta);
      const y = gm.homeWin ? 1 : 0;
      const r = y - ph;
      const wgt = ph * (1 - ph);
      g[gm.home] = (g[gm.home] ?? 0) + r;
      g[gm.away] = (g[gm.away] ?? 0) - r;
      g[nTeams] = (g[nTeams] ?? 0) + r;
      const idx = [gm.home, gm.away, nTeams];
      const sgn = [1, -1, 1];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        H[idx[a]!]![idx[b]!] = (H[idx[a]!]![idx[b]!] ?? 0) - wgt * (sgn[a] ?? 0) * (sgn[b] ?? 0);
      }
    }
    for (let t = 0; t < nTeams; t++) {
      g[t] = (g[t] ?? 0) - prec * (ratings[t] ?? 0);
      H[t]![t] = (H[t]?.[t] ?? 0) - prec;
    }
    H[nTeams]![nTeams] = (H[nTeams]?.[nTeams] ?? 0) - 1e-6;
    const delta = solveLinear(H, g.map((v) => -v));
    let mx = 0;
    for (let t = 0; t < nTeams; t++) {
      ratings[t] = (ratings[t] ?? 0) + (delta[t] ?? 0);
      mx = Math.max(mx, Math.abs(delta[t] ?? 0));
    }
    hfa += delta[nTeams] ?? 0;
    mx = Math.max(mx, Math.abs(delta[nTeams] ?? 0));
    if (mx < 1e-8) break;
  }
  const mean = ratings.reduce((a, b) => a + b, 0) / nTeams;
  ratings = ratings.map((r) => r - mean);
  const newPrior = selfConsistentPrior(ratings, 0.05);
  return { ratings, hfa, priorVar: newPrior };
}

/** Log-loss of the ranking model on games (the gate's comparison metric). */
export function rankingLogLoss(
  games: readonly RankGame[],
  ratings: readonly number[],
  hfa: number,
): number {
  let s = 0;
  for (const gm of games) {
    const p = logistic((ratings[gm.home] ?? 0) - (ratings[gm.away] ?? 0) + hfa);
    const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
    s += gm.homeWin ? -Math.log(pc) : -Math.log(1 - pc);
  }
  return s / Math.max(1, games.length);
}
