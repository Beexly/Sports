import { describe, expect, it } from "vitest";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";
import { scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { clearedSources, PLATFORM_SOURCES } from "@/lib/data-sources/source-router";

describe("world-class multi-source bar", () => {
  it("NBA/MLB/NHL/NCAA score adapter chains remain dual+ (adapter plane ≠ router cleared)", () => {
    for (const s of ["nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      expect(scoreSourceChain(s).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("NFL scores are dual-cleared; other majors keep ESPN as cleared free spine", () => {
    expect(clearedSources("scores", "nfl").length).toBeGreaterThanOrEqual(2);
    for (const sport of ["nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      const cleared = clearedSources("scores", sport);
      expect(cleared.some((s) => s.id === "espn-public-api")).toBe(true);
    }
  });

  it("free odds candidates stay uncleared until counsel-approved registry entry", () => {
    expect(PLATFORM_SOURCES.find((s) => s.id === "polymarket-gamma")?.cleared).toBe(false);
    expect(PLATFORM_SOURCES.find((s) => s.id === "kalshi-public")?.cleared).toBe(false);
    const freeOdds = clearedSources("odds", "nfl").filter((s) => s.tier.startsWith("free"));
    expect(freeOdds.length).toBe(0);
  });

  it("readiness snapshot is draft-ready not autonomous", () => {
    const r = buildWorldClassReadiness();
    expect(r.oddsApiRequired).toBe(false);
    expect(r.liveBoardDefault).toBe("off");
    expect(r.agentPrime.autonomousActive).toBe(0);
    expect(r.agentPrime.externalActions).toBe("NONE");
    expect(r.lanes.length).toBeGreaterThanOrEqual(5);
  });
});
