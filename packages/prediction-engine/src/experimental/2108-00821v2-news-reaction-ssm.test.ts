import { describe, it, expect } from "vitest";
import {
  solveLinear,
  ridgeFit,
  ridgePredict,
  arxFit,
  adjustedPlusMinus,
  AR1State,
  ar1Update,
  ar1Forecast,
  ouForecast,
  ouWinProb,
  brownianWinProb,
} from "./2108-00821v2-news-reaction-ssm.js";

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

describe("ridge", () => {
  it("ridgeFit recovers coefficients and shrinks vs OLS", () => {
    const rand = mulberry32(81);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 300; i++) {
      const x1 = randn(rand);
      const x2 = randn(rand);
      X.push([1, x1, x2]);
      y.push(2 * x1 - x2 + randn(rand) * 0.5);
    }
    const b = ridgeFit(X, y, 1.0);
    expect(Math.abs(b[1]! - 2)).toBeLessThan(0.2);
    expect(Math.abs(b[2]! + 1)).toBeLessThan(0.2);
    const b0 = ridgeFit(X, y, 1e-9);
    const bBig = ridgeFit(X, y, 1e6);
    expect(Math.abs(bBig[1]!)).toBeLessThan(Math.abs(b0[1]!));
  });
  it("arxFit captures AR(1) dynamics", () => {
    const rand = mulberry32(82);
    const Y: number[] = [];
    let v = 0;
    for (let t = 0; t < 500; t++) {
      v = 0.7 * v + randn(rand);
      Y.push(v);
    }
    const b = arxFit(Y, [], 1, 0.1);
    expect(Math.abs(b[1]! - 0.7)).toBeLessThan(0.08);
  });
  it("adjustedPlusMinus ranks the true best player first", () => {
    const rand = mulberry32(83);
    const truth = [3, 1, -1, -2, 0.5];
    const presence: number[][] = [];
    const margin: number[] = [];
    for (let s = 0; s < 800; s++) {
      const row = truth.map(() => (rand() < 0.5 ? 1 : -1));
      const m = row.reduce((a, r, i) => a + r * truth[i]!, 0) + randn(rand);
      presence.push(row);
      margin.push(m);
    }
    const est = adjustedPlusMinus(presence, margin, 5);
    const best = est.indexOf(Math.max(...est));
    expect(best).toBe(0);
  });
});

describe("kalman", () => {
  it("ar1 filter beats raw observations on a momentum process", () => {
    const rand = mulberry32(131);
    const phi = 0.9;
    let x = 0;
    let s: AR1State = { level: 0, variance: 1 };
    let mseF = 0;
    let mseR = 0;
    const n = 400;
    for (let t = 0; t < n; t++) {
      x = phi * x + randn(rand) * 0.5;
      const y = x + randn(rand);
      s = ar1Update(s, y, phi, 0.25, 1);
      mseF += (s.level - x) ** 2;
      mseR += (y - x) ** 2;
    }
    expect(mseF / n).toBeLessThan((mseR / n) * 0.8);
    expect(s.variance).toBeLessThan(1);
  });
  it("ouWinProb is monotone in lead and time", () => {
    expect(ouWinProb(7, 0.5, 8, 30)).toBeGreaterThan(ouWinProb(0, 0.5, 8, 30));
    expect(ouWinProb(7, 0.5, 8, 5)).toBeGreaterThan(ouWinProb(7, 0.5, 8, 55));
    expect(ouWinProb(0, 0.5, 8, 30)).toBeCloseTo(0.5, 6);
  });
  it("ouForecast mean-reverts", () => {
    const f = ouForecast(10, 1, 0, 2, 5);
    expect(f.mean).toBeLessThan(10);
    expect(f.mean).toBeGreaterThan(0);
  });
});
