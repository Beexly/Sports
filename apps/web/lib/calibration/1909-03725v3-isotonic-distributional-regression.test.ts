import { describe, expect, it } from "vitest";

import {
  ENABLED,
  crpsFromCdfGrid,
  idrCdf,
  idrFit,
  idrQuantile,
  pava,
} from "@/lib/calibration/1909-03725v3-isotonic-distributional-regression";

describe("isotonic distributional regression", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("pava returns a nondecreasing fit", () => {
    const fit = pava([3, 1, 2, 0.5, 4, 3.5]);
    for (let i = 1; i < fit.length; i++) expect(fit[i]).toBeGreaterThanOrEqual(fit[i - 1]);
    expect(fit.reduce((a, b) => a + b, 0)).toBeCloseTo(14, 10);
  });

  it("IDR conditional quantiles are monotone in the engine covariate", () => {
    // y = x + noise: higher engine quantity -> stochastically larger outcome.
    const xs: number[] = [];
    const ys: number[] = [];
    let s = 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 600; i++) {
      const x = rnd() * 20;
      xs.push(x);
      ys.push(x + (rnd() - 0.5) * 6);
    }
    const gridT = Array.from({ length: 41 }, (_, i) => -5 + i);
    const fit = idrFit(xs, ys, gridT);
    const q50lo = idrQuantile(fit, 4, 0.5);
    const q50hi = idrQuantile(fit, 16, 0.5);
    expect(q50hi).toBeGreaterThan(q50lo);
    // quantiles within one x are ordered
    const q10 = idrQuantile(fit, 10, 0.1);
    const q90 = idrQuantile(fit, 10, 0.9);
    expect(q90).toBeGreaterThan(q10);
  });

  it("IDR CDF is a valid distribution function", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = [1.1, 1.9, 3.2, 3.8, 5.1, 5.9, 7.2, 7.8];
    const gridT = [0, 2, 4, 6, 8, 10];
    const fit = idrFit(xs, ys, gridT);
    const cdfs = gridT.map((t) => idrCdf(fit, 4.5, t));
    for (let i = 1; i < cdfs.length; i++) expect(cdfs[i]).toBeGreaterThanOrEqual(cdfs[i - 1]);
    expect(cdfs[0]).toBeGreaterThanOrEqual(0);
    expect(cdfs[cdfs.length - 1]).toBeLessThanOrEqual(1);
  });

  it("CRPS is zero for a degenerate perfect forecast", () => {
    // Degenerate forecast at y=1.5 on a fine grid: CRPS -> 0 as the grid refines.
    const gridT = Array.from({ length: 101 }, (_, i) => 1.0 + i * 0.01);
    const cdfVals = gridT.map((t) => (t >= 1.5 ? 1 : 0));
    expect(crpsFromCdfGrid(gridT, cdfVals, 1.5)).toBeCloseTo(0, 2);
    // A biased degenerate forecast scores worse.
    const biased = gridT.map((t) => (t >= 2.5 ? 1 : 0));
    expect(crpsFromCdfGrid(gridT, biased, 1.5)).toBeGreaterThan(
      crpsFromCdfGrid(gridT, cdfVals, 1.5),
    );
  });
});
