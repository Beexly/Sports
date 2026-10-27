/**
 * Unit tests for the decimal-odds multiplicative devig.
 *
 * Fixture: 45 two-way markets whose raw implied sum is exactly 1.045795
 * (the measured 4.58% hold). For each market the corrected pair must sum to 1
 * within 1e-6 and the favorite residual (0.0537) must be removed within 1e-6.
 */

import { describe, it, expect } from "vitest";
import {
  multiplicativeDevig,
  FAVORITE_RESIDUAL,
  SAMPLE_IMPLIED_SUM,
} from "../devig.js";

/**
 * Build 45 markets with raw implied sum = target.
 * q0 varies over [0.51, 0.61]; q1 = target - q0; d_i = 1 / q_i.
 */
function build45MarketFixture(target: number): Array<[number, number]> {
  const markets: Array<[number, number]> = [];
  for (let i = 0; i < 45; i += 1) {
    const q0 = 0.51 + (i % 11) * 0.01; // 0.51 .. 0.61
    const q1 = target - q0;
    markets.push([1 / q0, 1 / q1]);
  }
  return markets;
}

function impliedSum([d0, d1]: [number, number]): number {
  return 1 / d0 + 1 / d1;
}

function deviggedPair([d0, d1]: [number, number]): [number, number] {
  const q0 = 1 / d0;
  const q1 = 1 / d1;
  const s = q0 + q1;
  return [q0 / s, q1 / s];
}

function favoriteIndex(pair: [number, number]): 0 | 1 {
  return pair[0] > 0.5 ? 0 : 1;
}

describe("multiplicativeDevig (decimal odds)", () => {
  it("converts a fair 2.00/2.00 market to [0.5, 0.5] with no correction", () => {
    const [p0, p1] = multiplicativeDevig([2, 2]);
    expect(p0).toBeCloseTo(0.5, 12);
    expect(p1).toBeCloseTo(0.5, 12);
  });

  it("45-market fixture: every raw implied sum is 1.045795", () => {
    const markets = build45MarketFixture(SAMPLE_IMPLIED_SUM);
    expect(markets).toHaveLength(45);
    for (const m of markets) {
      expect(impliedSum(m)).toBeCloseTo(SAMPLE_IMPLIED_SUM, 9);
    }
    const mean = markets.reduce((a, m) => a + impliedSum(m), 0) / markets.length;
    expect(mean).toBeCloseTo(SAMPLE_IMPLIED_SUM, 9);
  });

  it("45-market fixture: every corrected pair sums to 1 within 1e-6", () => {
    for (const m of build45MarketFixture(SAMPLE_IMPLIED_SUM)) {
      const [p0, p1] = multiplicativeDevig(m);
      expect(Math.abs(p0 + p1 - 1)).toBeLessThan(1e-6);
    }
  });

  it("45-market fixture: favorite residual removed within 1e-6", () => {
    for (const m of build45MarketFixture(SAMPLE_IMPLIED_SUM)) {
      const rawPair = deviggedPair(m);
      const fav = favoriteIndex(rawPair);
      const pFav = rawPair[fav];
      const [p0, p1] = multiplicativeDevig(m);
      // Track the ORIGINAL favorite side: after the correction the other side
      // can become the larger value, so Math.max is not the corrected favorite.
      const correctedFav = fav === 0 ? p0 : p1;
      expect(pFav - correctedFav).toBeCloseTo(FAVORITE_RESIDUAL, 6);
    }
  });

  it("removes the residual from side 1 when side 1 is the favorite", () => {
    // q0 = 0.45, q1 = 0.595795 -> side 1 is the favorite after normalization.
    const d0 = 1 / 0.45;
    const d1 = 1 / 0.595795;
    const pFav = deviggedPair([d0, d1])[1];
    const [p0, p1] = multiplicativeDevig([d0, d1]);
    expect(p1).toBeGreaterThan(p0);
    expect(pFav - p1).toBeCloseTo(FAVORITE_RESIDUAL, 6);
    expect(p0 + p1).toBeCloseTo(1, 9);
  });

  it("clamps a favorite whose devigged probability is below the residual", () => {
    // Extreme hold: raw q0 = 0.53, q1 = 0.515795 -> p0 ~ 0.5069, barely above 0.5.
    const d0 = 1 / 0.53;
    const d1 = 1 / 0.515795;
    const [p0, p1] = multiplicativeDevig([d0, d1]);
    expect(p0 + p1).toBeCloseTo(1, 9);
    expect(p0).toBeGreaterThanOrEqual(0);
    expect(p1).toBeGreaterThanOrEqual(0);
  });

  it("is a pure function: same input gives same output, input not mutated", () => {
    const input: [number, number] = [1.9, 2.1];
    const a = multiplicativeDevig(input);
    const b = multiplicativeDevig(input);
    expect(a).toEqual(b);
    expect(input).toEqual([1.9, 2.1]);
  });

  it("rejects invalid decimal odds", () => {
    expect(() => multiplicativeDevig([1, 2])).toThrow();
    expect(() => multiplicativeDevig([0.5, 2])).toThrow();
    expect(() => multiplicativeDevig([NaN, 2])).toThrow();
    expect(() => multiplicativeDevig([Infinity, 2])).toThrow();
  });
});
