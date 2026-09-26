import { describe, expect, it } from "vitest";
import type { BookmakerOddsInput, OddsInput } from "@sports/types";
import { scoreGame, scoreGameWithDropReasons, type TotalDropReason } from "../scoring.js";

const fetchedAt = new Date("2026-09-23T12:00:00Z");

function makeInput(bookmakerOdds: BookmakerOddsInput[], sport = "baseball_mlb"): OddsInput {
  return {
    gameId: "total-drop-reasons",
    homeTeam: "Los Angeles Dodgers",
    awayTeam: "San Francisco Giants",
    commenceTime: new Date("2026-09-23T18:00:00Z"),
    sport,
    bookmakerOdds,
  };
}

function totalDropReason(input: OddsInput): TotalDropReason | undefined {
  return scoreGameWithDropReasons(input, fetchedAt).dropReasons.find(
    (drop) => drop.market === "TOTAL",
  )?.reason;
}

function total(bookmaker: string, overPrice?: number, underPrice?: number): BookmakerOddsInput {
  return {
    bookmaker,
    market: "TOTALS",
    total: 8.5,
    ...(overPrice === undefined ? {} : { overPrice }),
    ...(underPrice === undefined ? {} : { underPrice }),
  };
}

describe("TOTAL drop reasons", () => {
  it("reports fewer_than_min_books", () => {
    expect(totalDropReason(makeInput([total("espn")]))).toBe("fewer_than_min_books");
  });

  it("reports no_two_sided_prices", () => {
    expect(totalDropReason(makeInput([total("book-a"), total("book-b")]))).toBe(
      "no_two_sided_prices",
    );
  });

  it("reports consensus_below_floor", () => {
    expect(
      totalDropReason(
        makeInput([total("book-a", -110, -105), total("book-b", -105, -110)]),
      ),
    ).toBe("consensus_below_floor");
  });

  it("reports confidence_below_floor", () => {
    expect(
      totalDropReason(
        makeInput([
          total("book-a", -110, -105),
          total("book-b", -110, -105),
          total("book-c", -110, -105),
          total("book-d", -105, -110),
          total("book-e", -105, -110),
        ]),
      ),
    ).toBe("confidence_below_floor");
  });

  it("keeps scoreGame behavior and enforces TOTAL pick XOR drop reason on a deep board", () => {
    // Full multi-market NFL board from scoring.test.ts makeOddsInput. Totals may
    // still land under MIN_PUBLISH_CONFIDENCE when game-context depth stays cold
    // (SPREAD can publish while TOTAL does not). Contract under test is XOR:
    // exactly one of {TOTAL pick, TOTAL dropReason} — never both, never neither —
    // and scoreGame remains the pick-array projection of scoreGameWithDropReasons.
    const input = makeInput(
      [
        { bookmaker: "fanduel", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -112, awaySpreadPrice: -108 },
        { bookmaker: "betmgm", market: "SPREADS", spread: -3.0, homeSpreadPrice: -115, awaySpreadPrice: -105 },
        { bookmaker: "caesars", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "pointsbet", market: "SPREADS", spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 },
        { bookmaker: "fanduel", market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "draftkings", market: "TOTALS", total: 49.0, overPrice: -112, underPrice: -108 },
        { bookmaker: "betmgm", market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "caesars", market: "TOTALS", total: 49.0, overPrice: -108, underPrice: -112 },
        { bookmaker: "fanduel", market: "H2H", homePrice: -180, awayPrice: 155 },
        { bookmaker: "draftkings", market: "H2H", homePrice: -175, awayPrice: 150 },
        { bookmaker: "betmgm", market: "H2H", homePrice: -180, awayPrice: 155 },
        { bookmaker: "caesars", market: "H2H", homePrice: -185, awayPrice: 160 },
      ],
      "NFL",
    );
    const detailed = scoreGameWithDropReasons(input, fetchedAt);
    const totalPick = detailed.picks.find((pick) => pick.pickType === "TOTAL");
    const totalDrop = detailed.dropReasons.find((drop) => drop.market === "TOTAL");

    expect(Boolean(totalPick) !== Boolean(totalDrop)).toBe(true);
    if (totalDrop) {
      expect(totalDrop.reason).toBe("confidence_below_floor");
    }
    expect(scoreGame(input, fetchedAt)).toEqual(detailed.picks);
  });
});