import { describe, it, expect } from "vitest";
import {
  PLATFORM_SOURCES,
  routeSources,
  clearedSources,
  bestFreeClearedSource,
  planIngestion,
  requiresPaidEscalation,
  freeCoverageMatrix,
  isFreeTier,
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

  it("NCAAF scores fall to the cleared free ESPN feed (gated candidates excluded)", () => {
    const cleared = clearedSources("scores", "ncaaf");
    expect(cleared[0]?.id).toBe("espn-public-api");
    expect(cleared.every((s) => s.cleared)).toBe(true);
  });

  it("weather is covered free by Open-Meteo for every sport", () => {
    for (const sport of ALL_SPORTS) {
      expect(bestFreeClearedSource("weather", sport)?.id).toBe("open-meteo");
      expect(requiresPaidEscalation("weather", sport)).toBe(false);
    }
  });

  it("odds currently require paid escalation (free odds sources still gated)", () => {
    const plan = planIngestion("odds", "nfl");
    expect(plan.mustSpend).toBe(true);
    expect(plan.primary?.id).toBe("the-odds-api");
    // …and it tells us which free sources to clear to stop paying.
    expect(plan.unlockToGoFree.length).toBeGreaterThan(0);
    expect(plan.unlockToGoFree.every((s) => isFreeTier(s.tier) && !s.cleared)).toBe(true);
  });

  it("requiresPaidEscalation is false whenever a free cleared source exists", () => {
    expect(requiresPaidEscalation("scores", "nfl")).toBe(false); // nflverse
    expect(requiresPaidEscalation("standings", "mlb")).toBe(false); // espn
  });

  it("freeCoverageMatrix reports free coverage and flags spend needs", () => {
    const matrix = freeCoverageMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    const nflScores = matrix.find((r) => r.need === "scores" && r.sport === "nfl");
    expect(nflScores?.freeCovers).toBe(true);
    const nflOdds = matrix.find((r) => r.need === "odds" && r.sport === "nfl");
    expect(nflOdds?.mustSpend).toBe(true);
  });

  it("every cleared source has a registry id (traceable to rights posture)", () => {
    for (const s of PLATFORM_SOURCES) {
      if (s.cleared) expect(s.registrySourceId, s.id).not.toBeNull();
    }
  });
});
