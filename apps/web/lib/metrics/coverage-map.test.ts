import { describe, it, expect } from "vitest";
import {
  METRIC_COVERAGE,
  metricClearance,
  clearedMetrics,
  coverageMapRows,
} from "./coverage-map";

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
    expect(epa!.tier).toBe(1);
    expect(epa!.sourceId).toBe("nflverse");
    expect(epa!.attribution).toContain("nflverse");
  });

  it("clearedMetrics surfaces only cleared rows (fail-closed)", () => {
    const cleared = clearedMetrics();
    // all currently-registered metrics are cleared, so the sets match today.
    expect(cleared.length).toBe(METRIC_COVERAGE.length);
    expect(cleared.every((m) => metricClearance(m).allowed)).toBe(true);
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
});
