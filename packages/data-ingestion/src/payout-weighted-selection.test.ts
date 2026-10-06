/**
 * Tests for ./payout-weighted-selection (arXiv:1702.05982v1, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT the pay-out-weighted selection doctrine if on 2024-2025 holdout the pay-out-optimized
 * variant beats the accuracy-optimized variant by >=$500 per season at flat $100 stakes (or >=2 pp
 * ROI) with the gain concentrated in underdog/pick'em hits.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./payout-weighted-selection";

describe("payout-weighted selection (arXiv:1702.05982v1)", () => {
  const results = [
    { marketClass: "favorite" as const, won: true, payout: 60 },
    { marketClass: "favorite" as const, won: false, payout: 0 },
    { marketClass: "underdog" as const, won: true, payout: 180 },
    { marketClass: "pickem" as const, won: true, payout: 91 },
    { marketClass: "underdog" as const, won: "yes", payout: 180 },
  ];
  it("breaks down by class, skips malformed", () => {
    const b = mod.classBreakdown(results);
    expect(b.favorite.n).toBe(2);
    expect(b.favorite.accuracy).toBeCloseTo(0.5, 10);
    expect(b.underdog.totalPayout).toBe(180);
    expect(b.pickem.wins).toBe(1);
  });
  it("payout-weighted log-loss weights by pay-out", () => {
    const a = mod.payoutWeightedLogLoss([0.9, 0.6], [1, 0], [1, 1]);
    const b = mod.payoutWeightedLogLoss([0.9, 0.6], [1, 0], [1, 100]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(b).not.toBeCloseTo(a ?? -1, 6);
    expect(mod.payoutWeightedLogLoss([0.9], [1], [0])).toBeNull();
  });
  it("threshold rule", () => {
    expect(mod.thresholdBet(0.05, 0.03)).toBe(true);
    expect(mod.thresholdBet(0.02, 0.03)).toBe(false);
    expect(mod.thresholdBet(NaN, 0.03)).toBe(false);
  });
  it("ROI", () => {
    const r = mod.roiPp([
      { marketClass: "underdog", won: true, payout: 180 },
      { marketClass: "underdog", won: false, payout: 0 },
    ]);
    expect(r).toBeCloseTo(40, 10);
    expect(mod.roiPp([])).toBeNull();
  });
});
