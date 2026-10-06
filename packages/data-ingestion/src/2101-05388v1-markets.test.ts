/**
 * Tests for ./2101-05388v1-markets (arXiv:2101.05388v1, lane=markets).
 *
 * ACCEPTANCE GATE: Adopt the EDP framework if, on the 2023-2024 holdout: (i) EDP is well-calibrated (slope 0.95-1.05)
 * AND (ii) team mean EDP/play predicts rest-of-season point differential with R^2 >= EPA/play R^2 +
 * 0.02, OR (iii) the credit-spread audit shows EDP systematically reallocating >= 20% of drive value
 * from scoring plays to setup plays while maintaining (i). Reject (stay with EPA/WPA) otherwise.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2101-05388v1-markets";

describe("market efficiency diagnostics (arXiv:2101.05388v1)", () => {
  it("concentration index (Herfindahl)", () => {
    expect(mod.concentrationIndex([0.5, 0.5])).toBeCloseTo(0.5, 10);
    expect(mod.concentrationIndex([1, 0, 0, 0])).toBeCloseTo(1, 10);
    expect(mod.concentrationIndex([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0.25, 10);
    expect(mod.concentrationIndex([])).toBeNull();
    expect(mod.concentrationIndex([0.5, -0.5])).toBeNull();
  });

  it("chronological bucket means", () => {
    expect(mod.bucketMeans([1, 2, 3, 4], 2)).toEqual([1.5, 3.5]);
    expect(mod.bucketMeans([1, 2], 3)).toBeNull();
    expect(mod.bucketMeans([1, 2, 3], 0)).toBeNull();
  });

  it("counts AR~EAR crossings", () => {
    expect(mod.countCrossings([1, 3, 1], [2, 2, 2])).toBe(2);
    expect(mod.countCrossings([1, 2, 3], [4, 5, 6])).toBe(0);
    expect(mod.countCrossings([1], [2])).toBeNull();
    expect(mod.countCrossings([1, 2], [1])).toBeNull();
  });

  it("detects non-monotonic paths", () => {
    expect(mod.isNonMonotonicPath([1, 3, 2])).toBe(true);
    expect(mod.isNonMonotonicPath([1, 2, 3])).toBe(false);
    expect(mod.isNonMonotonicPath([1, 2])).toBeNull();
  });
});
