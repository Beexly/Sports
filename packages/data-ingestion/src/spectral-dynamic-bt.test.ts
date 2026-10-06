/**
 * Tests for ./spectral-dynamic-bt (arXiv:2307.16642v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT KRC as a weekly power-rating component if it beats the repo's existing dynamic rating by
 * >=1.0pp pooled winner accuracy over 2015-2025 AND beats Elo on the same window; ADAPT if it
 * matches but does not beat - keep the online-update machinery (Algorithm 2) as the fast in-week
 * refresh; REJECT if it underperforms static RC or Elo on NFL data.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./spectral-dynamic-bt";

describe("spectral dynamic BT (arXiv:2307.16642v2)", () => {
  const t0 = Date.now();
  const games = [
    { home: "A", away: "B", homeWin: true, playedAt: new Date(t0).toISOString() },
    { home: "B", away: "C", homeWin: true, playedAt: new Date(t0 + 1000).toISOString() },
    { home: "A", away: "C", homeWin: false, playedAt: new Date(t0 + 2000).toISOString() },
  ];
  it("window matrix", () => {
    const W = mod.windowWinMatrix(games, ["A", "B", "C"], t0 - 1000, t0 + 5000)!;
    expect(W[0]![1]).toBe(1);
    expect(W[2]![0]).toBe(1);
    expect(mod.windowWinMatrix(games, ["A"], t0 + 5000, t0)).toBeNull();
  });
  it("spectral scores normalize", () => {
    const W = mod.windowWinMatrix(games, ["A", "B", "C"], t0 - 1000, t0 + 5000)!;
    const s = mod.spectralScores(W)!;
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });
  it("trajectory + shift", () => {
    const tr = mod.scoreTrajectory(games, ["A", "B", "C"], 1500, 1000)!;
    expect(tr.length).toBeGreaterThan(1);
    expect(mod.maxTrajectoryShift(tr)!).toBeGreaterThanOrEqual(0);
    expect(mod.maxTrajectoryShift([tr[0]!])).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.spectralScores([])).toBeNull();
    expect(mod.scoreTrajectory([], ["A"], 1000, 500)).toBeNull();
  });
});
