import { describe, it, expect } from "vitest";
import {
  brierScore,
  logLoss,
  rankedProbScore,
  eceProbs,
  pairedT,
  normalCdfLocal,
  spearman,
  fbeta,
  classWeightedBCE,
} from "./2209-07274v5-convexity-grid-war.js";

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

describe("scoring", () => {
  it("brier/logloss reward the sharper forecaster on synthetic outcomes", () => {
    const rand = mulberry32(7);
    const ps: number[] = [];
    const qs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const pTrue = 0.2 + 0.6 * rand();
      ys.push(rand() < pTrue ? 1 : 0);
      ps.push(Math.min(0.99, Math.max(0.01, pTrue + (rand() - 0.5) * 0.05)));
      qs.push(0.5);
    }
    expect(brierScore(ps, ys)).toBeLessThan(brierScore(qs, ys));
    expect(logLoss(ps, ys)).toBeLessThan(logLoss(qs, ys));
  });
  it("rps is zero for a perfect categorical forecast", () => {
    expect(rankedProbScore([0, 0, 1, 0], 2)).toBeCloseTo(0, 10);
    expect(rankedProbScore([0.25, 0.25, 0.25, 0.25], 2)).toBeGreaterThan(0);
  });
  it("pairedT detects a real mean shift", () => {
    const rand = mulberry32(8);
    const diffs = Array.from({ length: 500 }, () => 0.05 + randn(rand) * 0.2);
    const { t, p } = pairedT(diffs);
    expect(t).toBeGreaterThan(2);
    expect(p).toBeLessThan(0.05);
    const null_ = Array.from({ length: 500 }, () => randn(rand) * 0.2);
    expect(pairedT(null_).p).toBeGreaterThan(0.01);
  });
  it("spearman recovers monotone association", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    expect(spearman(xs, ys)).toBeCloseTo(1, 8);
  });
  it("fbeta weights recall when beta > 1", () => {
    expect(fbeta(0.9, 0.5, 2)).toBeLessThan(fbeta(0.5, 0.9, 2));
  });
});
