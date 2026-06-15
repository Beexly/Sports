import { describe, it, expect, afterEach } from "vitest";
import { isSportInSeason, getInSeasonSports, SUPPORTED_SPORTS } from "@sports/data-ingestion";

describe("season gating (Odds API cost control)", () => {
  afterEach(() => {
    delete process.env.ODDS_REFRESH_ALL_SPORTS;
  });

  it("football is in season in the fall and out in the summer", () => {
    const october = new Date("2026-10-15T12:00:00Z");
    const june = new Date("2026-06-15T12:00:00Z");
    expect(isSportInSeason("americanfootball_nfl", october)).toBe(true);
    expect(isSportInSeason("americanfootball_ncaaf", october)).toBe(true);
    expect(isSportInSeason("americanfootball_nfl", june)).toBe(false);
    expect(isSportInSeason("americanfootball_ncaaf", june)).toBe(false);
  });

  it("wrap-around windows work across the year boundary (NFL in January)", () => {
    expect(isSportInSeason("americanfootball_nfl", new Date("2026-01-20T12:00:00Z"))).toBe(true);
  });

  it("getInSeasonSports excludes out-of-season football in June", () => {
    const june = new Date("2026-06-15T12:00:00Z");
    const keys = getInSeasonSports(june).map((s) => s.key);
    expect(keys).not.toContain("americanfootball_nfl");
    expect(keys).not.toContain("americanfootball_ncaaf");
    expect(keys).toContain("baseball_mlb"); // summer sport in season
    expect(keys.length).toBeLessThan(SUPPORTED_SPORTS.length);
  });

  it("ODDS_REFRESH_ALL_SPORTS=true forces all sports (backfill override)", () => {
    process.env.ODDS_REFRESH_ALL_SPORTS = "true";
    expect(getInSeasonSports(new Date("2026-06-15T12:00:00Z")).length).toBe(SUPPORTED_SPORTS.length);
  });
});
