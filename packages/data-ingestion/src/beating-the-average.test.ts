/**
 * Tests for ./beating-the-average (arXiv:2303.16648v1, lane=experimental).
 *
 * ACCEPTANCE GATE: Adopt the coverage calculator if, on the 10,000-draw simulation using GSE's calibrated per-pick
 * probabilities, empirical coverage at the computed n matches the target Q within +/-1 pp across Q
 * in {90%, 99%, 99.9%} AND the expected-profit sign matches the formula's prediction on historical
 * pick'em data; reject if heterogeneity in p_i breaks the approximation beyond +/-3 pp.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./beating-the-average";

describe("beating the average (arXiv:2303.16648v1)", () => {
  const bets = [
    { betId: "1", decimalOdds: 2.0, stake: 10, won: true, market: "1x2" },
    { betId: "2", decimalOdds: 3.0, stake: 10, won: false, market: "1x2" },
    { betId: "3", decimalOdds: 1.5, stake: 10, won: true, market: "ou" },
    { betId: "4", decimalOdds: 5.0, stake: 10, won: false, market: "ou" },
  ];
  it("roi", () => {
    expect(mod.roi(bets)).toBeCloseTo((35 - 40) / 40, 10);
    expect(mod.roi([])).toBeNull();
    expect(mod.isPricedBet({ ...bets[0], decimalOdds: 0.9 })).toBe(false);
  });
  it("roi by market", () => {
    const r = mod.roiByMarket(bets);
    expect(r["1x2"]!.n).toBe(2);
    expect(r["ou"]!.n).toBe(2);
  });
  it("favorite-longshot split", () => {
    const f = mod.favoriteLongshot(bets, 2.0);
    expect(f.favRoi).toBeCloseTo((15 - 10) / 10, 10);
    expect(f.dogRoi).toBeCloseTo((20 - 30) / 30, 10);
  });
  it("t-stat", () => {
    expect(mod.roiTStat(bets)).not.toBeNull();
    expect(mod.roiTStat([bets[0]])).toBeNull();
  });
});
