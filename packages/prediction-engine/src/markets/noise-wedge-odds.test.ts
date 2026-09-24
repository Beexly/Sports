/**
 * Fair odds for noisy probabilities — tests (arXiv 1811.12516).
 *
 * ACCEPTANCE GATE: zero epsilon -> zero wedge (raw 1/P_C recovered);
 * wedge grows with epsilon; favorites get longer odds, longshots shorter.
 */
import { describe, expect, it } from "vitest";
import {
  estimateEpsilon,
  fairOddsNoisy,
  longshotFilter,
  noiseWedge,
  normInv,
} from "./noise-wedge-odds";

describe("estimateEpsilon", () => {
  it("is zero for identical members and grows with dispersion", () => {
    expect(estimateEpsilon([0.6, 0.6, 0.6, 0.6])).toBeCloseTo(0, 12);
    const tight = estimateEpsilon([0.59, 0.6, 0.61, 0.6]);
    const wide = estimateEpsilon([0.5, 0.6, 0.7, 0.6]);
    expect(wide).toBeGreaterThan(tight);
    expect(tight).toBeGreaterThan(0);
  });

  it("normalizes by min(P_C, 1-P_C): same sd near the boundary -> bigger epsilon", () => {
    const mid = estimateEpsilon([0.48, 0.52, 0.5, 0.5]);
    const nearEdge = estimateEpsilon([0.88, 0.92, 0.9, 0.9]);
    expect(nearEdge).toBeGreaterThan(mid);
  });

  it("throws on degenerate input", () => {
    expect(() => estimateEpsilon([0.5])).toThrow();
    expect(() => estimateEpsilon([1, 1, 1])).toThrow();
  });
});

describe("normInv", () => {
  it("matches known normal quantiles", () => {
    expect(normInv(0.5)).toBeCloseTo(0, 6);
    expect(normInv(0.975)).toBeCloseTo(1.959964, 4);
    expect(normInv(0.025)).toBeCloseTo(-1.959964, 4);
    expect(normInv(0.8413447)).toBeCloseTo(1, 4);
  });
});

describe("noiseWedge", () => {
  it("is zero when epsilon is zero and grows with epsilon", () => {
    expect(noiseWedge(0.7, 0)).toBe(0);
    const w1 = noiseWedge(0.7, 0.1);
    const w2 = noiseWedge(0.7, 0.3);
    expect(w2).toBeGreaterThan(w1);
    expect(w1).toBeGreaterThan(0);
  });

  it("never exceeds the distance to the nearer boundary", () => {
    expect(noiseWedge(0.9, 5)).toBeLessThanOrEqual(0.1);
    expect(noiseWedge(0.05, 5)).toBeLessThanOrEqual(0.05);
  });

  it("matches the one-sigma truncated tail at tail=0.16 for small noise", () => {
    // Small epsilon: truncation negligible, wedge ~= sigma * z_{0.84}.
    const eps = 0.02;
    const pc = 0.6;
    const sigma = eps * Math.min(pc, 1 - pc);
    expect(noiseWedge(pc, eps)).toBeCloseTo(sigma * normInv(1 - 0.16), 3);
  });

  it("throws on invalid input", () => {
    expect(() => noiseWedge(0, 0.1)).toThrow();
    expect(() => noiseWedge(0.5, -0.1)).toThrow();
    expect(() => noiseWedge(0.5, 0.1, { tail: 0.6 })).toThrow();
  });
});

describe("fairOddsNoisy", () => {
  it("shades both sides: favorite longer, longshot shorter than raw", () => {
    const members = [0.66, 0.7, 0.74, 0.7];
    const fav = fairOddsNoisy(0.7, members);
    expect(fav.odds).toBeGreaterThan(1 / 0.7);
    const dog = fairOddsNoisy(0.3, [0.26, 0.3, 0.34, 0.3]);
    expect(dog.odds).toBeLessThan(1 / 0.3);
    expect(fav.wedge).toBeGreaterThan(0);
  });

  it("recovers raw fair odds with a zero-dispersion ensemble", () => {
    const r = fairOddsNoisy(0.7, [0.7, 0.7, 0.7]);
    expect(r.wedge).toBe(0);
    expect(r.odds).toBeCloseTo(1 / 0.7, 12);
  });
});

describe("longshotFilter", () => {
  it("flags only high-epsilon longshots", () => {
    expect(longshotFilter(0.3, 0.5, 0.2)).toBe(true);
    expect(longshotFilter(0.3, 0.1, 0.2)).toBe(false);
    expect(longshotFilter(0.7, 0.5, 0.2)).toBe(false);
  });
});
