/**
 * Measuring Spatial Allocative Efficiency in Basketball
 *
 * arXiv:1912.05129v2 · lane:team_ratings · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Elo ratings on the 400-point scale with logistic win probabilities, zero-sum updates scaled by K, a
 * 538-style margin-of-victory multiplier that damps blowouts by the pre-game Elo gap, and weighted
 * blending across rating systems.
 *
 * Improvement (wiring record): Add an NFL Target Allocation Efficiency (TAE) metric: per team-week (rolling 4-week), rank receivers
 * by efficiency (EPA/target) and by allocation (target share/TPRR) within route-depth x field-zone
 * cells, compute rank correspondence and an NFL LPL (expected EPA lost vs rank-matched optimal
 * allocation), with player-level TPC apportioned by target deviation -- for weekly props and coaching
 * content.
 *
 * ACCEPTANCE GATE: ADAPT to a weekly props/coaching metric if, on 2022-2025 nflverse, the TAE-augmented game model
 * beats the baseline (EPA/play + Herfindahl) by >=0.5 points of out-of-sample RMSE per game AND
 * theta's 95% CI excludes 0 with the expected sign.
 *
 * Ingest role: team rating inputs (Elo updates, MOV multiplier, rating blends).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1912.05129v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT to a weekly props/coaching metric if, on 2022-2025 nflverse, the TAE-augmented game model beats the baseline (EPA/play + Herfindahl) by >=0.5 points of out-of-sample RMSE per game AND theta's 95% CI excludes 0 with the expected sign.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "Elo with margin-of-victory multiplier",
  baseK: 20,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Win probability for A given Elo ratings (400-point logistic scale). */
export function eloWinProb(ratingA: number, ratingB: number): number | null {
  if (!isFiniteNumber(ratingA) || !isFiniteNumber(ratingB)) return null;
  return 1 / (1 + Math.pow(10, -(ratingA - ratingB) / 400));
}

/**
 * Zero-sum Elo update. scoreA: 1 = A wins, 0.5 = draw, 0 = A loses.
 * Returns [newRatingA, newRatingB].
 */
export function eloUpdate(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k: number,
): [number, number] | null {
  if (!isFiniteNumber(ratingA) || !isFiniteNumber(ratingB)) return null;
  if (!isFiniteNumber(k) || k <= 0) return null;
  if (scoreA !== 0 && scoreA !== 0.5 && scoreA !== 1) return null;
  const expected = eloWinProb(ratingA, ratingB);
  if (expected === null) return null;
  const delta = k * (scoreA - expected);
  return [ratingA + delta, ratingB - delta];
}

/**
 * Margin-of-victory multiplier (538-style): bigger beatdowns move ratings more,
 * damped by the pre-game Elo gap so expected blowouts count less.
 */
export function movMultiplier(marginOfVictory: number, eloDiff: number): number | null {
  if (!isFiniteNumber(marginOfVictory) || !isFiniteNumber(eloDiff)) return null;
  return (Math.log(Math.abs(marginOfVictory) + 1) * 2.2) / (Math.abs(eloDiff) * 0.001 + 2.2);
}

/** Weighted blend of rating systems with normalized non-negative weights. */
export function blendRatings(ratings: readonly number[], weights: readonly number[]): number | null {
  if (ratings.length === 0 || ratings.length !== weights.length) return null;
  if (!ratings.every(isFiniteNumber)) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return null;
  return ratings.reduce((a, r, i) => a + r * (weights[i] ?? 0), 0) / wSum;
}
