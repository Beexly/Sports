/**
 * Pairwise Comparisons with Flexible Time-Dynamics
 *
 * arXiv:1903.07746v2 · lane:team_ratings · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Elo ratings on the 400-point scale with logistic win probabilities, zero-sum updates scaled by K, a
 * 538-style margin-of-victory multiplier that damps blowouts by the pre-game Elo gap, and weighted
 * blending across rating systems.
 *
 * Improvement (wiring record): Adopt the GP team-strength module (piecewise-constant season boundaries + Matern nu=1/2, Gaussian
 * likelihood on demeaned margin; phase 2 adds injury-lineup features) as the engine's team-strength
 * prior with posterior credible intervals and weekly trajectory plots.
 *
 * ACCEPTANCE GATE: ADAPT as the engine's team-strength module if, on 2023-2025 prequential evaluation, GP log-loss <=
 * Elo log-loss with statistical significance (paired t-test on weekly log-loss, p < 0.05) OR
 * calibration is strictly better at equal log-loss (the uncertainty story).
 *
 * Ingest role: team rating inputs (Elo updates, MOV multiplier, rating blends).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1903.07746v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT as the engine's team-strength module if, on 2023-2025 prequential evaluation, GP log-loss <= Elo log-loss with statistical significance (paired t-test on weekly log-loss, p < 0.05) OR calibration is strictly better at equal log-loss (the uncertainty story).`;

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
