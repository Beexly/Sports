import { describe, it, expect } from "vitest";
import { replayAndSettleGame, type RawScheduleRow } from "../historical-replay.js";
import { calculatePickResult } from "../settlement.js";

/**
 * The nflverse spread sign is the opposite of this repo's.
 *
 *   nflverse `spread_line`  : POSITIVE = home favored
 *   RawScheduleRow.spreadLine (and scoring/settlement/clv) : NEGATIVE = home favored
 *
 * Verified against the live games.csv on 2026-09-04:
 *   corr(spread_line, result) = +0.4260 over n=7276 rows carrying both
 *   same-sign 4810 vs opposite-sign 2420
 *   2007_08_WAS_NE — the 16-0 Patriots at home, won 52-7 — carries spread_line = +15
 *
 * A mapper that forwards the raw column puts every SPREAD pick on the WRONG TEAM.
 * These cases pin the convention at the level that actually matters: which team the
 * frozen model names, on a game whose correct answer is not arguable.
 *
 * The fixture is the real 2007_08_WAS_NE row. Washington finished 5-11 that season;
 * New England finished 16-0 and won this game 52-7. No model, on any sane reading of
 * the market, takes Washington laying 15 points on the road here.
 */

const NE_WAS_2007 = (spreadLine: number): RawScheduleRow => ({
  gameKey: "2007_08_WAS_NE",
  season: 2007,
  week: 8,
  gameType: "REG",
  homeTeam: "NE",
  awayTeam: "WAS",
  commenceTime: "2007-10-28T17:00:00.000Z",
  spreadLine,
  totalLine: 46.5,
  homeMoneyline: -1225,
  awayMoneyline: 825,
  homeScore: 52,
  awayScore: 7,
  result: 45,
});

const spreadPick = (row: RawScheduleRow) =>
  replayAndSettleGame(row).find((p) => p.pickType === "SPREAD");

describe("nflverse spread sign — repo convention is negative = home favored", () => {
  it("settlement's own grading defines the convention: home favored is a NEGATIVE line", () => {
    // homeCoverMargin = homeMargin + line. NE won by 45, so NE -15 must be a WIN
    // and WAS +15 must be a LOSS. This is the anchor the rest of the file rests on.
    expect(calculatePickResult("SPREAD", "NE", -15, "NE", 52, 7, "americanfootball_nfl", "WAS")).toBe("WIN");
    expect(calculatePickResult("SPREAD", "WAS", -15, "NE", 52, 7, "americanfootball_nfl", "WAS")).toBe("LOSS");
  });

  it("a correctly-signed row picks the HOME favourite and grades it a WIN", () => {
    const pick = spreadPick(NE_WAS_2007(-15));
    expect(pick).toBeDefined();
    expect(pick!.selection).toContain("NE");
    expect(pick!.line).toBe(-15);
    expect(pick!.result).toBe("WIN");
  });

  it("CONTROL: forwarding the raw nflverse sign picks the WRONG team", () => {
    // This is the defect, pinned. It is deliberately asserted rather than described,
    // so that if anyone ever "simplifies" a mapper back to passing spread_line
    // through, the contradiction below is what they have to argue with.
    const pick = spreadPick(NE_WAS_2007(15));
    expect(pick).toBeDefined();
    expect(pick!.selection).toContain("WAS");
    expect(pick!.result).toBe("LOSS");
  });

  it("the wrong sign contradicts the model's OWN moneyline read of the same game", () => {
    // The tell that this is a data bug and not a bold contrarian opinion: on the
    // unnegated row the engine simultaneously calls Washington a 15-point favourite
    // and New England a -1225 moneyline favourite. Both cannot be true.
    const settled = replayAndSettleGame(NE_WAS_2007(15));
    const spread = settled.find((p) => p.pickType === "SPREAD");
    const moneyline = settled.find((p) => p.pickType === "MONEYLINE");
    expect(spread!.selection).toContain("WAS");
    expect(moneyline!.selection).toContain("NE");
  });

  it("a pick'em line is sign-stable in both directions", () => {
    // 0 and -0 must not produce different picks; a signed zero downstream would be
    // a silent divergence between two runs of the same game.
    const a = spreadPick(NE_WAS_2007(0));
    const b = spreadPick(NE_WAS_2007(-0));
    expect(a?.selection).toBe(b?.selection);
    expect(Object.is(a?.line ?? 0, -0)).toBe(false);
  });
});
