import { describe, it, expect } from "vitest";
import {
  windChill,
  heatIndex,
  passWeatherImpact,
  fgWeatherAdj,
  logistic,
  irlsFit,
  logisticLogLoss,
  stadiumFactorFit,
} from "./2109-09287-stadium-factor-decomposition.js";

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

describe("weather", () => {
  it("windChill cools cold windy days", () => {
    expect(windChill(30, 20)).toBeLessThan(30);
    expect(windChill(60, 20)).toBe(60);
  });
  it("heatIndex warms hot humid days", () => {
    expect(heatIndex(95, 70)).toBeGreaterThan(95);
    expect(heatIndex(70, 70)).toBe(70);
  });
  it("passWeatherImpact grows with wind and rain", () => {
    const calm = passWeatherImpact(70, 5, 0);
    const storm = passWeatherImpact(70, 25, 0.4);
    expect(storm).toBeGreaterThan(calm);
    expect(calm).toBe(0);
  });
  it("fgWeatherAdj penalizes wind and cold", () => {
    expect(fgWeatherAdj(0.85, 25, 20)).toBeLessThan(0.85);
    expect(fgWeatherAdj(0.85, 5, 60)).toBe(0.85);
  });
});

describe("logistic", () => {
  it("irlsFit recovers the true coefficients", () => {
    const rand = mulberry32(91);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const x1 = randn(rand);
      const x2 = randn(rand);
      const p = logistic(-0.5 + 1.5 * x1 - x2);
      X.push([1, x1, x2]);
      y.push(rand() < p ? 1 : 0);
    }
    const b = irlsFit(X, y, 0.5, 60);
    expect(Math.abs(b[1]! - 1.5)).toBeLessThan(0.25);
    expect(Math.abs(b[2]! + 1)).toBeLessThan(0.25);
  });
  it("stadiumFactorFit recenters to sum zero and finds the altitude effect", () => {
    const rand = mulberry32(92);
    const nStad = 4;
    const off: number[] = [];
    const def: number[] = [];
    const stad: number[] = [];
    const y: number[] = [];
    const trueS = [0.6, -0.2, -0.2, -0.2]; // stadium 0 boosts events
    for (let i = 0; i < 4000; i++) {
      const s = Math.floor(rand() * nStad);
      const z = trueS[s]! + randn(rand) * 0.3;
      stad.push(s); off.push(0); def.push(0);
      y.push(rand() < logistic(z) ? 1 : 0);
    }
    const sHat = stadiumFactorFit(off, def, stad, y, nStad, 2);
    const sum = sHat.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-6);
    expect(sHat[0]!).toBeGreaterThan(sHat[1]!);
  });
});
