import { describe, expect, it } from "vitest";
import { standardNormalQuantile, zCritOneSided } from "../normal-quantile.js";

describe("standardNormalQuantile / zCritOneSided", () => {
  it("matches known one-sided critical z-values (fixes the skeleton's hardcoded zCrit=1.64485)", () => {
    // Phi^-1(1 - alpha) for the standard critical alphas.
    expect(zCritOneSided(0.05)).toBeCloseTo(1.6449, 4);
    expect(zCritOneSided(0.025)).toBeCloseTo(1.96, 4);
    expect(zCritOneSided(0.01)).toBeCloseTo(2.3263, 4);
  });

  it("is a real function of alpha, not a hardcoded constant", () => {
    // The skeleton's defect: welchOneSidedNonInferiority hardcoded
    // zCrit = 1.64485 (the alpha=0.05 value) regardless of the alpha
    // argument, so a Bonferroni-adjusted alpha never actually tightened the
    // critical value. Here the tighter (smaller) alpha must yield a
    // strictly larger critical z.
    const z05 = zCritOneSided(0.05);
    const z01 = zCritOneSided(0.01);
    const zBonferroni = zCritOneSided(0.05 / 5); // alpha/m, m=5
    expect(z01).toBeGreaterThan(z05);
    expect(zBonferroni).toBeGreaterThan(z05);
    expect(zBonferroni).toBeCloseTo(z01, 6);
  });

  it("standardNormalQuantile is (anti)symmetric around p=0.5", () => {
    expect(standardNormalQuantile(0.5)).toBeCloseTo(0, 9);
    expect(standardNormalQuantile(0.9)).toBeCloseTo(-standardNormalQuantile(0.1), 8);
    expect(standardNormalQuantile(0.75)).toBeCloseTo(-standardNormalQuantile(0.25), 8);
  });

  it("rejects p outside the open interval (0, 1)", () => {
    expect(() => standardNormalQuantile(0)).toThrow(RangeError);
    expect(() => standardNormalQuantile(1)).toThrow(RangeError);
    expect(() => standardNormalQuantile(-0.1)).toThrow(RangeError);
    expect(() => standardNormalQuantile(1.1)).toThrow(RangeError);
  });

  it("rejects an alpha outside (0, 1) in zCritOneSided", () => {
    expect(() => zCritOneSided(0)).toThrow(RangeError);
    expect(() => zCritOneSided(1)).toThrow(RangeError);
  });
});
