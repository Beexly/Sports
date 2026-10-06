/**
 * Tests for ./2605-29395v2-team-rating (arXiv:2605.29395v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt the low-rank context-rating estimator if it beats per-context BTL on next-season SU log-loss by ≥ 0.003/game averaged over the 2023–2024 test seasons AND produces strictly narrower mean rank CIs at ≥ nominal coverage on a 2024 holdout.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2605-29395v2-team-rating";

describe("2605-29395v2 Low Rank for Rank: Uncertainty-Aware Task-Specific", () => {
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
