/**
 * Tests for ./field-prediction-markets (arXiv:2209.08778v1, lane=markets).
 *
 * ACCEPTANCE GATE: Gate is the same market-microstructure validation: rolling informed-flow-share windows must
 * predict the alpha efficiency metric with the predicted sign at statistical significance — if the
 * informed-flow share does not predict efficiency, the detector is descriptive only, not
 * predictive.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./field-prediction-markets";

describe("field prediction markets (arXiv:2209.08778v1)", () => {
  const t0 = Date.now();
  const trades = [
    { marketId: "m", traderId: "a", tradedAt: new Date(t0).toISOString(), price: 0.6, size: 10, side: "yes" },
    { marketId: "m", traderId: "b", tradedAt: new Date(t0 + 1000).toISOString(), price: 0.4, size: 10, side: "no" },
    { marketId: "m", traderId: "a", tradedAt: new Date(t0 + 2000).toISOString(), price: 0.7, size: 20, side: "yes" },
  ];
  it("vwap", () => {
    expect(mod.vwap(trades)).toBeCloseTo((0.6 * 10 + 0.6 * 10 + 0.7 * 20) / 40, 10);
    expect(mod.vwap([])).toBeNull();
  });
  it("diversity", () => {
    expect(mod.traderDiversity(trades)).toBe(2);
    expect(mod.traderDiversity([])).toBeNull();
  });
  it("price reversion", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      marketId: "m",
      traderId: `t${i}`,
      tradedAt: new Date(t0 + i * 1000).toISOString(),
      price: 0.5 + (i % 2 === 0 ? 0.1 : -0.1),
      size: 5,
      side: "yes" as const,
    }));
    const r = mod.priceReversion(many, 2);
    expect(r).not.toBeNull();
    expect(mod.priceReversion(trades, 5)).toBeNull();
  });
  it("isFieldTrade rejects malformed", () => {
    expect(mod.isFieldTrade({ ...trades[0], price: 1.5 })).toBe(false);
  });
});
