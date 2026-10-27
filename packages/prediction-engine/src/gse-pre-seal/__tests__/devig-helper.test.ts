/**
 * Unit tests for the multiplicative devig helper.
 *
 * The 45-market sample: 45 markets whose raw implied probabilities sum to
 * 1.045795 on average. The helper must recover a probability that, after the
 * +0.0537 favorite correction, lands on the measured fair value.
 */

import { describe, it } from "vitest";
import {
  americanToImplied,
  impliedToAmerican,
  multiplicativeDevig,
  FAVORITE_RESIDUAL,
  SAMPLE_IMPLIED_SUM,
} from "../devig-helper.js";

/**
 * Build a 45-market sample whose *per-market* implied probability sums
 * average to the target (1.045795). The target is the average vig per market,
 * not a total across all 45 markets.
 */
function build45MarketSample(targetSum: number): Array<{ favoriteOdds: number; underdogOdds: number }> {
  const markets: Array<{ favoriteOdds: number; underdogOdds: number }> = [];

  for (let i = 0; i < 45; i += 1) {
    // Vary the favorite odds across the realistic band; the per-market implied
    // sum stays at targetSum (the observed average vig).
    const fav = -105 - (i % 11) * 5; // -105 .. -155
    const impliedFav = americanToImplied(fav);
    const impliedDog = targetSum - impliedFav;
    const dog = impliedToAmerican(impliedDog);
    markets.push({ favoriteOdds: fav, underdogOdds: dog });
  }
  return markets;
}

describe("multiplicative devig helper", () => {
  it("converts American odds to implied probability", () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.52381, 5);
    expect(americanToImplied(110)).toBeCloseTo(0.47619, 5);
    expect(americanToImplied(-200)).toBeCloseTo(0.666667, 6);
    expect(americanToImplied(200)).toBeCloseTo(0.333333, 6);
  });

  it("round-trips probability back to American odds", () => {
    expect(impliedToAmerican(0.52381)).toBeCloseTo(-110, 0);
    expect(impliedToAmerican(0.47619)).toBeCloseTo(110, 0);
  });

  it("devigs a pair to sum 1", () => {
    const r = multiplicativeDevig({ favoriteOdds: -155, underdogOdds: 130 });
    expect(r.devigged.favorite + r.devigged.underdog).toBeCloseTo(1, 5);
  });

  it("subtracts the +0.0537 favorite residual", () => {
    const r = multiplicativeDevig({ favoriteOdds: -155, underdogOdds: 130 });
    expect(r.correctedFavorite).toBeCloseTo(r.devigged.favorite - FAVORITE_RESIDUAL, 5);
    expect(r.correctedUnderdog).toBeCloseTo(r.devigged.underdog + FAVORITE_RESIDUAL, 5);
    expect(r.correctedFavorite + r.correctedUnderdog).toBeCloseTo(1, 5);
  });

  it("floors the favorite at 0 and conserves mass", () => {
    // A near-coinflip pair leaves less than 0.0537 to remove from the favorite.
    const r = multiplicativeDevig({ favoriteOdds: 100, underdogOdds: 100 });
    expect(r.correctedFavorite).toBeGreaterThanOrEqual(0);
    expect(r.correctedFavorite + r.correctedUnderdog).toBeCloseTo(1, 5);
  });

  it("45-market sample: mean implied sum is 1.045795", () => {
    const markets = build45MarketSample(SAMPLE_IMPLIED_SUM);
    const sums = markets.map(
      (m) => americanToImplied(m.favoriteOdds) + americanToImplied(m.underdogOdds),
    );
    const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
    expect(mean).toBeCloseTo(SAMPLE_IMPLIED_SUM, 4);
  });

  it("45-market sample: every devigged pair sums to 1 and applies the residual", () => {
    const markets = build45MarketSample(SAMPLE_IMPLIED_SUM);
    for (const m of markets) {
      const r = multiplicativeDevig(m);
      expect(r.devigged.favorite + r.devigged.underdog).toBeCloseTo(1, 5);
      expect(r.correctedFavorite + r.correctedUnderdog).toBeCloseTo(1, 5);
      expect(r.favoriteResidual).toBe(FAVORITE_RESIDUAL);
    }
  });

  it("45-market sample: average favorite correction equals FAVORITE_RESIDUAL", () => {
    const markets = build45MarketSample(SAMPLE_IMPLIED_SUM);
    const corrections = markets.map((m) => {
      const r = multiplicativeDevig(m);
      return r.devigged.favorite - r.correctedFavorite;
    });
    const meanCorrection = corrections.reduce((a, b) => a + b, 0) / corrections.length;
    expect(meanCorrection).toBeCloseTo(FAVORITE_RESIDUAL, 4);
  });

  it("is a pure function: same input gives same output, no side effects", () => {
    const input = { favoriteOdds: -155, underdogOdds: 130 };
    const a = multiplicativeDevig(input);
    const b = multiplicativeDevig(input);
    expect(a).toEqual(b);
    // Input object is not mutated.
    expect(input.favoriteOdds).toBe(-155);
    expect(input.underdogOdds).toBe(130);
  });
});
