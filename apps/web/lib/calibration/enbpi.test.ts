import { describe, it, expect } from "vitest";
import {
  empiricalQuantile,
  looEnsemblePredictions,
  looResiduals,
  residualWindow,
  seedEarlySeasonWindow,
  enbpiInterval,
  optimizeBeta,
  intervalCoverage,
  retrainTrigger,
} from "@/lib/calibration/enbpi";

// ============================================================
// arXiv 2010.09107 — EnbPI. Additive only.
// ============================================================

describe("EnbPI — 2010.09107", () => {
  it("empiricalQuantile matches the finite-sample rank", () => {
    expect(empiricalQuantile([1, 2, 3, 4], 0.5)).toBe(3);
    expect(empiricalQuantile([], 0.5)).toBe(Number.POSITIVE_INFINITY);
  });

  it("looEnsemblePredictions averages only out-of-bag fits", () => {
    const preds = [
      [10, 20],
      [14, 22],
    ];
    const inBag = [
      [true, false],
      [false, true],
    ];
    expect(looEnsemblePredictions(preds, inBag)).toEqual([14, 20]);
  });

  it("looEnsemblePredictions returns NaN when every fit saw the game", () => {
    const preds = [[10]];
    expect(looEnsemblePredictions(preds, [[true]])[0]).toBeNaN();
  });

  it("looResiduals skips games without LOO predictions", () => {
    expect(looResiduals([5, 6], [4, Number.NaN])).toEqual([1]);
  });

  it("residualWindow takes the trailing slice", () => {
    expect(residualWindow([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
    expect(residualWindow([], 3)).toEqual([]);
  });

  it("seedEarlySeasonWindow concatenates prior then current", () => {
    expect(seedEarlySeasonWindow([1, 2], [3, 4, 5], 4)).toEqual([2, 3, 4, 5]);
  });

  it("enbpiInterval is vacuous on empty residuals (fail-closed)", () => {
    const iv = enbpiInterval(10, [], 0.1);
    expect(iv.lo).toBe(Number.NEGATIVE_INFINITY);
    expect(iv.hi).toBe(Number.POSITIVE_INFINITY);
  });

  it("enbpiInterval at beta 0.5 is symmetric on symmetric residuals", () => {
    const resid = [-2, -1, 0, 1, 2, -2, -1, 0, 1, 2];
    const iv = enbpiInterval(10, resid, 0.2, 0.5);
    expect(iv.lo + iv.hi).toBeCloseTo(20, 6);
  });

  it("optimizeBeta returns a beta in [0,1] that does not widen vs 0.5", () => {
    const resid = [-3, -1, 0, 0.5, 1, 2, 3, -2, 1.5, -0.5];
    const fs = [10, 12, 14];
    const b = optimizeBeta(fs, resid, 0.2);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
    const wOpt = fs.map((f) => {
      const iv = enbpiInterval(f, resid, 0.2, b);
      return iv.hi - iv.lo;
    });
    const wSym = fs.map((f) => {
      const iv = enbpiInterval(f, resid, 0.2, 0.5);
      return iv.hi - iv.lo;
    });
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    expect(mean(wOpt)).toBeLessThanOrEqual(mean(wSym) + 1e-9);
  });

  it("intervalCoverage counts hits", () => {
    const ivs = [
      { lo: 0, hi: 10 },
      { lo: 0, hi: 10 },
    ];
    expect(intervalCoverage(ivs, [5, 11])).toBeCloseTo(0.5, 10);
    expect(intervalCoverage([], [])).toBe(0);
  });

  it("retrainTrigger fires on two consecutive low-coverage weeks", () => {
    expect(retrainTrigger([0.95, 0.7, 0.7], 0.1)).toBe(true);
    expect(retrainTrigger([0.95, 0.7, 0.95], 0.1)).toBe(false);
    expect(retrainTrigger([0.7], 0.1)).toBe(false);
  });
});
