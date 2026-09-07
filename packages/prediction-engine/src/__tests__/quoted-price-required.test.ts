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
        { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { spread: -3.5, homeSpreadPrice: -110 },
      ]),
    );
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(true);
  });

  it("ignores a one-sided book entirely, rather than half-counting it", () => {
    // CORRECTION. An earlier revision of this file asserted the OPPOSITE here:
    // that this input stops publishing. That was pinning a half-fix. At the
    // time, avgPrice was still drawn from every book while the fair
    // probability came only from two-sided books, so the incomplete book moved
    // one side of the edge comparison and not the other, and the pick vanished
    // for a reason that was itself a defect. With one book set used throughout,
    // the incomplete book is simply absent and the result equals the three
    // complete books on their own.
    const complete = [
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 },
    ];
    const withIncomplete = scoreGame(
      spreadInput([...complete, { spread: -3.5, homeSpreadPrice: -110 }]),
    ).find((p) => p.pickType === "SPREAD");
    const completeOnly = scoreGame(spreadInput(complete)).find((p) => p.pickType === "SPREAD");

    expect(withIncomplete?.entryPrice).toBe(completeOnly?.entryPrice);
    expect(withIncomplete?.confidence).toBe(completeOnly?.confidence);
    // And the incomplete book is not counted as one that priced the market.
    expect(withIncomplete?.bookmakerCount).toBe(4);
  });
  it("ignores a one-sided outlier price entirely, so it cannot manufacture an edge", () => {
    // avgPrice and fairProb are COMPARED to produce the edge, so they must come
    // from the same books. Drawing avgPrice from all books while fairProb came
    // from two-sided books only let a single one-sided quote move one half of
    // the comparison and not the other (Devin Review, #717).
    //
    // The outlier here is +900 on the chosen side from a book that quotes no
    // opposite side. Under the mismatched-set version it dragged avgPrice far
    // from the complete market; now it is dropped before any price is averaged,
    // so the result is identical to the same three complete books alone.
    // Four complete books: three sits below the engine's own market-depth bar
    // and publishes nothing, which would make this assert undefined === undefined.
    const complete = [
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      { spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    ];
    const withOutlier = scoreGame(
      spreadInput([...complete, { spread: -3.5, homeSpreadPrice: 900, awaySpreadPrice: undefined }]),
    ).find((p) => p.pickType === "SPREAD");
    const withoutOutlier = scoreGame(spreadInput(complete)).find((p) => p.pickType === "SPREAD");

    expect(withOutlier?.entryPrice).toBe(withoutOutlier?.entryPrice);
    expect(withOutlier?.confidence).toBe(withoutOutlier?.confidence);
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

  it("refuses when books quote only ONE direction, so no book prices the vig", () => {
    // The asymmetric case, mirroring the spread scorer. Both directions appear
    // across the book set but no single book quotes both, so there is no honest
    // overround to remove.
    const picks = scoreGame(
      totalInput([
        { total: 51.5, overPrice: -110 },
        { total: 51.5, underPrice: -110 },
        { total: 51.5, overPrice: -108 },
        { total: 51.5, underPrice: -112 },
      ]),
    );
    expect(picks.some((p) => p.pickType === "TOTAL")).toBe(false);
  });

  it("ignores a one-sided total quote entirely, so it cannot manufacture an edge", () => {
    // Same defect the spread scorer had, in the sibling lane: chosenPrices came
    // from every book while the implied averages each used their own one-sided
    // filter — three different book sets inside one function (Devin Review,
    // #717). A +900 OVER quote from a book with no UNDER must change nothing.
    const complete = [
      { total: 51.5, overPrice: -110, underPrice: -110 },
      { total: 51.5, overPrice: -110, underPrice: -110 },
      { total: 51.5, overPrice: -110, underPrice: -110 },
      { total: 51.5, overPrice: -110, underPrice: -110 },
    ];
    const withOutlier = scoreGame(
      totalInput([...complete, { total: 51.5, overPrice: 900 }]),
    ).find((p) => p.pickType === "TOTAL");
    const completeOnly = scoreGame(totalInput(complete)).find((p) => p.pickType === "TOTAL");

    expect(withOutlier?.entryPrice).toBe(completeOnly?.entryPrice);
    expect(withOutlier?.confidence).toBe(completeOnly?.confidence);
    // And the book that priced only one direction is not counted as pricing it.
    expect(withOutlier?.bookmakerCount).toBe(4);
  });
});
