import { describe, it, expect } from "vitest";
import {
  bcaMeanCi,
  percentileMeanCi,
  normalCdf,
  normalQuantile,
} from "../performance-ci.js";

/**
 * BCa performance CIs for continuous ROI/units — the honest uncertainty band on
 * the public ledger. These pin the math (Efron BCa), the DETERMINISM (a public
 * CI must reproduce), and the honest behavior (a 55% even-odds record does NOT
 * yet prove profitability once uncertainty is shown).
 */

describe("normalCdf / normalQuantile", () => {
  it("match known standard-normal values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 3);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 4);
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6);
  });
});

describe("bcaMeanCi", () => {
  // 55 wins (+1) / 45 losses (-1) at even money -> +0.10 units per bet.
  const evenOdds55 = [...Array(55).fill(1), ...Array(45).fill(-1)];

  it("brackets the point estimate and reports the observed mean", () => {
    const ci = bcaMeanCi(evenOdds55, { resamples: 4000, seed: 1 })!;
    expect(ci.point).toBeCloseTo(0.1, 6);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
    expect(ci.n).toBe(100);
  });

  it("is HONEST: a 55/100 even-odds record has a lower bound below break-even (0)", () => {
    // The point is +0.10 units, but the 95% band's lower edge is still negative:
    // we cannot yet claim profitability. This is the whole reason to show the CI.
    const ci = bcaMeanCi(evenOdds55, { resamples: 6000, seed: 7 })!;
    expect(ci.low).toBeLessThan(0);
    expect(ci.high).toBeGreaterThan(0.1);
  });

  it("is DETERMINISTIC: same data + seed -> identical interval (auditable)", () => {
    const a = bcaMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    const b = bcaMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    expect(a.low).toBe(b.low);
    expect(a.high).toBe(b.high);
  });

  it("contains the true mean for a clean symmetric sample", () => {
    const ci = bcaMeanCi(evenOdds55, { resamples: 8000, seed: 3 })!;
    expect(ci.low).toBeLessThanOrEqual(0.1);
    expect(ci.high).toBeGreaterThanOrEqual(0.1);
  });

  it("BCa applies a material skew correction on right-skewed data (longshots)", () => {
    // Varied longshot profile: many small losses, a few varied big wins ->
    // right-skewed and continuous (so the correction is meaningful, not a
    // discrete-ties artifact). BCa's acceleration must be materially non-zero,
    // which is the whole reason BCa beats the plain percentile method here.
    const skewed = [
      -1, -1.2, -0.8, -1, -1.1, -0.9, -1, -1.3, -0.7, -1,
      -1, -0.9, -1.1, -1, -1.2, -0.8, -1, -1, -1.1, -0.9,
      6, 8, 5, 11, 7, 9, 4, 12,
    ];
    const ci = bcaMeanCi(skewed, { resamples: 6000, seed: 9 })!;
    expect(Math.abs(ci.acceleration)).toBeGreaterThan(0.001);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
  });

  it("returns null for too-little data and a point interval for zero variance", () => {
    expect(bcaMeanCi([0.5], {})).toBeNull();
    const flat = bcaMeanCi([2, 2, 2, 2, 2], { resamples: 500, seed: 1 })!;
    expect(flat.low).toBe(2);
    expect(flat.high).toBe(2);
  });
});

describe("bcaCi general statistic (the confound-adjusted-edge bridge)", () => {
  it("works on a non-mean statistic (median) and brackets it", async () => {
    const { bcaCi } = await import("../performance-ci.js");
    const median = (xs: readonly number[]): number => {
      const s = [...xs].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
    };
    const data = [-2, -1, -1, 0, 0, 0, 1, 1, 2, 5, 8, -3, 0, 1, -1, 0, 2, -2, 1, 0];
    const ci = bcaCi(data, median, { resamples: 4000, seed: 5 })!;
    expect(ci.low).toBeLessThanOrEqual(ci.point);
    expect(ci.high).toBeGreaterThanOrEqual(ci.point);
    expect(ci.n).toBe(20);
  });

  it("a plug-in confound-adjusted statistic flows through unchanged", async () => {
    const { bcaCi } = await import("../performance-ci.js");
    // Toy 'adjusted edge': mean return minus a volatility penalty (variance).
    // The point is only that ANY statistic composes; the machinery is agnostic.
    const adjustedEdge = (xs: readonly number[]): number => {
      const m = xs.reduce((s, x) => s + x, 0) / xs.length;
      const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
      return m - 0.1 * v;
    };
    const ci = bcaCi([1, -1, 1, -1, 1, 1, -1, 2, -2, 1], adjustedEdge, { resamples: 3000, seed: 11 })!;
    expect(Number.isFinite(ci.point)).toBe(true);
    expect(ci.low).toBeLessThanOrEqual(ci.high);
  });
});
