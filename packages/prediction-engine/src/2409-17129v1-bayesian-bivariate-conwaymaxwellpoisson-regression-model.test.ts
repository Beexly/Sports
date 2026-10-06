/**
 * Vitest suite for arXiv:2409.17129v1 (Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports).
 * Gate: Adopt CMP as a totals-modeling option if, on the reproducible test, its out-of-sample joint log-loss beats bivariate Poisson and NB (or ties with demonstrably better tail calibration) and a full-season fit runs in <24 h on GSE hardware.
 */
import { describe, it, expect } from "vitest";
import { cmpZ, cmpLogPmf, bivCmpLogPmf, dispersionUpdate, jointLogLoss } from "./2409-17129v1-bayesian-bivariate-conwaymaxwellpoisson-regression-model";

describe("2409-17129v1 bivariate CMP totals model", () => {
  it("CMP reduces to Poisson at nu=1", () => {
    // Poisson(3) P(X=2) = e^-3 3^2/2
    const poisson = Math.exp(-3) * 9 / 2;
    expect(Math.exp(cmpLogPmf(2, 3, 1))).toBeCloseTo(poisson, 6);
    expect(() => cmpLogPmf(2, -1, 1)).toThrow();
  });
  it("bivariate pmf sums to ~1", () => {
    let z = 0;
    for (let x1 = 0; x1 <= 12; x1++)
      for (let x2 = 0; x2 <= 12; x2++) z += Math.exp(bivCmpLogPmf(x1, x2, 2, 2, 1, 1));
    expect(z).toBeCloseTo(1, 2);
    expect(() => bivCmpLogPmf(-1, 2, 1, 1, 1, 1)).toThrow();
  });
  it("dispersion update and joint log-loss", () => {
    expect(dispersionUpdate(1, 0.5, 0.1)).toBeGreaterThan(1);
    expect(dispersionUpdate(1, -0.5, 0.1)).toBeLessThan(1);
    const ll = jointLogLoss([{ x1: 3, x2: 2 }, { x1: 1, x2: 4 }], 2, 2, 0.5, 1);
    expect(Number.isFinite(ll)).toBe(true);
    expect(() => jointLogLoss([], 1, 1, 1, 1)).toThrow();
    expect(() => dispersionUpdate(0, 1, 0.1)).toThrow();
  });
});
