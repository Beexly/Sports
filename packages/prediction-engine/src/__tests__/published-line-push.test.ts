import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import { calculatePickResult, selectGradingLine } from "../settlement.js";
import { snapToPostedLine, formatPublishedLine } from "../published-line.js";
import type { OddsInput, ScoredPick } from "@sports/types";

/**
 * END-TO-END: the engine's OWN output fed into the grader.
 *
 * This is the test that did not exist. Every prior push test hand-fed
 * `calculatePickResult` an integer line (settlement.test.ts), and
 * spread-line-convention.test.ts deliberately uses six IDENTICAL books so the
 * consensus mean comes out exact. Nothing ever ran `scoreGame` output into
 * `calculatePickResult`, so nothing could observe that the published line is a
 * raw arithmetic mean and therefore almost never an integer.
 *
 * The consequence, before the published-line fix:
 *
 *   `homeCoverMargin === 0` (SPREAD) and `total === line` (TOTAL) are the only
 *   PUSH branches. Final margins and totals are integers, so a push requires an
 *   integer line — and with `MIN_BOOKMAKERS = 2`, the mean of the book numbers
 *   is an integer only when EVERY book posted the identical number. One book off
 *   consensus erases the push, which inflates BOTH the numerator and the W/L
 *   denominator of the published track record and pins its PUSH column at 0
 *   forever for spreads and totals.
 *
 * The four rows below are the worked cases. Each asserts three things together,
 * because any one of them alone can pass while the record is still wrong:
 *
 *   1. the pick grades the way a bettor at that number really finished;
 *   2. the CUSTOMER-VISIBLE number in `selection` is the number we graded;
 *   3. the published number is one the books actually posted.
 */

function spreadInput(spreads: readonly number[]): OddsInput {
  return {
    gameId: "g-spread",
    homeTeam: "Home Chiefs",
    awayTeam: "Away Broncos",
    commenceTime: new Date().toISOString() as unknown as Date,
    sport: "NFL",
    bookmakerOdds: spreads.map((spread, i) => ({
      bookmaker: `book-${i}`,
      market: "SPREADS" as const,
      spread,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
  };
}

function totalInput(totals: readonly number[]): OddsInput {
  return {
    gameId: "g-total",
    homeTeam: "Home Chiefs",
    awayTeam: "Away Broncos",
    commenceTime: new Date().toISOString() as unknown as Date,
    sport: "NFL",
    bookmakerOdds: totals.map((total, i) => ({
      bookmaker: `book-${i}`,
      market: "TOTALS" as const,
      total,
      // OVER is the market favorite when its SIGNED price is <= the under's.
      overPrice: -115,
      underPrice: -105,
    })),
  };
}

function spreadPick(spreads: readonly number[]): ScoredPick {
  const pick = scoreGame(spreadInput(spreads)).find((p) => p.pickType === "SPREAD");
  expect(pick, `engine published no SPREAD pick for ${spreads.join(",")}`).toBeTruthy();
  return pick!;
}

function totalPick(totals: readonly number[]): ScoredPick {
  const pick = scoreGame(totalInput(totals)).find((p) => p.pickType === "TOTAL");
  expect(pick, `engine published no TOTAL pick for ${totals.join(",")}`).toBeTruthy();
  return pick!;
}

/** The number a customer reads off the pick — parsed back out of `selection`. */
function displayedNumber(selection: string): number {
  const match = selection.match(/[+-]?\d+(?:\.\d+)?$/);
  expect(match, `no number in selection "${selection}"`).toBeTruthy();
  return Number(match![0]);
}

describe("published line — the engine's own output, graded", () => {
  describe("SPREAD", () => {
    it("row 1: books -3,-3,-3,-3,-3,-2.5 vs a 3-point home win is a PUSH, not a WIN", () => {
      const books = [-3, -3, -3, -3, -3, -2.5];
      const pick = spreadPick(books);

      // Pre-fix this published the raw mean -2.9166666666666665, whose
      // homeCoverMargin is +0.0833… — a WIN on a game five of six books had
      // hanging on the -3 that pushes.
      expect(pick.line).toBe(-3);
      expect(books).toContain(pick.line);
      expect(displayedNumber(pick.selection)).toBe(pick.line);

      // Home wins by exactly 3.
      expect(
        calculatePickResult(
          "SPREAD",
          pick.selection,
          pick.line,
          "Home Chiefs",
          24,
          21,
          "americanfootball_nfl",
          "Away Broncos",
        ),
      ).toBe("PUSH");
    });

    it("row 2: a mean that DISPLAYS as -3.0 must also GRADE at -3.0", () => {
      // The launch-relevant row. Nine books at -3 and one at -2.5 average to
      // -2.95, which `toFixed(1)` renders as the string "-3.0" — so the card
      // read "-3.0" while the grader used -2.95 and returned WIN on a game that
      // pushed at the number shown. Display and grade must be one value.
      const books = [-3, -3, -3, -3, -3, -3, -3, -3, -3, -2.5];
      expect(books.reduce((a, b) => a + b, 0) / books.length).toBe(-2.95);

      const pick = spreadPick(books);
      expect(pick.selection).toContain("-3.0");
      expect(pick.line).toBe(-3);
      expect(displayedNumber(pick.selection)).toBe(pick.line);

      expect(
        calculatePickResult(
          "SPREAD",
          pick.selection,
          pick.line,
          "Home Chiefs",
          24,
          21,
          "americanfootball_nfl",
          "Away Broncos",
        ),
      ).toBe("PUSH");
    });

    it("row 3: books -3,-3,-3,-3.5,-3.5 vs a 3-point home win is a PUSH, not a LOSS", () => {
      // The mean -3.2 is not a line anyone could take, and it grades a LOSS on a
      // game that pushed at the -3 three of five books posted. This row proves
      // the defect is not one-directional: the raw mean invents losses too.
      const books = [-3, -3, -3, -3.5, -3.5];
      expect(books.reduce((a, b) => a + b, 0) / books.length).toBe(-3.2);

      const pick = spreadPick(books);
      expect(pick.line).toBe(-3);
      expect(books).toContain(pick.line);
      expect(displayedNumber(pick.selection)).toBe(pick.line);

      expect(
        calculatePickResult(
          "SPREAD",
          pick.selection,
          pick.line,
          "Home Chiefs",
          24,
          21,
          "americanfootball_nfl",
          "Away Broncos",
        ),
      ).toBe("PUSH");
    });
  });

  describe("TOTAL", () => {
    it("row 4: books 44.5 and 45 vs a 45-point game is a PUSH, not an OVER win", () => {
      // Mean 44.75 is exactly equidistant from both posted totals. The tie is
      // broken AGAINST the pick — a higher total is harder for an OVER — so we
      // publish 45 and push, rather than publishing 44.5 and booking a win.
      // (Three books a side rather than one: a two-book total scores below
      // MIN_PUBLISH_CONFIDENCE and the engine declines to publish it at all.
      // The mean, the posted set and the tie are identical to the worked row.)
      const books = [44.5, 44.5, 44.5, 45, 45, 45];
      expect(books.reduce((a, b) => a + b, 0) / books.length).toBe(44.75);
      const pick = totalPick(books);

      expect(pick.line).toBe(45);
      expect(books).toContain(pick.line);
      expect(pick.selection).toBe("OVER 45.0");
      expect(displayedNumber(pick.selection)).toBe(pick.line);

      expect(
        calculatePickResult(
          "TOTAL",
          pick.selection,
          pick.line,
          "Home Chiefs",
          24,
          21,
          "americanfootball_nfl",
          "Away Broncos",
        ),
      ).toBe("PUSH");
    });
  });

  describe("the invariants behind the rows", () => {
    const CASES: readonly (readonly number[])[] = [
      [-3, -3, -3, -3, -3, -2.5],
      [-3, -3, -3, -3.5, -3.5],
      [-7, -7, -7.5, -6.5, -7],
      [-1.5, -2, -2, -2, -1.5, -2],
      [2.5, 3, 3, 3, 3, 3],
      [6, 6, 6, 6, 6, 6],
    ];

    it("always publishes a line some book actually posted", () => {
      for (const books of CASES) {
        const pick = spreadPick(books);
        expect(books, `published ${pick.line} for ${books.join(",")}`).toContain(pick.line);
      }
    });

    it("always shows the customer the number it locks and grades", () => {
      for (const books of CASES) {
        const pick = spreadPick(books);
        // `line` is home-perspective; `selection` carries the CHOSEN side's
        // number, so an away-favored pick displays the negated line.
        expect(Math.abs(displayedNumber(pick.selection))).toBe(Math.abs(pick.line));
        // The CLV lock process-sport.ts mints is `pick.line` verbatim, so the
        // number settlement will grade is the number on the card.
        expect(selectGradingLine({ clvLockLine: pick.line, line: pick.line })).toBe(pick.line);
      }
    });

    it("reaches PUSH on an integer line — the branch the raw mean made unreachable", () => {
      // Sanity floor for the whole fix: across the spread cases, at least one
      // integer-line publish exists, so the PUSH column can ever be non-zero.
      const integerLines = CASES.map((books) => spreadPick(books).line).filter((l) =>
        Number.isInteger(l),
      );
      expect(integerLines.length).toBeGreaterThan(0);
    });
  });
});

describe("the published-line rule itself", () => {
  describe("snapToPostedLine", () => {
    it("returns the nearest posted number, not a rounded one", () => {
      // -2.9166… is nearer -3 than -2.5; a half-point GRID would also say -3,
      // but a grid would mangle a real quarter-line, so the rule is "nearest
      // number a book actually quoted".
      expect(snapToPostedLine(-2.9166666666666665, [-3, -3, -3, -3, -3, -2.5], false)).toBe(-3);
      expect(snapToPostedLine(-3.2, [-3, -3, -3, -3.5, -3.5], false)).toBe(-3);
      // Asian quarter-lines survive intact — the value is a posted one, not a
      // half-point it never occupied.
      expect(snapToPostedLine(-0.6666666666666666, [-0.75, -0.75, -0.5], false)).toBe(-0.75);
    });

    it("breaks an exact tie AGAINST the side we published, never for it", () => {
      // 44.75 is equidistant from both posted totals. A higher total is worse
      // for an OVER, a lower one worse for an UNDER.
      expect(snapToPostedLine(44.75, [44.5, 45], /* worseWhenHigher (OVER) */ true)).toBe(45);
      expect(snapToPostedLine(44.75, [44.5, 45], /* worseWhenHigher (UNDER) */ false)).toBe(44.5);
      // Spreads are stored home-perspective: laying the HOME team, the bigger
      // handicap is worse; laying the AWAY team, the smaller one is.
      expect(snapToPostedLine(-3.25, [-3, -3.5], /* home laid */ false)).toBe(-3.5);
      expect(snapToPostedLine(-3.25, [-3, -3.5], /* away laid */ true)).toBe(-3);
      // Order of the posted array must not decide the tie.
      expect(snapToPostedLine(44.75, [45, 44.5], true)).toBe(45);
      expect(snapToPostedLine(44.75, [45, 44.5], false)).toBe(44.5);
    });

    it("is a no-op when every book posted the same number", () => {
      expect(snapToPostedLine(-6, [-6, -6, -6, -6, -6, -6], false)).toBe(-6);
      // This is also why the historical-replay backfill is unaffected: it
      // synthesises N books all quoting the SAME nflverse closing line.
      expect(snapToPostedLine(-2.5, [-2.5, -2.5, -2.5], true)).toBe(-2.5);
    });

    it("falls back to the average only when no line was posted at all", () => {
      // Unreachable behind MIN_BOOKMAKERS, but it must not return undefined.
      expect(snapToPostedLine(-3.2, [], false)).toBe(-3.2);
    });
  });

  describe("formatPublishedLine", () => {
    it("is byte-identical to toFixed(1) on the .0/.5 grid every major market quotes", () => {
      for (const v of [-3, -3.5, -2.5, 0, 44.5, 45, 224.5, -7.5, 110.5, -1.5]) {
        expect(formatPublishedLine(v)).toBe(v.toFixed(1));
      }
    });

    it("renders a finer grid exactly, so the shown string still parses back to the graded number", () => {
      // toFixed(1) would print "-0.8" for a -0.75 Asian line and we would grade
      // -0.75 — the display/grade split this whole change exists to close.
      expect(formatPublishedLine(-0.75)).toBe("-0.75");
      expect(Number(formatPublishedLine(-0.75))).toBe(-0.75);
      expect((-0.75).toFixed(1)).toBe("-0.8");
    });
  });
});
