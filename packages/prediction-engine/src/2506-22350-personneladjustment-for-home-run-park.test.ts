/**
 * Vitest suite for arXiv:2506.22350 (Personnel-adjustment for home run park effects in Major League Baseball).
 * Gate: ADAPT the elsewhere-covariate method if OOS totals RMSE improves >=0.3 points over raw venue means and >=3 stadiums move >=5 rank places between raw and adjusted scoring-friendliness.
 */
import { describe, it, expect } from "vitest";
import { residualize, clusterDml } from "./2506-22350-personneladjustment-for-home-run-park";

describe("2506-22350 cluster-robust DML", () => {
  it("recovers the treatment effect with clustered SEs", () => {
    // y = 2*d + x + noise, clusters alternate
    const y: number[] = [];
    const d: number[] = [];
    const X: number[][] = [];
    const cl: number[] = [];
    for (let i = 0; i < 60; i++) {
      const xi = (i % 10) / 10;
      const di = i % 2;
      X.push([1, xi]);
      d.push(di);
      y.push(2 * di + xi + ((i * 13) % 7 - 3) * 0.01);
      cl.push(i % 6);
    }
    const yR = residualize(y, X);
    const dR = residualize(d, X);
    const { theta, se } = clusterDml(yR, dR, cl);
    expect(theta).toBeCloseTo(2, 0);
    expect(se).toBeGreaterThan(0);
    expect(() => clusterDml([], [], [])).toThrow();
    expect(() => clusterDml([1], [0], [0])).toThrow(); // no variation
  });
});
