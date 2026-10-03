
import { describe, expect, it } from "vitest";
import { breakevenKeepRate, ceilingVolume, selectiveFeasibilityCeiling } from "./selective-feasibility-ceiling";

describe("selective-feasibility-ceiling", () => {
  it("ceiling is the mean of the top slice", () => {
    expect(selectiveFeasibilityCeiling([0.1, 0.3, 0.2, 0.4], 0.5)).toBeCloseTo(0.35, 10);
    expect(selectiveFeasibilityCeiling([0.1, 0.3, 0.2, 0.4], 1)).toBeCloseTo(0.25, 10);
  });
  it("breakevenKeepRate finds the largest profitable slice", () => {
    // Slice is profitable while its MEAN edge clears the hurdle: all four
    // average to 0.0375 > 0, so the largest profitable slice is everything.
    expect(breakevenKeepRate([0.2, 0.1, -0.05, -0.1], 0)).toBeCloseTo(1, 10);
    // Adding a big loser drags the mean below zero -> stop at 3/4.
    expect(breakevenKeepRate([0.2, 0.1, -0.05, -0.5], 0)).toBeCloseTo(0.75, 10);
    expect(breakevenKeepRate([-0.1, -0.2], 0)).toBe(0);
  });
  it("ceilingVolume is at least 1", () => {
    expect(ceilingVolume(100, 0.1)).toBe(10);
    expect(ceilingVolume(3, 0.1)).toBe(1);
  });
  it("edge cases throw", () => {
    expect(() => selectiveFeasibilityCeiling([], 0.5)).toThrow();
    expect(() => selectiveFeasibilityCeiling([1], 0)).toThrow();
    expect(() => breakevenKeepRate([], 0)).toThrow();
  });
});
