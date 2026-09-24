import { describe, it, expect } from "vitest";
import {
  complexityProxy,
  complexityCap,
  bootstrapCILowerBound,
  twoGatePass,
} from "./two-gate-policy.js";

/** Seeded PRNG (mulberry32) — deterministic Monte Carlo. */
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

// ============================================================
// arXiv 2510.04399v3 — two-gate policy. Additive invention.
// ============================================================

describe("two-gate policy — 2510.04399v3", () => {
  it("complexityProxy sums the breakdown", () => {
    expect(
      complexityProxy({ freeParams: 5, engineeredFeatures: 3, ruleCount: 2 }),
    ).toBe(10);
  });

  it("complexityCap scales with sqrt(trainingSize)", () => {
    expect(complexityCap(100)).toBeCloseTo(10, 10);
    expect(complexityCap(400)).toBeCloseTo(20, 10);
    expect(complexityCap(0)).toBe(0);
  });

  it("bootstrapCILowerBound is below the mean and above the min", () => {
    const deltas = [0.004, 0.005, 0.003, 0.006, 0.004, 0.005];
    const lb = bootstrapCILowerBound(deltas, 0.05, 500, mulberry32(3));
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    expect(lb).toBeLessThan(mean);
    expect(lb).toBeGreaterThan(Math.min(...deltas) - 1e-9);
    expect(bootstrapCILowerBound([], 0.05)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("twoGatePass promotes a strong simple candidate", () => {
    const deltas = [0.004, 0.005, 0.003, 0.006, 0.004, 0.005];
    const r = twoGatePass(
      deltas,
      { freeParams: 2, engineeredFeatures: 1, ruleCount: 1 },
      10000,
      0.001,
      0.05,
      500,
      mulberry32(3),
    );
    expect(r.gate1Pass).toBe(true);
    expect(r.gate2Pass).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("twoGatePass rejects on a weak lower bound (point estimate fooled)", () => {
    // One lucky fold, rest weak: mean > margin but lower bound < margin.
    const deltas = [0.05, 0.0001, 0.0002, -0.0001, 0.0001, 0.0002];
    const r = twoGatePass(
      deltas,
      { freeParams: 1, engineeredFeatures: 0, ruleCount: 0 },
      10000,
      0.001,
      0.05,
      2000,
      mulberry32(11),
    );
    expect(r.gate1Pass).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("twoGatePass rejects an over-complex candidate", () => {
    const deltas = [0.004, 0.005, 0.003, 0.006, 0.004, 0.005];
    const r = twoGatePass(
      deltas,
      { freeParams: 50, engineeredFeatures: 40, ruleCount: 30 },
      100, // cap = 10 < 120
      0.001,
      0.05,
      500,
      mulberry32(3),
    );
    expect(r.gate1Pass).toBe(true);
    expect(r.gate2Pass).toBe(false);
    expect(r.pass).toBe(false);
  });
});
