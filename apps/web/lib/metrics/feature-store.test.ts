import { describe, expect, it } from "vitest";
import { METRIC_COVERAGE, coverageMapRows, metricCoverageById } from "./coverage-map";
import {
  FEATURE_METRIC_DEFINITIONS,
  FEATURE_STORE_PERSISTENCE_TARGET,
  buildOpponentAdjustedEpaFeatureSnapshot,
  featureMetricCoverageIntegrity,
  type FeatureStoreSnapshot,
} from "./feature-store";
import type { Play } from "./opponent-adjusted-epa";

const plays: readonly Play[] = [
  { offense: "A", defense: "B", epa: 0.5 },
  { offense: "A", defense: "C", epa: 0.4 },
  { offense: "B", defense: "A", epa: -0.2 },
  { offense: "C", defense: "A", epa: -0.1 },
];

describe("feature store metric coverage", () => {
  it("has a coverage-map row for every feature metric", () => {
    expect(featureMetricCoverageIntegrity()).toEqual([]);

    for (const definition of FEATURE_METRIC_DEFINITIONS) {
      const coverage = metricCoverageById(definition.coverageId);
      expect(coverage?.id).toBe(definition.coverageId);
    }
  });

  it("keeps feature metrics visible through the cleared coverage-map UI rows", () => {
    const rows = coverageMapRows();

    for (const definition of FEATURE_METRIC_DEFINITIONS) {
      const coverage = metricCoverageById(definition.coverageId);
      expect(rows.some((row) => row.metric === coverage?.shortLabel)).toBe(true);
    }
  });
});

describe("buildOpponentAdjustedEpaFeatureSnapshot", () => {
  it("materializes opponent-adjusted EPA ratings as typed feature rows", () => {
    const now = new Date("2026-06-23T12:00:00.000Z");
    const result = buildOpponentAdjustedEpaFeatureSnapshot(plays, { now, iterations: 10 });
    const row = requireFeatureRow(result, "A");

    expect(result.status).toBe("READY");
    expect(result.metricId).toBe("opponent-adjusted-epa");
    expect(result.generatedAt).toBe("2026-06-23T12:00:00.000Z");
    expect(result.persistence).toEqual(FEATURE_STORE_PERSISTENCE_TARGET);
    expect(row.entityType).toBe("team");
    expect(row.sampleSize).toBe(plays.length);
    expect(row.provenance.source).toContain("nflverse");
    expect(row.values.map((value) => value.key)).toEqual(["offAdj", "defAdj", "offPlays", "defPlays"]);
  });

  it("returns EMPTY_INPUT without fabricating rows when no plays exist", () => {
    const result = buildOpponentAdjustedEpaFeatureSnapshot([], {
      now: new Date("2026-06-23T12:00:00.000Z"),
    });

    expect(result.status).toBe("EMPTY_INPUT");
    expect(result.rows).toEqual([]);
    expect(result.coverage?.id).toBe("opponent-adjusted-epa");
  });

  it("fails closed when the metric has no cleared coverage row", () => {
    const result = buildOpponentAdjustedEpaFeatureSnapshot(plays, {
      now: new Date("2026-06-23T12:00:00.000Z"),
      coverageEntries: [],
    });

    expect(result.status).toBe("BLOCKED_BY_RIGHTS");
    expect(result.coverage).toBeNull();
    expect(result.rows).toEqual([]);
  });

  it("declares R2 and DuckDB as an infra-only persistence seam", () => {
    expect(FEATURE_STORE_PERSISTENCE_TARGET).toEqual({
      kind: "r2-duckdb",
      status: "INFRA",
      bucketBinding: "R2_FEATURE_STORE",
      relation: "feature_store.metric_snapshots",
      partitionKeys: ["metric_id", "generated_at"],
    });
  });
});

describe("featureMetricCoverageIntegrity", () => {
  it("returns the missing definitions when coverage-map rows lag feature definitions", () => {
    expect(featureMetricCoverageIntegrity(FEATURE_METRIC_DEFINITIONS, [])).toEqual(
      FEATURE_METRIC_DEFINITIONS
    );
    expect(featureMetricCoverageIntegrity(FEATURE_METRIC_DEFINITIONS, METRIC_COVERAGE)).toEqual([]);
  });
});

function requireFeatureRow(snapshot: FeatureStoreSnapshot, entityId: string) {
  const row = snapshot.rows.find((candidate) => candidate.entityId === entityId);
  if (row === undefined) {
    throw new Error(`Expected feature row for ${entityId}`);
  }

  return row;
}
