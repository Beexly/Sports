import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import type { BookmakerOddsInput, OddsInput, ScoredPick } from "@sports/types";

/**
 * The spread teaser's book count must be the count it publishes as evidence.
 *
 * `scoreSpreadPick` keeps two sets: `spreadOdds` (every row carrying a line)
 * and `pricedOdds` (the subset that also carries both prices). The pick ships
 * `bookmakerCount: pricedOdds.length`, and the module's own doc states the rule
 * plainly — "Every price-derived and depth-derived value below uses this set,
 * never `spreadOdds`" — citing Devin Review #717, where this SAME reason string
 * previously claimed "backed by N bookmakers pricing this market" about books
 * that quoted no price.
 *
 * It happened again on PR #819, and two reviewers caught it independently
 * (Devin Review and CodeRabbit). The rewritten clause counted over `spreads`,
 * so a card could read "11 of 14 books pricing this game have X favoured" while
 * its evidence caption read "11 books" — the claim disagreeing with the number
 * offered to support it, which is exactly what the T-1 tripwire
 * (lib/claims/public-consensus-claim.ts) exists to prevent.
 *
 * Twice is a pattern, so this file pins it rather than trusting the comment.
 *
 * Third invariant, added after the first draft shipped the opposite: the frozen
 * text carries NO RAW COUNT. `reasoning`/`reasoningShort` are frozen write-once
 * at creation while `bookmakerCount` and `dataFreshnessAt` refresh every cycle,
 * and the T-1 caption is built from the live columns — so "7 of 8" in permanent
 * text sits beside a caption that has moved on. Measured: 772 of 1,076
 * published spread picks (72%) already drift from their mint-time snapshot,
 * mean 2.70 books, max 9.
 *
 * Second invariant here: a PICK'EM row (spread exactly 0) names no favourite
 * and belongs in NEITHER side's count. `consensusPct` derives from
 * `spreads.filter((s) => s < 0)`, which is a home test; for an away pick
 * `1 - homeFavoredPct` silently promoted every zero-spread row to
 * "away-favoured". The display clause uses strict checks in both directions.
 */

const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

/** A book quoting a line AND both prices — counts toward `pricedOdds`. */
function priced(bookmaker: string, spread: number): BookmakerOddsInput {
  return {
    bookmaker,
    market: "SPREADS" as const,
    spread,
    homeSpreadPrice: -110,
    awaySpreadPrice: -110,
  } as BookmakerOddsInput;
}

/** A book quoting a line but NO prices — in `spreadOdds`, NOT in `pricedOdds`. */
function lineOnly(bookmaker: string, spread: number): BookmakerOddsInput {
  return { bookmaker, market: "SPREADS" as const, spread } as BookmakerOddsInput;
}

function input(bookmakerOdds: BookmakerOddsInput[]): OddsInput {
  return {
    gameId: "g1",
    homeTeam: "Bears",
    awayTeam: "Packers",
    commenceTime: new Date("2026-09-20T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds,
    context: { bookmakerCoverageMax: bookmakerOdds.length },
  };
}

const spread = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "SPREAD");

describe("the spread teaser counts the books it publishes as evidence", () => {
  it("names pricedOdds.length, not spreadOdds.length, and matches bookmakerCount", () => {
    // 8 priced books, all with the home team favoured, PLUS 3 line-only rows.
    // spreadOdds = 11, pricedOdds = 8. The claim must say 8.
    const pick = spread(
      scoreGame(
        input([
          ...BOOKS.slice(0, 8).map((b) => priced(b, -3)),
          lineOnly("extra1", -3),
          lineOnly("extra2", -3),
          lineOnly("extra3", -3),
        ]),
      ),
    );
    expect(pick).toBeDefined();
    expect(pick!.bookmakerCount).toBe(8);

    // Every priced book has the same side favoured, so the clause takes the
    // scale-free "every book" form.
    expect(pick!.reasoningShort).toContain("Every book pricing this game has");
    // NO RAW COUNT anywhere in the frozen text: not the 8 priced rows, not the
    // 11 line-carrying ones. The text outlives both numbers.
    expect(pick!.reasoningShort).not.toMatch(/\d+ of \d+ books/);
    expect(pick!.reasoning).not.toMatch(/\d+ of \d+ books/);
    expect(pick!.reasoningShort).not.toContain("11");
  });

  it("a pick'em row counts for neither side", () => {
    // 7 priced books favour the AWAY team (positive spread) and one priced book
    // is a pick'em. A zero spread names no favourite, so this is NOT unanimous
    // and must not take the "every book" form — but it must not pin "7 of 8"
    // either, because that text is frozen while the evidence caption is not.
    const pick = spread(
      scoreGame(
        input([
          ...BOOKS.slice(0, 7).map((b) => priced(b, 3)),
          priced("pickem-book", 0),
        ]),
      ),
    );
    expect(pick).toBeDefined();
    expect(pick!.bookmakerCount).toBe(8);
    expect(pick!.reasoningShort).not.toContain("Every book");
    expect(pick!.reasoningShort).toContain("split");
    expect(pick!.reasoningShort).not.toMatch(/\d+ of \d+/);
  });

  it("never claims consensus ON the selection — the agreement is about who is favoured", () => {
    // The defect this copy replaced: "100% bookmaker consensus on Bears -3.0"
    // reads as "every book likes the Bears to cover -3". consensusPct is
    // agreement about WHICH TEAM IS FAVOURED and says nothing about the number.
    const pick = spread(scoreGame(input(BOOKS.map((b) => priced(b, -3)))));
    expect(pick).toBeDefined();
    expect(pick!.reasoningShort).not.toMatch(/bookmaker consensus/i);
    expect(pick!.reasoning).not.toMatch(/bookmaker consensus/i);
    expect(pick!.reasoningShort).not.toMatch(/backed by \d+% of/i);
    // It says the true thing instead, and still names the selection separately.
    expect(pick!.reasoningShort).toContain("favoured");
    expect(pick!.reasoningShort).toContain("We are on");
  });
});
