import { describe, expect, it } from "vitest";
import {
  buildMetricResidualRollup,
  buildMetricResidualRollups,
  type MetricResidualPlayInput,
} from "../core/index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const cleanPolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

const blockedPolicy: MetricSourcePolicy = {
  allowedForModeling: false,
  sourceId: "restricted-tracking-feed",
  status: "blocked",
};

function yacRow(overrides: Partial<MetricResidualPlayInput> = {}): MetricResidualPlayInput {
  return {
    actualValue: 8,
    confidenceScore: 74,
    creationIndex: 66,
    expectedValue: 5,
    metricId: "yac-creation-gse",
    playerId: "wr-1",
    playerName: "Fixture Receiver",
    season: 2026,
    sourcePolicy: [cleanPolicy],
    team: "GSE",
    uncertaintyBand: "MEDIUM",
    ...overrides,
  };
}

function rushRow(overrides: Partial<MetricResidualPlayInput> = {}): MetricResidualPlayInput {
  return {
    actualValue: 11,
    confidenceScore: 76,
    creationIndex: 68,
    expectedValue: 4,
    metricId: "rush-over-expected-gse",
    playerId: "rb-1",
    playerName: "Fixture Rusher",
    season: 2026,
    sourcePolicy: [cleanPolicy],
    team: "GSE",
    uncertaintyBand: "MEDIUM",
    ...overrides,
  };
}

function repeatedRows(
  count: number,
  rowFactory: (index: number) => MetricResidualPlayInput,
): readonly MetricResidualPlayInput[] {
  return Array.from({ length: count }, (_value, index) => rowFactory(index));
}

describe("metric residual rollups", () => {
  it("rolls receiver YAC residuals into player-season totals without protected weights", () => {
    const rollup = buildMetricResidualRollup([
      yacRow({ actualValue: 12, expectedValue: 7, playId: "play-1" }),
      yacRow({ actualValue: 4, expectedValue: 6, playId: "play-2" }),
      yacRow({ actualValue: 9, expectedValue: 5, playId: "play-3" }),
    ]);

    expect(rollup.rollupKind).toBe("PLAYER_SEASON_RESIDUAL");
    expect(rollup.metricId).toBe("yac-creation-gse");
    expect(rollup.status).toBe("SHADOW");
    expect(rollup.exposure).toBe("INTERNAL");
    expect(rollup.sampleSize).toBe(3);
    expect(rollup.actualTotal).toBe(25);
    expect(rollup.expectedTotal).toBe(18);
    expect(rollup.residualTotal).toBe(7);
    expect(rollup.residualPerPlay).toBeCloseTo(2.333, 3);
    expect(rollup.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_OUTCOME_CERTAINTY");
    expect(rollup.drivers.some((driver) => Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(false);
  });

  it("keeps receiver and rusher rollups separate by metric, player, and season", () => {
    const rollups = buildMetricResidualRollups([
      yacRow({ playerId: "athlete-1", season: 2026 }),
      yacRow({ playerId: "athlete-1", season: 2025 }),
      rushRow({ playerId: "athlete-1", season: 2026 }),
      rushRow({ playerId: "athlete-2", season: 2026 }),
    ]);

    expect(rollups.map((rollup) => `${rollup.metricId}:${rollup.playerId}:${rollup.season}`)).toEqual([
      "rush-over-expected-gse:athlete-1:2026",
      "rush-over-expected-gse:athlete-2:2026",
      "yac-creation-gse:athlete-1:2025",
      "yac-creation-gse:athlete-1:2026",
    ]);
  });

  it("fails source posture closed when a rollup includes blocked source policy", () => {
    const clean = buildMetricResidualRollup(
      repeatedRows(80, (index) => yacRow({ playId: `clean-${index}`, uncertaintyBand: "LOW" })),
    );
    const blocked = buildMetricResidualRollup(
      repeatedRows(80, (index) =>
        yacRow({ playId: `blocked-${index}`, sourcePolicy: [cleanPolicy, blockedPolicy], uncertaintyBand: "LOW" }),
      ),
    );

    expect(clean.sourceValidation.status).toBe("PASS");
    expect(blocked.sourceValidation.status).toBe("FAIL_CLOSED");
    expect(blocked.uncertaintyBand).toBe("HIGH");
    expect(blocked.confidenceScore).toBeLessThan(clean.confidenceScore);
  });

  it("keeps residual magnitude separate from evidence confidence", () => {
    const lowConfidence = buildMetricResidualRollup(
      repeatedRows(80, (index) =>
        rushRow({ confidenceScore: 34, playId: `low-${index}`, uncertaintyBand: "LOW" }),
      ),
    );
    const highConfidence = buildMetricResidualRollup(
      repeatedRows(80, (index) =>
        rushRow({ confidenceScore: 82, playId: `high-${index}`, uncertaintyBand: "LOW" }),
      ),
    );

    expect(lowConfidence.residualTotal).toBe(highConfidence.residualTotal);
    expect(lowConfidence.residualPerPlay).toBe(highConfidence.residualPerPlay);
    expect(highConfidence.confidenceScore).toBeGreaterThan(lowConfidence.confidenceScore);
  });

  it("throws on empty rollups instead of fabricating a player summary", () => {
    expect(() => buildMetricResidualRollup([])).toThrow("requires at least one play row");
  });

  it("rejects mixed direct rollups instead of blending unrelated player summaries", () => {
    expect(() => buildMetricResidualRollup([yacRow(), rushRow({ playerId: "wr-1" })])).toThrow(
      "same metric, player, and season",
    );
  });
});
