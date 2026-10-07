import { describe, it, expect } from "vitest";
import {
  scoreGame,
  averageAmericanPrices,
  americanToImpliedProbability,
  toEdgeIndex,
} from "../scoring.js";
import { MIN_PUBLISH_CONFIDENCE } from "../constants.js";
import type { OddsInput } from "@sports/types";

/**
 * Two publish-path regressions in `scoring.ts`, both confirmed live.
 *
 * 1. FAKE EDGE — `scoreSpreadPick` and `scoreTotalPick` built the chosen side's
 *    average price with an arithmetic mean of AMERICAN odds. American odds are
 *    discontinuous across ±100, so a book set that straddles pick'em collapses
 *    toward 0 — a value that is not a price at all. `computeEdgeScore` then
 *    reads its implied probability as ~0 and reports the entire fair
 *    probability as "edge". The live symptom was a spread pick published as
 *    "Fair value: 49%. Edge: +44.2%" with Edge Index 100 on a market whose real
 *    edge is -2.3%. Both call sites now use `averageAmericanPrices`, which
 *    averages in PROBABILITY space and converts back.
 *
 * 2. NaN PUBLISHES — the three publish gates read `confidence <
 *    MIN_PUBLISH_CONFIDENCE`. Every comparison against NaN is false, so a
 *    non-finite confidence failed to be rejected and shipped
 *    "Confidence: NaN/100" to customers. The gates are now fail-closed via the
 *    repo's `!(Number.isFinite(x) && <predicate>)` idiom.
 */

const FETCHED_AT = new Date("2026-04-15T12:00:00Z");

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "espnbet", "hardrock", "fanatics", "bet365",
];

const naiveAmericanMean = (prices: number[]) =>
  prices.reduce((a, b) => a + b, 0) / prices.length;

// ============================================================
// Bug 1 — American odds averaged as raw integers
// ============================================================

/**
 * Ten books on the same -3.5 line. Half shade the home side to -115, half to
 * +105 — ordinary line shopping, and a straddle of the ±100 discontinuity.
 */
const makeStraddlingSpreadInput = (): OddsInput => ({
  gameId: "straddle-spread-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: TEN_BOOKS.map((bookmaker, i) => ({
    bookmaker,
    market: "SPREADS" as const,
    spread: -3.5,
    homeSpreadPrice: i < 5 ? -115 : 105,
    awaySpreadPrice: i < 5 ? -105 : -125,
  })),
});

/**
 * Ten books on the same 45.5 total. Eight price it -105/-115; two carry a
 * lopsided quote (-180/+150). The picked UNDER side therefore straddles ±100.
 */
const makeStraddlingTotalInput = (): OddsInput => ({
  gameId: "straddle-total-1",
  homeTeam: "St. Louis Cardinals",
  awayTeam: "Texas Rangers",
  commenceTime: new Date("2026-06-01T18:00:00Z"),
  sport: "MLB",
  bookmakerOdds: TEN_BOOKS.map((bookmaker, i) => ({
    bookmaker,
    market: "TOTALS" as const,
    total: 45.5,
    overPrice: i < 8 ? -105 : -180,
    underPrice: i < 8 ? -115 : 150,
  })),
});

describe("scoreSpreadPick — chosen-side price is averaged in probability space", () => {
  it("a straddling book set no longer mints a +44.2% edge", () => {
    const chosenPrices = [-115, -115, -115, -115, -115, 105, 105, 105, 105, 105];

    // The two averages disagree wildly across the discontinuity. The old path
    // took the integer mean, which lands next to zero and, read as a price,
    // claims a ~4.8% implied probability on a market quoted around even money.
    expect(naiveAmericanMean(chosenPrices)).toBe(-5);
    expect(americanToImpliedProbability(-5)).toBeCloseTo(0.0476, 4);
    // Averaging the implied probabilities and converting back gives a real price.
    expect(averageAmericanPrices(chosenPrices)).toBe(-105);
    expect(americanToImpliedProbability(-105)).toBeCloseTo(0.5122, 4);

    const pick = scoreGame(makeStraddlingSpreadInput(), FETCHED_AT).find(
      (p) => p.pickType === "SPREAD",
    );
    expect(pick).toBeTruthy();

    // The locked entry price is the probability-space average, never the -5
    // integer mean that the old path recorded as the pick's price.
    expect(pick!.entryPrice).toBe(-105);
    expect(pick!.entryPrice).not.toBe(naiveAmericanMean(chosenPrices));

    // The customer-visible numbers. Pre-fix this exact fixture published
    // "Fair value: 49%. Edge: +44.2%. Confidence: 85/100 (ELITE PLAY)".
    expect(pick!.reasoning).toContain("Fair value: 49%.");
    expect(pick!.reasoning).toContain("Edge: -2.3%.");
    expect(pick!.reasoning).not.toContain("Edge: +44.2%");

    // A market priced this tightly cannot be a maxed-out Edge Index.
    expect(toEdgeIndex(pick!.edgeScore)).toBeLessThan(40);
    expect(pick!.pickGrade).not.toBe("ELITE_PLAY");
  });
});

describe("scoreTotalPick — chosen-side price is averaged in probability space", () => {
  it("a straddling book set no longer mints a +10.3% edge", () => {
    const pick = scoreGame(makeStraddlingTotalInput(), FETCHED_AT).find(
      (p) => p.pickType === "TOTAL",
    );
    expect(pick).toBeTruthy();

    // Old path averaged the UNDER prices [-115 x8, +150 x2] to -62.
    expect(pick!.entryPrice).toBe(-103);
    expect(pick!.entryPrice).not.toBe(
      Math.round(naiveAmericanMean([-115, -115, -115, -115, -115, -115, -115, -115, 150, 150])),
    );

    // Pre-fix: "Fair value: 49%. Edge: +10.3%. Confidence: 73/100 (SOLID PLAY)".
    expect(pick!.reasoning).toContain("Edge: -2.2%.");
    expect(pick!.reasoning).not.toContain("Edge: +10.3%");
    expect(toEdgeIndex(pick!.edgeScore)).toBeLessThan(40);
    expect(pick!.pickGrade).not.toBe("SOLID_PLAY");
  });
});

// ============================================================
// Bug 2 — NaN confidence must be rejected, not published
// ============================================================

const FOUR_BOOKS = ["fanduel", "draftkings", "betmgm", "caesars"];

/** One book's price arrives non-finite (a malformed upstream quote). */
const makeNaNSpreadInput = (): OddsInput => ({
  gameId: "nan-spread-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: FOUR_BOOKS.map((bookmaker, i) => ({
    bookmaker,
    market: "SPREADS" as const,
    spread: -3.5,
    homeSpreadPrice: i === 0 ? Number.NaN : -110,
    awaySpreadPrice: -110,
  })),
});

const makeNaNTotalInput = (): OddsInput => ({
  gameId: "nan-total-1",
  homeTeam: "St. Louis Cardinals",
  awayTeam: "Texas Rangers",
  commenceTime: new Date("2026-06-01T18:00:00Z"),
  sport: "MLB",
  bookmakerOdds: FOUR_BOOKS.map((bookmaker, i) => ({
    bookmaker,
    market: "TOTALS" as const,
    total: 45.5,
    overPrice: i === 0 ? Number.NaN : -115,
    underPrice: -105,
  })),
});

const makeNaNMoneylineInput = (): OddsInput => ({
  gameId: "nan-ml-1",
  homeTeam: "St. Louis Cardinals",
  awayTeam: "Texas Rangers",
  commenceTime: new Date("2026-06-01T18:00:00Z"),
  sport: "MLB",
  bookmakerOdds: FOUR_BOOKS.map((bookmaker, i) => ({
    bookmaker,
    market: "H2H" as const,
    homePrice: i === 0 ? Number.NaN : -180,
    awayPrice: 155,
  })),
});

describe("publish gates are fail-closed against a non-finite confidence", () => {
  const cases: Array<[string, () => OddsInput]> = [
    ["scoreSpreadPick", makeNaNSpreadInput],
    ["scoreTotalPick", makeNaNTotalInput],
    ["scoreMoneylinePick", makeNaNMoneylineInput],
  ];

  for (const [gate, makeInput] of cases) {
    it(`${gate} withholds the pick instead of publishing Confidence: NaN/100`, () => {
      const picks = scoreGame(makeInput(), FETCHED_AT);
      // `NaN < MIN_PUBLISH_CONFIDENCE` is false, so the old gate let this
      // through and rendered "Confidence: NaN/100" on the board.
      expect(picks).toHaveLength(0);
    });
  }

  it("no published pick ever carries a non-finite confidence or edge", () => {
    for (const [, makeInput] of cases) {
      for (const pick of scoreGame(makeInput(), FETCHED_AT)) {
        expect(Number.isFinite(pick.confidence)).toBe(true);
        expect(Number.isFinite(pick.edgeScore)).toBe(true);
        expect(pick.reasoning).not.toContain("NaN");
      }
    }
  });

  it("rejects only the non-finite case — a confidence exactly at MIN_PUBLISH_CONFIDENCE still publishes", () => {
    // Four books on a vanilla -110/-110 total land the composite exactly on the
    // threshold. The strengthened guard rejects strictly more than the old one,
    // so this boundary must not move: `>=` still admits it.
    const boundaryInput = (overPrice: number): OddsInput => ({
      gameId: "boundary-total-1",
      homeTeam: "St. Louis Cardinals",
      awayTeam: "Texas Rangers",
      commenceTime: new Date("2026-06-01T18:00:00Z"),
      sport: "MLB",
      bookmakerOdds: FOUR_BOOKS.map((bookmaker, i) => ({
        bookmaker,
        market: "TOTALS" as const,
        total: 7.5,
        overPrice: i === 0 ? overPrice : -110,
        underPrice: -110,
      })),
    });

    const pick = scoreGame(boundaryInput(-110), FETCHED_AT).find(
      (p) => p.pickType === "TOTAL",
    );
    expect(pick).toBeTruthy();
    expect(pick!.confidence).toBe(MIN_PUBLISH_CONFIDENCE);

    // Same fixture, one price non-finite: the only verdict that changes.
    expect(scoreGame(boundaryInput(Number.NaN), FETCHED_AT)).toHaveLength(0);
  });
});
