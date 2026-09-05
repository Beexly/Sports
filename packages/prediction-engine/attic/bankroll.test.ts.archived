import { describe, expect, it } from "vitest";
import { recommendStake, summarizePortfolio } from "../bankroll.js";

describe("recommendStake", () => {
  it("suggests a conservative quarter-Kelly stake when there is an edge", () => {
    // 58% to win at even money (decimal 2.0) → positive edge.
    const s = recommendStake(1000, 0.58, 2.0);
    expect(s.amount).toBeGreaterThan(0);
    expect(s.kellyFraction).toBe(0.25);
    expect(s.percentOfBankroll).toBeLessThanOrEqual(5);
  });

  it("suggests zero when there is no edge", () => {
    const s = recommendStake(1000, 0.45, 2.0); // 45% at even money → negative edge
    expect(s.amount).toBe(0);
  });

  it("binds the per-pick hard cap on a huge edge", () => {
    const s = recommendStake(1000, 0.95, 3.0, { mode: "full" });
    expect(s.capped).toBe(true);
    expect(s.percentOfBankroll).toBe(5);
    expect(s.amount).toBe(50);
  });

  it("supports flat staking", () => {
    const s = recommendStake(1000, 0.9, 2.0, { mode: "flat", flatPercent: 2 });
    expect(s.percentOfBankroll).toBe(2);
    expect(s.amount).toBe(20);
    expect(s.kellyFraction).toBe(0);
  });
});

describe("summarizePortfolio", () => {
  it("flags over-exposure when total stake exceeds the healthy cap", () => {
    const s = summarizePortfolio(1000, [60, 60, 60], 15); // 18% > 15%
    expect(s.totalStake).toBe(180);
    expect(s.percentOfBankroll).toBe(18);
    expect(s.overexposed).toBe(true);
  });

  it("is healthy under the cap", () => {
    expect(summarizePortfolio(1000, [30, 30]).overexposed).toBe(false);
  });
});
