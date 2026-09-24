
import { describe, expect, it } from "vitest";
import { airDensityRatio, densityAltitude, dragScaling, isaTempC, pressureAltitude } from "./density-altitude";

describe("density-altitude", () => {
  it("pressureAltitude rises as the altimeter falls", () => {
    expect(pressureAltitude(0, 29.92)).toBeCloseTo(0, 6);
    expect(pressureAltitude(0, 28.92)).toBeCloseTo(1000, 6);
  });
  it("isaTempC is 15C at sea level", () => {
    expect(isaTempC(0)).toBeCloseTo(15, 6);
  });
  it("densityAltitude exceeds PA on a hot day", () => {
    const pa = pressureAltitude(0, 29.92);
    expect(densityAltitude(0, 29.92, 35)).toBeGreaterThan(pa);
    expect(densityAltitude(0, 29.92, 15)).toBeCloseTo(pa, 6);
  });
  it("Denver air is much thinner than sea level", () => {
    const denver = airDensityRatio(5280, 29.92, 20);
    const sea = airDensityRatio(0, 29.92, 20);
    expect(denver).toBeLessThan(0.9);
    expect(sea).toBeCloseTo(1, 1);
    expect(dragScaling(5280, 29.92, 20)).toBeCloseTo(denver, 12);
  });
});
