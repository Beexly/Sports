/**
 * Vitest suite for arXiv:2605.00864 (Arbitrage Analysis in Polymarket NBA Markets).
 * Gate: Adopt the monitor as a standing benchmark if, on 4 weeks of 2026 NFL Polymarket data, it detects ≥1 genuine in-game dislocation with measured executable depth while keeping post-game false-positive rate at 0.
 */
import { describe, it, expect } from "vitest";
import { singleMarketDislocation, syntheticShortDislocation, dedupDislocations } from "./2605-00864-arbitrage-analysis-in-polymarket-nba";

describe("2605-00864 Polymarket arb monitor", () => {
  it("flags single-market dislocations only with depth", () => {
    const d = singleMarketDislocation({ marketId: "m", askYes: 0.45, askNo: 0.5, depthYes: 100, depthNo: 100 }, 10);
    expect(d.edge).toBeCloseTo(0.05, 10);
    expect(d.executable).toBe(true);
    const thin = singleMarketDislocation({ marketId: "m", askYes: 0.45, askNo: 0.5, depthYes: 1, depthNo: 100 }, 10);
    expect(thin.executable).toBe(false);
    const none = singleMarketDislocation({ marketId: "m", askYes: 0.55, askNo: 0.5, depthYes: 100, depthNo: 100 }, 10);
    expect(none.edge).toBeLessThan(0);
  });
  it("prices the synthetic short net of fees", () => {
    expect(syntheticShortDislocation(0.45, 0.5, 0.01)).toBeCloseTo(0.03, 10);
  });
  it("dedups mirrored liquidity to one edge per market", () => {
    const edges = [
      { marketId: "m", edge: 0.03 },
      { marketId: "m", edge: 0.05 },
      { marketId: "n", edge: 0.01 },
    ];
    const d = dedupDislocations(edges);
    expect(d).toHaveLength(2);
    expect(d.find((e) => e.marketId === "m")?.edge).toBeCloseTo(0.05, 10);
  });
});
