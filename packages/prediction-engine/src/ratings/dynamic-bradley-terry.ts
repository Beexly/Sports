/**
 * Nonparametric dynamic Bradley-Terry ratings (arXiv 2003.00083).
 *
 * Kernel-smoothed dynamic BT: at each target week, weight games by a Gaussian
 * kernel in time, K((week - gameWeek) / h), and fit a Bradley-Terry model by
 * penalized logistic regression on team indicators. The bandwidth h is tuned
 * by leave-one-out cross-validated log-likelihood. The existence-condition
 * guardrail refuses to fit when the weighted comparison graph is degenerate
 * (a team with only wins or only losses has no finite MLE) and widens the
 * bandwidth instead.
 *
 * Serves as the "dumb" power-rating baseline every feature-rich engine
 * rating must beat on LOO log-likelihood and rank displacement, and as GSE's
 * smoothing primitive (LOOCV bandwidth discipline) for team-strength curves.
 *
 * ACCEPTANCE GATE: ADAPT as the minimalist benchmark — its value is the
 * "dumb baseline that feature-rich models must beat" plus the transferable
 * LOOCV bandwidth discipline and existence-condition guardrail.
 *
 * Research-only module. Not wired into any live ratings path.
 */

export interface BTGame {
  week: number;
  home: string;
  away: string;
  /** True when the home team won. */
  homeWin: boolean;
}

export interface BTFit {
  week: number;
  bandwidth: number;
  /** Team -> strength (sum-to-zero identified). */
  ratings: Record<string, number>;
  /** Effective sample size (sum of kernel weights). */
  effN: number;
}

function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

function teamList(games: readonly BTGame[]): string[] {
  const s = new Set<string>();
  for (const g of games) {
    s.add(g.home);
    s.add(g.away);
  }
  return [...s].sort();
}

/**
 * Existence condition: every team must have at least one weighted win and
 * one weighted loss (else the MLE is not finite). Returns the offending
 * teams, or an empty array when the condition holds.
 */
export function existenceViolations(
  games: readonly BTGame[],
  weights: readonly number[],
  minWeight = 1e-6,
): string[] {
  const wsum: Record<string, number> = {};
  const lsum: Record<string, number> = {};
  for (let i = 0; i < games.length; i++) {
    const g = games[i] as BTGame;
    const w = weights[i] ?? 0;
    if (w < minWeight) continue;
    const winner = g.homeWin ? g.home : g.away;
    const loser = g.homeWin ? g.away : g.home;
    wsum[winner] = (wsum[winner] ?? 0) + w;
    lsum[loser] = (lsum[loser] ?? 0) + w;
    wsum[loser] = wsum[loser] ?? 0;
    lsum[winner] = lsum[winner] ?? 0;
  }
  const bad: string[] = [];
  for (const t of Object.keys(wsum)) {
    if ((wsum[t] ?? 0) < minWeight || (lsum[t] ?? 0) < minWeight) bad.push(t);
  }
  return bad.sort();
}

/** Gaussian kernel weights of games around a target week. */
export function kernelWeights(
  games: readonly BTGame[],
  week: number,
  h: number,
): number[] {
  if (h <= 0) throw new Error("kernelWeights: bandwidth must be positive");
  return games.map((g) => {
    const z = (g.week - week) / h;
    return Math.exp(-0.5 * z * z);
  });
}

/**
 * Fit weighted Bradley-Terry at one target week by Newton's method on team
 * strengths (sum-to-zero via a tiny ridge on the centered parametrization).
 * Returns null when the existence condition fails.
 */
export function fitDynamicBT(
  games: readonly BTGame[],
  week: number,
  h: number,
  opts: { iters?: number; ridge?: number } = {},
): BTFit | null {
  if (games.length === 0) return null;
  const weights = kernelWeights(games, week, h);
  if (existenceViolations(games, weights).length > 0) return null;
  const teams = teamList(games);
  const idx: Record<string, number> = {};
  teams.forEach((t, i) => {
    idx[t] = i;
  });
  const n = teams.length;
  const ridge = opts.ridge ?? 1e-6;
  const iters = opts.iters ?? 100;
  let r = new Array<number>(n).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(n).fill(0);
    for (let i = 0; i < games.length; i++) {
      const g = games[i] as BTGame;
      const w = weights[i] ?? 0;
      if (w < 1e-12) continue;
      const ih = idx[g.home] as number;
      const ia = idx[g.away] as number;
      const p = sigmoid((r[ih] ?? 0) - (r[ia] ?? 0));
      const resid = (g.homeWin ? 1 : 0) - p;
      const v = Math.max(1e-9, p * (1 - p));
      grad[ih] = (grad[ih] ?? 0) + w * resid;
      grad[ia] = (grad[ia] ?? 0) - w * resid;
      void v;
    }
    // Diagonal Newton step with ridge (identifies the level).
    let maxStep = 0;
    for (let t = 0; t < n; t++) {
      let hess = ridge;
      for (let i = 0; i < games.length; i++) {
        const g = games[i] as BTGame;
        const w = weights[i] ?? 0;
        if (w < 1e-12) continue;
        const ih = idx[g.home] as number;
        const ia = idx[g.away] as number;
        if (ih !== t && ia !== t) continue;
        const p = sigmoid((r[ih] ?? 0) - (r[ia] ?? 0));
        hess += w * Math.max(1e-9, p * (1 - p));
      }
      const step = ((grad[t] ?? 0) - ridge * (r[t] ?? 0)) / hess;
      r[t] = (r[t] ?? 0) + step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    // Re-center (sum-to-zero identification).
    const m = r.reduce((a, v) => a + v, 0) / n;
    r = r.map((v) => v - m);
    if (maxStep < 1e-10) break;
  }
  const ratings: Record<string, number> = {};
  teams.forEach((t, i) => {
    ratings[t] = r[i] ?? 0;
  });
  return { week, bandwidth: h, ratings, effN: weights.reduce((a, w) => a + w, 0) };
}

/** Log-likelihood of games under a rating map (for LOO scoring). */
function logLik(games: readonly BTGame[], ratings: Record<string, number>): number {
  let s = 0;
  for (const g of games) {
    const p = sigmoid((ratings[g.home] ?? 0) - (ratings[g.away] ?? 0));
    const c = Math.min(1 - 1e-12, Math.max(1e-12, p));
    s += g.homeWin ? Math.log(c) : Math.log(1 - c);
  }
  return s;
}

/**
 * Leave-one-out cross-validated log-likelihood of the dynamic BT at a
 * bandwidth: each game is scored under the fit on all other games evaluated
 * at that game's own week (the paper's dynamic LOO protocol).
 */
export function looLogLik(games: readonly BTGame[], h: number): number {
  if (games.length < 2) throw new Error("looLogLik: need >= 2 games");
  let s = 0;
  let counted = 0;
  for (let i = 0; i < games.length; i++) {
    const g = games[i] as BTGame;
    const rest = games.filter((_, j) => j !== i);
    const fit = fitDynamicBT(rest, g.week, h);
    if (!fit) continue;
    const p = sigmoid((fit.ratings[g.home] ?? 0) - (fit.ratings[g.away] ?? 0));
    const c = Math.min(1 - 1e-12, Math.max(1e-12, p));
    s += g.homeWin ? Math.log(c) : Math.log(1 - c);
    counted++;
  }
  if (counted === 0) throw new Error("looLogLik: no valid LOO fits (existence failures)");
  return s / counted;
}

/**
 * Tune the bandwidth by LOO log-likelihood over a candidate grid. When the
 * smallest bandwidths fail the existence condition, they are skipped (the
 * guardrail widens h automatically).
 */
export function tuneBandwidthLOOCV(
  games: readonly BTGame[],
  candidates: readonly number[],
): { h: number; scores: { h: number; loo: number }[] } {
  if (candidates.length === 0) throw new Error("tuneBandwidthLOOCV: no candidates");
  const scores: { h: number; loo: number }[] = [];
  for (const h of candidates) {
    try {
      scores.push({ h, loo: looLogLik(games, h) });
    } catch {
      continue;
    }
  }
  if (scores.length === 0) throw new Error("tuneBandwidthLOOCV: all candidates failed");
  let best = scores[0] as { h: number; loo: number };
  for (const s of scores) if (s.loo > best.loo) best = s;
  return { h: best.h, scores };
}
