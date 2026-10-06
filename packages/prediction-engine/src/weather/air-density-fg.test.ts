import { describe, expect, it } from "vitest";
import {
  SEA_LEVEL_RHO,
  airDensityKgM3,
  effectiveKickDistance,
  kickDistanceScale,
  venueEffectEstimate,
} from "./air-density-fg";

describe("air-density-fg", () => {
  it("sea-level standard conditions recover the reference density", () => {
    const rho = airDensityKgM3(0, 59, 29.92);
    expect(rho).toBeCloseTo(SEA_LEVEL_RHO, 2);
  });

  it("Denver air is thinner than sea-level air", () => {
    const denver = airDensityKgM3(5280, 59, 24.9);
    expect(denver).toBeLessThan(airDensityKgM3(0, 59, 29.92));
    expect(denver).toBeGreaterThan(0.9);
    expect(denver).toBeLessThan(1.1);
  });

  it("cold dense air shortens effective range vs hot thin air", () => {
    const cold = airDensityKgM3(0, 20, 29.92);
    const hot = airDensityKgM3(0, 95, 29.92);
    expect(kickDistanceScale(cold)).toBeLessThan(kickDistanceScale(hot));
  });

  it("effective distance of a 60-yarder in Denver is shorter than nominal", () => {
    const eff = effectiveKickDistance(60, 5280, 59, 24.9);
    expect(eff).toBeLessThan(60);
    expect(eff).toBeGreaterThan(45); // ~17% distance premium in thin air
  });

  it("venue effect nets out the league-wide change", () => {
    // venue improved 3pp, league improved 1pp -> +2pp venue effect
    expect(venueEffectEstimate(0.7, 0.73, 0.75, 0.76)).toBeCloseTo(0.02, 12);
  });

  it("rejects non-physical inputs", () => {
    expect(() => airDensityKgM3(0, -500)).toThrow();
    expect(() => kickDistanceScale(0)).toThrow();
  });
});
