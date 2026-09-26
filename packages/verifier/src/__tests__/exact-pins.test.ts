/**
 * Hand-computed pins for the exact-rational Wilson companion (arXiv:2505.23703).
 *
 * The headline case is k = n: the exact bound is 1, the float path returns
 * 0.9999999999999999, and a containment test therefore fails on a bound that is
 * mathematically correct. These pins prove the exact values and measure the gap.
 */

import { describe, expect, it } from "vitest";

import {
  Z_95_EXACT,
  formatExact,
  wilsonBoundaryAudit,
  wilsonExact,
  wilsonMarginExact,
  type ExactRational,
} from "../exact";
import { wilsonInterval } from "../stats";

const z1: ExactRational = { numerator: 1n, denominator: 1n };
const asNumber = (r: ExactRational): number => Number(r.numerator) / Number(r.denominator);

describe("exact rationals", () => {
  it("carries z_95 with no decimal at all", () => {
    // 1.959963984540054 = 1959963984540054 / 10^15.
    expect(Z_95_EXACT.numerator).toBe(1959963984540054n);
    expect(Z_95_EXACT.denominator).toBe(1000000000000000n);
    expect(asNumber(Z_95_EXACT)).toBeCloseTo(1.959963984540054, 15);
  });
});

describe("wilsonExact — the k = n boundary", () => {
  it("is EXACTLY 1 at k = n, where the float path is a ULP short", () => {
    const exact = wilsonExact(10, 10)!;
    expect(exact.high.denominator).toBe(1n);
    expect(exact.high.numerator).toBe(1n);
    // the float path, same z, same inputs:
    expect(wilsonInterval(10, 10).high).toBeLessThan(1);
    expect(wilsonInterval(10, 10).high).toBeCloseTo(1, 12);
  });

  it("is exactly 1 at every k = n, not just 10/10", () => {
    for (const n of [1, 2, 5, 20, 100]) {
      expect(wilsonExact(n, n)!.high.numerator).toBe(1n);
    }
  });

  it("is exactly 0 at k = 0", () => {
    const exact = wilsonExact(0, 10)!;
    expect(exact.low.numerator).toBe(0n);
    expect(exact.low.denominator).toBe(1n);
  });

  it("reproduces the textbook 0/10 upper bound", () => {
    // 0.2775327998628892… — the float pin in stats-pins.test.ts.
    expect(wilsonExact(0, 10)!.highAsDouble).toBeCloseTo(0.2775327998628892, 12);
  });

  it("agrees with the float path to 12 places on every mid-range case", () => {
    for (const [k, n] of [[0, 10], [1, 10], [5, 10], [9, 20], [3, 7]] as const) {
      const exact = wilsonExact(k, n)!;
      const float = wilsonInterval(k, n);
      expect(exact.highAsDouble).toBeCloseTo(float.high, 12);
      expect(asNumber(exact.low)).toBeCloseTo(float.low, 12);
    }
  });

  it("matches the 9/20 bounds the existing pins assert", () => {
    // stats-pins.test.ts pins 9/20 at [0.2582, 0.6579].
    const exact = wilsonExact(9, 20)!;
    expect(exact.highAsDouble).toBeCloseTo(0.6579, 4);
    expect(asNumber(exact.low)).toBeCloseTo(0.2582, 4);
  });

  it("returns null on n <= 0, same as the float path", () => {
    expect(wilsonExact(0, 0)).toBeNull();
    expect(wilsonExact(3, -5)).toBeNull();
  });

  it("clamps k into [0, n] rather than trusting the caller", () => {
    expect(wilsonExact(99, 10)!.successes).toBe(10n);
    expect(wilsonExact(-4, 10)!.successes).toBe(0n);
  });

  it("computes the point estimate as a reduced exact fraction", () => {
    expect(formatExact(wilsonExact(3, 7)!.point)).toBe("3/7");
    expect(formatExact(wilsonExact(4, 8)!.point)).toBe("1/2");
  });
});

describe("wilsonBoundaryAudit — formal layer vs numeric layer", () => {
  it("shows containment holding exactly and FAILING in float at k = n", () => {
    const audit = wilsonBoundaryAudit(10, 10)!;
    expect(audit.containmentHoldsExactly).toBe(true);
    expect(audit.containmentHoldsInFloat).toBe(false);
    expect(audit.floatBreaksContainment).toBe(true);
    // the float path is BELOW the exact bound — the direction that breaks it
    expect(audit.highGap).toBeLessThan(0);
    expect(Math.abs(audit.highGap)).toBeLessThan(1e-15);
  });

  it("agrees on both layers away from the boundary", () => {
    for (const [k, n] of [[0, 10], [5, 10], [9, 20]] as const) {
      const audit = wilsonBoundaryAudit(k, n)!;
      expect(audit.floatBreaksContainment).toBe(false);
      expect(audit.containmentHoldsExactly).toBe(true);
      expect(audit.containmentHoldsInFloat).toBe(true);
    }
  });

  it("returns null on an empty panel", () => {
    expect(wilsonBoundaryAudit(0, 0)).toBeNull();
  });
});

describe("wilsonMarginExact", () => {
  it("is z/(2n) at both ends, where p(1-p) vanishes", () => {
    // p(1-p) = 0 at k = 0 and k = n, but the z^2/(4n^2) term keeps the band
    // honest, so the margin is exactly z/(2n) = 1/20 for z = 1, n = 10.
    expect(asNumber(wilsonMarginExact(10n, 10n, z1))).toBeCloseTo(0.05, 12);
    expect(asNumber(wilsonMarginExact(0n, 10n, z1))).toBeCloseTo(0.05, 12);
  });

  it("peaks in the middle of the panel", () => {
    const at0 = asNumber(wilsonMarginExact(0n, 10n, z1));
    const at5 = asNumber(wilsonMarginExact(5n, 10n, z1));
    expect(at5).toBeGreaterThan(at0);
  });
});
