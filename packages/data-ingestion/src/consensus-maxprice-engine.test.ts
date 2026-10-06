/**
 * Tests for ./consensus-maxprice-engine (arXiv:1710.02824v2, lane=markets).
 *
 * ACCEPTANCE GATE: ADOPT the consensus/max-price rule as a live signal iff on the 2023-2024 backtest it delivers
 * ROI >= 2% over >= 500 signals with positive mean CLV. If ROI <= 0 or CLV <= 0, reject -- the
 * dispersion edge doesn't exist in current NFL markets.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./consensus-maxprice-engine";

describe("consensus max-price engine (arXiv:1710.02824v2)", () => {
  const now = Date.now();
  const quotes = [
    { book: "a", decimalOdds: 2.0, capturedAt: new Date(now - 1000).toISOString() },
    { book: "b", decimalOdds: 2.1, capturedAt: new Date(now - 2000).toISOString() },
    { book: "c", decimalOdds: 2.5, capturedAt: new Date(now - 3000).toISOString() },
  ];
  it("fair prob from mean odds", () => {
    expect(mod.fairProbFromMeanOdds(quotes)).toBeCloseTo(1 / 2.2, 10);
    expect(mod.fairProbFromMeanOdds([])).toBeNull();
    expect(mod.fairProbFromMeanOdds([{ book: "a", decimalOdds: 0.5, capturedAt: new Date().toISOString() }])).toBeNull();
  });
  it("flags max-price EV beyond alpha", () => {
    const s = mod.maxPriceSignal(quotes, 0.05)!;
    expect(s.book).toBe("c");
    expect(s.ev).toBeGreaterThan(0.05);
    expect(mod.maxPriceSignal(quotes, 0.99)).toBeNull();
    expect(mod.maxPriceSignal([quotes[0]], 0.01)).toBeNull();
  });
  it("stale quote rate", () => {
    expect(mod.staleQuoteRate(quotes, 2500, now)).toBeCloseTo(1 / 3, 10);
    expect(mod.staleQuoteRate([], 1000, now)).toBeNull();
  });
  it("signal log entry is paper-trade stamped", () => {
    const e = JSON.parse(mod.signalLogEntry("g1", "ML", quotes, null)!);
    expect(e.mode).toBe("paper-trade");
    expect(e.books).toBe(3);
    expect(mod.signalLogEntry(42 as never, "ML", quotes, null)).toBeNull();
  });
});
