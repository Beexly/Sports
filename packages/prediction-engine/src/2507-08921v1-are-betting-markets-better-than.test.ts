/**
 * Vitest suite for arXiv:2507.08921v1 (Are Betting Markets Better than Polling in Predicting Political Elections?).
 * Gate: ADAPT-accept iff informed-steam-flagged moves achieve mean CLV >=+1.5% (de-vigged) vs <=+0.3% for unflagged moves over the 2023-2024 test set with n>=200 flagged moves.
 */
import { describe, it, expect } from "vitest";
import { winsorize, playScore, positionZScores, pearson, teammateSeparation, mean } from "./2507-08921v1-are-betting-markets-better-than";

describe("2507-08921v1 PFF-ification from public tracking", () => {
  it("winsorizes tails", () => {
    const w = winsorize([0, 1, 2, 3, 4, 5, 6, 7, 8, 100]);
    expect(Math.max(...w)).toBeLessThan(100);
    expect(() => winsorize([])).toThrow();
  });
  it("position z-scores are ~0-mean within group", () => {
    const plays = [
      { position: "WR", baseline: 60, technique: 5, process: 3, result: 2 },
      { position: "WR", baseline: 60, technique: -2, process: 0, result: -4 },
      { position: "WR", baseline: 60, technique: 1, process: 1, result: 1 },
      { position: "QB", baseline: 65, technique: 2, process: 2, result: 5 },
    ];
    const z = positionZScores(plays);
    expect(z.size).toBe(4);
    const wrZ = plays.filter((p) => p.position === "WR").map((p) => z.get(p) ?? 0);
    expect(Math.abs(mean(wrZ))).toBeLessThan(1e-9);
  });
  it("EPA correlation and teammate separation", () => {
    expect(pearson([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10);
    expect(teammateSeparation([1, 1.2], [[0.5], [-0.3]])).toBe(1);
    expect(teammateSeparation([0], [[0.5], [-0.3]])).toBeCloseTo(0.5, 10);
    expect(() => pearson([1], [1])).toThrow();
  });
});
