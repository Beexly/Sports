import { describe, it, expect } from "vitest";
import { detectCoverageGaps, DEFAULT_MODULE_REQUIREMENTS } from "../coverage-gap-radar.js";
import { ENDPOINTS_NFLVERSE, ENDPOINTS_ODDS_API } from "../source-mesh-fixtures.js";

describe("Coverage Gap Radar", () => {
  it("identifies the missing fantasy/DFS/market facts when only football-reality endpoints exist", () => {
    const r = detectCoverageGaps(DEFAULT_MODULE_REQUIREMENTS, ENDPOINTS_NFLVERSE);
    const missing = new Set(r.gaps.map((g) => g.factType));
    for (const needed of ["odds_history", "dfs_salary", "adp", "roster_pct", "start_pct", "add_drop_velocity"] as const) {
      expect(missing.has(needed)).toBe(true);
    }
    // nflverse DOES cover the role-state facts, so those are not gaps.
    expect(missing.has("snap_share")).toBe(false);
    expect(missing.has("route_rate")).toBe(false);
  });
  it("closes the market gaps when the odds endpoints are added", () => {
    const r = detectCoverageGaps(DEFAULT_MODULE_REQUIREMENTS, [...ENDPOINTS_NFLVERSE, ...ENDPOINTS_ODDS_API]);
    const missing = new Set(r.gaps.map((g) => g.factType));
    expect(missing.has("odds_history")).toBe(false);
    expect(missing.has("dfs_salary")).toBe(true); // still uncovered — no DFS source yet
  });
  it("ranks gaps by how many modules they block", () => {
    const r = detectCoverageGaps(DEFAULT_MODULE_REQUIREMENTS, []);
    expect(r.gaps[0]!.modulesBlocked.length).toBeGreaterThanOrEqual(r.gaps[r.gaps.length - 1]!.modulesBlocked.length);
  });
});
