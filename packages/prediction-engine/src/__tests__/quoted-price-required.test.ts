import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import type { OddsInput } from "@sports/types";

/**
 * Rule 1, no fake data. The scorer used to fall back to `-110` when no book
 * quoted a price for the chosen side, and that invented number reached the
 * subscriber as the pick's odds AND was committed into the immutable proof
 * receipt as entryOdds. `-110` is a plausible-looking price, which is exactly
 * what makes it dangerous: nothing downstream can tell it apart from a real one.
 *
 * Reachability, measured rather than assumed: `sanitizeAmericanPrice`
 * (packages/data-ingestion/src/normalizer.ts) returns undefined for a missing,
 * null, non-finite OR decimal-format price, so a row can carry a real spread
 * with no price at all. Production currently has 0 such rows across 2,268,217
 * spread rows and 2,316,785 total rows, so this guard is a no-op on today's
 * feed by measurement — it exists so a feed-shape change cannot silently
 * reintroduce the fabrication.
 *
 * Every value below is a labelled fixture: a line and a price, never a pick,
 * score or win rate.
 */

const NCAAF_SPREADS = [-3.5, -3.5, -3.5, -3.5] as const;

type SpreadBook = {
  readonly spread: number;
  readonly homeSpreadPrice?: number;
  readonly awaySpreadPrice?: number;
};

const spreadInput = (books: readonly SpreadBook[]): OddsInput => ({
  gameId: "game-quoted-price-fixture",
  homeTeam: "Fixture Home Owls",
  awayTeam: "Fixture Away Rams",
  commenceTime: new Date("2026-10-03T23:00:00Z"),
  sport: "americanfootball_ncaaf",
  bookmakerOdds: books.map((b, i) => ({
    bookmaker: `fixture-book-${i}`,
    market: "SPREADS" as const,
    spread: b.spread,
    ...(b.homeSpreadPrice === undefined ? {} : { homeSpreadPrice: b.homeSpreadPrice }),
    ...(b.awaySpreadPrice === undefined ? {} : { awaySpreadPrice: b.awaySpreadPrice }),
  })),
});

type TotalBook = {
  readonly total: number;
  readonly overPrice?: number;
  readonly underPrice?: number;
};

const totalInput = (books: readonly TotalBook[]): OddsInput => ({
  gameId: "game-quoted-total-fixture",
  homeTeam: "Fixture Home Owls",
  awayTeam: "Fixture Away Rams",
  commenceTime: new Date("2026-10-03T23:00:00Z"),
  sport: "americanfootball_ncaaf",
  bookmakerOdds: books.map((b, i) => ({
    bookmaker: `fixture-book-${i}`,
    market: "TOTALS" as const,
    total: b.total,
    ...(b.overPrice === undefined ? {} : { overPrice: b.overPrice }),
    ...(b.underPrice === undefined ? {} : { underPrice: b.underPrice }),
  })),
});

describe("scoreGame — a spread is never published at a price no book quoted", () => {
  it("publishes normally when the books quote both sides", () => {
    // The positive control. Without it the refusal tests below would pass on a
    // scorer that refuses everything, and prove nothing.
    const picks = scoreGame(
      spreadInput(NCAAF_SPREADS.map((spread) => ({ spread, homeSpreadPrice: -110, awaySpreadPrice: -110 }))),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(true);
  });

  it("refuses when no book quoted a price for either side", () => {
    const picks = scoreGame(spreadInput(NCAAF_SPREADS.map((spread) => ({ spread }))));
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(false);
  });

  it("refuses when the line is quoted but only the OTHER side carries a price", () => {
    // The asymmetric case the old `?? -110` hid: the chosen side has no price,
    // so its average was invented while the opposite side's was real.
    const picks = scoreGame(
      spreadInput(NCAAF_SPREADS.map((spread) => ({ spread, homeSpreadPrice: -110 }))),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(false);
  });

  it("refuses when every book is one-sided, so no book can price the vig", () => {
    // Both sides appear across the book set, but no SINGLE book quotes both, so
    // there is no honest overround to remove. The old code averaged these into
    // a fabricated two-sided market.
    const picks = scoreGame(
      spreadInput([
        { spread: -3.5, homeSpreadPrice: -110 },
        { spread: -3.5, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -108 },
        { spread: -3.5, awaySpreadPrice: -112 },
      ]),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(false);
  });

  it("narrows to the two-sided books rather than vetoing the market", () => {
    // The guard must not turn "one book is incomplete" into "no pick". Three
    // complete books plus one home-only book is still a real, priceable market.
    // Prices are uniform on purpose: a dispersed set (e.g. one book at
    // -108/-112) moves the fair probability enough to fail the edge threshold
    // on its own, which would make this control pass or fail for a reason that
    // has nothing to do with the guard under test.
    const picks = scoreGame(
      spreadInput([
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -110 },
      ]),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(true);
  });

  it("drops an edge that only existed because the missing price was invented", () => {
    // Measured against the pre-change scorer: this exact input published a
    // SPREAD before and does not now. That is the guard doing its job, not a
    // regression. The fourth book quotes only the home side; the old code
    // invented its away price as -110 and folded that into the vig removal, so
    // part of the published edge came from a number no book quoted. Dropping
    // the book from the two-sided average removes the fabricated component and
    // the remaining edge no longer clears the threshold.
    const picks = scoreGame(
      spreadInput([
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 },
        { spread: -3.5, homeSpreadPrice: -110 },
      ]),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(false);
  });
});

describe("scoreGame — a total is never published at a price no book quoted", () => {
  const TOTALS = [51.5, 51.5, 51.5, 51.5] as const;

  it("publishes normally when the books quote both directions", () => {
    // Uniform -110/-110 for the same reason as the spread control above: a
    // -105/-115 set fails the edge threshold on BOTH the old and new scorer, so
    // it would prove nothing about this guard.
    const picks = scoreGame(
      totalInput(TOTALS.map((total) => ({ total, overPrice: -110, underPrice: -110 }))),
    );
    expect(picks.some((p) => p.pickType === "TOTAL")).toBe(true);
  });

  it("refuses when no book quoted a price for either direction", () => {
    const picks = scoreGame(totalInput(TOTALS.map((total) => ({ total }))));
    expect(picks.some((p) => p.pickType === "TOTAL")).toBe(false);
  });
});
