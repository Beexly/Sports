import { describe, expect, it } from "vitest";
import {
  betaInv,
  binomialCoverage,
  clopperPearsonLowerBound,
  regularizedIncompleteBeta,
  wilsonInterval,
  wilsonLowerBound,
} from "../stats.js";

describe("wilsonLowerBound", () => {
  it("matches the textbook value for 55/100 at z=1.96", () => {
    // Textbook Wilson lower bound: center = (p + z^2/2n) / (1 + z^2/n),
    // margin = (z / (1 + z^2/n)) * sqrt(p(1-p)/n + z^2/4n^2), p=0.55, n=100,
    // z=1.96 -> lower ~= 0.45244.
    const lower = wilsonLowerBound(55, 100, 1.96);
    expect(lower).toBeCloseTo(0.4524, 3);
  });

  it("returns 0 when n = 0", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("is monotone in n at a fixed rate: more data -> higher lower bound", () => {
    const small = wilsonLowerBound(55, 100);
    const large = wilsonLowerBound(550, 1000);
    expect(large).toBeGreaterThan(small);
  });

  it("throws RangeError on non-integer or negative inputs, or successes > n", () => {
    expect(() => wilsonLowerBound(1.5, 10)).toThrow(RangeError);
    expect(() => wilsonLowerBound(1, 10.5)).toThrow(RangeError);
    expect(() => wilsonLowerBound(-1, 10)).toThrow(RangeError);
    expect(() => wilsonLowerBound(1, -10)).toThrow(RangeError);
    expect(() => wilsonLowerBound(11, 10)).toThrow(RangeError);
  });

  it("defaults to the one-sided 95% z (1.6449)", () => {
    const withDefault = wilsonLowerBound(55, 100);
    const withExplicit = wilsonLowerBound(55, 100, 1.6449);
    expect(withDefault).toBeCloseTo(withExplicit, 10);
  });
});

describe("wilsonInterval", () => {
  it("brackets the lower bound and the raw rate", () => {
    const { lower, upper, center } = wilsonInterval(55, 100, 1.96);
    expect(lower).toBeLessThan(0.55);
    expect(upper).toBeGreaterThan(0.55);
    expect(center).toBeGreaterThan(lower);
    expect(center).toBeLessThan(upper);
    expect(lower).toBeCloseTo(wilsonLowerBound(55, 100, 1.96), 12);
  });

  it("returns the honest [0,1] band at n=0", () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 1, center: 0.5 });
  });
});

describe("regularizedIncompleteBeta / betaInv round-trip", () => {
  it("round-trips across a grid of (p, a, b) within 1e-7", () => {
    const grid: Array<[number, number, number]> = [
      [0.5, 2, 3],
      [0.1, 5, 5],
      [0.9, 1, 1],
      [0.05, 5, 6],
      [0.5, 1, 1],
      [0.99, 10, 2],
      [0.01, 2, 10],
      [0.25, 0.5, 0.5],
      [0.75, 20, 20],
      [0.001, 3, 40],
    ];
    for (const [p, a, b] of grid) {
      const x = betaInv(p, a, b);
      const back = regularizedIncompleteBeta(x, a, b);
      expect(Math.abs(back - p)).toBeLessThan(1e-7);
    }
  });

  it("is monotone increasing in x", () => {
    const a = 5;
    const b = 7;
    let prev = -1;
    for (let x = 0.05; x < 1; x += 0.05) {
      const v = regularizedIncompleteBeta(x, a, b);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });
});

describe("clopperPearsonLowerBound", () => {
  it("returns 0 when successes = 0", () => {
    expect(clopperPearsonLowerBound(0, 10)).toBe(0);
  });

  it("is conservative: CP lower <= Wilson lower on several cases", () => {
    for (const [s, n] of [
      [55, 100],
      [5, 10],
      [10, 10],
      [3, 20],
      [1, 1],
    ] as const) {
      const cp = clopperPearsonLowerBound(s, n);
      const wl = wilsonLowerBound(s, n);
      expect(cp).toBeLessThanOrEqual(wl);
    }
  });

  it("CP(5,10) falls in the sanity range 0.15-0.25", () => {
    const cp = clopperPearsonLowerBound(5, 10);
    expect(cp).toBeGreaterThan(0.15);
    expect(cp).toBeLessThan(0.25);
  });

  it("defaults to alpha = 0.05", () => {
    const withDefault = clopperPearsonLowerBound(5, 10);
    const withExplicit = clopperPearsonLowerBound(5, 10, 0.05);
    expect(withDefault).toBeCloseTo(withExplicit, 12);
  });

  it("throws RangeError on non-integer/negative inputs, successes > n, or bad alpha", () => {
    expect(() => clopperPearsonLowerBound(1.5, 10)).toThrow(RangeError);
    expect(() => clopperPearsonLowerBound(-1, 10)).toThrow(RangeError);
    expect(() => clopperPearsonLowerBound(11, 10)).toThrow(RangeError);
    expect(() => clopperPearsonLowerBound(1, 10, 0)).toThrow(RangeError);
    expect(() => clopperPearsonLowerBound(1, 10, 1)).toThrow(RangeError);
  });
});

describe("binomialCoverage", () => {
  it("computes fired/eligible", () => {
    expect(binomialCoverage(42, 100)).toEqual({ fired: 42, eligible: 100, coverage: 0.42 });
  });

  it("returns coverage 0 when eligible = 0 (no denominator, no claim)", () => {
    expect(binomialCoverage(0, 0)).toEqual({ fired: 0, eligible: 0, coverage: 0 });
  });

  it("throws RangeError when fired > eligible or either is negative", () => {
    expect(() => binomialCoverage(11, 10)).toThrow(RangeError);
    expect(() => binomialCoverage(-1, 10)).toThrow(RangeError);
    expect(() => binomialCoverage(1, -10)).toThrow(RangeError);
  });
});
