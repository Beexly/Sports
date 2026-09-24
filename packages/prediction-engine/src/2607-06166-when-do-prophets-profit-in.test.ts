/**
 * Vitest suite for arXiv:2607.06166 (When Do Prophets Profit in Prediction Markets?).
 * Gate: ADAPT is confirmed if, on the 2024-season backtest, proper-Brier staking beats both flat staking and Kelly on realized ROI with statistical significance (paired bootstrap, 5%) and the three-term decomposition attributes ≥60% of the gain to the score-gap term.
 */
import { describe, it, expect } from "vitest";
import { properBetStake, decomposeClv, netClv } from "./2607-06166-when-do-prophets-profit-in";

describe("2607-06166 Brier proper-bet sizing", () => {
  it("stakes proportionally to the model-market gap, clipped", () => {
    expect(properBetStake({ pModel: 0.6, qMarket: 0.5, liquidity: 0.5, cap: 1 })).toBeCloseTo(0.2, 10);
    expect(properBetStake({ pModel: 0.9, qMarket: 0.5, liquidity: 0.1, cap: 1 })).toBe(1);
    expect(properBetStake({ pModel: 0.4, qMarket: 0.5, liquidity: 0.5, cap: 1 })).toBe(0);
    expect(() => properBetStake({ pModel: 0.6, qMarket: 0.5, liquidity: 0, cap: 1 })).toThrow();
  });
  it("decomposes CLV into the three feedback terms", () => {
    const d = decomposeClv(0.65, 0.55, 1, 0.2, 0.01);
    expect(d.scoreGap).toBeGreaterThan(0); // model closer to the outcome
    expect(d.divergence).toBeCloseTo(0.02, 10);
    expect(d.liquidityCost).toBeCloseTo(0.002, 10);
    expect(netClv(d)).toBeCloseTo(d.scoreGap + 0.02 - 0.002, 10);
  });
});
