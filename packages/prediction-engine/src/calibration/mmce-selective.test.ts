
import { describe, expect, it } from "vitest";
import { ece, mmce, selectiveEce, selectiveKeep } from "./mmce-selective";

describe("mmce-selective", () => {
  it("mmce is 0 for a perfect forecaster, >0 for miscalibration", () => {
    expect(mmce([1, 0, 1, 0], [1, 0, 1, 0])).toBeCloseTo(0, 10);
    expect(mmce([0.9, 0.9, 0.9, 0.9], [0, 0, 0, 0])).toBeGreaterThan(0.3);
  });
  it("ece is 0 for perfect calibration", () => {
    expect(ece([1, 0, 1, 0], [1, 0, 1, 0])).toBeCloseTo(0, 10);
  });
  it("selectiveKeep applies the confidence floor and outlier ceiling", () => {
    const keep = selectiveKeep([0.9, 0.5, 0.8], [0.1, 0.1, 5.0], { confidenceFloor: 0.6, outlierCeiling: 1 });
    expect(keep).toEqual([0]);
  });
  it("selectiveEce on an empty set is 0", () => {
    expect(selectiveEce([0.9], [1], [])).toBe(0);
  });
  it("edge cases: misaligned throws; empty mmce is 0", () => {
    expect(() => mmce([0.5], [1, 0])).toThrow();
    expect(mmce([], [])).toBe(0);
  });
});
