import { describe, expect, it } from "vitest";
import {
  BASE_EXPLOSIVE_RATE,
  MAX_SAFETY_OUTS,
  SAFETY_OUT_EXPLOSIVE_DELTA,
  explosiveMultiplierForSafetyOuts,
  explosiveRateWithSafetyOuts,
  isReversedVsFolkModel,
} from "../safety-explosive";

describe("safety explosive effect", () => {
  it("pins the measured direction and size", () => {
    expect(SAFETY_OUT_EXPLOSIVE_DELTA).toBe(-0.0258);
    expect(BASE_EXPLOSIVE_RATE).toBeCloseTo(0.1822, 4);
    expect(isReversedVsFolkModel()).toBe(true);
  });

  it("LOWERS the rate as safeties go out", () => {
    expect(explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, 1)).toBeLessThan(BASE_EXPLOSIVE_RATE);
    expect(explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, 2)).toBeLessThan(
      explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, 1),
    );
  });

  it("is a no-op at zero outs and clamps past the observed range", () => {
    expect(explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, 0)).toBeCloseTo(BASE_EXPLOSIVE_RATE, 6);
    expect(explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, 5)).toBeCloseTo(
      explosiveRateWithSafetyOuts(BASE_EXPLOSIVE_RATE, MAX_SAFETY_OUTS),
      6,
    );
  });

  it("never returns a negative rate", () => {
    expect(explosiveRateWithSafetyOuts(0.01, 2)).toBeGreaterThanOrEqual(0);
  });

  it("multiplier form is 1 at zero outs and below 1 otherwise", () => {
    expect(explosiveMultiplierForSafetyOuts(BASE_EXPLOSIVE_RATE, 0)).toBeCloseTo(1, 6);
    expect(explosiveMultiplierForSafetyOuts(BASE_EXPLOSIVE_RATE, 1)).toBeLessThan(1);
  });
});
