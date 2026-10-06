import { describe, expect, it } from "vitest";
import { fitSqrtKFrontier, kFromBudget, biasCurve, kFrontierGatePasses, GSE_K_FRONTIER_ENABLED } from "./k-scaling-frontier-2410.js";

describe("k scaling frontier", () => {
  it("fits a perfect sqrt(K) line with R^2 = 1", () => {
    const pts = [4, 9, 16, 25].map((k) => ({ k, dispersion: 10 + 2 * Math.sqrt(k) }));
    const f = fitSqrtKFrontier(pts);
    expect(f.r2).toBeCloseTo(1, 8);
    expect(f.b).toBeCloseTo(2, 8);
  });
  it("inverts the frontier for a target dispersion", () => {
    expect(kFromBudget(14, { a: 10, b: 2 })).toBeCloseTo(4, 8);
    expect(kFromBudget(5, { a: 10, b: 2 })).toBe(0); // below intercept -> no valid K
  });
  it("bias curve averages expected-minus-realized wins", () => {
    const b = biasCurve(
      [{ finalElo: 1600, nextSeasonWins: 9 }, { finalElo: 1600, nextSeasonWins: 11 }],
      () => 10,
    );
    expect(b.meanBias).toBeCloseTo(0, 10);
    expect(b.n).toBe(2);
    expect(biasCurve([], () => 10).meanBias).toBe(0);
  });
  it("gate needs R^2 >= 0.6", () => {
    expect(kFrontierGatePasses(0.7)).toBe(true);
    expect(kFrontierGatePasses(0.5)).toBe(false);
  });
  it("stays off until the frontier fit clears", () => {
    expect(GSE_K_FRONTIER_ENABLED).toBe(false);
  });
  it("handles empty input", () => {
    expect(fitSqrtKFrontier([])).toEqual({ r2: 0, a: 0, b: 0 });
    expect(biasCurve([], (e) => e / 100)).toEqual({ meanBias: 0, n: 0 });
  });
  it("handles edge inputs", () => {
    // single point: no slope information, intercept = the point
    const one = fitSqrtKFrontier([{ k: 4, dispersion: 2 }]);
    expect(one.b).toBe(0);
    expect(one.a).toBeCloseTo(2, 10);
    // zero slope inverts to zero K
    expect(kFromBudget(1.5, { a: 0, b: 0 })).toBe(0);
    // target below the frontier floor clamps to 0
    expect(kFromBudget(-5, { a: 1, b: 2 })).toBe(0);
  });
});

