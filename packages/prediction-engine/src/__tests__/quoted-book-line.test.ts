import { afterEach, describe, expect, it } from "vitest";
import { isQuotedBookLine, lineIntegrityPublishGuardEnabled, scoreGame } from "../scoring.js";
import type { OddsInput } from "@sports/types";

/**
 * C-270 (ledger C-197): does a pick still publish with a line no book quoted?
 *
 * C-197 diagnosed the stored `line` as a MODEL-PREDICTED MARGIN. It is not.
 * scoring.ts computes `avgSpread` (line ~411) and `avgTotal` (line ~684) as the
 * arithmetic MEAN of the book lines on the row, so 'Missouri Tigers -53.8' /
 * -53.83333333333334 is the mean of three real FCS book lines. The defect is
 * real — the member is shown a price nobody offers — but the mechanism is
 * consensus averaging, not model leakage. These tests pin BOTH halves: what the
 * engine does today (publishes it) and what the guard does when enabled.
 *
 * Every value below is a LINE, not product data: no pick, score or win rate.
 */

const FLAG = "LINE_INTEGRITY_PUBLISH_GUARD_ENABLED";

afterEach(() => {
  delete process.env[FLAG];
});

/**
 * Six books on every fixture. Below four the pick fails MIN_PUBLISH_CONFIDENCE
 * on market depth alone and nothing is returned, which would make every
 * assertion below pass for the wrong reason.
 */
const spreadInput = (sport: string, spreads: readonly number[]): OddsInput => ({
  gameId: "game-quoted-line-fixture",
  homeTeam: "Fixture Home Bears",
  awayTeam: "Fixture Away Hawks",
  commenceTime: new Date("2026-09-13T17:00:00Z"),
  sport,
  bookmakerOdds: spreads.map((spread, i) => ({
    bookmaker: `fixture-book-${i}`,
    market: "SPREADS" as const,
    spread,
    homeSpreadPrice: -110,
    awaySpreadPrice: -110,
  })),
});

const totalInput = (sport: string, totals: readonly number[]): OddsInput => ({
  gameId: "game-quoted-total-fixture",
  homeTeam: "Fixture Home Bears",
  awayTeam: "Fixture Away Hawks",
  commenceTime: new Date("2026-09-13T17:00:00Z"),
  sport,
  bookmakerOdds: totals.map((total, i) => ({
    bookmaker: `fixture-book-${i}`,
    market: "TOTALS" as const,
    total,
    overPrice: -110,
    underPrice: -110,
  })),
});

const spreadOf = (input: OddsInput) =>
  scoreGame(input).find((p) => p.pickType === "SPREAD");
const totalOf = (input: OddsInput) =>
  scoreGame(input).find((p) => p.pickType === "TOTAL");

describe("isQuotedBookLine", () => {
  it("accepts a mean that landed on a line a book quoted", () => {
    expect(isQuotedBookLine(-3.5, [-3.5, -3.5, -3.5])).toBe(true);
  });

  it("refuses a mean that sits between the lines it was averaged from", () => {
    // Three books at -3, -3.5, -3 average to -3.1666666666666665.
    expect(isQuotedBookLine(-3.1666666666666665, [-3, -3.5, -3])).toBe(false);
    // And the finding's own value, against the book set that produces it.
    expect(isQuotedBookLine(-53.833333333333336, [-53.5, -54])).toBe(false);
  });

  it("tolerates float drift around a quoted line, but not a real gap", () => {
    // The stored line is a mean, so compare with an epsilon exactly as the
    // run-line ladder does. A half-point apart is a real gap, not drift.
    expect(isQuotedBookLine(-3.5 + 1e-12, [-3.5])).toBe(true);
    expect(isQuotedBookLine(-3.5 - 1e-12, [-3.5])).toBe(true);
    expect(isQuotedBookLine(-3.4, [-3.5])).toBe(false);
  });

  it("refuses a non-finite line and ignores non-finite quotes", () => {
    expect(isQuotedBookLine(Number.NaN, [-3.5])).toBe(false);
    expect(isQuotedBookLine(Number.POSITIVE_INFINITY, [-3.5])).toBe(false);
    expect(isQuotedBookLine(Number.NaN, [Number.NaN])).toBe(false);
  });

  it("refuses anything against an empty book set", () => {
    expect(isQuotedBookLine(-3.5, [])).toBe(false);
  });
});

/**
 * DELIVERABLE 1 — the answer to "does it still happen", pinned as a test so it
 * cannot be claimed without evidence. With the flag unset (production today),
 * every one of these publishes a line no book on the row quoted.
 */
describe("scoreGame with the guard OFF — the finding still reproduces today", () => {
  it("SPREAD: publishes a football line that is between two quoted lines", () => {
    const pick = spreadOf(spreadInput("americanfootball_nfl", [-3, -3, -3, -3.5, -3.5, -3.5]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(-3.25, 12);
    expect(isQuotedBookLine(pick!.line, [-3, -3.5])).toBe(false);
  });

  it("SPREAD: reproduces the finding's own repeating-decimal signature", () => {
    // The exact shape of 'Missouri Tigers -53.8' / -53.83333333333334: three
    // real book lines on a blowout FCS fixture, averaged.
    const pick = spreadOf(spreadInput("americanfootball_ncaaf", [-53.5, -54, -54, -53.5, -54, -54]));
    expect(pick).toBeDefined();
    expect(String(pick!.line)).toMatch(/\.\d{6,}/);
  });

  it("TOTAL: publishes a total that is between two quoted totals", () => {
    const pick = totalOf(totalInput("americanfootball_nfl", [44, 44.5, 44.5, 44, 44.5, 44.5]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(44.333333333333336, 12);
    expect(isQuotedBookLine(pick!.line, [44, 44.5])).toBe(false);
  });

  it("TOTAL: baseball has no run-line-ladder twin, so MLB totals go off-grid too", () => {
    // isPublishableSpreadLine is SPREAD-only. There is no fixed ladder for MLB
    // totals (8.5 and 9 are both real), so the ladder guard cannot be reused —
    // the quoted-set rule is the only one that applies.
    const pick = totalOf(totalInput("baseball_mlb", [8.5, 9, 9, 8.5, 9, 9]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(8.833333333333334, 12);
  });
});

describe("lineIntegrityPublishGuardEnabled", () => {
  it("is off unless the flag is exactly true", () => {
    // Read from the environment rather than PlatformConfig on purpose: the
    // env-example coverage guard requires a .env.example entry for every key
    // PlatformConfig reads, and law 2 freezes .env* for agents (same conflict
    // and same resolution as C-108).
    expect(lineIntegrityPublishGuardEnabled({})).toBe(false);
    expect(lineIntegrityPublishGuardEnabled({ [FLAG]: "false" })).toBe(false);
    expect(lineIntegrityPublishGuardEnabled({ [FLAG]: "1" })).toBe(false);
    expect(lineIntegrityPublishGuardEnabled({ [FLAG]: " TRUE " })).toBe(true);
  });
});

describe("the guard accepts only REAL bookmakers (Devin Review, #733)", () => {
  /** Six books, five agreeing and one non-book writer sitting on the mean. */
  const withNonBook = (sport: string, lines: readonly number[], market: "SPREADS" | "TOTALS") => ({
    gameId: "game-nonbook",
    homeTeam: "Fixture Home Bears",
    awayTeam: "Fixture Away Hawks",
    commenceTime: new Date("2026-09-13T17:00:00Z"),
    sport,
    bookmakerOdds: lines.map((v, i) => ({
      // The LAST entry is the non-book writer.
      bookmaker: i === lines.length - 1 ? "rundown_default" : `fixture-book-${i}`,
      market,
      ...(market === "SPREADS"
        ? { spread: v, homeSpreadPrice: -110, awaySpreadPrice: -110 }
        : { total: v, overPrice: -108, underPrice: -112 }),
    })),
  }) as OddsInput;

  it("SPREAD: a rundown_default row sitting on the mean does not satisfy the guard", () => {
    process.env[FLAG] = "true";
    // The non-book quotes the mean of the five real books (-3.2), so the
    // overall mean lands on it. No REAL book quotes -3.2, so the only thing
    // vouching for the published line is a writer that is not a bookmaker.
    const input = withNonBook("americanfootball_nfl", [-3, -3, -3, -3.5, -3.5, -3.2], "SPREADS");
    expect(scoreGame(input).find((p) => p.pickType === "SPREAD")).toBeUndefined();
  });

  it("TOTAL: same, for the totals scorer", () => {
    process.env[FLAG] = "true";
    const input = withNonBook("americanfootball_nfl", [44, 44, 44, 44.5, 44.5, 44.2], "TOTALS");
    expect(scoreGame(input).find((p) => p.pickType === "TOTAL")).toBeUndefined();
  });

  it("a REAL book quoting the mean still satisfies the guard", () => {
    process.env[FLAG] = "true";
    const input = withNonBook("americanfootball_nfl", [-3.5, -3.5, -3.5, -3.5, -3.5, -3.5], "SPREADS");
    expect(scoreGame(input).find((p) => p.pickType === "SPREAD")).toBeDefined();
  });
});

describe("scoreGame with the guard ON — the same rows are refused", () => {
  it("SPREAD: refuses the between-lines football mean", () => {
    process.env[FLAG] = "true";
    expect(spreadOf(spreadInput("americanfootball_nfl", [-3, -3, -3, -3.5, -3.5, -3.5]))).toBeUndefined();
  });

  it("SPREAD: still publishes when every book quotes the same line", () => {
    process.env[FLAG] = "true";
    const pick = spreadOf(spreadInput("americanfootball_nfl", [-3.5, -3.5, -3.5, -3.5, -3.5, -3.5]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(-3.5, 12);
  });

  it("TOTAL: refuses the between-lines total", () => {
    process.env[FLAG] = "true";
    expect(totalOf(totalInput("americanfootball_nfl", [44, 44.5, 44.5, 44, 44.5, 44.5]))).toBeUndefined();
  });

  it("TOTAL: still publishes when every book quotes the same total", () => {
    process.env[FLAG] = "true";
    const pick = totalOf(totalInput("americanfootball_nfl", [44.5, 44.5, 44.5, 44.5, 44.5, 44.5]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(44.5, 12);
  });

  it("an even book count that averages onto a quoted line is still published", () => {
    // -3.5 and -3.5 and -3 and -4 average to -3.5, which IS quoted. The rule is
    // the book set, not the arithmetic, and not a half-point grid.
    process.env[FLAG] = "true";
    const pick = spreadOf(spreadInput("americanfootball_nfl", [-3.5, -3.5, -3.5, -3.5, -3, -4]));
    expect(pick).toBeDefined();
    expect(pick!.line).toBeCloseTo(-3.5, 12);
  });
});
