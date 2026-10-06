/**
 * Extending the Dixon and Coles model: an application to women's football data
 *
 * arXiv:2307.02139v1 · lane:tracking · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Use the Sarmanov/ANS machinery as a challenger joint-distribution model for NFL exact scores and
 * totals: apply the framework to (home TDs, away TDs) bivariate counts from nflverse 2015-2025
 * with NB marginals and team attack/defence log-linear means (log(theta) = home + att + def, sum-
 * to-zero constraint on defence), fit by numerical MLE - the fitted joint pmf gives exact-score
 * probabilities -> derive totals and spread distributions that respect dependence (negative
 * correlation in low-scoring games), compared against GSE's current Skellam/independent baseline -
 * with time-weighted Sarmanov (reintroduce exponential time weighting into the MLE so recent
 * matches dominate) and covariate-driven omega (dependence as a function of game context: total
 * line, weather, divisional matchup).
 *
 * ACCEPTANCE GATE: Adopt the Sarmanov/ANS challenger only if: (a) the reproduction confirms the paper's mechanism
 * (ANS AIC-best on women's data, correlation range reproduced); AND (b) on the NFL TD-count
 * transfer, Sarmanov beats independent NB on out-of-sample mean per-game log-likelihood over
 * 2023-2025 with p < 0.05 (paired test), AND (c) implied-total calibration shows no degradation vs
 * the current production baseline.
 *
 * Ingest role: feature builder (Dixon-Coles goals model: rho correction + team attack/defence).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2307.02139v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the Sarmanov/ANS challenger only if: (a) the reproduction confirms the paper's mechanism
 * (ANS AIC-best on women's data, correlation range reproduced); AND (b) on the NFL TD-count
 * transfer, Sarmanov beats independent NB on out-of-sample mean per-game log-likelihood over
 * 2023-2025 with p < 0.05 (paired test), AND (c) implied-total calibration shows no degradation vs
 * the current production baseline.`;

export const CONFIG = {
  enabled: false,
  model: "Dixon-Coles",
  rhoRange: [-0.2, 0.2],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface GoalGame {
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export function isGoalGame(x: unknown): x is GoalGame {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["home"] === "string" &&
    typeof o["away"] === "string" &&
    Number.isInteger(o["homeGoals"]) && (o["homeGoals"] as number) >= 0 &&
    Number.isInteger(o["awayGoals"]) && (o["awayGoals"] as number) >= 0
  );
}

function poissonPMF(k: number, lam: number): number {
  if (lam <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lam) * Math.pow(lam, k)) / fact(k);
}

function fact(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Dixon-Coles tau correction for low scores. */
export function dcTau(x: number, y: number, lam: number, mu: number, rho: number): number | null {
  if (![x, y, lam, mu, rho].every(isFiniteNumber) || lam <= 0 || mu <= 0) return null;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return null;
  if (x === 0 && y === 0) return 1 - lam * mu * rho;
  if (x === 0 && y === 1) return 1 + lam * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

/** Match scoreline probability under Dixon-Coles. */
export function scorelineProb(
  x: number,
  y: number,
  lam: number,
  mu: number,
  rho: number,
): number | null {
  const tau = dcTau(x, y, lam, mu, rho);
  if (tau === null || tau <= 0) return null;
  return tau * poissonPMF(x, lam) * poissonPMF(y, mu);
}

/** Outcome probabilities by summing the scoreline grid. */
export function outcomeProbs(lam: number, mu: number, rho: number, maxGoals = 10): { home: number; draw: number; away: number } | null {
  if (![lam, mu, rho, maxGoals].every(isFiniteNumber) || lam <= 0 || mu <= 0 || !Number.isInteger(maxGoals) || maxGoals <= 0) return null;
  let h = 0;
  let d = 0;
  let a = 0;
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = scorelineProb(x, y, lam, mu, rho);
      if (p === null) return null;
      if (x > y) h += p;
      else if (x === y) d += p;
      else a += p;
    }
  }
  const tot = h + d + a;
  if (tot === 0) return null;
  return { home: h / tot, draw: d / tot, away: a / tot };
}

/** Attack/defence MLE via alternating updates (small leagues). */
export function attackDefence(
  games: readonly unknown[],
  teams: readonly string[],
  iters = 200,
): { attack: Record<string, number>; defence: Record<string, number>; rho: number } | null {
  const v: GoalGame[] = [];
  for (const g of games) if (isGoalGame(g)) v.push(g);
  if (v.length === 0 || teams.length === 0) return null;
  const attack: Record<string, number> = {};
  const defence: Record<string, number> = {};
  for (const t of teams) {
    attack[t] = 0;
    defence[t] = 0;
  }
  for (let it = 0; it < iters; it++) {
    const aNum: Record<string, number> = {};
    const aDen: Record<string, number> = {};
    const dNum: Record<string, number> = {};
    const dDen: Record<string, number> = {};
    for (const t of teams) {
      aNum[t] = 0; aDen[t] = 0; dNum[t] = 0; dDen[t] = 0;
    }
    for (const g of v) {
      const lam = Math.exp(0.2 + (attack[g.home] ?? 0) - (defence[g.away] ?? 0));
      const mu = Math.exp((attack[g.away] ?? 0) - (defence[g.home] ?? 0));
      aNum[g.home] = (aNum[g.home] ?? 0) + g.homeGoals;
      aDen[g.home] = (aDen[g.home] ?? 0) + lam * Math.exp(-((attack[g.home] ?? 0)));
      dNum[g.away] = (dNum[g.away] ?? 0) + g.homeGoals;
      dDen[g.away] = (dDen[g.away] ?? 0) + lam * Math.exp((defence[g.away] ?? 0));
      aNum[g.away] = (aNum[g.away] ?? 0) + g.awayGoals;
      aDen[g.away] = (aDen[g.away] ?? 0) + mu * Math.exp(-((attack[g.away] ?? 0)));
      dNum[g.home] = (dNum[g.home] ?? 0) + g.awayGoals;
      dDen[g.home] = (dDen[g.home] ?? 0) + mu * Math.exp((defence[g.home] ?? 0));
    }
    for (const t of teams) {
      if ((aDen[t] ?? 0) > 0) attack[t] = Math.log(Math.max(1e-6, (aNum[t] ?? 0) / (aDen[t] ?? 1)));
      if ((dDen[t] ?? 0) > 0) defence[t] = Math.log(Math.max(1e-6, (dNum[t] ?? 0) / (dDen[t] ?? 1)));
    }
    const ma = teams.reduce((s, t) => s + (attack[t] ?? 0), 0) / teams.length;
    for (const t of teams) attack[t] = (attack[t] ?? 0) - ma;
  }
  return { attack, defence, rho: 0 };
}
