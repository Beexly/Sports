/**
 * Fantasy trade analyzer — tests.
 *
 * Coverage: settings-adjusted scoring (PPR + matchup), tier assignment by
 * position percentile, even swap -> fair, star-for-two-flexes under PPR
 * with tiers assigned and a signed verdict, magnitude bands, and the
 * handoff-suite TradeApi factory.
 */
import { describe, expect, it } from "vitest";
import {
  analyzeTrade,
  createTradeAnalyzer,
  DEFAULT_ROSTER_SLOTS,
  positionPercentile,
  settingsAdjustedPoints,
  tierFromPercentile,
  verdictFromDelta,
  type FantasyPlayer,
  type PprSetting,
} from "./trade-analyzer.js";

function player(
  id: string,
  name: string,
  position: string,
  projectedPoints: number,
  projectedReceptions: number,
  matchupAdjustment?: number,
): FantasyPlayer {
  return {
    id,
    name,
    position,
    projectedPoints,
    projectedReceptions,
    ...(matchupAdjustment === undefined ? {} : { matchupAdjustment }),
  };
}

const PPR: PprSetting = 1;

describe("settingsAdjustedPoints", () => {
  it("applies PPR on receptions then the matchup multiplier", () => {
    const wr = player("w1", "WR One", "WR", 100, 80);
    // 100 + 1*80 = 180
    expect(settingsAdjustedPoints(wr, 1)).toBeCloseTo(180, 10);
    // half-PPR: 100 + 0.5*80 = 140
    expect(settingsAdjustedPoints(wr, 0.5)).toBeCloseTo(140, 10);
    // standard: 100
    expect(settingsAdjustedPoints(wr, 0)).toBeCloseTo(100, 10);
    // matchup multiplier after PPR
    expect(settingsAdjustedPoints(wr, 1, 1.1)).toBeCloseTo(198, 10);
    // per-player override beats the trade default
    const boosted = player("w2", "WR Two", "WR", 100, 80, 1.2);
    expect(settingsAdjustedPoints(boosted, 1, 1.1)).toBeCloseTo(216, 10);
  });
});

describe("positionPercentile + tierFromPercentile", () => {
  it("maps mid-rank ties and the four-tier ladder", () => {
    const pool = [10, 20, 30, 40, 50];
    expect(positionPercentile(50, pool)).toBeCloseTo(90, 10);
    expect(positionPercentile(30, pool)).toBeCloseTo(50, 10);
    expect(positionPercentile(10, pool)).toBeCloseTo(10, 10);
    expect(positionPercentile(30, [])).toBe(100);
    expect(positionPercentile(30, [30])).toBe(100);

    expect(tierFromPercentile(90)).toBe("elite");
    expect(tierFromPercentile(70)).toBe("starter");
    expect(tierFromPercentile(40)).toBe("flex");
    expect(tierFromPercentile(10)).toBe("replaceable");
  });
});

describe("verdictFromDelta", () => {
  it("bands magnitude into fair / wins-loses / fleece", () => {
    expect(verdictFromDelta(0)).toBe("fair");
    expect(verdictFromDelta(4.9)).toBe("fair");
    expect(verdictFromDelta(-4.9)).toBe("fair");
    expect(verdictFromDelta(5)).toBe("side-a-wins");
    expect(verdictFromDelta(-5)).toBe("side-a-loses");
    expect(verdictFromDelta(15)).toBe("side-a-wins");
    expect(verdictFromDelta(15.1)).toBe("side-a-fleeces");
    expect(verdictFromDelta(-15.1)).toBe("side-a-fleeced");
  });
});

describe("analyzeTrade", () => {
  it("even swap -> fair", () => {
    // Two identical WRs, same receptions, neutral matchup: delta = 0.
    const a = player("a1", "Alpha", "WR", 150, 70);
    const b = player("b1", "Beta", "WR", 150, 70);
    const result = analyzeTrade({
      ppr: PPR,
      rosterSlots: DEFAULT_ROSTER_SLOTS,
      sideA: [a],
      sideB: [b],
    });
    expect(result.valueDeltaPct).toBeCloseTo(0, 10);
    expect(result.verdict).toBe("fair");
    expect(result.tiersA).toHaveLength(1);
    expect(result.tiersB).toHaveLength(1);
    expect(result.explanation).toContain("fair");
  });

  it("star-for-two-flexes under PPR computes, assigns tiers, and signs the verdict", () => {
    // Elite RB (low receptions) vs two possession WRs (high receptions).
    // Under PPR the two WRs' receiving volume closes the raw-points gap.
    const starRb = player("rb1", "Star RB", "RB", 280, 40);
    const flexWr1 = player("wr1", "Flex WR A", "WR", 160, 85);
    const flexWr2 = player("wr2", "Flex WR B", "WR", 155, 80);

    // Position reference pools so the star reads elite and the flexes
    // land mid-ladder (percentile is not forced by the 3-player trade).
    // WR pool is centered near the flexes' 235-245 adjusted points.
    const positionReference = {
      RB: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
      WR: [200, 210, 220, 230, 240, 245, 250, 260, 270, 280],
    };

    const result = analyzeTrade({
      ppr: PPR,
      rosterSlots: DEFAULT_ROSTER_SLOTS,
      sideA: [starRb],
      sideB: [flexWr1, flexWr2],
      positionReference,
    });

    // Settings-adjusted totals: A 280+40 = 320; B (160+85)+(155+80) = 480.
    expect(result.tiersA[0]?.adjustedPoints).toBeCloseTo(320, 10);
    expect(result.tiersB[0]?.adjustedPoints).toBeCloseTo(245, 10);
    expect(result.tiersB[1]?.adjustedPoints).toBeCloseTo(235, 10);

    // Tiers assigned from position percentiles.
    expect(result.tiersA[0]?.tier).toBe("elite");
    expect(result.tiersB[0]?.tier).toBe("flex");
    expect(result.tiersB[1]?.tier).toBe("flex");
    expect(result.tiersA[0]?.positionPercentile).toBeGreaterThan(80);

    // sumB - sumA = 480 - 320 = +160; baseline 400 -> +40%.
    expect(result.valueDeltaPct).toBeCloseTo(40, 10);
    expect(result.verdict).toBe("side-a-fleeces");

    // Explanation names both sides and the PPR setting.
    expect(result.explanation).toContain("PPR 1");
    expect(result.explanation).toContain("Star RB");
    expect(result.explanation).toContain("Flex WR A");
    expect(result.explanation).toContain("side-a-fleeces");
  });

  it("half-PPR shrinks the receiving-side edge versus full PPR", () => {
    const starRb = player("rb1", "Star RB", "RB", 280, 40);
    const flexWr1 = player("wr1", "Flex WR A", "WR", 160, 85);
    const flexWr2 = player("wr2", "Flex WR B", "WR", 155, 80);

    const full = analyzeTrade({ ppr: 1, sideA: [starRb], sideB: [flexWr1, flexWr2] });
    const half = analyzeTrade({ ppr: 0.5, sideA: [starRb], sideB: [flexWr1, flexWr2] });
    expect(half.valueDeltaPct).toBeLessThan(full.valueDeltaPct);
  });

  it("matchup adjustment moves the signed delta", () => {
    const a = player("a1", "Alpha", "RB", 200, 20);
    const b = player("b1", "Beta", "RB", 200, 20);
    // 1.08 -> B 216 vs A 200; delta ~7.7% lands in the wins band.
    const boosted = analyzeTrade({
      ppr: 0,
      sideA: [a],
      sideB: [{ ...b, matchupAdjustment: 1.08 }],
    });
    expect(boosted.valueDeltaPct).toBeGreaterThan(5);
    expect(boosted.valueDeltaPct).toBeLessThanOrEqual(15);
    expect(boosted.verdict).toBe("side-a-wins");
  });
});

describe("createTradeAnalyzer (handoff TradeApi)", () => {
  it("exposes analyze() returning the documented shape", () => {
    const api = createTradeAnalyzer();
    expect(typeof api.analyze).toBe("function");
    const result = api.analyze({
      ppr: 1,
      sideA: [player("a1", "Alpha", "WR", 150, 70)],
      sideB: [player("b1", "Beta", "WR", 150, 70)],
    });
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("valueDeltaPct");
    expect(result).toHaveProperty("tiersA");
    expect(result).toHaveProperty("tiersB");
    expect(result).toHaveProperty("explanation");
  });
});
