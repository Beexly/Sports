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

/** Sources intentionally uncleared until registry grant (compliance / terms). */
const UNCLEARED_IDS = new Set([
  "polymarket-gamma",
  "kalshi-public",
  "mlb-statsapi",
  "mlb-statsapi-cleared",
  "balldontlie-nba",
  "fpl-official",
  "nhl-web-api",
  "henrygd-ncaa",
]);

describe("source-router: free-first orchestration + clearance honesty", () => {
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

  it("NCAAF router-cleared scores are ESPN; henrygd stays uncleared (adapter-only)", () => {
    const cleared = clearedSources("scores", "ncaaf");
    const ids = cleared.map((s) => s.id);
    expect(ids).toContain("espn-public-api");
    expect(ids).not.toContain("henrygd-ncaa");
    const henrygd = PLATFORM_SOURCES.find((s) => s.id === "henrygd-ncaa");
    expect(henrygd?.cleared).toBe(false);
    // Free-settlement may still call henrygd directly; router auto-select does not.
  });

  it("weather is covered free by Open-Meteo for every sport", () => {
    for (const sport of ALL_SPORTS) {
      expect(bestFreeClearedSource("weather", sport)?.id).toBe("open-meteo");
      expect(requiresPaidEscalation("weather", sport)).toBe(false);
    }
  });

  it("odds free candidates (gamma/kalshi) are uncleared — compliance hold", () => {
    for (const id of ["polymarket-gamma", "kalshi-public"] as const) {
      expect(PLATFORM_SOURCES.find((s) => s.id === id)?.cleared).toBe(false);
    }
    const freeClearedOdds = clearedSources("odds", "nfl").filter((s) =>
      s.tier.startsWith("free"),
    );
    expect(freeClearedOdds.length).toBe(0);
    // Licensed Odds API remains the only cleared odds source until registry grants free odds.
    const plan = planIngestion("odds", "nfl");
    expect(plan.primary?.id).toBe("the-odds-api");
    expect(plan.mustSpend).toBe(true);
    expect(plan.freeCovers).toBe(false);
    expect(plan.unlockToGoFree.map((s) => s.id)).toEqual(
      expect.arrayContaining(["polymarket-gamma", "kalshi-public"]),
    );
  });

  it("requiresPaidEscalation is false when free cleared scores exist", () => {
    expect(requiresPaidEscalation("scores", "nfl")).toBe(false);
    expect(requiresPaidEscalation("standings", "mlb")).toBe(false);
    // Odds currently require spend (only licensed cleared) — honest until free odds registry.
    expect(requiresPaidEscalation("odds", "nfl")).toBe(true);
  });

  it("freeCoverageMatrix reports free scores; odds spend until free registry grant", () => {
    const matrix = freeCoverageMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    const nflScores = matrix.find((r) => r.need === "scores" && r.sport === "nfl");
    expect(nflScores?.freeCovers).toBe(true);
    const nflOdds = matrix.find((r) => r.need === "odds" && r.sport === "nfl");
    expect(nflOdds?.mustSpend).toBe(true);
    expect(nflOdds?.clearedCount).toBe(1); // the-odds-api only
  });

  it("every cleared source has a registry id (traceable to rights posture)", () => {
    for (const s of PLATFORM_SOURCES) {
      if (s.cleared) expect(s.registrySourceId, s.id).not.toBeNull();
    }
  });

  it("unregistered / compliance-hold sources are uncleared", () => {
    for (const id of UNCLEARED_IDS) {
      const row = PLATFORM_SOURCES.find((s) => s.id === id);
      expect(row, id).toBeDefined();
      expect(row!.cleared, id).toBe(false);
    }
  });

  it("registry-backed free spines remain cleared", () => {
    for (const id of ["nflverse", "espn-public-api", "open-meteo", "the-odds-api"] as const) {
      expect(PLATFORM_SOURCES.find((s) => s.id === id)?.cleared, id).toBe(true);
    }
  });

  it("NFL scores still dual-cleared (nflverse + espn); other majors may be single until registry", () => {
    expect(clearedSources("scores", "nfl").length).toBeGreaterThanOrEqual(2);
    // Single free cleared (ESPN) is honest for nba/mlb/nhl/ncaa until dual registry rows exist.
    for (const sport of ["nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      expect(clearedSources("scores", sport).some((s) => s.id === "espn-public-api")).toBe(
        true,
      );
    }
  });
});
