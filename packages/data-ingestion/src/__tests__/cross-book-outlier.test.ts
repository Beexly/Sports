import { describe, it, expect } from "vitest";
import {
  detectCrossBookOutliers,
  findOddsOutliers,
  MIN_QUOTES_TO_JUDGE,
} from "../cross-book-outlier";
import type { NormalizedOdds } from "@sports/types";

function odds(partial: Partial<NormalizedOdds> & Pick<NormalizedOdds, "bookmaker" | "market">): NormalizedOdds {
  return {
    gameExternalId: "game-1",
    fetchedAt: new Date("2026-08-23T00:00:00Z"),
    bookmakerLastUpdate: new Date("2026-08-23T00:00:00Z"),
    ...partial,
  } as NormalizedOdds;
}

describe("detectCrossBookOutliers", () => {
  it("flags the C-119 shape: eleven books at a real MLB run line, one book at the observed 19.5 contamination", () => {
    const quotes = [
      ...Array.from({ length: 11 }, (_, i) => ({ bookmaker: `book${i}`, value: -1.5 })),
      { bookmaker: "contaminated-book", value: 19.5 },
    ];

    const results = detectCrossBookOutliers(quotes);

    const bad = results.find((r) => r.bookmaker === "contaminated-book")!;
    expect(bad.flagged).toBe(true);
    expect(Math.abs(bad.modifiedZ)).toBeGreaterThan(3.5);

    // The robust median/MAD barely moves under one bad point — unlike a
    // mean/variance measure, which the outlier itself would drag.
    expect(bad.median).toBeCloseTo(-1.5, 5);

    for (const r of results.filter((r) => r.bookmaker !== "contaminated-book")) {
      expect(r.flagged).toBe(false);
    }
  });

  it("does NOT flag a real, wide NCAAF blowout line when the group agrees closely", () => {
    // No sport-specific magnitude bound exists (or should exist) for this —
    // a 45-point line is real when every book agrees it's roughly there.
    const quotes = [
      { bookmaker: "a", value: -42 },
      { bookmaker: "b", value: -44 },
      { bookmaker: "c", value: -45 },
      { bookmaker: "d", value: -45.5 },
      { bookmaker: "e", value: -46 },
      { bookmaker: "f", value: -47 },
    ];

    const results = detectCrossBookOutliers(quotes);
    expect(results.every((r) => !r.flagged)).toBe(true);
  });

  it("does not flag ordinary market noise (small real disagreement)", () => {
    const quotes = [
      { bookmaker: "a", value: -3 },
      { bookmaker: "b", value: -3 },
      { bookmaker: "c", value: -3 },
      { bookmaker: "d", value: -3.5 },
      { bookmaker: "e", value: -2.5 },
      { bookmaker: "f", value: -3 },
    ];

    const results = detectCrossBookOutliers(quotes);
    expect(results.every((r) => !r.flagged)).toBe(true);
  });

  it("refuses to judge below MIN_QUOTES_TO_JUDGE — no false signal from a thin board", () => {
    const quotes = [
      { bookmaker: "a", value: -1.5 },
      { bookmaker: "b", value: 19.5 },
    ];
    expect(quotes.length).toBeLessThan(MIN_QUOTES_TO_JUDGE);

    const results = detectCrossBookOutliers(quotes);
    expect(results.every((r) => !r.flagged)).toBe(true);
    expect(results.every((r) => Number.isNaN(r.median))).toBe(true);
  });

  it("handles a MAD=0 majority-tie via the mean-absolute-deviation fallback, still catching a real single-book outlier", () => {
    // 5 of 6 books agree exactly, so the MEDIAN of deviations (MAD) is 0 —
    // the mean-absolute-deviation fallback must take over rather than divide
    // by zero or blanket-flag any nonzero difference.
    const quotes = [
      { bookmaker: "a", value: -1.5 },
      { bookmaker: "b", value: -1.5 },
      { bookmaker: "c", value: -1.5 },
      { bookmaker: "d", value: -1.5 },
      { bookmaker: "e", value: -1.5 },
      { bookmaker: "f", value: -2.5 },
    ];

    const results = detectCrossBookOutliers(quotes);
    const outlier = results.find((r) => r.bookmaker === "f")!;
    expect(outlier.flagged).toBe(true);
    expect(Number.isFinite(outlier.modifiedZ)).toBe(true);
    expect(Math.abs(outlier.modifiedZ)).toBeGreaterThan(3.5);

    for (const r of results.filter((r) => r.bookmaker !== "f")) {
      expect(r.flagged).toBe(false);
      expect(r.modifiedZ).toBe(0);
    }
  });

  it("does not divide by zero when every quote in the group is identical", () => {
    const quotes = Array.from({ length: 5 }, (_, i) => ({ bookmaker: `book${i}`, value: -7 }));
    const results = detectCrossBookOutliers(quotes);
    expect(results.every((r) => !r.flagged)).toBe(true);
    expect(results.every((r) => Number.isFinite(r.modifiedZ))).toBe(true);
  });

  it("ignores non-finite values without crashing", () => {
    const quotes = [
      { bookmaker: "a", value: -1.5 },
      { bookmaker: "b", value: -1.5 },
      { bookmaker: "c", value: -1.5 },
      { bookmaker: "d", value: -1.5 },
      { bookmaker: "e", value: Number.NaN },
    ];
    const results = detectCrossBookOutliers(quotes);
    const nanRow = results.find((r) => r.bookmaker === "e")!;
    expect(nanRow.flagged).toBe(false);
  });
});

describe("findOddsOutliers", () => {
  it("surfaces a flagged spread outlier from a realistic NormalizedOdds batch, keyed by game and market", () => {
    const batch: NormalizedOdds[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        odds({ bookmaker: `book${i}`, market: "SPREADS", spread: -1.5 }),
      ),
      odds({ bookmaker: "contaminated-book", market: "SPREADS", spread: 19.5 }),
      // A totally separate game+market should never leak into this game's group.
      odds({ gameExternalId: "game-2", bookmaker: "book0", market: "SPREADS", spread: -6 }),
      odds({ gameExternalId: "game-2", bookmaker: "book1", market: "SPREADS", spread: -6.5 }),
      odds({ gameExternalId: "game-2", bookmaker: "book2", market: "SPREADS", spread: -6 }),
      odds({ gameExternalId: "game-2", bookmaker: "book3", market: "SPREADS", spread: -5.5 }),
    ];

    const flags = findOddsOutliers(batch);

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      gameExternalId: "game-1",
      market: "SPREADS",
      bookmaker: "contaminated-book",
      value: 19.5,
    });
  });

  it("returns no flags for a clean, unanimous board", () => {
    const batch: NormalizedOdds[] = Array.from({ length: 5 }, (_, i) =>
      odds({ bookmaker: `book${i}`, market: "TOTALS", total: 8.5 }),
    );
    expect(findOddsOutliers(batch)).toEqual([]);
  });

  it("dedupes a bookmaker appearing more than once in the batch (e.g. multiple fetch cycles), keeping only its latest reading", () => {
    // "draftkings" quoted -1.5 all day, then went live (C-119 shape) and
    // escalated to -19.5 in its own LATER snapshot in the same batch. If this
    // were not deduped, "draftkings" would count as 5 independent quotes (4 at
    // -1.5, 1 at -19.5) alongside the 3 genuinely distinct books, biasing the
    // median/MAD toward one source's own history instead of reflecting the
    // real 4-book cross-section — and could mask or fabricate a signal either
    // way depending on how many stale duplicates happen to be in the batch.
    const batch: NormalizedOdds[] = [
      odds({ bookmaker: "draftkings", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T02:00:00Z") }),
      odds({ bookmaker: "draftkings", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T10:00:00Z") }),
      odds({ bookmaker: "draftkings", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T16:00:00Z") }),
      // Its genuinely latest reading, post-kickoff live drift — the one that
      // should actually be judged against the other books.
      odds({ bookmaker: "draftkings", market: "SPREADS", spread: -19.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
      odds({ bookmaker: "fanduel", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
      odds({ bookmaker: "betmgm", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
      odds({ bookmaker: "caesars", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
      odds({ bookmaker: "lowvig", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
      odds({ bookmaker: "bovada", market: "SPREADS", spread: -1.5, fetchedAt: new Date("2026-08-23T20:00:00Z") }),
    ];

    const flags = findOddsOutliers(batch);

    // Exactly one flag: draftkings' single latest (-19.5) reading against the
    // 6-book group (its own 3 stale dupes excluded), not 7 rows for draftkings.
    // (6 real books, not 4, so the outlier clears the modified-z threshold the
    // same way the other tests' 5-vs-1 and 11-vs-1 shapes do — this test is
    // about proving dedup, not re-proving the threshold math at the margin.)
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ bookmaker: "draftkings", value: -19.5 });
  });
});
