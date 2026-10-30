import { describe, expect, it } from "vitest";
import { denoiseSgpPairwiseCorrelation } from "./sgp-copula";

/**
 * Guards the positive-part James-Stein shrink in `denoiseSgpPairwiseCorrelation`.
 *
 * The defect this pins: a prior revision returned exactly 0 for every input, so a copula
 * built on its output had NO correlation structure at all while still reporting that it
 * had been denoised. A constant-zero shrinker is indistinguishable from deleting the
 * feature, and it fails silently - every downstream joint probability stays plausible.
 */
describe("denoiseSgpPairwiseCorrelation", () => {
  it("preserves a strong correlation at reduced size instead of zeroing it", () => {
    const strong = denoiseSgpPairwiseCorrelation(0.8);
    expect(strong.denoisedRho).toBeGreaterThan(0.5);
    expect(strong.denoisedRho).toBeLessThan(0.8); // shrunk, not passed through
    expect(strong.noiseClipped).toBe(true);
  });

  it("keeps the sign of a negative correlation", () => {
    const neg = denoiseSgpPairwiseCorrelation(-0.8);
    expect(neg.denoisedRho).toBeLessThan(-0.5);
    expect(neg.denoisedRho).toBeGreaterThan(-0.8);
  });

  it("collapses a noise-sized correlation to zero", () => {
    // sigma = 1/sqrt(17-3) = 0.267; 0.2 is inside the sampling band, 0.8 is not.
    expect(denoiseSgpPairwiseCorrelation(0.2).denoisedRho).toBe(0);
  });

  it("returns exactly zero for zero, not a divide-by-zero", () => {
    const zero = denoiseSgpPairwiseCorrelation(0);
    expect(zero.denoisedRho).toBe(0);
    expect(Number.isFinite(zero.denoisedRho)).toBe(true);
  });

  it("is monotone in |rho| above the sampling band", () => {
    const a = denoiseSgpPairwiseCorrelation(0.45).denoisedRho;
    const b = denoiseSgpPairwiseCorrelation(0.6).denoisedRho;
    const c = denoiseSgpPairwiseCorrelation(0.9).denoisedRho;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("never claims a larger correlation than it was given", () => {
    for (const rho of [-0.9, -0.5, -0.1, 0, 0.1, 0.5, 0.9]) {
      const out = denoiseSgpPairwiseCorrelation(rho);
      expect(Math.abs(out.denoisedRho)).toBeLessThanOrEqual(Math.abs(rho) + 1e-9);
    }
  });

  it("reports the Marchenko-Pastur edge for the sample size it was given", () => {
    // q = 6/17 -> (1 + sqrt(q))^2 = 2.5411
    expect(denoiseSgpPairwiseCorrelation(0.5).lambdaPlus).toBeCloseTo(2.5411, 3);
    // More samples tighten the edge.
    const many = denoiseSgpPairwiseCorrelation(0.5, 200, 6);
    expect(many.lambdaPlus).toBeLessThan(2.5411);
  });

  it("shrinks less when the sample is larger", () => {
    const small = denoiseSgpPairwiseCorrelation(0.45, 17, 6).denoisedRho;
    const large = denoiseSgpPairwiseCorrelation(0.45, 200, 6).denoisedRho;
    expect(large).toBeGreaterThan(small);
  });
});
