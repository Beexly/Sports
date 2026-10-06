import { describe, expect, it } from "vitest";
import {
  luckDepthProb, meanLogLikelihood, fitLuckDepth, luckDepthGainPerGame,
  GSE_LUCK_DEPTH_BT_ENABLED,
} from "./luck-depth-bt-2312.js";

describe("luck+depth BT", () => {
  it("reduces to plain BT at alpha=0", () => {
    expect(luckDepthProb(1, 0, { alpha: 0, beta: 1 })).toBeCloseTo(1 / (1 + Math.exp(-1)), 10);
  });
  it("alpha bounds the probability away from 0/1 (irreducible upset rate)", () => {
    // even at infinite strength difference the upset rate never vanishes
    const p = luckDepthProb(100, -100, { alpha: 0.2, beta: 1 });
    expect(p).toBeCloseTo(1 - 0.2 / 2, 12); // saturates at the upper bound, never 1
    expect(p).toBeLessThan(1);
    const q = luckDepthProb(-100, 100, { alpha: 0.2, beta: 1 });
    expect(q).toBeCloseTo(0.2 / 2, 12); // saturates at the lower bound, never 0
    expect(q).toBeGreaterThan(0);
  });
  it("is antisymmetric", () => {
    const a = luckDepthProb(2, 1, { alpha: 0.1, beta: 2 });
    const b = luckDepthProb(1, 2, { alpha: 0.1, beta: 2 });
    expect(a + b).toBeCloseTo(1, 10);
  });
  it("fits alpha/beta on separable data and measures gain", () => {
    const pairs = [
      { i: 0, j: 1, y: 1 }, { i: 0, j: 1, y: 1 }, { i: 1, j: 0, y: 0 },
      { i: 1, j: 0, y: 1 }, // one upset
    ];
    const theta = [1, 0];
    const fitted = fitLuckDepth(pairs, theta);
    expect(fitted.alpha).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(luckDepthGainPerGame(pairs, theta, fitted))).toBe(true);
  });
  it("handles empty pairs", () => {
    expect(meanLogLikelihood([], [0], { alpha: 0, beta: 1 })).toBe(0);
  });
  it("stays off until the walk-forward gate clears", () => {
    expect(GSE_LUCK_DEPTH_BT_ENABLED).toBe(false);
  });
});

