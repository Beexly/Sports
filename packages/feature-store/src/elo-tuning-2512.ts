/**
 * Empirical Elo parameterization: K grid tuning + rating-diff to win-probability map
 *
 * Research port: arXiv:2512.18013
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure Elo tuning harness from the paper: grid-search K over training
 * histories, walk-forward proper-score evaluation (Brier / log-loss) on the
 * holdout window, and an empirical rating-difference -> win-probability map
 * fit by isotonic binning. Reports whether the tuned config beats convention
 * Elo by >=0.002 Brier and whether the empirical map is monotone and within
 * +/-3pp of the theoretical logistic curve across rating diffs.
 *
 * ACCEPTANCE GATE: ADOPT the empirically tuned K/config if walk-forward
 * Brier on 2016-2025 improves on convention Elo by >=0.002 AND the empirical
 * expected-score map is monotone and within +/-3pp of the theoretical curve
 * across rating diffs.
 */

export interface EloGame {
  home: string;
  away: string;
  homeWon: boolean;
  /** neutral-site or HFA handling is the operator's choice; Elo is HFA-free here */
}

export interface EloTuneResult {
  k: number;
  brier: number;
  logLoss: number;
  games: number;
}

function expectedScore(ratingDiff: number): number {
  return 1 / (1 + Math.pow(10, -ratingDiff / 400));
}

/** Run Elo through a game list with fixed K; returns Brier and log-loss. */
export function evaluateK(games: EloGame[], k: number, initialRating = 1500): EloTuneResult {
  const ratings = new Map<string, number>();
  const get = (t: string): number => ratings.get(t) ?? initialRating;
  let brier = 0;
  let ll = 0;
  let n = 0;
  for (const g of games) {
    const rh = get(g.home);
    const ra = get(g.away);
    const p = expectedScore(rh - ra);
    const y = g.homeWon ? 1 : 0;
    brier += (p - y) * (p - y);
    ll += -(y * Math.log(Math.max(p, 1e-9)) + (1 - y) * Math.log(Math.max(1 - p, 1e-9)));
    n++;
    ratings.set(g.home, rh + k * (y - p));
    ratings.set(g.away, ra + k * ((1 - y) - (1 - p)));
  }
  return { k, brier: n === 0 ? Number.NaN : brier / n, logLoss: n === 0 ? Number.NaN : ll / n, games: n };
}

/** Grid-search K on the training histories; convention K=20 baseline included. */
export function tuneK(train: EloGame[], kGrid: number[]): EloTuneResult[] {
  return kGrid
    .map((k) => evaluateK(train, k))
    .sort((a, b) => a.brier - b.brier);
}

export interface EmpiricalMapPoint {
  diffMid: number;
  empiricalP: number;
  theoreticalP: number;
  n: number;
}

export interface EmpiricalMapCheck {
  points: EmpiricalMapPoint[];
  monotone: boolean;
  maxAbsDeviation: number;
  within3pp: boolean;
}

/**
 * Empirical rating-diff -> win-probability map: bin holdout games by rating
 * diff (from a frozen rating snapshot), compare bin win rates to the
 * theoretical logistic curve.
 */
export function empiricalWinProbMap(
  games: EloGame[],
  ratings: Map<string, number>,
  binWidth = 50,
): EmpiricalMapCheck {
  const bins = new Map<number, { wins: number; n: number }>();
  for (const g of games) {
    const diff = (ratings.get(g.home) ?? 1500) - (ratings.get(g.away) ?? 1500);
    const key = Math.round(diff / binWidth) * binWidth;
    const b = bins.get(key) ?? { wins: 0, n: 0 };
    b.n++;
    if (g.homeWon) b.wins++;
    bins.set(key, b);
  }
  const points: EmpiricalMapPoint[] = [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([diffMid, b]) => ({
      diffMid,
      empiricalP: b.wins / b.n,
      theoreticalP: expectedScore(diffMid),
      n: b.n,
    }));
  let monotone = true;
  for (let i = 1; i < points.length; i++) {
    if ((points[i]?.empiricalP ?? 0) < (points[i - 1]?.empiricalP ?? 0)) {
      monotone = false;
      break;
    }
  }
  const maxAbsDeviation = points.reduce(
    (m, p) => Math.max(m, Math.abs(p.empiricalP - p.theoreticalP)),
    0,
  );
  return { points, monotone, maxAbsDeviation, within3pp: maxAbsDeviation <= 0.03 };
}

export interface TuneGate {
  bestK: number;
  baselineBrier: number;
  bestBrier: number;
  improvement: number;
  map: EmpiricalMapCheck;
  adopt: boolean;
}

/** Full gate: tune on train, evaluate on walk-forward holdout, check the map. */
export function eloTuneGate(
  train: EloGame[],
  holdout: EloGame[],
  kGrid: number[],
  conventionK = 20,
): TuneGate {
  const tuned = tuneK(train, kGrid);
  const best = tuned[0] ?? { k: conventionK, brier: Number.NaN, logLoss: Number.NaN, games: 0 };
  const baseline = evaluateK(holdout, conventionK);
  const bestHoldout = evaluateK(holdout, best.k);
  // Frozen ratings for the empirical map: run best-K Elo over train, then map holdout.
  const ratings = new Map<string, number>();
  const get = (t: string): number => ratings.get(t) ?? 1500;
  for (const g of train) {
    const rh = get(g.home);
    const ra = get(g.away);
    const p = expectedScore(rh - ra);
    const y = g.homeWon ? 1 : 0;
    ratings.set(g.home, rh + best.k * (y - p));
    ratings.set(g.away, ra + best.k * ((1 - y) - (1 - p)));
  }
  const map = empiricalWinProbMap(holdout, ratings);
  const improvement = baseline.brier - bestHoldout.brier;
  const adopt =
    Number.isFinite(improvement) && improvement >= 0.002 && map.monotone && map.within3pp;
  return {
    bestK: best.k,
    baselineBrier: baseline.brier,
    bestBrier: bestHoldout.brier,
    improvement,
    map,
    adopt,
  };
}

export const GSE_ELO_TUNING_ENABLED = false;
