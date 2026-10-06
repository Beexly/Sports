import { describe, expect, it } from "vitest";
import { confoundingReport, eValue, eValueForCi } from "./e-value";

describe("e-value", () => {
  it("eValue matches the closed form", () => {
    expect(eValue(1)).toBeCloseTo(1, 12);
    expect(eValue(2)).toBeCloseTo(2 + Math.sqrt(2), 12);
    // RR < 1 inverts: E(0.5) == E(2).
    expect(eValue(0.5)).toBeCloseTo(eValue(2), 12);
    // Larger effects need stronger confounding to explain away.
    expect(eValue(3)).toBeGreaterThan(eValue(2));
  });
  it("eValueForCi uses the bound closest to the null", () => {
    expect(eValueForCi(1.5, 2.5)).toBeCloseTo(eValue(1.5), 12);
    expect(eValueForCi(0.4, 0.8)).toBeCloseTo(eValue(0.8), 12);
    expect(eValueForCi(0.8, 1.5)).toBeCloseTo(1, 12); // straddles null
  });
  it("confoundingReport flags null-straddling CIs", () => {
    const r1 = confoundingReport(2, 1.5, 2.8);
    expect(r1.ciExcludesNull).toBe(true);
    expect(r1.eCi).toBeLessThan(r1.ePoint);
    const r2 = confoundingReport(1.3, 0.9, 1.8);
    expect(r2.ciExcludesNull).toBe(false);
    expect(r2.eCi).toBeCloseTo(1, 12);
  });
  it("throws on degenerate inputs", () => {
    expect(() => eValue(0)).toThrow();
    expect(() => eValue(-2)).toThrow();
    expect(() => eValueForCi(2, 1)).toThrow();
  });
});
