/**
 * Regime-conditional team strength: fusion-regularized covariate Bradley-Terry
 *
 * Research port: arXiv:2606.07492
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's covariate BT: weekly win matrices with covariates
 * (rest differential, dome/outdoor, wind bucket, QB-missing flag) fit to get
 * per-team logit beta_{i0} + <x, beta_i>. Fusion regularization (L2 penalty
 * on pairwise differences of team coefficient vectors — the paper's fusion
 * penalty operationalized in its ridge form) keeps regime effects shared
 * across similar teams. The transitive-triplet ratio of weekly implied
 * rankings is the standing model-selection metric. Optimization is gradient
 * ascent with backtracking (the paper's L-BFGS-B is the production choice;
 * the objective and metric are identical).
 *
 * ACCEPTANCE GATE: Adopt the covariate-BT component if, on the 2022-2024
 * rolling test seasons, it beats the static-BT baseline by >= 0.01 log-loss
 * per game AND achieves a higher transitive-triplet ratio on weekly implied
 * rankings, with no worse top-3 overlap.
 */

export interface CovariateGame {
  home: string;
  away: string;
  homeWon: boolean;
  /** rest differential: home rest days minus away rest days */
  restDiff: number;
  /** 1 if dome/retractable roof, else 0 */
  dome: number;
  /** wind bucket: 0 calm, 1 moderate, 2 high */
  wind: number;
  /** 1 if either starting QB is missing, else 0 */
  qbMissing: number;
}

export const COVARIATE_NAMES = ["restDiff", "dome", "wind", "qbMissing"] as const;

function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function covariates(g: CovariateGame): number[] {
  return [g.restDiff / 7, g.dome, g.wind / 2, g.qbMissing];
}

export interface CovariateFit {
  /** team -> [intercept, ...covariate coefficients] */
  beta: Map<string, number[]>;
  logLikelihood: number;
  /** L2 fusion penalty weight used */
  fusionLambda: number;
}

/**
 * Fit fusion-regularized covariate BT. logit(home win) =
 * (b_h0 - b_a0) + <x, b_h[1:] - b_a[1:]>, penalized by
 * fusionLambda * sum_{i<j} ||b_i - b_j||^2.
 */
export function fitCovariateBT(
  games: CovariateGame[],
  teams: string[],
  fusionLambda = 1,
  iters = 300,
): CovariateFit {
  const dim = 1 + COVARIATE_NAMES.length;
  const beta = new Map<string, number[]>(teams.map((t) => [t, new Array<number>(dim).fill(0)]));
  const grad = new Map<string, number[]>();
  let prev = penalizedLl(games, teams, beta, fusionLambda);
  for (let it = 0; it < iters; it++) {
    for (const t of teams) grad.set(t, new Array<number>(dim).fill(0));
    for (const g of games) {
      const bh = beta.get(g.home) ?? [];
      const ba = beta.get(g.away) ?? [];
      const x = covariates(g);
      let logit = (bh[0] ?? 0) - (ba[0] ?? 0);
      for (let k = 0; k < x.length; k++) logit += (x[k] ?? 0) * ((bh[k + 1] ?? 0) - (ba[k + 1] ?? 0));
      const p = sigma(logit);
      const r = (g.homeWon ? 1 : 0) - p;
      const gh = grad.get(g.home);
      const ga = grad.get(g.away);
      if (!gh || !ga) continue;
      gh[0] = (gh[0] ?? 0) + r;
      ga[0] = (ga[0] ?? 0) - r;
      for (let k = 0; k < x.length; k++) {
        const xk = x[k] ?? 0;
        gh[k + 1] = (gh[k + 1] ?? 0) + r * xk;
        ga[k + 1] = (ga[k + 1] ?? 0) - r * xk;
      }
    }
    // fusion penalty gradient: 2*lambda*sum_{j != i} (b_i - b_j)
    if (fusionLambda > 0) {
      for (const t of teams) {
        const bt = beta.get(t) ?? [];
        const gt = grad.get(t);
        if (!gt) continue;
        for (const o of teams) {
          if (o === t) continue;
          const bo = beta.get(o) ?? [];
          for (let k = 0; k < dim; k++) {
            gt[k] = (gt[k] ?? 0) - 2 * fusionLambda * ((bt[k] ?? 0) - (bo[k] ?? 0));
          }
        }
      }
    }
    let step = 0.5;
    let improved = false;
    for (let ls = 0; ls < 12; ls++) {
      const trial = new Map<string, number[]>();
      for (const t of teams) {
        const bt = beta.get(t) ?? [];
        const gt = grad.get(t) ?? [];
        trial.set(t, bt.map((v, k) => v + step * (gt[k] ?? 0)));
      }
      // center intercepts for identifiability
      const m = teams.reduce((s, t) => s + ((trial.get(t) ?? [])[0] ?? 0), 0) / Math.max(teams.length, 1);
      for (const t of teams) {
        const bt = trial.get(t) ?? [];
        bt[0] = (bt[0] ?? 0) - m;
      }
      const ll = penalizedLl(games, teams, trial, fusionLambda);
      if (ll > prev) {
        for (const t of teams) beta.set(t, trial.get(t) ?? []);
        prev = ll;
        improved = true;
        break;
      }
      step *= 0.5;
    }
    if (!improved) break;
  }
  return { beta, logLikelihood: prev, fusionLambda };
}

function penalizedLl(
  games: CovariateGame[],
  teams: string[],
  beta: Map<string, number[]>,
  fusionLambda: number,
): number {
  let ll = 0;
  for (const g of games) {
    const bh = beta.get(g.home) ?? [];
    const ba = beta.get(g.away) ?? [];
    const x = covariates(g);
    let logit = (bh[0] ?? 0) - (ba[0] ?? 0);
    for (let k = 0; k < x.length; k++) logit += (x[k] ?? 0) * ((bh[k + 1] ?? 0) - (ba[k + 1] ?? 0));
    const p = sigma(logit);
    ll += g.homeWon ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12));
  }
  if (fusionLambda > 0) {
    const dim = 1 + COVARIATE_NAMES.length;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const bi = beta.get(teams[i] ?? "") ?? [];
        const bj = beta.get(teams[j] ?? "") ?? [];
        for (let k = 0; k < dim; k++) {
          const d = (bi[k] ?? 0) - (bj[k] ?? 0);
          ll -= fusionLambda * d * d;
        }
      }
    }
  }
  return ll;
}

/** Mean SU log-loss of a covariate fit on games. */
export function covariateLogLoss(fit: CovariateFit, games: CovariateGame[]): number {
  if (games.length === 0) return Number.NaN;
  let s = 0;
  for (const g of games) {
    const bh = fit.beta.get(g.home) ?? [];
    const ba = fit.beta.get(g.away) ?? [];
    const x = covariates(g);
    let logit = (bh[0] ?? 0) - (ba[0] ?? 0);
    for (let k = 0; k < x.length; k++) logit += (x[k] ?? 0) * ((bh[k + 1] ?? 0) - (ba[k + 1] ?? 0));
    const p = sigma(logit);
    const y = g.homeWon ? 1 : 0;
    s += -(y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12)));
  }
  return s / games.length;
}

/** Implied weekly ranking: teams sorted by intercept (neutral-regime strength). */
export function impliedRanking(fit: CovariateFit, teams: string[]): string[] {
  return [...teams].sort(
    (a, b) => ((fit.beta.get(b) ?? [])[0] ?? 0) - ((fit.beta.get(a) ?? [])[0] ?? 0),
  );
}

export interface TripletWeek {
  ranking: string[];
  games: CovariateGame[];
}

/**
 * Transitive-triplet ratio: over team triples with at least one head-to-head
 * game that week, the fraction whose observed results are acyclic AND agree
 * with the ranking order (higher-ranked team won every game among the three).
 */
export function transitiveTripletRatio(weeks: TripletWeek[]): number {
  let transitive = 0;
  let total = 0;
  for (const w of weeks) {
    const rank = new Map(w.ranking.map((t, i) => [t, i]));
    const teams = w.ranking;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (let k = j + 1; k < teams.length; k++) {
          const trio = [teams[i] ?? "", teams[j] ?? "", teams[k] ?? ""];
          const among = w.games.filter(
            (g) => trio.includes(g.home) && trio.includes(g.away),
          );
          if (among.length === 0) continue;
          total++;
          // check for a directed cycle in observed results
          const beats = new Map<string, Set<string>>();
          for (const t of trio) beats.set(t, new Set());
          for (const g of among) {
            const winner = g.homeWon ? g.home : g.away;
            const loser = g.homeWon ? g.away : g.home;
            beats.get(winner)?.add(loser);
          }
          const [t0 = "", t1 = "", t2 = ""] = trio;
          const hasCycle =
            (beats.get(t0)?.has(t1) && beats.get(t1)?.has(t2) && beats.get(t2)?.has(t0)) ||
            (beats.get(t0)?.has(t2) && beats.get(t2)?.has(t1) && beats.get(t1)?.has(t0));
          if (hasCycle) continue;
          const agrees = among.every((g) => {
            const winner = g.homeWon ? g.home : g.away;
            const loser = g.homeWon ? g.away : g.home;
            return (rank.get(winner) ?? 0) < (rank.get(loser) ?? 0);
          });
          if (agrees) transitive++;
        }
      }
    }
  }
  return total === 0 ? Number.NaN : transitive / total;
}

/** Top-3 overlap between two rankings. */
export function top3Overlap(a: string[], b: string[]): number {
  const sa = new Set(a.slice(0, 3));
  return b.slice(0, 3).filter((t) => sa.has(t)).length / 3;
}

export const GSE_COVARIATE_BT_ENABLED = false;
