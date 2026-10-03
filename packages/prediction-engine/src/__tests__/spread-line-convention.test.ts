import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import { calculatePickResult } from "../settlement.js";
import type { OddsInput } from "@sports/types";

/**
 * Regression for a critical settlement bug: away-favored SPREAD picks must store
 * their `line` in HOME-team perspective so settlement grades them correctly.
 *
 * Before the fix, scoring stored `chosenSpread` (away-perspective for away picks),
 * but settlement.ts treats `line` as home-perspective — so an away favorite that
 * FAILED to cover was graded a WIN. That silently corrupts win rate, calibration,
 * and CLV — fatal for a "graded in public" platform.
 */
function awayFavoredInput(): OddsInput {
  const books = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet", "bovada"];
  return {
    gameId: "g-away-fav",
    homeTeam: "Home Dogs",
    awayTeam: "Away Favs",
    commenceTime: new Date().toISOString() as unknown as Date,
    sport: "NFL",
    bookmakerOdds: books.map((b) => ({
      bookmaker: b,
      market: "SPREADS" as const,
      // home-perspective spread of +6 = home is a 6-point underdog (away favored by 6)
      spread: 6,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
  };
}

describe("SPREAD line convention — away-favored picks", () => {
  it("picks the favorite and stores the line in home-team perspective", () => {
    const spread = scoreGame(awayFavoredInput()).find((p) => p.pickType === "SPREAD");
    expect(spread).toBeTruthy();
    expect(spread!.selection).toContain("Away Favs"); // the favorite is the pick
    // Home is the underdog → home-perspective line is positive.
    expect(spread!.line).toBeGreaterThan(0);
  });

  it("grades an away favorite that FAILS to cover as a LOSS", () => {
    const spread = scoreGame(awayFavoredInput()).find((p) => p.pickType === "SPREAD")!;
    // Away favored by 6 wins by only 3 (home 20, away 23) → did not cover.
    const result = calculatePickResult(
      "SPREAD",
      spread.selection,
      spread.line,
      "Home Dogs",
      20,
      23,
      "americanfootball_nfl",
      "Away Favs",
      );
    expect(result).toBe("LOSS");
  });

  it("grades an away favorite that covers as a WIN", () => {
    const spread = scoreGame(awayFavoredInput()).find((p) => p.pickType === "SPREAD")!;
    // Away favored by 6 wins by 10 (home 13, away 23) → covered.
    const result = calculatePickResult(
      "SPREAD",
      spread.selection,
      spread.line,
      "Home Dogs",
      13,
      23,
      "americanfootball_nfl",
      "Away Favs",
      );
    expect(result).toBe("WIN");
  });
});
