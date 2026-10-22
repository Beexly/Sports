import { describe, it, expect } from "vitest";
import { computeAvgSeparationExpected } from "../avg-separation-expected.js";
import type { CovariateRow } from "../../edge-lab/covariate-bus.js";

function makeRow(
  gsisId: string,
  week: number,
  avgSeparation: number | null,
  statType: "receiving" | "passing" | "rushing" | "defense" = "receiving"
): CovariateRow {
  return {
    gsisId,
    season: 2026,
    week,
    statType,
    avgSeparation,
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    avgAirYardsToSticks: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    avgExpectedYac: null,
    avgYacAboveExpectation: null,
    avgYac: null
  } as CovariateRow;
}

describe("AvgSeparationExpected", () => {
  it("filters out week=0, week>asOfWeek, null avgSeparation, and non-receiving rows", () => {
    const rows = [
      makeRow("P1", 0, 5.0), // week 0 (poison)
      makeRow("P1", 1, 4.0), // valid
      makeRow("P1", 2, 4.5), // valid
      makeRow("P1", 3, 5.5), // valid
      makeRow("P1", 4, 3.0), // week > asOfWeek (3)
      makeRow("P1", 5, null), // null
      makeRow("P1", 6, 2.0, "passing"), // non-receiving
    ];

    const result = computeAvgSeparationExpected(rows, 3, "season-to-date");

    // Only weeks 1, 2, 3 should be valid
    expect(result.metrics.length).toBe(1);
    expect(result.metrics[0].plays).toBe(3); // 3 qualifying weeks

    // Mean of [4.0, 4.5, 5.5] is 14.0 / 3 = 4.6666...
    expect(result.metrics[0].actualMean).toBeCloseTo(4.6667, 4);

    // Total valid rows used = 3
    expect(result.provenance.sampleSize).toBe(3);
  });

  it("enforces 3-qualifying-weeks floor", () => {
    const rows = [
      // P1: exactly 3 valid weeks
      makeRow("P1", 1, 4.0),
      makeRow("P1", 2, 4.5),
      makeRow("P1", 3, 5.5),
      // P2: only 2 valid weeks
      makeRow("P2", 1, 3.0),
      makeRow("P2", 2, 3.5),
      // P3: 3 valid weeks
      makeRow("P3", 1, 2.0),
      makeRow("P3", 2, 2.5),
      makeRow("P3", 3, 3.0),
    ];

    const result = computeAvgSeparationExpected(rows, 3, "season-to-date");

    // P2 should be filtered out
    expect(result.metrics.length).toBe(2);
    expect(result.metrics.map(m => m.playerId).sort()).toEqual(["P1", "P3"]);
  });

  it("computes league mean and overExpected arithmetic correctly", () => {
    const rows = [
      // P1: mean = 4.0 (3 weeks)
      makeRow("P1", 1, 4.0),
      makeRow("P1", 2, 4.0),
      makeRow("P1", 3, 4.0),

      // P2: mean = 3.0 (3 weeks)
      makeRow("P2", 1, 3.0),
      makeRow("P2", 2, 3.0),
      makeRow("P2", 3, 3.0),

      // P3: mean = 5.0 (3 weeks)
      makeRow("P3", 1, 5.0),
      makeRow("P3", 2, 5.0),
      makeRow("P3", 3, 5.0),
    ];

    const result = computeAvgSeparationExpected(rows, 3, "season-to-date");

    // League mean is unweighted average of player means
    // Player means: 4.0, 3.0, 5.0 -> League mean = 4.0

    const m1 = result.metrics.find(m => m.playerId === "P1")!;
    expect(m1.actualMean).toBe(4.0);
    expect(m1.expectedMean).toBe(4.0);
    expect(m1.overExpected).toBe(0.0);
    expect(m1.overExpectedTotal).toBe(0.0);

    const m2 = result.metrics.find(m => m.playerId === "P2")!;
    expect(m2.actualMean).toBe(3.0);
    expect(m2.expectedMean).toBe(4.0);
    expect(m2.overExpected).toBe(-1.0);
    expect(m2.overExpectedTotal).toBe(-3.0); // -1.0 * 3 weeks

    const m3 = result.metrics.find(m => m.playerId === "P3")!;
    expect(m3.actualMean).toBe(5.0);
    expect(m3.expectedMean).toBe(4.0);
    expect(m3.overExpected).toBe(1.0);
    expect(m3.overExpectedTotal).toBe(3.0); // 1.0 * 3 weeks
  });

  it("isolates most recent qualifying weeks for last-4-weeks window, skipping nulls", () => {
    const rows = [
      makeRow("P1", 1, 2.0), // valid
      makeRow("P1", 2, 2.5), // valid
      makeRow("P1", 3, null), // null, skip
      makeRow("P1", 4, 3.0), // valid
      makeRow("P1", 5, 3.5), // valid
      makeRow("P1", 6, 4.0), // valid
    ];

    // Player P1 has 5 valid weeks: W1, W2, W4, W5, W6
    // last-4-weeks window up to W6 should take the 4 most recent valid weeks: W2, W4, W5, W6
    const result = computeAvgSeparationExpected(rows, 6, "last-4-weeks");

    expect(result.metrics.length).toBe(1);
    expect(result.metrics[0].plays).toBe(4);

    // Mean of [2.5, 3.0, 3.5, 4.0] is 13.0 / 4 = 3.25
    expect(result.metrics[0].actualMean).toBe(3.25);
  });

  it("season window equals the union of weekly windows inputs", () => {
    // A consistency check: season-to-date up to W6 should include all 5 valid weeks for P1
    const rows = [
      makeRow("P1", 1, 2.0),
      makeRow("P1", 2, 2.5),
      makeRow("P1", 3, null),
      makeRow("P1", 4, 3.0),
      makeRow("P1", 5, 3.5),
      makeRow("P1", 6, 4.0),
    ];

    const result = computeAvgSeparationExpected(rows, 6, "season-to-date");

    expect(result.metrics.length).toBe(1);
    expect(result.metrics[0].plays).toBe(5);

    // Mean of [2.0, 2.5, 3.0, 3.5, 4.0] is 15.0 / 5 = 3.0
    expect(result.metrics[0].actualMean).toBe(3.0);
  });
});
