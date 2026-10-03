/**
 * Direct unit tests for the per-player rollup.
 *
 * The engine-level tests in src/__tests__/expected-metrics.test.ts only ever feed
 * players that clear the qualifier, so the honesty gate that DROPS under-sampled
 * players (`if (g.plays < options.minPlays) continue;`) had no coverage. These
 * tests pin that gate directly: sub-qualifier players must never appear in the
 * output, matching the house contract's "return empty on insufficient sample".
 */

import { describe, expect, it } from "vitest";
import { rollupByPlayer, type PlayerPlayOutcome } from "../rollup.js";

/** Repeat a single (actual, expected) outcome `n` times for one player. */
function plays(playerId: string, n: number, actual: number, expected: number): PlayerPlayOutcome[] {
  return Array.from({ length: n }, () => ({ playerId, actual, expected }));
}

describe("rollupByPlayer minimum-plays qualifier", () => {
  it("drops players below minPlays and keeps players at or above it", () => {
    const outcomes: PlayerPlayOutcome[] = [
      ...plays("00-QUALIFIED", 5, 1, 0.6), // 5 plays, == minPlays → kept
      ...plays("00-THIN", 2, 1, 0.6), // 2 plays, < minPlays → dropped
    ];

    const rows = rollupByPlayer(outcomes, { minPlays: 5 });

    const ids = rows.map((r) => r.playerId);
    expect(ids).toContain("00-QUALIFIED");
    expect(ids).not.toContain("00-THIN");
    expect(rows).toHaveLength(1);
  });

  it("uses a strict '< minPlays' cutoff: minPlays-1 is dropped, minPlays is kept", () => {
    const outcomes: PlayerPlayOutcome[] = [
      ...plays("00-AT", 4, 1, 0.5), // exactly minPlays → kept
      ...plays("00-BELOW", 3, 1, 0.5), // minPlays-1 → dropped
    ];

    const rows = rollupByPlayer(outcomes, { minPlays: 4 });

    expect(rows.map((r) => r.playerId)).toEqual(["00-AT"]);
    expect(rows[0]?.plays).toBe(4);
  });

  it("returns an empty rollup when every player is under the qualifier", () => {
    const outcomes: PlayerPlayOutcome[] = [
      ...plays("00-A", 2, 1, 0.4),
      ...plays("00-B", 4, 1, 0.4),
    ];

    expect(rollupByPlayer(outcomes, { minPlays: 5 })).toEqual([]);
  });

  it("computes the mean and over-expected rollup for a qualifying player", () => {
    const rows = rollupByPlayer(plays("00-QUALIFIED", 5, 1, 0.6), { minPlays: 5 });

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.plays).toBe(5);
    expect(row.actualMean).toBeCloseTo(1, 9);
    expect(row.expectedMean).toBeCloseTo(0.6, 9);
    expect(row.overExpected).toBeCloseTo(0.4, 9);
    expect(row.overExpectedTotal).toBeCloseTo(2, 9);
  });
});
