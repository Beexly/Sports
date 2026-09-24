import { describe, it, expect } from "vitest";
import {
  sesForecast,
  trailingMean,
  rollingOriginMae,
  availabilityProb,
  lineupForecastGain,
} from "./1909-12938v1-ts-forecast-dfs-optimizer.js";

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

describe("tsf", () => {
  it("sesForecast adapts to level shifts faster than trailing mean", () => {
    const xs = [...new Array<number>(20).fill(10), ...new Array<number>(20).fill(20)];
    const ses = sesForecast(xs.slice(0, 25), 0.5);
    const tm = trailingMean(xs.slice(0, 25), 10);
    expect(Math.abs(ses - 20)).toBeLessThan(Math.abs(tm - 20));
  });
  it("rollingOriginMae favors the better forecaster on trending data", () => {
    const rand = mulberry32(461);
    const xs = Array.from({ length: 60 }, (_, i) => i * 0.5 + randnTsf(rand));
    const maeSes = rollingOriginMae(xs, (h) => sesForecast(h, 0.6), 20);
    const maeTm = rollingOriginMae(xs, (h) => trailingMean(h, 5), 20);
    expect(maeSes).toBeLessThan(maeTm);
  });
  it("availabilityProb separates high/low workload", () => {
    const hi = availabilityProb([30, 1], [-2, -0.1, -0.5]);
    const lo = availabilityProb([5, 0], [-2, -0.1, -0.5]);
    expect(hi).toBeLessThan(lo);
    expect(hi).toBeGreaterThan(0);
    expect(hi).toBeLessThan(1);
  });
  it("lineupForecastGain measures relative improvement", () => {
    expect(lineupForecastGain([110, 120], [100, 100])).toBeCloseTo(0.15, 8);
  });
});

function randnTsf(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
