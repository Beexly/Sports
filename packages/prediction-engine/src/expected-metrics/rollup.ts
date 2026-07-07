/**
 * Per-player aggregation of play-level (actual, expected) outcomes into the
 * over-expected rollup that our metrics report and that the validation bridge
 * correlates against Next Gen Stats. Pure and deterministic.
 *
 * The reported per-play means are scaled by `reportScale` (e.g. ×100 to turn a
 * completion probability into completion-percentage points, matching NGS units),
 * while `overExpectedTotal` stays in raw outcome units so it reads as a genuine
 * counting stat (completions / yards over expectation), not a scaled artifact.
 */

import { round } from "./numeric.js";
import type { PlayerExpectedMetric } from "./types.js";

export interface PlayerPlayOutcome {
  /** nflverse gsis player id. */
  readonly playerId: string;
  /** Raw actual outcome for this play (0/1 completion, or yards). */
  readonly actual: number;
  /** Model-expected outcome for the same play, in the same raw unit. */
  readonly expected: number;
}

export interface RollupOptions {
  /** Minimum qualifying plays for a player to appear (grain-matching qualifier). */
  readonly minPlays: number;
  /** Multiplier applied to the reported per-play means (default 1). */
  readonly reportScale?: number;
  /** Rounding decimals for reported values (default 3). */
  readonly decimals?: number;
}

/**
 * Group play outcomes by player, drop players below the qualifier, and compute
 * the actual/expected/over-expected rollup. Sorted by over-expected descending
 * (id-tiebroken) for deterministic output.
 */
export function rollupByPlayer(
  outcomes: readonly PlayerPlayOutcome[],
  options: RollupOptions,
): PlayerExpectedMetric[] {
  const scale = options.reportScale ?? 1;
  const decimals = options.decimals ?? 3;
  const groups = new Map<string, { plays: number; actual: number; expected: number }>();
  for (const o of outcomes) {
    if (!o.playerId) continue;
    if (!Number.isFinite(o.actual) || !Number.isFinite(o.expected)) continue;
    const g = groups.get(o.playerId) ?? { plays: 0, actual: 0, expected: 0 };
    g.plays += 1;
    g.actual += o.actual;
    g.expected += o.expected;
    groups.set(o.playerId, g);
  }

  const rows: PlayerExpectedMetric[] = [];
  for (const [playerId, g] of groups) {
    if (g.plays < options.minPlays) continue;
    const actualMean = (g.actual / g.plays) * scale;
    const expectedMean = (g.expected / g.plays) * scale;
    rows.push({
      playerId,
      plays: g.plays,
      actualMean: round(actualMean, decimals),
      expectedMean: round(expectedMean, decimals),
      overExpected: round(actualMean - expectedMean, decimals),
      overExpectedTotal: round(g.actual - g.expected, decimals),
    });
  }
  rows.sort((a, b) => b.overExpected - a.overExpected || (a.playerId < b.playerId ? -1 : 1));
  return rows;
}
