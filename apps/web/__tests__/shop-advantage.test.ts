import { describe, it, expect } from "vitest";
import { computeShopAdvantage } from "@/lib/market/shop-advantage";

describe("computeShopAdvantage", () => {
  it("returns a positive advantage when the best price beats the average price", () => {
    // -178 (avg) implies a higher probability than -172 (best) — shopping helps.
    const result = computeShopAdvantage({ avgPrice: -178, bestPrice: -172 });
    expect(result.avgImpliedProb).toBeGreaterThan(result.bestImpliedProb);
    expect(result.shopAdvantageProb).toBeGreaterThan(0);
  });

  it("returns exactly zero when the best price equals the average price", () => {
    const result = computeShopAdvantage({ avgPrice: -150, bestPrice: -150 });
    expect(result.shopAdvantageProb).toBe(0);
  });

  it("never goes negative even if bestPrice is somehow worse than avgPrice", () => {
    // Inverted on purpose to prove the clamp, not a real-world shape.
    const result = computeShopAdvantage({ avgPrice: -172, bestPrice: -178 });
    expect(result.shopAdvantageProb).toBe(0);
  });

  it("computes a sane magnitude for a realistic moneyline gap", () => {
    const result = computeShopAdvantage({ avgPrice: -178, bestPrice: -172 });
    // -178 -> ~0.6403, -172 -> ~0.6324, delta ~0.0079 (well under 1 percentage point)
    expect(result.shopAdvantageProb).toBeCloseTo(0.0079, 3);
  });

  it("handles positive (underdog) American odds correctly", () => {
    const result = computeShopAdvantage({ avgPrice: 150, bestPrice: 160 });
    expect(result.avgImpliedProb).toBeGreaterThan(result.bestImpliedProb);
    expect(result.shopAdvantageProb).toBeGreaterThan(0);
  });
});
