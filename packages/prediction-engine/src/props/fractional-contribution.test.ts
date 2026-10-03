
import { describe, expect, it } from "vitest";
import { effectiveTeamSize, eraNormalize, fractionalContribution, sEffStarOutInteraction } from "./fractional-contribution";

describe("fractional-contribution", () => {
  it("era normalization rescales across scoring eras", () => {
    expect(eraNormalize(100, 22, 20)).toBeCloseTo(110, 10);
    expect(() => eraNormalize(100, 22, 0)).toThrow();
  });
  it("fractional contribution averages yardage and EPA shares", () => {
    expect(fractionalContribution(100, 400, 5, 20)).toBeCloseTo(0.25, 10);
  });
  it("effective team size: concentrated roster -> low S_eff", () => {
    expect(effectiveTeamSize([1])).toBeCloseTo(1, 10);
    expect(effectiveTeamSize([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(4, 10);
    expect(effectiveTeamSize([0.6, 0.2, 0.1, 0.1])).toBeLessThan(4);
  });
  it("S_eff x star-OUT interaction has the right sign", () => {
    const concentrated = sEffStarOutInteraction(2, true, 4);
    const deep = sEffStarOutInteraction(6, true, 4);
    expect(concentrated).toBeGreaterThan(0);
    expect(deep).toBeLessThan(0);
    expect(sEffStarOutInteraction(2, false, 4)).toBe(0);
  });
  it("edge cases throw on degenerate inputs", () => {
    expect(() => effectiveTeamSize([])).toThrow();
    expect(() => fractionalContribution(1, 0, 1, 1)).toThrow();
  });
});
