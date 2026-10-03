/**
 * Vitest suite for arXiv:2609.06005 (Price Dislocations, News Citations, and Epistemic Leverage on Polymarket).
 * Gate: Adopt the dislocation + impact pipeline as GSE's sharp-flow sensor if, on 2025 NFL Polymarket data, dislocations flagged by the detector predict next-day line direction (sportsbook consensus move) with hit rate >=55% over >=200 events (binomial p < 0.05 vs 50%); reject if the hit rate is indistinguishable from coin-flip or fewer than 25% of NFL tokens yield detectable impact coefficients.
 */
import { describe, it, expect } from "vitest";
import { isDislocation, impactCoefficient, nextDayDirectionSignal } from "./2609-06005-price-dislocations-news-citations-and";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2609-06005 dislocation-plus-impact sensor", () => {
  it("detects dislocations beyond the threshold", () => {
    expect(isDislocation({ size: 100, priceBefore: 0.5, priceAfter: 0.56, }, 0.05)).toBe(true);
    expect(isDislocation({ size: 100, priceBefore: 0.5, priceAfter: 0.51 }, 0.05)).toBe(false);
    expect(() => isDislocation({ size: 1, priceBefore: 0.5, priceAfter: 0.6 }, 0)).toThrow();
  });
  it("recovers Kyle's lambda on synthetic flow", () => {
    const rng = lcg(121);
    const trades = Array.from({ length: 200 }, () => {
      const size = (rng() - 0.5) * 200;
      const dp = 0.0005 * size + (rng() - 0.5) * 0.01;
      return { size, priceBefore: 0.5, priceAfter: 0.5 + dp };
    });
    const { lambda, rSquared } = impactCoefficient(trades);
    expect(lambda).toBeGreaterThan(0.0002);
    expect(lambda).toBeLessThan(0.001);
    expect(rSquared).toBeGreaterThan(0.3);
    expect(() => impactCoefficient([trades[0]!])).toThrow();
  });
  it("signals next-day direction from dislocation flow", () => {
    const trades = [
      { size: 500, priceBefore: 0.5, priceAfter: 0.58 },
      { size: 100, priceBefore: 0.58, priceAfter: 0.585 },
    ];
    expect(nextDayDirectionSignal(trades, 0.05)).toBe(1);
    expect(nextDayDirectionSignal(trades, 0.5)).toBe(0);
  });
});
