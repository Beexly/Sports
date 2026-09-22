
import { describe, expect, it } from "vitest";
import { idrMedian, idrPredictiveCdf, mafterWindowWeights, pava } from "./idr-postprocess";

describe("idr-postprocess", () => {
  it("pava returns a nondecreasing fit", () => {
    const fit = pava([3, 1, 2, 5, 4]);
    for (let i = 1; i < fit.length; i++) expect(fit[i] ?? 0).toBeGreaterThanOrEqual((fit[i - 1] ?? 0) - 1e-12);
    expect(fit.reduce((s, v) => s + v, 0)).toBeCloseTo(15, 8);
  });
  it("IDR CDF is monotone in the threshold and in [0,1]", () => {
    const calX = [1, 2, 3, 4, 5, 6];
    const calY = [1.1, 1.9, 3.2, 3.8, 5.1, 5.9];
    const cdf = idrPredictiveCdf(calX, calY, 3.5, [0, 2, 4, 6, 8]);
    for (let i = 1; i < cdf.length; i++) expect(cdf[i] ?? 0).toBeGreaterThanOrEqual((cdf[i - 1] ?? 0) - 1e-12);
    expect(Math.min(...cdf)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...cdf)).toBeLessThanOrEqual(1);
  });
  it("IDR median tracks the conditional center", () => {
    const calX = [1, 2, 3, 4, 5, 6];
    const calY = [1.1, 1.9, 3.2, 3.8, 5.1, 5.9];
    const thresholds = [0, 1, 2, 3, 4, 5, 6, 7];
    const med = idrMedian(idrPredictiveCdf(calX, calY, 5.5, thresholds), thresholds);
    expect(med).toBeGreaterThanOrEqual(4);
  });
  it("mafter weights favor low-loss windows and sum to 1", () => {
    const w = mafterWindowWeights([0.1, 0.5, 1.0]);
    expect(w[0]).toBeGreaterThan(w[2] ?? 0);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    expect(mafterWindowWeights([])).toEqual([]);
  });
  it("edge cases throw on empty calibration", () => {
    expect(() => idrPredictiveCdf([], [], 1, [1])).toThrow();
  });
});
