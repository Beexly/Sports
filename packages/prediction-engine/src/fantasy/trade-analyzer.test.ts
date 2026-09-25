import { describe, expect, it } from "vitest";
import { analyzeTrade, DEFAULT_LEAGUE_SETTINGS, type TradePlayer } from "./trade-analyzer.js";

const player = (name: string, position: TradePlayer["position"], points: number): TradePlayer => ({
  player: name, position, projectedPoints: points, matchupAdjustmentPct: 0,
});

describe("fantasy trade analyzer", () => {
  it("calls an even swap fair", () => {
    const result = analyzeTrade([player("A", "WR", 20)], [player("B", "RB", 20)], DEFAULT_LEAGUE_SETTINGS);
    expect(result.verdict).toBe("fair");
    expect(Math.abs(result.valueDeltaPct)).toBeLessThan(5);
  });

  it("handles a star-for-two-flexes PPR package and assigns tiers", () => {
    const result = analyzeTrade(
      [player("Star", "WR", 300)],
      [player("Flex1", "RB", 120), player("Flex2", "WR", 130)],
      DEFAULT_LEAGUE_SETTINGS,
    );
    expect(["wins", "loses", "fleece"]).toContain(result.verdict);
    expect(result.tiersA[0]?.tier).toBe("elite");
    expect(result.tiersB).toHaveLength(2);
    expect(result.explanation).toContain("%");
  });
});
