import { describe, it, expect, afterEach } from "vitest";

import { isSportInSeason, getInSeasonSports } from "../config.js";

/**
 * Regression cover for the L-14 census finding (2026-08-20): NFL's last odds
 * snapshot was 2026-06-17 with ZERO clean closing prices, because the season
 * window opened in September and the refresh silently skipped NFL for all of
 * August — while 84 future NFL games sat in the DB with no odds attached.
 */
describe("season windows", () => {
  const AUGUST = new Date("2026-08-20T12:00:00Z");

  afterEach(() => {
    delete process.env["ODDS_REFRESH_ALL_SPORTS"];
  });

  it("treats NFL as in season during August, when Week 1 lines are already posted", () => {
    expect(isSportInSeason("americanfootball_nfl", AUGUST)).toBe(true);
  });

  it("includes NFL in the August refresh set", () => {
    const keys = getInSeasonSports(AUGUST).map((s) => s.key);
    expect(keys).toContain("americanfootball_nfl");
  });

  it("still closes the NFL window in the spring off-season", () => {
    // April/May/June sit outside Aug->Feb and must stay closed, so widening the
    // window costs credits only in August, not year-round.
    for (const month of ["04", "05", "06"]) {
      const date = new Date(`2026-${month}-15T12:00:00Z`);
      expect(isSportInSeason("americanfootball_nfl", date)).toBe(false);
    }
  });

  it("keeps wrapping windows intact across the year end", () => {
    expect(
      isSportInSeason("americanfootball_nfl", new Date("2027-01-15T12:00:00Z")),
    ).toBe(true);
    expect(
      isSportInSeason("americanfootball_nfl", new Date("2027-02-15T12:00:00Z")),
    ).toBe(true);
  });

  it("does not put out-of-season sports in the August refresh set", () => {
    const keys = getInSeasonSports(AUGUST).map((s) => s.key);
    expect(keys).not.toContain("basketball_nba");
    expect(keys).not.toContain("icehockey_nhl");
    expect(keys).not.toContain("basketball_ncaab");
  });

  it("still honours the ODDS_REFRESH_ALL_SPORTS backfill override", () => {
    process.env["ODDS_REFRESH_ALL_SPORTS"] = "true";
    const keys = getInSeasonSports(AUGUST).map((s) => s.key);
    expect(keys).toContain("basketball_nba");
    expect(keys).toContain("icehockey_nhl");
  });
});
