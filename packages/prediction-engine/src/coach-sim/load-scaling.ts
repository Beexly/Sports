/**
 * Effective-count scaling of a positional dropoff.
 *
 * HHI is convex. A ratio taken on HHI overstates the concentrated end.
 * The effective number of contributors is N = 1/HHI (Davies 2025).
 * The multiplier is taken in that space:
 *
 *   m = sqrt(N_league / N_team) = sqrt(hhi / leagueHhi)
 *   clamped to [0.55, 1.60]
 *
 * The square root is a modelling choice. A dropoff is a per-player quantity,
 * and the note treats the contributor count as diluting it by about sqrt(N).
 * It is not a derived law. Do not fold it into the Tuesday hash until it has
 * been checked against realised injury outcomes.
 *
 * This module is not imported by locked-projection. applyInjuryOverlay still
 * multiplies by the sealed factor alone. Calling scaleDropoff from the overlay
 * would change the applied injury without a re-seal.
 *
 * The index this was written against is targets only. Carries are a separate
 * share and are not combined here.
 */
export const LEAGUE_HHI = 0.135;
export const LOAD_FLOOR = 0.55;
export const LOAD_CEIL = 1.6;

export function effectiveN(hhi: number): number {
  if (hhi <= 0) return Number.POSITIVE_INFINITY;
  return 1 / hhi;
}

export function loadMultiplier(
  hhi: number,
  leagueHhi: number = LEAGUE_HHI,
  floor: number = LOAD_FLOOR,
  ceil: number = LOAD_CEIL,
): number {
  const nTeam = effectiveN(hhi);
  const nLeague = effectiveN(leagueHhi);
  const m = Math.sqrt(nLeague / nTeam);
  return Math.max(floor, Math.min(ceil, m));
}

/** Product of the sealed factor and the multiplier, rounded to 4 decimals. */
export function scaleDropoff(
  baseDropoff: number,
  hhi: number,
  leagueHhi?: number,
): number {
  const m = leagueHhi === undefined ? loadMultiplier(hhi) : loadMultiplier(hhi, leagueHhi);
  return Math.round(baseDropoff * m * 10000) / 10000;
}
