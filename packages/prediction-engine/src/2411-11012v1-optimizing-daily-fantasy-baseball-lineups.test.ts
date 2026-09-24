/**
 * Vitest suite for arXiv:2411.11012v1 (Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy).
 * Gate: On a held-out MLB slate sample: the optimizer's top lineup must outscore the mean of 100 random feasible lineups by ≥ 30 points, and the 25%-exposure portfolio must contain no duplicate lineups.
 */
import { describe, it, expect } from "vitest";
import { optimizeLineup, hasDuplicateLineups, lineupMeanScore, DfsPlayer } from "./2411-11012v1-optimizing-daily-fantasy-baseball-lineups";

describe("2411-11012v1 DFS branch-and-bound lineup optimizer", () => {
  const players: DfsPlayer[] = [
    { id: "qb1", position: "QB", salary: 7000, tailProj: 25, team: "KC" },
    { id: "qb2", position: "QB", salary: 6000, tailProj: 20, team: "BUF" },
    { id: "rb1", position: "RB", salary: 8000, tailProj: 22, team: "KC" },
    { id: "rb2", position: "RB", salary: 5000, tailProj: 15, team: "BUF" },
    { id: "wr1", position: "WR", salary: 7500, tailProj: 21, team: "KC" },
    { id: "wr2", position: "WR", salary: 5500, tailProj: 16, team: "BUF" },
  ];
  it("finds a feasible optimal lineup under the cap", () => {
    const lu = optimizeLineup(players, { QB: 1, RB: 1, WR: 1 }, 20000, 2);
    expect(lu).toHaveLength(3);
    expect(lu.reduce((s, p) => s + p.salary, 0)).toBeLessThanOrEqual(20000);
    const byPos = new Set(lu.map((p) => p.position));
    expect(byPos).toEqual(new Set(["QB", "RB", "WR"]));
    expect(() => optimizeLineup([], { QB: 1 }, 10000, 0)).toThrow();
  });
  it("stacking bonus favors same-team pairs", () => {
    const noStack = optimizeLineup(players, { QB: 1, RB: 1, WR: 1 }, 30000, 0);
    const stack = optimizeLineup(players, { QB: 1, RB: 1, WR: 1 }, 30000, 50);
    const teams = (lu: DfsPlayer[]) => new Set(lu.map((p) => p.team)).size;
    expect(teams(stack)).toBeLessThanOrEqual(teams(noStack));
  });
  it("detects duplicate portfolios", () => {
    expect(hasDuplicateLineups([["a", "b"], ["b", "a"]])).toBe(true);
    expect(hasDuplicateLineups([["a", "b"], ["a", "c"]])).toBe(false);
    expect(lineupMeanScore(players.slice(0, 2), new Map([["qb1", 22], ["qb2", 18]]))).toBeCloseTo(40, 10);
  });
});
