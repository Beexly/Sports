import { describe, expect, it } from "vitest";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";
import { scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { clearedSources } from "@/lib/data-sources/source-router";

describe("world-class multi-source bar", () => {
  it("NBA/MLB/NHL/NCAA score chains are dual+", () => {
    for (const s of ["nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      expect(scoreSourceChain(s).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("scores have ≥2 cleared sources for major sports", () => {
    for (const sport of ["nfl", "nba", "mlb", "nhl", "ncaaf", "ncaab"] as const) {
      expect(clearedSources("scores", sport).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("odds free dual (gamma + kalshi) without requiring paid Odds", () => {
    const odds = clearedSources("odds", "nfl").filter((s) => s.tier.startsWith("free"));
    expect(odds.length).toBeGreaterThanOrEqual(2);
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
