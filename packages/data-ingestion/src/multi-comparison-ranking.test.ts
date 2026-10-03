/**
 * Tests for ./multi-comparison-ranking (arXiv:2206.13580v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT as an engine input iff across 2016-2023: (a) log-loss on game winners >=2% better than
 * unimodal Bradley-Terry, OR (b) ATS hit rate beats the EPA-ranking baseline by >=1.5 points with
 * the same sign in >=6 of 8 seasons; REJECT if neither holds or q_t signs flip on >2 of 5 facets
 * year-to-year.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./multi-comparison-ranking";

describe("multi-comparison ranking (arXiv:2206.13580v2)", () => {
  const teams = ["A", "B", "C"];
  const games = [
    { home: "A", away: "B", type: "win-loss", homeWin: true },
    { home: "A", away: "B", type: "spread-cover", homeWin: false },
    { home: "B", away: "C", type: "win-loss", homeWin: true },
    { home: "C", away: "A", type: "epa-win", homeWin: false },
    null,
  ];
  it("per-type matrices", () => {
    const M = mod.multiWinMatrices(games, teams)!;
    expect(M["win-loss"][0]![1]).toBe(1);
    expect(M["spread-cover"][1]![0]).toBe(1);
    expect(M["epa-win"][0]![2]).toBe(1);
    expect(mod.multiWinMatrices([{ home: "A", away: "Z", type: "win-loss", homeWin: true }], teams)).toBeNull();
  });
  it("combine weights", () => {
    const M = mod.multiWinMatrices(games, teams)!;
    const C = mod.combineMatrices(M, { "win-loss": 1, "spread-cover": 1, "epa-win": 1 })!;
    expect(C[0]![1]).toBeCloseTo(1 / 3, 10);
    expect(mod.combineMatrices(M, { "win-loss": 0, "spread-cover": 0, "epa-win": 0 })).toBeNull();
  });
  it("BT MLE ranks A top", () => {
    const M = mod.multiWinMatrices(games, teams)!;
    const C = mod.combineMatrices(M, { "win-loss": 1, "spread-cover": 0, "epa-win": 0 })!;
    const th = mod.btMLE(C)!;
    expect(th[0]).toBeGreaterThan(th[1]!);
    expect(mod.btMLE([])).toBeNull();
  });
  it("isMultiComp rejects malformed", () => {
    expect(mod.isMultiComp({ home: "A", away: "B", type: "nope", homeWin: true })).toBe(false);
  });
});
