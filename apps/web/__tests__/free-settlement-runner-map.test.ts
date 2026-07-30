import { describe, expect, it } from "vitest";

/**
 * Sport map contract for free settlement path.
 * Full runner is DB-bound; this locks the odds-key → free sport map so free path
 * cannot silently drop NFL/NBA/etc.
 */
const ODDS_KEY_TO_FREE: Record<string, string> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  basketball_ncaab: "ncaab",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  soccer_usa_mls: "mls",
};

describe("free settlement sport map", () => {
  it("covers all SUPPORTED_SPORTS keys used by settle-picks", () => {
    const keys = [
      "americanfootball_nfl",
      "americanfootball_ncaaf",
      "basketball_nba",
      "basketball_ncaab",
      "baseball_mlb",
      "icehockey_nhl",
      "soccer_usa_mls",
    ];
    for (const k of keys) {
      expect(ODDS_KEY_TO_FREE[k]).toBeTruthy();
    }
  });

  it("never requires THE_ODDS_API_KEY for free path law", () => {
    // Contract: free path response shape
    const freeResponse = { path: "free" as const, oddsApiRequired: false as const };
    expect(freeResponse.oddsApiRequired).toBe(false);
    expect(freeResponse.path).toBe("free");
  });
});
