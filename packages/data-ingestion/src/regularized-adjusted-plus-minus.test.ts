/**
 * Tests for ./regularized-adjusted-plus-minus (arXiv:1706.04943v1, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADAPT as a complementary player-valuation input if: (a) year-over-year correlation of player APM
 * >= 0.35, and (b) team APM sums add >=0.001 log-loss over the spread baseline on 2025 holdout.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./regularized-adjusted-plus-minus";

describe("regularized adjusted plus-minus (arXiv:1706.04943v1)", () => {
  it("ridgeSolve recovers coefficients", () => {
    const X = [[1, 0], [0, 1], [1, 1], [2, 0]];
    const y = [2, 3, 5, 4];
    const b = mod.ridgeSolve(X, y, 1e-6)!;
    expect(b[0]).toBeCloseTo(2, 1);
    expect(b[1]).toBeCloseTo(3, 1);
  });
  it("ridgeSolve null on singular / oversize", () => {
    expect(mod.ridgeSolve([[1, 1], [1, 1]], [1, 1], 0)).toBeNull();
    expect(mod.ridgeSolve([], [], 1)).toBeNull();
  });
  it("apmDesign builds dummies + controls", () => {
    const plays = [
      { playerOn: ["A"], epa: 0.5, down: 1, distance: 10, yardline: 25, scoreDiff: 0, secondsLeft: 1800, weight: 1 },
      { playerOn: ["B"], epa: -0.2, down: 2, distance: 8, yardline: 40, scoreDiff: 3, secondsLeft: 1700, weight: 1 },
    ];
    const d = mod.apmDesign(plays, ["A", "B"])!;
    expect(d.X[0]).toHaveLength(7);
    expect(d.X[0]![0]).toBe(1);
    expect(d.X[1]![1]).toBe(1);
    expect(d.y).toEqual([0.5, -0.2]);
  });
  it("controlVector scales", () => {
    const p = { playerOn: [], epa: 0, down: 3, distance: 7, yardline: 50, scoreDiff: -3, secondsLeft: 900, weight: 1 };
    expect(mod.controlVector(p)[2]).toBeCloseTo(0.5, 10);
  });
  it("isSegmentPlay rejects malformed", () => {
    expect(mod.isSegmentPlay({ playerOn: ["A"] })).toBe(false);
    expect(mod.apmDesign([], ["A"])).toBeNull();
  });
});
