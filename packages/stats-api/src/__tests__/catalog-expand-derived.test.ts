import { describe, expect, it } from "vitest";
import { expandOwnDerivedFormulas } from "../catalog-expand.js";
import { getMetricCatalog } from "../catalog.js";

describe("expandOwnDerivedFormulas", () => {
  const rows = expandOwnDerivedFormulas();

  it("exposes every formula in formulas/derived.ts under its own formulaId", () => {
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("derived.rest_days");
    expect(ids).toContain("derived.self_clv_bps");
    expect(ids).toContain("derived.roll_mean.w4");
    expect(ids).toContain("derived.success_rate.w16");
  });

  it("all rows are ACTIVE — these are real, tested formulas, not placeholders", () => {
    expect(rows.every((r) => r.status === "ACTIVE")).toBe(true);
  });

  it("nflverse-sourced rows require CC-BY-4.0 attribution", () => {
    const nflverseRows = rows.filter((r) => r.sourceIds.some((s) => s.startsWith("nflverse.")));
    expect(nflverseRows.length).toBeGreaterThan(0);
    expect(nflverseRows.every((r) => r.rights.attributionRequired)).toBe(true);
  });

  it("self-CLV is gated to elite_api, never public — first-party archive only", () => {
    const clv = rows.find((r) => r.id === "derived.self_clv_bps");
    expect(clv?.rights.surface).toBe("elite_api");
  });

  it("registers cleanly into the full catalog with no id collisions", () => {
    const ids = getMetricCatalog().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("derived.rest_days");
  });
});
