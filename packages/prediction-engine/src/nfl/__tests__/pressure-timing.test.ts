import { describe, expect, it } from "vitest";
import {
  BASE_CONVERSION,
  CONVERSION_BY_BUCKET,
  expectedSacks,
  finishingMultiplier,
  pressureBucket,
  pressureWeight,
} from "../pressure-timing";

describe("pressureBucket", () => {
  it("buckets by arrival time", () => {
    expect(pressureBucket(1.2)).toBe("immediate");
    expect(pressureBucket(2.2)).toBe("fast");
    expect(pressureBucket(2.7)).toBe("mid");
    expect(pressureBucket(3.4)).toBe("late");
  });

  it("treats absent or nonsense times as mid rather than immediate", () => {
    expect(pressureBucket(Number.NaN)).toBe("mid");
    expect(pressureBucket(0)).toBe("mid");
    expect(pressureBucket(-1)).toBe("mid");
  });
});

describe("timing weights", () => {
  it("ranks immediate above late above mid, per the measurement", () => {
    expect(pressureWeight(1.5)).toBeGreaterThan(pressureWeight(3.5));
    expect(pressureWeight(3.5)).toBeGreaterThan(pressureWeight(2.7));
  });

  it("pins the fitted conversion and weight values", () => {
    expect(CONVERSION_BY_BUCKET.immediate).toBe(0.158);
    expect(CONVERSION_BY_BUCKET.mid).toBe(0.101);
    expect(BASE_CONVERSION).toBe(0.119);
  });
});

describe("expectedSacks", () => {
  it("sums bucket conversions", () => {
    expect(expectedSacks([1.5])).toBeCloseTo(0.158, 4);
    expect(expectedSacks([1.5, 1.6])).toBeCloseTo(0.316, 4);
    expect(expectedSacks([])).toBe(0);
  });

  it("prices two fast pressures above two mid ones", () => {
    expect(expectedSacks([1.5, 1.5])).toBeGreaterThan(expectedSacks([2.7, 2.7]));
  });
});

describe("finishingMultiplier", () => {
  it("is neutral at league average or with no sample", () => {
    expect(finishingMultiplier(0, 400)).toBeCloseTo(1, 6);
    expect(finishingMultiplier(0.05, 0)).toBe(1);
  });

  it("moves with the residual and is damped at small n", () => {
    const big = finishingMultiplier(0.04, 500);
    const small = finishingMultiplier(0.04, 10);
    expect(big).toBeGreaterThan(1);
    expect(small).toBeGreaterThan(1);
    expect(big).toBeGreaterThan(small);
  });

  it("clamps", () => {
    expect(finishingMultiplier(0.4, 5000)).toBeLessThanOrEqual(1.4);
    expect(finishingMultiplier(-0.4, 5000)).toBeGreaterThanOrEqual(0.7);
  });
});
