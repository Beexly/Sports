/**
 * Vitest suite for arXiv:2604.08251v1 (The Statistical Profitability of Social Media Sports Betting Influencers: Evidence from the Nigerian Market).
 * Gate: Adopt the tout-audit pipeline and staking baseline battery if the tracker reproduces the paper's negative-ROI pattern on a fresh tout sample and GSE's Kelly sizing beats all four naive strategies on its own history.
 */
import { describe, it, expect } from "vitest";
import { flatStake, inverseStake, sqrtStake, fixedReturnStake, batteryPnl, batteryVerdict, validCapture } from "./2604-08251v1-the-statistical-profitability-of-social";

describe("2604-08251v1 tout-audit staking battery", () => {
  const bets = [
    { odds: 2.0, edge: 0.1, won: true },
    { odds: 2.0, edge: 0.1, won: false },
    { odds: 3.0, edge: 0.2, won: true },
    { odds: 1.5, edge: 0.05, won: true },
  ];
  it("staking rules size correctly", () => {
    expect(flatStake(10)).toBe(10);
    expect(inverseStake(10, 3)).toBeCloseTo(5, 10);
    expect(sqrtStake(100, 0.25)).toBeCloseTo(50, 10);
    expect(fixedReturnStake(10, 3)).toBeCloseTo(5, 10);
    expect(() => inverseStake(10, 1)).toThrow();
    expect(() => fixedReturnStake(10, 1)).toThrow();
  });
  it("battery P&L and verdict", () => {
    const v = batteryVerdict(bets, (b) => sqrtStake(50, b.edge), 10, 10);
    expect(Number.isFinite(v.candidate)).toBe(true);
    expect(Object.keys(v.naive)).toEqual(["flat", "inverse", "sqrt", "fixedReturn"]);
    // A perfect oracle beats all naive rules
    const oracle = batteryVerdict(bets, (b) => (b.won ? 100 : 0), 10, 10);
    expect(oracle.beatsAll).toBe(true);
  });
  it("validates pick captures", () => {
    expect(validCapture({ tout: "x", pick: "KC -3", capturedAt: "2026-01-01T00:00:00Z", hash: "abc" })).toBe(true);
    expect(validCapture({ tout: "", pick: "KC -3", capturedAt: "2026-01-01T00:00:00Z", hash: "abc" })).toBe(false);
  });
});
