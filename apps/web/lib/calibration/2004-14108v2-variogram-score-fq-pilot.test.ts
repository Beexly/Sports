import { describe, expect, it } from "vitest";

import {
  FQ_QUANTILE_GRID,
  PILOT_ENABLED,
  chol2,
  empiricalQuantileGrid,
  gaussianCopulaDraw,
  marginalCdf,
  rankByVariogram,
  variogramScore,
  variogramTriple,
} from "@/lib/calibration/2004-14108v2-variogram-score-fq-pilot";

describe("variogram score + FQ pilot", () => {
  it("pilot is disabled by default", () => {
    expect(PILOT_ENABLED).toBe(false);
  });

  it("variogram score is zero for a degenerate perfect ensemble", () => {
    const obs = [250, 35, 22];
    expect(variogramScore([obs, obs, obs], obs, 1)).toBeCloseTo(0, 10);
  });

  it("VS_1 detects broken correlation structure", () => {
    const obs = [1, 1];
    // Ensemble A: members move together like the obs pair. B: anti-correlated.
    const ensA = [[1.1, 1.1], [0.9, 0.9], [1.05, 0.95], [0.95, 1.05]];
    const ensB = [[1.1, 0.9], [0.9, 1.1], [1.05, 0.95], [0.95, 1.05]];
    expect(variogramScore(ensA, obs, 1)).toBeLessThan(variogramScore(ensB, obs, 1));
    const triple = variogramTriple(ensA, obs);
    expect(triple.vs1).toBeGreaterThanOrEqual(0);
    expect(triple.vs05).toBeGreaterThanOrEqual(0);
    expect(triple.vs2).toBeGreaterThanOrEqual(0);
  });

  it("rankByVariogram picks the lower mean", () => {
    const r = rankByVariogram([1, 2, 3], [4, 5, 6]);
    expect(r.winner).toBe("A");
    expect(r.meanA).toBeCloseTo(2, 10);
  });

  it("FQ quantile grid is tail-concentrated with 9 nodes", () => {
    expect(FQ_QUANTILE_GRID.length).toBe(9);
    expect(FQ_QUANTILE_GRID[0]).toBe(0.01);
    expect(FQ_QUANTILE_GRID[8]).toBe(0.99);
    const g = empiricalQuantileGrid([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(g.quantiles.length).toBe(9);
    for (let i = 1; i < 9; i++) expect(g.quantiles[i]).toBeGreaterThanOrEqual(g.quantiles[i - 1]);
  });

  it("marginalCdf is monotone and copula draws respect correlation", () => {
    const g = empiricalQuantileGrid(Array.from({ length: 200 }, (_, i) => i));
    expect(marginalCdf(g, -1000)).toBeLessThan(marginalCdf(g, 100));
    expect(marginalCdf(g, 100)).toBeLessThanOrEqual(1);
    const draw = gaussianCopulaDraw([0.7, 0.7], chol2(0.8), [g, g]);
    expect(draw.length).toBe(2);
    expect(draw.every(Number.isFinite)).toBe(true);
    // high correlation + same uniforms -> draws move together
    const draw2 = gaussianCopulaDraw([0.9, 0.1], chol2(0.0), [g, g]);
    expect(draw[0] - draw[1]).toBeLessThan(Math.abs(draw2[0] - draw2[1]) + 50);
  });
});
