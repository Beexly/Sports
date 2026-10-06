import { describe, it, expect } from "vitest";
import {
  pinballLoss,
  meanPinball,
  violationRate,
  quantileCombine,
  quantileRegSGD,
} from "./2104-04918v2-weighted-quantile-combination.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("pinball", () => {
  it("quantile regression recovers the median of symmetric noise", () => {
    const rand = mulberry32(11);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 800; i++) {
      const x = rand() * 4 - 2;
      X.push([1, x]);
      y.push(2 * x + randn(rand));
    }
    const b = quantileRegSGD(X, y, 0.5, 0.02, 60, rand);
    expect(Math.abs(b[1]! - 2)).toBeLessThan(0.25);
    const qs = X.map((xi) => b[0]! + b[1]! * xi[1]!);
    const vr = violationRate(y, qs);
    expect(Math.abs(vr - 0.5)).toBeLessThan(0.08);
  });
  it("pinball loss is minimized at the true quantile", () => {
    const rand = mulberry32(12);
    const ys = Array.from({ length: 2000 }, () => randn(rand));
    const qsTrue = ys.map(() => 0);
    const qsOff = ys.map(() => 1.5);
    expect(meanPinball(ys, qsTrue, 0.5)).toBeLessThan(meanPinball(ys, qsOff, 0.5));
  });
  it("quantileCombine averages level forecasts", () => {
    const out = quantileCombine([[1, 2, 3], [3, 4, 5]], [1, 1]);
    expect(out).toEqual([2, 3, 4]);
  });
});
