import { describe, it, expect } from "vitest";
import { pavIsotonic, pavBinary } from "../calibration/pav.js";

describe("pavIsotonic", () => {
  it("returns an empty array for empty input", () => {
    expect(pavIsotonic([])).toEqual([]);
  });

  it("leaves an already-monotone sequence untouched", () => {
    const ys = [0, 0.2, 0.4, 0.6, 0.8, 1];
    expect(pavIsotonic(ys)).toEqual(ys);
  });

  it("pools a single violation into the block mean", () => {
    // [0, 1, 0] -> the middle pair (1, 0) violates; pooled to 0.5, 0.5
    const fitted = pavIsotonic([0, 1, 0]);
    expect(fitted[0]).toBe(0);
    expect(fitted[1]).toBeCloseTo(0.5, 10);
    expect(fitted[2]).toBeCloseTo(0.5, 10);
  });

  it("is non-decreasing for arbitrary unsorted-value input", () => {
    const ys = [0.9, 0.1, 0.5, 0.3, 0.8, 0.2, 0.95, 0.05];
    const fitted = pavIsotonic(ys);
    for (let i = 1; i < fitted.length; i++) {
      expect(fitted[i]).toBeGreaterThanOrEqual(fitted[i - 1]! - 1e-12);
    }
  });

  it("preserves the length of the input", () => {
    const ys = Array.from({ length: 37 }, (_, i) => Math.sin(i));
    expect(pavIsotonic(ys)).toHaveLength(37);
  });

  it("a single-point sequence is unchanged", () => {
    expect(pavIsotonic([0.42])).toEqual([0.42]);
  });

  it("backtracks correctly when a merge creates a new violation with the previous block", () => {
    // Chain of violations requiring cascading pooling: 3, 2, 4, 1
    // Step: (3,2) violate -> merge to 2.5,2.5 -> now [2.5,2.5,4,1]
    // (4,1) violate -> merge to 2.5,2.5 -> now [2.5,2.5,2.5,2.5]
    const fitted = pavIsotonic([3, 2, 4, 1]);
    for (const v of fitted) expect(v).toBeCloseTo(2.5, 10);
  });

  it("weighted PAV: heavier weight pulls the pooled value toward it", () => {
    // Violation pair (1, 0); left weight much heavier than right
    const fitted = pavIsotonic([1, 0], [10, 1]);
    // Weighted mean = (1*10 + 0*1) / 11 = 10/11
    expect(fitted[0]).toBeCloseTo(10 / 11, 10);
    expect(fitted[1]).toBeCloseTo(10 / 11, 10);
  });

  it("throws when weights length does not match ys length", () => {
    expect(() => pavIsotonic([1, 2, 3], [1, 1])).toThrow(
      /weights length must match/,
    );
  });

  it("treats non-positive weights as EPSILON rather than zero/negative", () => {
    // Should not throw or produce NaN even with a zero/negative weight.
    const fitted = pavIsotonic([1, 0], [0, -5]);
    for (const v of fitted) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("pavBinary", () => {
  it("is a thin wrapper delegating to pavIsotonic on 0/1 labels", () => {
    const labels: (0 | 1)[] = [0, 1, 0, 1, 1];
    expect(pavBinary(labels)).toEqual(pavIsotonic(labels));
  });

  it("fitted values on binary labels stay within [0, 1]", () => {
    const labels: (0 | 1)[] = [0, 0, 1, 0, 1, 1, 1, 0, 1, 1];
    const fitted = pavBinary(labels);
    for (const v of fitted) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
