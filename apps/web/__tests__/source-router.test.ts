import { describe, it, expect } from "vitest";
import {
  PLATFORM_SOURCES,
  routeSources,
  clearedSources,
  bestFreeClearedSource,
  planIngestion,
  requiresPaidEscalation,
  freeCoverageMatrix,
  ALL_SPORTS,
} from "@/lib/data-sources/source-router";
import { COST_TIER_RANK } from "@/lib/data-sources/cost-policy";

describe("source-router: free-first orchestration", () => {
  it("orders every route free-first (cost rank non-decreasing)", () => {
    for (const sport of ALL_SPORTS) {
      for (const need of ["scores", "odds", "team_stats", "standings"] as const) {
        const ranks = routeSources(need, sport).map((s) => COST_TIER_RANK[s.tier]);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      }
    }
  });

  it("NFL scores use the free open dataset (nflverse) first", () => {
    expect(routeSources("scores", "nfl")[0]?.id).toBe("nflverse");
    const plan = planIngestion("scores", "nfl");
    expect(plan.freeCovers).toBe(true);
    expect(plan.mustSpend).toBe(false);
    expect(plan.primary?.id).toBe("nflverse");
  });

  it("NCAAF scores have dual free cleared sources (ESPN + henrygd)", () => {
    const cleared = clearedSources("scores", "ncaaf");
    const ids = cleared.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["espn-public-api", "henrygd-ncaa"]));
    expect(cleared.length).toBeGreaterThanOrEqual(2);
    expect(cleared.every((s) => s.cleared)).toBe(true);
  });

  it("weather is covered free by Open-Meteo for every sport", () => {
    for (const sport of ALL_SPORTS) {
      expect(bestFreeClearedSource("weather", sport)?.id).toBe("open-meteo");
      expect(requiresPaidEscalation("weather", sport)).toBe(false);
    }
  });

  it("odds free path covers without paid Odds (gamma/kalshi dual)", () => {
    const plan = planIngestion("odds", "nfl");
    expect(plan.mustSpend).toBe(false);
    expect(plan.freeCovers).toBe(true);
    const freeOdds = clearedSources("odds", "nfl").filter((s) =>
      s.tier.startsWith("free"),
    );
    expect(freeOdds.length).toBeGreaterThanOrEqual(2);
  });

  it("requiresPaidEscalation is false whenever a free cleared source exists", () => {
    expect(requiresPaidEscalation("scores", "nfl")).toBe(false);
    expect(requiresPaidEscalation("standings", "mlb")).toBe(false);
    expect(requiresPaidEscalation("odds", "nfl")).toBe(false);
  });

  it("freeCoverageMatrix reports free coverage and dual odds", () => {
    const matrix = freeCoverageMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    const nflScores = matrix.find((r) => r.need === "scores" && r.sport === "nfl");
    expect(nflScores?.freeCovers).toBe(true);
    const nflOdds = matrix.find((r) => r.need === "odds" && r.sport === "nfl");
    expect(nflOdds?.mustSpend).toBe(false);
    expect(nflOdds?.clearedCount).toBeGreaterThanOrEqual(2);
  });

  it("every cleared source has a registry id (traceable to rights posture)", () => {
    for (const s of PLATFORM_SOURCES) {
      if (s.cleared) expect(s.registrySourceId, s.id).not.toBeNull();
    }
  });

  it("world-class: major sports scores have dual+ cleared sources", () => {
    for (const sport of ["nfl", "nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      expect(clearedSources("scores", sport).length).toBeGreaterThanOrEqual(2);
    }
  });
});
