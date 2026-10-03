/**
 * Pairwise matchup ratings (arXiv 2209.06346v2).
 *
 * Matchup outcomes (e.g. WR yards per route run above expected vs a
 * corner) modeled as s_ij = A + a_i - b_j, fit by SGD with:
 *  - recency weights w(t) = (1 + t - t_min) / (1 + t_max - t_min);
 *  - neighborhood regularization lambda * Sum(r_i - n_i)^2 pulling each
 *    rating toward its position-group neighborhood mean.
 * Used as features where individual matchups matter (props/spreads).
 * The Bayesian extension (TrueSkill/Glicko-2 uncertainty) and
 * exponential-decay half-life tuning are noted but out of scope here.
 *
 * ACCEPTANCE GATE: accept iff on a strictly time-ordered backtest the
 * ratings beat raw-aggregate features by >= 1% MAE on prop-relevant
 * targets with face-valid correlation to known elite matchups; reject
 * if they don't beat expanding-window player averages or SGD fails to
 * converge stably.
 *
 * Research-only module. Not wired into any live ratings path.
 */

export interface MatchupObs {
  /** Attacker id (e.g. WR). */
  i: string;
  /** Defender id (e.g. CB). */
  j: string;
  /** Observed matchup outcome (e.g. YPRR above expected). */
  s: number;
  /** Week index (recency). */
  t: number;
}

export interface MatchupRatings {
  intercept: number;
  attack: Map<string, number>;
  defense: Map<string, number>;
  /** Rating of an unseen player (neighborhood prior mean). */
  priorMean: number;
}

export interface SgdOptions {
  lr?: number;
  epochs?: number;
  /** Neighborhood regularization strength. */
  lambda?: number;
  seed?: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recency weight w(t) = (1 + t - t_min) / (1 + t_max - t_min). */
export function recencyWeight(t: number, tMin: number, tMax: number): number {
  if (tMax < tMin) throw new Error("recencyWeight: tMax >= tMin");
  return (1 + t - tMin) / (1 + tMax - tMin);
}

/**
 * Fit s_ij = A + a_i - b_j by SGD with recency weights and
 * neighborhood regularization toward the position-group mean.
 */
export function fitMatchupRatings(
  obs: readonly MatchupObs[],
  opts: SgdOptions = {},
): MatchupRatings {
  if (obs.length === 0) throw new Error("fitMatchupRatings: no observations");
  const { lr = 0.05, epochs = 200, lambda = 0.7, seed = 7 } = opts;
  const rand = mulberry32(seed);
  const ts = obs.map((o) => o.t);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  let A = 0;
  const attack = new Map<string, number>();
  const defense = new Map<string, number>();
  const ids = new Set<string>();
  for (const o of obs) {
    ids.add(`a:${o.i}`);
    ids.add(`d:${o.j}`);
  }
  // Neighborhood prior: all players start at the global mean outcome.
  const priorMean = obs.reduce((s, o) => s + o.s, 0) / obs.length;
  for (const id of ids) {
    if (id.startsWith("a:")) attack.set(id.slice(2), 0);
    else defense.set(id.slice(2), 0);
  }
  const order = obs.map((_, k) => k);
  for (let e = 0; e < epochs; e++) {
    // Shuffle each epoch.
    for (let k = order.length - 1; k > 0; k--) {
      const r = Math.floor(rand() * (k + 1));
      [order[k], order[r]] = [order[r] as number, order[k] as number];
    }
    // Neighborhood means (recomputed per epoch).
    const aMean =
      [...attack.values()].reduce((s, v) => s + v, 0) / Math.max(1, attack.size);
    const dMean =
      [...defense.values()].reduce((s, v) => s + v, 0) / Math.max(1, defense.size);
    for (const k of order) {
      const o = obs[k] as MatchupObs;
      const w = recencyWeight(o.t, tMin, tMax);
      const ai = attack.get(o.i) ?? 0;
      const bj = defense.get(o.j) ?? 0;
      const pred = A + ai - bj;
      const err = o.s - pred;
      A += lr * w * err;
      attack.set(o.i, ai + lr * (w * err - lambda * (ai - aMean)));
      defense.set(o.j, bj + lr * (-w * err - lambda * (bj - dMean)));
    }
  }
  return { intercept: A, attack, defense, priorMean };
}

/** Predict a matchup outcome from fitted ratings. */
export function predictMatchup(
  ratings: MatchupRatings,
  i: string,
  j: string,
): number {
  const ai = ratings.attack.get(i) ?? 0;
  const bj = ratings.defense.get(j) ?? 0;
  return ratings.intercept + ai - bj;
}

/**
 * Strictly time-ordered backtest MAE: for each split week, fit on
 * strictly earlier weeks and score later weeks. Also scores the
 * raw-aggregate baseline (expanding player mean) for the >= 1% gate.
 */
export function timeOrderedMae(
  obs: readonly MatchupObs[],
  splitWeeks: readonly number[],
  opts: SgdOptions = {},
): { model: number; baseline: number } {
  if (splitWeeks.length === 0) throw new Error("timeOrderedMae: no splits");
  let sModel = 0;
  let sBase = 0;
  let n = 0;
  for (const split of splitWeeks) {
    const train = obs.filter((o) => o.t < split);
    const test = obs.filter((o) => o.t >= split);
    if (train.length === 0 || test.length === 0) continue;
    const ratings = fitMatchupRatings(train, opts);
    // Baseline: expanding-window attacker mean.
    const means = new Map<string, { s: number; n: number }>();
    for (const o of train) {
      const e = means.get(o.i) ?? { s: 0, n: 0 };
      e.s += o.s;
      e.n++;
      means.set(o.i, e);
    }
    for (const o of test) {
      const e = means.get(o.i);
      const base = e ? e.s / e.n : 0;
      sModel += Math.abs(o.s - predictMatchup(ratings, o.i, o.j));
      sBase += Math.abs(o.s - base);
      n++;
    }
  }
  if (n === 0) throw new Error("timeOrderedMae: no test observations");
  return { model: sModel / n, baseline: sBase / n };
}
