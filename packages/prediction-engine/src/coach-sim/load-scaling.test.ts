import { describe, expect, it } from "vitest";
import { effectiveN, loadMultiplier, scaleDropoff } from "./load-scaling";

describe("effective-count dropoff scaling", () => {
  it("converts HHI to a contributor count", () => {
    expect(effectiveN(0.2)).toBeCloseTo(5, 10);
    expect(effectiveN(0.1)).toBeCloseTo(10, 10);
    expect(effectiveN(0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("scales in effective-count space, then clamps", () => {
    // sqrt(0.159 / 0.135). The printed table rounded the multiplier first.
    expect(loadMultiplier(0.159)).toBeCloseTo(Math.sqrt(0.159 / 0.135), 12);
    expect(scaleDropoff(0.095, 0.159)).toBe(0.1031);
    expect(scaleDropoff(0.095, 0.087)).toBe(0.0763);
    expect(scaleDropoff(0.095, 0.09)).toBe(0.0776);
    expect(loadMultiplier(0.5)).toBe(1.6);
    expect(loadMultiplier(0.02)).toBe(0.55);
  });

  it("is smaller than the raw HHI ratio at the concentrated end", () => {
    const multiplierRatio = loadMultiplier(0.159) / loadMultiplier(0.087);
    const rawHhiRatio = 0.159 / 0.087;
    expect(multiplierRatio).toBeCloseTo(Math.sqrt(rawHhiRatio), 12);
    expect(rawHhiRatio).toBeGreaterThan(multiplierRatio);
  });
});
