import { describe, it, expect } from "vitest";
import {
  METRIC_COVERAGE,
  metricClearance,
  clearedMetrics,
  coverageMapUiData,
  coverageMapRows,
  type MetricCoverageEntry,
} from "./coverage-map";

/** A metric pointing at a source that is NOT in the rights registry — must never clear. */
const UNCLEARED_METRIC: MetricCoverageEntry = {
  id: "synthetic-uncleared",
  name: "Synthetic uncleared metric",
  shortLabel: "Uncleared",
  tier: 1,
  sourceId: "definitely-not-a-registered-source",
  clearance: { mode: "open_dataset_ingest", toolId: "fetch-native", intents: ["commercial_display"] },
  theyWithhold: "n/a",
  weCompute: "n/a",
  attribution: "n/a",
};

describe("metrics coverage map — clearance-gated", () => {
  it("every registered metric clears its underlying source (no row without rights)", () => {
    for (const m of METRIC_COVERAGE) {
      const result = metricClearance(m);
      expect(result.allowed, `${m.id} must clear ${m.sourceId}`).toBe(true);
      // a cleared source produces a rights snapshot we can propagate.
      expect(result.rightsSnapshot).not.toBeNull();
    }
  });

  it("opponent-adjusted EPA is registered as the first Tier-1 metric on nflverse", () => {
    const epa = METRIC_COVERAGE.find((m) => m.id === "opponent-adjusted-epa");
    expect(epa).toBeDefined();
    expect(epa?.tier).toBe(1);
    expect(epa?.sourceId).toBe("nflverse");
    expect(epa?.attribution).toContain("nflverse");
  });

  it("clearedMetrics surfaces only cleared rows (fail-closed)", () => {
    const cleared = clearedMetrics();
    // all currently-registered metrics are cleared, so the sets match today.
    expect(cleared.length).toBe(METRIC_COVERAGE.length);
    expect(cleared.every((m) => metricClearance(m).allowed)).toBe(true);
  });

  it("DROPS a metric whose source does not clear (the fail-closed path)", () => {
    // sanity: the synthetic metric genuinely does not clear.
    expect(metricClearance(UNCLEARED_METRIC).allowed).toBe(false);
    const withUncleared = [...METRIC_COVERAGE, UNCLEARED_METRIC];
    const cleared = clearedMetrics(new Date(), withUncleared);
    expect(cleared.some((m) => m.id === "synthetic-uncleared")).toBe(false);
    // the real, cleared rows still pass through.
    expect(cleared.length).toBe(METRIC_COVERAGE.length);
    // and it never reaches the public coverage rows.
    const rows = coverageMapRows(new Date(), withUncleared);
    expect(rows.some((r) => r.metric === "Uncleared")).toBe(false);
  });

  it("coverageMapRows carries the they-withhold / we-compute / attribution framing", () => {
    const rows = coverageMapRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.theyWithhold.length).toBeGreaterThan(0);
      expect(row.weCompute.length).toBeGreaterThan(0);
      expect(row.attribution.length).toBeGreaterThan(0);
    }
  });

  it("builds UI-ready coverage data from cleared metrics only", () => {
    const withUncleared = [...METRIC_COVERAGE, UNCLEARED_METRIC];
    const data = coverageMapUiData(new Date("2026-06-24T16:40:00.000Z"), withUncleared);

    expect(data.headline).toContain("Stats we have");
    expect(data.generatedAt).toBe("2026-06-24T16:40:00.000Z");
    expect(data.summary.clearedRows).toBe(METRIC_COVERAGE.length);
    expect(data.summary.withheldRows).toBe(1);
    expect(data.summary.priced).toBe(false);
    expect(data.rows.some((row) => row.id === "synthetic-uncleared")).toBe(false);
    expect(data.rows[0]).toMatchObject({
      claimStatus: "cleared",
      id: "opponent-adjusted-epa",
      priced: false,
      sourceId: "nflverse",
    });
  });
});
