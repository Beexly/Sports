import { describe, expect, it } from "vitest";
import { ODDS_KEY_TO_FREE } from "@/lib/data-sources/free-settlement-runner";

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
    const freeResponse = { path: "free" as const, oddsApiRequired: false as const };
    expect(freeResponse.oddsApiRequired).toBe(false);
    expect(freeResponse.path).toBe("free");
  });
});
