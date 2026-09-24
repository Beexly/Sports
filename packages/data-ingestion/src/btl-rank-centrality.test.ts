/**
 * Tests for ./btl-rank-centrality (arXiv:2109.13743v2, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT confirmed if DRC's week-ahead log-likelihood on 2024 NFL is within 0.005/game of GSE's
 * current rating AND DRC rebuild time is >=3x faster. Speed parity alone justifies the port given
 * the theory.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./btl-rank-centrality";

describe("BTL rank centrality (arXiv:2109.13743v2)", () => {
  const W = [
    [0, 3, 1],
    [1, 0, 2],
    [2, 1, 0],
  ];
  it("stationary distribution normalizes", () => {
    const pi = mod.rankCentrality(W)!;
    expect(pi.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    expect(pi.every((v) => v > 0)).toBe(true);
  });
  it("stronger team gets more centrality", () => {
    const pi = mod.rankCentrality(W)!;
    expect(pi[0]).toBeGreaterThan(pi[2]!);
  });
  it("decayed win counts", () => {
    const now = Date.now();
    const games = [
      { home: "A", away: "B", homeWin: true, playedAt: new Date(now - 86400000).toISOString() },
      { home: "B", away: "A", homeWin: true, playedAt: new Date(now - 400 * 86400000).toISOString() },
    ];
    const Wd = mod.decayedWinCounts(games, ["A", "B"], 0.98, now)!;
    expect(Wd[0]![1]).toBeGreaterThan(Wd[1]![0]!);
    expect(mod.decayedWinCounts([], [], 0.98, now)).toBeNull();
  });
  it("BTL win prob", () => {
    expect(mod.btlWinProb(0.6, 0.4)).toBeCloseTo(0.6, 10);
    expect(mod.btlWinProb(0, 0)).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.rankCentrality([])).toBeNull();
    expect(mod.rankCentrality([[0, -1], [1, 0]])).toBeNull();
  });
});
