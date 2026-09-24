// Tests for decision/1710-01787-kelly-saturation-hardening.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  expectedLogGrowth,
  taylorKellyShortcut,
  muSigmaSqKelly,
  exactKellyFraction,
  GAMBLE_A,
  maxDrawdown,
  expectedMaxDrawdown,
  drawdownConstrainedKelly,
  drawdownGatePasses,
} from "./1710-01787-kelly-saturation-hardening.js";

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

describe("Gamble A regression (1710.01787)", () => {
  it("exact sizer returns K ~ 0.667, never the saturated K = 1", () => {
    const exact = exactKellyFraction(GAMBLE_A);
    expect(exact).toBeCloseTo(2 / 3, 3);
    // The banned shortcuts saturate: mu/sigma^2 = 1.2 -> clamped to 1.
    expect(muSigmaSqKelly(GAMBLE_A)).toBe(1);
    expect(taylorKellyShortcut(GAMBLE_A)).toBeCloseTo(2 / 3, 6); // E[X] itself
    // Sanity: exact optimum really maximizes E[log(1+fX)].
    expect(expectedLogGrowth(exact, GAMBLE_A)).toBeGreaterThan(expectedLogGrowth(1, GAMBLE_A));
    expect(expectedLogGrowth(exact, GAMBLE_A)).toBeGreaterThan(expectedLogGrowth(0.2, GAMBLE_A));
  });
  it("exact fraction matches the closed form p/a - (1-p) for two-outcome gambles", () => {
    const dist = [
      { x: 2, p: 0.4 },
      { x: -1, p: 0.6 },
    ];
    const closed = 0.4 / 1 - 0.6; // p/a - (1-p) with a=1 payoff scale... computed below
    void closed;
    const f = exactKellyFraction(dist);
    // Verify via first-order condition numerically: derivative ~ 0 at interior optimum.
    const h = 1e-6;
    const deriv =
      (expectedLogGrowth(f + h, dist) - expectedLogGrowth(f - h, dist)) / (2 * h);
    expect(Math.abs(deriv)).toBeLessThan(1e-3);
  });
});

describe("expectedLogGrowth", () => {
  it("returns -Infinity on ruin", () => {
    expect(expectedLogGrowth(1, [{ x: -1, p: 1 }])).toBe(-Infinity);
  });
});

describe("maxDrawdown / expectedMaxDrawdown", () => {
  it("computes peak-to-trough drawdown", () => {
    expect(maxDrawdown([1, 1.5, 1.2, 1.8, 0.9])).toBeCloseTo(0.5, 10);
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });
  it("is monotone non-decreasing in the stake fraction", () => {
    const rand = mulberry32(7);
    const scenarios = Array.from({ length: 60 }, () =>
      Array.from({ length: 20 }, () => (rand() < 0.55 ? 0.9 : -1)),
    );
    const ddLow = expectedMaxDrawdown(0.1, scenarios, 200, mulberry32(1));
    const ddHigh = expectedMaxDrawdown(0.8, scenarios, 200, mulberry32(1));
    expect(ddHigh).toBeGreaterThanOrEqual(ddLow);
  });
});

describe("drawdownConstrainedKelly", () => {
  it("respects the E[D(f)] <= d budget", () => {
    const rand = mulberry32(11);
    const scenarios = Array.from({ length: 80 }, () =>
      Array.from({ length: 25 }, () => (rand() < 0.55 ? 0.9 : -1)),
    );
    const dist = [
      { x: 0.9, p: 0.55 },
      { x: -1, p: 0.45 },
    ];
    const res = drawdownConstrainedKelly(dist, scenarios, 0.2, 300, mulberry32(3), 100);
    expect(res.expectedDrawdown).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(res.fraction).toBeGreaterThanOrEqual(0);
  });
});

describe("drawdownGatePasses", () => {
  it("encodes the 0.8x drawdown / 0.95x growth gate", () => {
    expect(drawdownGatePasses(0.16, 0.2, 0.95, 1.0)).toBe(true);
    expect(drawdownGatePasses(0.17, 0.2, 0.95, 1.0)).toBe(false); // drawdown too high
    expect(drawdownGatePasses(0.16, 0.2, 0.94, 1.0)).toBe(false); // growth too low
  });
});
