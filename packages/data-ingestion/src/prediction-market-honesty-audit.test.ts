/**
 * Tests for ./prediction-market-honesty-audit (arXiv:1609.03471v1, lane=markets).
 *
 * ACCEPTANCE GATE: Replicate-to-baseline gate: confirm on 2024-2025 prediction-market data the paper's empirical
 * pattern -- <1% of traders profit >$400 vs ~5% losing >$400, day-trader mean trading profit
 * negative, KS test on entry-time profits n.s. at 95%, mean-belief intervals straddling 0.5 -- as
 * GSE's published market-honesty baseline.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./prediction-market-honesty-audit";

describe("prediction-market honesty audit (arXiv:1609.03471v1)", () => {
  const rows = [
    { traderId: "a", profit: 500, isDayTrader: true, entryTime: 1 },
    { traderId: "b", profit: -500, isDayTrader: true, entryTime: 2 },
    { traderId: "c", profit: -600, isDayTrader: false, entryTime: 3 },
    { traderId: "d", profit: 100, isDayTrader: true, entryTime: 1.5 },
    { traderId: "e", profit: -100, isDayTrader: false, entryTime: 4 },
    null,
  ];
  it("headline distribution stats", () => {
    const s = mod.profitDistributionStats(rows)!;
    expect(s.n).toBe(5);
    expect(s.pctProfitOver).toBeCloseTo(0.2, 10);
    expect(s.pctLossOver).toBeCloseTo(0.4, 10);
    expect(s.dayTraderMean).toBeCloseTo(100 / 3, 10);
  });
  it("KS statistic basics", () => {
    expect(mod.ksStatistic([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    expect(mod.ksStatistic([1, 1, 1], [10, 10, 10])).toBeCloseTo(1, 10);
    expect(mod.ksStatistic([], [1])).toBeNull();
  });
  it("belief straddle check", () => {
    expect(mod.beliefIntervalsStraddle([{ lo: 0.4, hi: 0.6 }])).toBe(true);
    expect(mod.beliefIntervalsStraddle([{ lo: 0.6, hi: 0.8 }])).toBe(false);
    expect(mod.beliefIntervalsStraddle([])).toBeNull();
    expect(mod.beliefIntervalsStraddle([{ lo: 0.8, hi: 0.6 }])).toBeNull();
  });
  it("entry timing test", () => {
    const t = mod.entryTimingTest(rows)!;
    expect(t.nWinners).toBe(2);
    expect(t.nLosers).toBe(3);
    expect(t.ks).toBeGreaterThanOrEqual(0);
  });
  it("null on empty", () => {
    expect(mod.profitDistributionStats([])).toBeNull();
    expect(mod.entryTimingTest([])).toBeNull();
  });
});
