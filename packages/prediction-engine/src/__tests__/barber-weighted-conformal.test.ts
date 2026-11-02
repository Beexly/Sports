import { describe, expect, it } from "vitest";
import { computeBarberWeightedConformalInterval } from "../calibration-map.js";

describe("Barber weighted conformal interval", () => {
  it("expands the quoted bounds by weighted residual quantiles", () => {
    const interval = computeBarberWeightedConformalInterval(10, 14, [-1, 0, 1, 2]);
    expect(interval.low).toBeLessThan(10);
    expect(interval.high).toBeGreaterThan(14);
    expect(interval.rho).toBe(0.97);
  });
});
