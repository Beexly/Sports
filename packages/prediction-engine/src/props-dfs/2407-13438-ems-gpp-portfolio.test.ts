import { describe, it, expect } from "vitest";
import {
  expectedMax2,
  emaxPortfolioGreedy,
  orderStatFeatures,
  unanimityShortlist,
  agreementThreshold,
  shortlistPrecision,
} from "./2407-13438-ems-gpp-portfolio.js";

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

describe("emax", () => {
  it("expectedMax2 matches Monte Carlo", () => {
    const rand = mulberry32(371);
    const mu1 = 100;
    const mu2 = 95;
    const s1 = 20;
    const s2 = 25;
    const rho = 0.4;
    const closed = expectedMax2(mu1, mu2, s1, s2, rho);
    const n = 60000;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const z1 = randn(rand);
      const z2 = randn(rand);
      const x = mu1 + s1 * z1;
      const y = mu2 + s2 * (rho * z1 + Math.sqrt(1 - rho * rho) * z2);
      s += Math.max(x, y);
    }
    expect(Math.abs(closed - s / n)).toBeLessThan(0.6);
    expect(closed).toBeGreaterThan(Math.max(mu1, mu2));
  });
  it("expectedMax2 reduces to max of means when variance -> 0", () => {
    expect(expectedMax2(100, 95, 1e-9, 1e-9, 0)).toBeCloseTo(100, 3);
  });
  it("emaxPortfolioGreedy picks k distinct entries", () => {
    const mus = [100, 98, 96, 94, 92];
    const sigmas = [20, 20, 20, 20, 20];
    const rhos = mus.map(() => mus.map(() => 0.3));
    const chosen = emaxPortfolioGreedy(mus, sigmas, rhos, 3);
    expect(chosen.length).toBe(3);
    expect(new Set(chosen).size).toBe(3);
    expect(chosen[0]).toBe(0); // highest mean first
  });
});

describe("orderstats", () => {
  it("orderStatFeatures sorts descending", () => {
    expect(orderStatFeatures([3, 1, 2])).toEqual([3, 2, 1]);
  });
  it("unanimity is stricter than k-of-M", () => {
    const votes = [[true, true, true], [true, true, false], [false, false, false]];
    expect(unanimityShortlist(votes)).toEqual([0]);
    expect(agreementThreshold(votes, 2)).toEqual([0, 1]);
  });
  it("shortlistPrecision measures hit rate", () => {
    expect(shortlistPrecision([0, 1, 2], new Set([0, 2]))).toBeCloseTo(2 / 3, 10);
  });
});
