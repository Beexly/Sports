import { describe, it, expect } from "vitest";
import {
  mixturePool,
  productPool,
  interpolatedPool,
  updateWealth,
  logLoss,
  fitAlpha,
} from "./1106-4509-ml-market-pooling.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("interpolatedPool", () => {
  const members = [
    [0.8, 0.2],
    [0.4, 0.6],
  ];
  const weights = [0.7, 0.3];
  it("recovers the mixture at alpha=0 and the product pool at alpha=1", () => {
    const mix = interpolatedPool(members, weights, 0);
    const prod = interpolatedPool(members, weights, 1);
    expect(mix[0]).toBeCloseTo(0.7 * 0.8 + 0.3 * 0.4, 10);
    const p0 = Math.pow(0.8, 0.7) * Math.pow(0.4, 0.3);
    const p1 = Math.pow(0.2, 0.7) * Math.pow(0.6, 0.3);
    expect(prod[0]).toBeCloseTo(p0 / (p0 + p1), 10);
  });
  it("always returns a valid probability vector", () => {
    for (const a of [0, 0.25, 0.5, 0.75, 1]) {
      const p = interpolatedPool(members, weights, a);
      expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
      expect(p.every((x) => x > 0)).toBe(true);
    }
  });
});

describe("updateWealth", () => {
  it("concentrates wealth on the historically accurate model", () => {
    let wealth = [0.5, 0.5];
    // model 0 assigns 0.8 to the realized outcome every round; model 1 assigns 0.2
    for (let r = 0; r < 20; r++) wealth = updateWealth(wealth, [0.8, 0.2]);
    expect(wealth[0]).toBeGreaterThan(0.99);
  });
  it("keeps wealth normalized", () => {
    const w = updateWealth([0.3, 0.7], [0.6, 0.4]);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  });
});

describe("fitAlpha", () => {
  it("fits alpha near 1 when the DGP is the product pool", () => {
    const rand = mulberry32(42);
    const members: number[][][] = [];
    const outcomes: number[] = [];
    const weights = [0.5, 0.5];
    for (let e = 0; e < 600; e++) {
      // strongly disagreeing members: mixture and product pools differ sharply
      const m: number[][] = [
        [0.9, 0.1],
        [0.2, 0.8],
      ];
      members.push(m);
      const truth = productPool(m, weights);
      outcomes.push(rand() < truth[0]! ? 0 : 1);
    }
    const fit = fitAlpha(members, outcomes, weights);
    const mixLoss =
      members.reduce((s, m, e) => s + logLoss(mixturePool(m, weights), outcomes[e]!), 0) /
      members.length;
    expect(fit.alpha).toBeGreaterThan(0.7);
    expect(fit.avgLogLoss).toBeLessThan(mixLoss);
  });
});
