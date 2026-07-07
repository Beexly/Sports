import { describe, expect, it } from "vitest";
import { shrinkProbability } from "../core/shrinkage.js";

describe("shrinkProbability", () => {
  it("returns the prior exactly when sampleSize is 0 (no observations to trust)", () => {
    // denominator = sampleSize + priorStrength = 0 + 5 = 5, so the observed term
    // (0 * observed) drops out and the result is the priorStrength-weighted prior.
    expect(shrinkProbability({ observed: 0.9, prior: 0.4, sampleSize: 0, priorStrength: 5 })).toBe(0.4);
  });

  it("returns the prior when sampleSize and priorStrength are both 0 (degenerate denominator)", () => {
    expect(shrinkProbability({ observed: 0.9, prior: 0.42, sampleSize: 0, priorStrength: 0 })).toBe(0.42);
  });

  it("floors a negative sampleSize to 0 and returns the prior", () => {
    expect(shrinkProbability({ observed: 0.9, prior: 0.3, sampleSize: -5, priorStrength: 4 })).toBe(0.3);
  });

  it("pulls the observed rate exactly halfway to the prior when priorStrength == sampleSize", () => {
    // (10*0.8 + 10*0.5) / 20 = 13/20 = 0.65, the midpoint of observed(0.8) and prior(0.5).
    expect(shrinkProbability({ observed: 0.8, prior: 0.5, sampleSize: 10, priorStrength: 10 })).toBe(0.65);
  });

  it("returns the observed rate when priorStrength is 0 (nothing pulling it back)", () => {
    expect(shrinkProbability({ observed: 0.8, prior: 0.5, sampleSize: 10, priorStrength: 0 })).toBe(0.8);
  });

  it("shrinks toward the prior by the fraction priorStrength/(sampleSize+priorStrength)", () => {
    // pull fraction toward prior = 30 / (10 + 30) = 0.75
    // (10*0.8 + 30*0.5) / 40 = 23/40 = 0.575  ==  0.8 + (0.5 - 0.8)*0.75
    expect(shrinkProbability({ observed: 0.8, prior: 0.5, sampleSize: 10, priorStrength: 30 })).toBe(0.575);
  });

  it("pulls harder toward the prior as priorStrength grows relative to sampleSize", () => {
    const base = { observed: 0.8, prior: 0.5, sampleSize: 10 };
    const weak = shrinkProbability({ ...base, priorStrength: 10 }); // 0.65
    const strong = shrinkProbability({ ...base, priorStrength: 30 }); // 0.575
    // Larger priorStrength => result sits closer to the prior (0.5).
    expect(Math.abs(strong - base.prior)).toBeLessThan(Math.abs(weak - base.prior));
    expect(strong).toBeLessThan(weak);
  });

  it("converges to the observed rate as sampleSize -> infinity", () => {
    const observed = 0.7;
    const result = shrinkProbability({ observed, prior: 0.2, sampleSize: 1_000_000, priorStrength: 10 });
    expect(result).toBeCloseTo(observed, 3);
  });

  it("moves strictly closer to observed as the sample grows", () => {
    const observed = 0.7;
    const prior = 0.2;
    const priorStrength = 20;
    const small = shrinkProbability({ observed, prior, sampleSize: 20, priorStrength });
    const large = shrinkProbability({ observed, prior, sampleSize: 2000, priorStrength });
    expect(Math.abs(large - observed)).toBeLessThan(Math.abs(small - observed));
  });

  it("clamps observed and prior into [0,1] before shrinking", () => {
    // observed=2 -> 1, prior=-1 -> 0; with equal weights the midpoint is 0.5.
    expect(shrinkProbability({ observed: 2, prior: -1, sampleSize: 10, priorStrength: 10 })).toBe(0.5);
  });

  it("keeps the output within [0,1]", () => {
    const result = shrinkProbability({ observed: 1, prior: 1, sampleSize: 5, priorStrength: 5 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBe(1);
  });
});
