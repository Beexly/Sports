import { describe, expect, it } from "vitest";
import { hillSaturation } from "./hill-saturation.js";

describe("hill saturation", () => {
  it("is one half at the half-saturation point and rejects a bad k", () => {
    expect(hillSaturation(4, 4)).toBeCloseTo(0.5);
    expect(hillSaturation(0, 4)).toBe(0);
    expect(hillSaturation(100, 4)).toBeGreaterThan(0.9);
    expect(() => hillSaturation(1, 0)).toThrow(/positive/);
  });
});
