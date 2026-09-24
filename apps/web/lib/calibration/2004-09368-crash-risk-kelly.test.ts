import { describe, expect, it } from "vitest";

import {
  ENABLED,
  kellyFraction,
  multiplicativeErrorSweep,
  passesErrorSweep,
  regimeAwareKellyFraction,
} from "@/lib/calibration/2004-09368-crash-risk-kelly";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("crash-risk-aware Kelly", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("kellyFraction matches the closed form", () => {
    // p=0.6, d=2.0 -> (0.6*1 - 0.4)/1 = 0.2
    expect(kellyFraction(0.6, 2.0)).toBeCloseTo(0.2, 10);
    expect(kellyFraction(0.4, 2.0)).toBeLessThan(0); // no edge
  });

  it("hard-constrains lambda to [0,1]: no leverage, no short", () => {
    expect(regimeAwareKellyFraction(0.99, 10, 1)).toBeLessThanOrEqual(1);
    expect(regimeAwareKellyFraction(0.4, 2.0, 1)).toBe(0);
    expect(regimeAwareKellyFraction(0.6, 2.0, 1)).toBeGreaterThanOrEqual(0);
  });

  it("scales down during high-volatility bubble regimes", () => {
    const calm = regimeAwareKellyFraction(0.65, 2.2, 1.0);
    const bubble = regimeAwareKellyFraction(0.65, 2.2, 3.0);
    expect(bubble).toBeLessThan(calm);
    // small edge: no scaling even in high vol
    const smallEdge = regimeAwareKellyFraction(0.51, 2.0, 3.0);
    expect(smallEdge).toBeCloseTo(regimeAwareKellyFraction(0.51, 2.0, 1.0), 10);
  });

  it("error sweep stays positive up to 100% error for a real edge", () => {
    const f = 0.5 * kellyFraction(0.6, 2.0);
    const sweep = multiplicativeErrorSweep(0.6, 2.0, f, mulberry(42), 4000);
    expect(sweep.length).toBe(8);
    expect(passesErrorSweep(sweep)).toBe(true);
  });
});
