/**
 * Vitest suite for arXiv:2507.11739v1 (Sparse Identification of Nonlinear Dynamics with Conformal Prediction).
 * Gate: ADOPT if EnbPI 90% bands achieve empirical coverage in [88%, 95%] on the 2025 rolling-origin test with mean width <= the naive baseline AND >=80% of SINDy equation terms survive the feature-CP zero-exclusion check across all 2025 windows.
 */
import { describe, it, expect } from "vitest";
import { sindyFit, featureConformalInterval, survivesZeroExclusion } from "./2507-11739v1-sparse-identification-of-nonlinear-dynamics";

describe("2507-11739v1 SINDy with conformal bands", () => {
  it("recovers the sparse true dynamics", () => {
    // y = 2*x0 - 3*x0*x1 + noise; library [x0, x1, x0*x1, x1^2]
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 60; i++) {
      const x0 = (i - 30) / 10;
      const x1 = ((i * 7) % 13 - 6) / 10;
      X.push([x0, x1, x0 * x1, x1 * x1]);
      y.push(2 * x0 - 3 * x0 * x1 + (i % 3 - 1) * 0.01);
    }
    const c = sindyFit(X, y, 0.5);
    expect(Math.abs(c[0]! - 2)).toBeLessThan(0.3);
    expect(Math.abs(c[2]! + 3)).toBeLessThan(0.3);
    expect(c[1]).toBe(0);
    expect(c[3]).toBe(0);
  });
  it("zero-exclusion keeps significant terms", () => {
    expect(survivesZeroExclusion(featureConformalInterval(2, [0.1, 0.2, 0.15], 0.1))).toBe(true);
    expect(survivesZeroExclusion(featureConformalInterval(0.05, [0.5, 0.6], 0.1))).toBe(false);
    expect(() => featureConformalInterval(1, [], 0.1)).toThrow();
  });
});
