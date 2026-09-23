/**
 * Tests for ./2501-16565v1-team-rating (arXiv:2501.16565v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt position-1-breaking PL for division-winner modeling if, on the 2021–2025 time-ordered test, it matches or beats the market baseline on log-loss (within 0.02) AND beats pairwise BT on top-1 hit rate by ≥1 additional correct division.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2501-16565v1-team-rating";

describe("2501-16565v1 Efficient inference of rankings from multi-body", () => {
  it("elo expected score is 0.5 for equal ratings", () => {
    expect(mod.eloExpectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(mod.eloExpectedScore(1600, 1500)).toBeGreaterThan(0.5);
    expect(mod.eloExpectedScore(NaN, 1500)).toBeNull();
  });
  it("elo update is zero-sum with k=32", () => {
    const u = mod.eloUpdate(1500, 1500, 1, 32);
    expect(u).not.toBeNull();
    expect(u!.a).toBeCloseTo(1516, 10);
    expect(u!.b).toBeCloseTo(1484, 10);
    expect(mod.eloUpdate(1500, 1500, 1.5, 32)).toBeNull();
  });
  it("margin-adjusted K grows log-wise with blowouts", () => {
    expect(mod.marginAdjustedK(32, 10)).toBeCloseTo(76.73, 1);
    expect(mod.marginAdjustedK(32, 0)).toBeCloseTo(0, 10);
    expect(mod.marginAdjustedK(-1, 10)).toBeNull();
  });
  it("one Bradley-Terry MM iteration on a 2-team matrix", () => {
    const r = mod.bradleyTerryIteration([[0, 3], [1, 0]], [1, 1]);
    expect(r).not.toBeNull();
    expect(r![0]).toBeCloseTo(1.5, 10);
    expect(r![1]).toBeCloseTo(0.5, 10);
  });
  it("ranking order sorts strongest-first", () => {
    expect(mod.rankingOrder([100, 300, 200])).toEqual([1, 2, 0]);
    expect(mod.rankingOrder([])).toBeNull();
  });
});
