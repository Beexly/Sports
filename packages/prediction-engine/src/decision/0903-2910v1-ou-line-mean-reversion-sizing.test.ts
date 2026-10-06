// Tests for decision/0903-2910v1-ou-line-mean-reversion-sizing.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  fitOuProcess,
  ouAdjustedStake,
  capClusterStakes,
  ouStabilityRejectRate,
  ouStabilityGatePasses,
} from "./0903-2910v1-ou-line-mean-reversion-sizing.js";

/** Deterministic PRNG (mulberry32) for synthetic OU paths. */
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

function synthOuPath(b: number, m: number, sigma: number, dt: number, n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const xs: number[] = [m];
  for (let i = 0; i < n; i++) {
    const prev = xs[i]!;
    // Box-Muller from the uniform PRNG.
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    xs.push(prev + b * (m - prev) * dt + sigma * Math.sqrt(dt) * z);
  }
  return xs;
}

describe("fitOuProcess (0903.2910v1)", () => {
  it("recovers b and sigma from a synthetic OU path", () => {
    const xs = synthOuPath(0.8, 0, 0.5, 0.05, 4000, 42);
    const fit = fitOuProcess(xs, 0.05);
    expect(fit.b).toBeGreaterThan(0); // mean-reverting detected
    expect(Math.abs(fit.b - 0.8)).toBeLessThan(0.25);
    expect(Math.abs(fit.sigma - 0.5)).toBeLessThan(0.1);
    expect(fit.rSquared).toBeGreaterThan(0);
  });
  it("handles degenerate input", () => {
    const fit = fitOuProcess([1, 1], 1);
    expect(fit.n).toBeLessThan(3);
    expect(fit.b).toBe(0);
  });
});

describe("ouAdjustedStake", () => {
  it("scales with deviation/sigma^2 and clips at the base Kelly fraction", () => {
    const base = 0.25;
    expect(ouAdjustedStake(0.5, 1, base)).toBeCloseTo(0.25, 10); // 0.5/1 = 0.5 -> clipped to 0.25
    expect(ouAdjustedStake(0.5, 1, base)).toBeLessThanOrEqual(base);
    expect(ouAdjustedStake(0.1, 2, base)).toBeCloseTo(0.025, 10); // 0.1/4
    expect(ouAdjustedStake(-0.5, 1, base)).toBe(0); // never bets the wrong way
    expect(ouAdjustedStake(0.5, 0, base)).toBe(0); // sigma<=0 -> 0
  });
  it("bets bigger when the line moved against GSE's number", () => {
    const small = ouAdjustedStake(0.1, 1, 0.25);
    const big = ouAdjustedStake(0.4, 1, 0.25);
    expect(big).toBeGreaterThan(small);
  });
});

describe("capClusterStakes", () => {
  it("caps a correlated cluster at the single-pick fraction", () => {
    const capped = capClusterStakes([0.2, 0.2, 0.2], 0.25);
    const total = capped.reduce((a, s) => a + s, 0);
    expect(total).toBeCloseTo(0.25, 10);
  });
  it("leaves an under-cap cluster untouched", () => {
    expect(capClusterStakes([0.05, 0.05], 0.25)).toEqual([0.05, 0.05]);
  });
});

describe("ouStabilityGatePasses", () => {
  it("rejects when b_hat sign flips on >20% of markets", () => {
    // 3 markets: two stable, one flip-flopping.
    const stable = [[0.5, 0.6, 0.55], [0.4, 0.45, 0.5]];
    const flippy = [[0.5, -0.4, 0.3, -0.2]];
    expect(ouStabilityGatePasses(stable)).toBe(true);
    expect(ouStabilityRejectRate(flippy)).toBeGreaterThan(0.2);
    expect(ouStabilityGatePasses(flippy)).toBe(false);
  });
});
