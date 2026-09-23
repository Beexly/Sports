/**
 * Vitest suite for arXiv:2602.17043 (Quantifying the Limits of Human Athletic Performance: A Bayesian Analysis of Elite Decathletes).
 * Gate: ADOPT if tail-CV RMSE improves >=2% over the no-weather baseline, posterior predictive 90% intervals achieve 88-93% empirical coverage, and at least one weather coefficient has a 95% credible interval excluding zero with stable sign across seasons.
 */
import { describe, it, expect } from "vitest";
import { weatherDesign, weatherAdjustment, coefSignificant } from "./2602-17043-quantifying-the-limits-of-human";

describe("2602-17043 weather-covariate layer", () => {
  const coefs = [
    { name: "wind", mean: -1.2, sd: 0.3 },
    { name: "temp", mean: 0.1, sd: 0.2 },
    { name: "precip", mean: -0.8, sd: 0.5 },
    { name: "dome", mean: 0.4, sd: 0.15 },
  ];
  it("wind depresses scoring, dome lifts it", () => {
    const windy = weatherAdjustment(coefs, { windMph: 25, tempF: 40, precipIn: 0, dome: false });
    const calm = weatherAdjustment(coefs, { windMph: 5, tempF: 70, precipIn: 0, dome: true });
    expect(windy.mean).toBeLessThan(calm.mean);
    expect(windy.lo).toBeLessThanOrEqual(windy.mean);
    expect(windy.hi).toBeGreaterThanOrEqual(windy.mean);
  });
  it("flags significant coefficients by 95% CI exclusion", () => {
    expect(coefSignificant(coefs[0]!)).toBe(true);
    expect(coefSignificant(coefs[1]!)).toBe(false);
  });
});
