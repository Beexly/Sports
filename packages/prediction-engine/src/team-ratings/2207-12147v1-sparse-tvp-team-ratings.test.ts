import { describe, it, expect } from "vitest";
import {
  softThreshold,
  istaLasso,
  tvDenoise1d,
  AR1State,
  ar1Update,
  ar1Forecast,
  ouForecast,
  ouWinProb,
  brownianWinProb,
} from "./2207-12147v1-sparse-tvp-team-ratings.js";

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

describe("sparse", () => {
  it("istaLasso recovers sparse support", () => {
    const rand = mulberry32(431);
    const n = 120;
    const p = 25;
    const bTrue = new Array<number>(p).fill(0);
    bTrue[2] = 3;
    bTrue[7] = -2;
    const X = Array.from({ length: n }, () => Array.from({ length: p }, () => randnSp(rand)));
    const y = X.map((row) => row.reduce((s, x, j) => s + x * bTrue[j]!, 0) + randnSp(rand) * 0.1);
    const b = istaLasso(X, y, 0.15, 400);
    expect(Math.abs(b[2]!)).toBeGreaterThan(1.5);
    expect(Math.abs(b[7]!)).toBeGreaterThan(1);
    const spurious = b.filter((_, j) => j !== 2 && j !== 7).filter((v) => Math.abs(v) > 0.3);
    expect(spurious.length).toBeLessThan(4);
  });
  it("tvDenoise1d smooths while preserving jumps", () => {
    const rand = mulberry32(432);
    const y = Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 5) + randnSp(rand) * 0.5);
    const x = tvDenoise1d(y, 2.0);
    const left = x.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
    const right = x.slice(35).reduce((a, b) => a + b, 0) / 25;
    expect(right - left).toBeGreaterThan(3);
  });
});

function randnSp(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

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
