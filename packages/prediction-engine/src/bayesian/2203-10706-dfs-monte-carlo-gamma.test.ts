import { describe, it, expect } from "vitest";
import {
  betaUpdate,
  betaMean,
  betaVar,
  wpBlendCell,
  wpBlendLogistic,
  gammaPosteriorShrink,
  expectedMax2,
  emaxPortfolioGreedy,
} from "./2203-10706-dfs-monte-carlo-gamma.js";

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

describe("betabinom", () => {
  it("posterior concentrates on the true rate with data", () => {
    let post = { a: 2, b: 2 };
    const rand = mulberry32(61);
    for (let i = 0; i < 500; i++) {
      const y = rand() < 0.7 ? 1 : 0;
      post = betaUpdate(post.a, post.b, y, 1 - y);
    }
    expect(Math.abs(betaMean(post.a, post.b) - 0.7)).toBeLessThan(0.05);
    expect(betaVar(post.a, post.b)).toBeLessThan(betaVar(2, 2));
  });
  it("wpBlendCell shrinks thin cells toward the prior", () => {
    expect(wpBlendCell(0, 0, 50, 50)).toBeCloseTo(0.5, 10);
    expect(wpBlendCell(9, 10, 50, 50)).toBeLessThan(0.9);
    expect(wpBlendCell(900, 1000, 50, 50)).toBeGreaterThan(0.85);
  });
  it("gamma shrinkage pulls low-sample players to the global mean", () => {
    const shrunk = gammaPosteriorShrink(30, 10, 1.0, 0.5);
    const raw = 30 / 10;
    expect(Math.abs(shrunk - 1.0)).toBeLessThan(Math.abs(raw - 1.0));
  });
});

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
