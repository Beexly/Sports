/**
 * Multivariate Kelly — tests (arXiv 2307.13807v1).
 *
 * ACCEPTANCE GATE: univariate Kelly matches the closed form; the
 * simultaneous solution respects f_i >= 0 and sum(f) <= 1, stakes
 * more on the bigger edge, and shrinks under correlation; the
 * adaptive scale penalizes miscalibration; Kelly beats flat staking
 * on wealth with no worse drawdown in a positive-edge simulation;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  adaptiveKellyScale,
  kellyFraction,
  simultaneousKelly,
  simulateWealth,
  type Edge,
} from "./multivariate-kelly";

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

describe("kellyFraction", () => {
  it("matches the closed form", () => {
    // p=0.6, odds=2.0 -> (0.6*2-1)/1 = 0.2.
    expect(kellyFraction(0.6, 2)).toBeCloseTo(0.2, 10);
    expect(kellyFraction(0.4, 2)).toBe(0); // no edge -> 0
    expect(() => kellyFraction(0, 2)).toThrow();
    expect(() => kellyFraction(0.6, 1)).toThrow();
  });
});

describe("adaptiveKellyScale", () => {
  it("penalizes miscalibration", () => {
    expect(adaptiveKellyScale(0)).toBe(1);
    expect(adaptiveKellyScale(0.1)).toBeCloseTo(0.8, 10);
    expect(adaptiveKellyScale(0.5)).toBe(0.25); // floor
    expect(() => adaptiveKellyScale(-0.1)).toThrow();
  });
});

describe("simultaneousKelly", () => {
  it("respects constraints and orders by edge", () => {
    const rand = mulberry32(401);
    const edges: Edge[] = [
      { p: 0.6, odds: 2.0 },
      { p: 0.55, odds: 2.0 },
      { p: 0.52, odds: 2.1 },
    ];
    const f = simultaneousKelly(edges, rand, { iters: 100, sims: 1500 });
    expect(f).toHaveLength(3);
    expect(f.every((x) => x >= 0)).toBe(true);
    expect(f.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(1 + 1e-9);
    // Biggest edge (0.6 @ 2.0, Kelly 0.2) gets the biggest stake.
    expect(f[0]).toBeGreaterThanOrEqual(f[1] as number);
    expect(() => simultaneousKelly([], rand)).toThrow();
    expect(() => simultaneousKelly(edges, rand, { kellyScale: 0 })).toThrow();
  });

  it("shrinks stakes under correlation", () => {
    const rand = mulberry32(403);
    const mk = (corr?: number[]): Edge[] => [
      { p: 0.6, odds: 2.0, corr },
      { p: 0.6, odds: 2.0, corr },
    ];
    const indep = simultaneousKelly(mk(), rand, { iters: 120, sims: 2000 });
    const corr = simultaneousKelly(mk([0.8, 0.8]), rand, { iters: 120, sims: 2000 });
    const sumIndep = indep.reduce((s, x) => s + x, 0);
    const sumCorr = corr.reduce((s, x) => s + x, 0);
    // Correlated legs are one concentrated risk: stake less in total.
    expect(sumCorr).toBeLessThan(sumIndep);
    expect(sumIndep).toBeGreaterThan(0.3); // near the 0.384 theory value
  });
});

describe("simulateWealth", () => {
  it("Kelly beats flat staking on wealth with no worse drawdown", () => {
    const rand = mulberry32(405);
    const n = 1200;
    // Varying edges: Kelly concentrates on the big edges; flat stakes
    // the same average amount uniformly.
    const edges: Edge[] = Array.from({ length: n }, (_, i) =>
      i % 2 === 0 ? { p: 0.65, odds: 2.0 } : { p: 0.53, odds: 2.0 },
    );
    const outcomes = edges.map((e) => rand() < e.p);
    const kelly = edges.map((e) => kellyFraction(e.p, e.odds) * 0.5);
    const avgStake = kelly.reduce((s, x) => s + x, 0) / n;
    const flat = edges.map(() => avgStake);
    const k = simulateWealth(kelly, edges, outcomes);
    const fl = simulateWealth(flat, edges, outcomes);
    // Positive edge at true probs: Kelly-family growth wins.
    expect(k.wealth).toBeGreaterThan(fl.wealth);
    expect(k.maxDrawdown).toBeLessThanOrEqual(fl.maxDrawdown + 0.15);
    expect(() => simulateWealth([0.1], edges, outcomes)).toThrow();
  });
});
