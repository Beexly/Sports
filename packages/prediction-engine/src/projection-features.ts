/**
 * Pillar-2 projection features — leakage-safe, orthogonal signal builders.
 *
 * The player-projection model's naive baseline is a trailing average of fantasy
 * points, and today the model is fed only *other* trailing averages — so it has no
 * information the baseline lacks and cannot beat it. These pure helpers build the
 * ORTHOGONAL signal that a trailing average can't see:
 *   - recency weighting (recent form the flat mean lags),
 *   - usage SHARE (role, denominated by team opportunity, more stable than raw counts),
 *   - opponent fantasy-points-allowed-over-expected, shrunk (matchup, de-noised).
 *
 * Every function is a pure transform of numbers the CALLER has already restricted to
 * weeks strictly before the target week — leakage-safety lives at the call site
 * (buildSamples), not here. No I/O, no Date, no RNG: replayable.
 */

/**
 * Exponentially recency-weighted mean. `values` are ordered oldest -> newest; the most
 * recent observation gets full weight and older ones decay by half every `halfLife`
 * steps. Unlike a flat mean (the naive baseline), this tracks a player ascending or
 * fading into a new role. Returns 0 for an empty series.
 */
export function recencyWeightedMean(values: readonly number[], halfLife = 3): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0) {
    throw new RangeError(`halfLife must be a finite number > 0, got ${String(halfLife)}`);
  }
  const n = values.length;
  if (n === 0) return 0;
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < n; i += 1) {
    const ageFromNewest = n - 1 - i; // 0 for the most recent
    const weight = Math.pow(0.5, ageFromNewest / halfLife);
    weighted += weight * values[i]!;
    weightSum += weight;
  }
  return weightSum === 0 ? 0 : weighted / weightSum;
}

/**
 * Trend signal: recent form minus the season-long flat mean. Positive = the player has
 * been outproducing their season baseline lately (role ascending); negative = fading.
 * This is orthogonal to the naive flat mean *by construction*. Returns 0 if there is
 * not yet a full `recentWindow` of history.
 */
export function recentMinusBaseline(values: readonly number[], recentWindow = 3): number {
  if (!Number.isInteger(recentWindow) || recentWindow < 1) {
    throw new RangeError(`recentWindow must be a positive integer, got ${String(recentWindow)}`);
  }
  const n = values.length;
  if (n < recentWindow) return 0;
  const all = values.reduce((sum, v) => sum + v, 0) / n;
  let recentSum = 0;
  for (let i = n - recentWindow; i < n; i += 1) recentSum += values[i]!;
  return recentSum / recentWindow - all;
}

/**
 * Empirical-Bayes shrinkage weight w = n / (n + k), in [0, 1). At low sample size the
 * observed quantity is pulled toward its prior; as n grows it trusts the observation.
 * Matches the convention used by the player-rate posteriors layer.
 */
export function shrinkageWeight(n: number, k: number): number {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`n must be a finite number >= 0, got ${String(n)}`);
  if (!Number.isFinite(k) || k <= 0) throw new RangeError(`k must be a finite number > 0, got ${String(k)}`);
  return n / (n + k);
}

/**
 * Trailing usage share (e.g. target or carry share), shrunk toward a position prior.
 * `playerSum` / `teamSum` are the player's and team's totals over the SAME prior weeks;
 * `games` is how many prior weeks back the share (drives shrinkage). A share denominated
 * by team opportunity is more stable and more predictive than a raw trailing count,
 * because it separates role from week-to-week box-score noise.
 */
export function shrunkUsageShare(
  playerSum: number,
  teamSum: number,
  priorShare: number,
  games: number,
  k = 4,
): number {
  const observed = teamSum > 0 ? playerSum / teamSum : priorShare;
  const w = shrinkageWeight(games, k);
  return w * observed + (1 - w) * priorShare;
}

/**
 * Opponent fantasy-points-allowed-over-expected (FPOE), shrunk toward 0 (the league
 * mean). `rawAllowedOverExpected` is the defense's trailing mean points allowed to the
 * position MINUS the league mean allowed to that position (so 0 = average matchup);
 * `games` is how many prior games the defense has played. Shrinking to 0 is why this
 * succeeds where the raw "points allowed" feature failed: early-season, a thin sample
 * collapses to "no matchup signal" instead of injecting noise the booster overfits.
 */
export function shrunkOpponentFpoe(rawAllowedOverExpected: number, games: number, k = 5): number {
  if (!Number.isFinite(rawAllowedOverExpected)) return 0;
  const w = shrinkageWeight(Math.max(0, games), k);
  return w * rawAllowedOverExpected;
}
