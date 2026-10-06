import { describe, expect, it } from "vitest";
import { toMarketSignalRow } from "@/lib/ops/prediction-market-snapshot";

describe("toMarketSignalRow", () => {
  it("projects a full fair-value snapshot to a MARKET_SENTIMENT row", () => {
    const row = toMarketSignalRow({
      source: "kalshi",
      homeFairProb: 0.62,
      awayFairProb: 0.38,
      capturedAt: "2026-10-01T12:00:00.000Z",
    });
    expect(row).not.toBeNull();
    expect(row!.sourceCategory).toBe("MARKET_SENTIMENT");
    expect(row!.sourceName).toBe("kalshi");
    expect(row!.signalKey).toBe("fair_value_moneyline");
    expect(row!.signalValue.homeFairProb).toBe(0.62);
    expect(row!.signalValue.awayFairProb).toBe(0.38);
    expect(row!.trustLevel).toBe(0.9);
  });

  it("returns null for a null pair — honest miss, never persisted", () => {
    expect(
      toMarketSignalRow({
        source: "kalshi",
        homeFairProb: null,
        awayFairProb: null,
        capturedAt: "2026-10-01T12:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("keeps a one-sided quote without inventing the complement", () => {
    const row = toMarketSignalRow({
      source: "polymarket_gamma_internal",
      homeFairProb: 0.7,
      awayFairProb: null,
      capturedAt: "2026-10-01T12:00:00.000Z",
    });
    expect(row!.signalValue.homeFairProb).toBe(0.7);
    expect(row!.signalValue.awayFairProb).toBeNull();
  });

  it("rejects non-finite probabilities", () => {
    expect(
      toMarketSignalRow({
        source: "kalshi",
        homeFairProb: NaN,
        awayFairProb: Infinity,
        capturedAt: "2026-10-01T12:00:00.000Z",
      }),
    ).toBeNull();
  });
});
