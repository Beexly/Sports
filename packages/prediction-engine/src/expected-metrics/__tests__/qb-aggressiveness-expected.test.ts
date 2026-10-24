import { describe, expect, it } from "vitest";
import { computeQbAggressivenessExpected } from "../qb-aggressiveness-expected.js";
import type { CovariateRow } from "../../edge-lab/covariate-bus.js";

const DEFAULT_ROW: CovariateRow = {
  gsisId: "test-id",
  season: 2026,
  week: 1,
  statType: "passing",
  avgSeparation: null,
  avgCushion: null,
  airYardsShare: null,
  avgTimeToThrow: null,
  aggressiveness: 10,
  avgIntendedAirYards: null,
  avgCompletedAirYards: null,
  avgAirYardsDifferential: null,
  avgAirYardsToSticks: null,
  pctAttemptsGte8Defenders: null,
  avgTimeToLos: null,
  ryoePerAtt: null,
  rushPctOverExpected: null,
  avgYac: null,
  yacAboveExpected: null,
  pressureRate: null,
  snapShare: null,
  tflRate: null,
  pdRate: null,
  intRate: null,
  fumbleRate: null,
  missedTackleRate: null,
  airYardsPerAttempt: null,
  passerRatingAllowed: null,
  passerRating: null,
  avgExpectedYac: null,
  expectedRushYards: null,
};

describe("computeQbAggressivenessExpected", () => {
  it("ignores week 0 rows and rows beyond asOfWeek", () => {
    const rows: CovariateRow[] = [
      { ...DEFAULT_ROW, gsisId: "QB1", week: 0, aggressiveness: 50 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 1, aggressiveness: 10 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 2, aggressiveness: 20 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 3, aggressiveness: 30 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 4, aggressiveness: 90 }, // week 4 == asOfWeek (ignored)

      { ...DEFAULT_ROW, gsisId: "QB2", week: 1, aggressiveness: 15 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 2, aggressiveness: 15 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 3, aggressiveness: 15 },
    ];

    const results = computeQbAggressivenessExpected(rows, 4, "season-to-date");
    expect(results).toHaveLength(2);
    const qb1 = results.find(r => r.playerId === "QB1")!;
    expect(qb1.plays).toBe(3);
    // (10+20+30)/3 = 20
    expect(qb1.actualMean).toBe(20);
  });

  it("ignores non-passing and null aggressiveness rows", () => {
    const rows: CovariateRow[] = [
      { ...DEFAULT_ROW, gsisId: "QB1", week: 1, aggressiveness: 10 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 2, statType: "rushing", aggressiveness: 20 }, // skipped
      { ...DEFAULT_ROW, gsisId: "QB1", week: 3, aggressiveness: 30 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 4, aggressiveness: null }, // skipped
      { ...DEFAULT_ROW, gsisId: "QB1", week: 5, aggressiveness: 20 },
    ];
    // QB1 has weeks 1, 3, 5 -> 3 valid weeks.
    const results = computeQbAggressivenessExpected(rows, 6, "season-to-date");
    expect(results).toHaveLength(1);
    expect(results[0].plays).toBe(3);
    expect(results[0].actualMean).toBe(20); // (10+30+20)/3 = 20
  });

  it("omits QBs with fewer than 3 qualifying weeks", () => {
    const rows: CovariateRow[] = [
      { ...DEFAULT_ROW, gsisId: "QB1", week: 1, aggressiveness: 10 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 2, aggressiveness: 20 },
      // QB1 has 2 weeks

      { ...DEFAULT_ROW, gsisId: "QB2", week: 1, aggressiveness: 15 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 2, aggressiveness: 15 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 3, aggressiveness: 15 },
      // QB2 has 3 weeks
    ];
    const results = computeQbAggressivenessExpected(rows, 4, "season-to-date");
    expect(results).toHaveLength(1);
    expect(results[0].playerId).toBe("QB2");
  });

  it("calculates expected mean and overExpectedTotal correctly", () => {
    const rows: CovariateRow[] = [
      { ...DEFAULT_ROW, gsisId: "QB1", week: 1, aggressiveness: 10 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 2, aggressiveness: 20 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 3, aggressiveness: 30 },
      // QB1 mean = 20

      { ...DEFAULT_ROW, gsisId: "QB2", week: 1, aggressiveness: 30 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 2, aggressiveness: 40 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 3, aggressiveness: 50 },
      // QB2 mean = 40
    ];
    const results = computeQbAggressivenessExpected(rows, 4, "season-to-date");
    // League mean = (20 + 40) / 2 = 30
    const qb1 = results.find(r => r.playerId === "QB1")!;
    expect(qb1.actualMean).toBe(20);
    expect(qb1.expectedMean).toBe(30);
    expect(qb1.overExpected).toBe(-10);
    expect(qb1.overExpectedTotal).toBe(-30); // -10 * 3 plays
  });

  it("applies window correctly (last-4-weeks)", () => {
    const rows: CovariateRow[] = [
      { ...DEFAULT_ROW, gsisId: "QB1", week: 1, aggressiveness: 100 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 2, aggressiveness: 100 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 3, aggressiveness: 10 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 4, aggressiveness: 20 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 5, aggressiveness: 30 },
      { ...DEFAULT_ROW, gsisId: "QB1", week: 6, aggressiveness: 40 },
      // weeks 1-6. Last 4 are 3,4,5,6 (10, 20, 30, 40) -> mean = 25

      { ...DEFAULT_ROW, gsisId: "QB2", week: 1, aggressiveness: 25 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 2, aggressiveness: 25 },
      { ...DEFAULT_ROW, gsisId: "QB2", week: 3, aggressiveness: 25 },
    ];
    const results = computeQbAggressivenessExpected(rows, 7, "last-4-weeks");
    const qb1 = results.find(r => r.playerId === "QB1")!;
    expect(qb1.plays).toBe(4);
    expect(qb1.actualMean).toBe(25);
  });
});
