import { describe, it, expect } from "vitest";
import { DataNormalizer } from "../normalizer.js";
import type { OddsApiEvent } from "@sports/types";

/**
 * Regression suite for the odds-format boundary guard (`sanitizeAmericanPrice`).
 *
 * This guard is the single defence between an upstream that ignored
 * `oddsFormat=american` and the de-vig math. Its own docstring names the
 * consequence: a decimal price like 1.91 read as "+1.91" implies ~0.98, which
 * fabricates a spurious pricing edge — "the root of the 'Edge Index 100' board
 * bug". Until now it had no test at all, in any file.
 *
 * The method is private, so every case here drives it through the public
 * `normalizeOdds` — which is also the honest boundary to pin, since that is
 * where the rest of the system actually consumes it.
 *
 * The PRICE/POINT distinction is the subtle half. `spread` (-3.5) and `total`
 * (48.5) are POINTS and must pass through untouched; only prices are
 * sanitized. A "fix" that sanitized points would silently delete every spread
 * and total on the board, so those invariants are pinned here too.
 */

const LAST_UPDATE = "2026-04-10T17:00:00Z";

/** Build a single-bookmaker event with the given h2h prices. */
function h2hEvent(homePrice: unknown, awayPrice: unknown): OddsApiEvent {
  return {
    id: "event-h2h",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2026-04-10T18:00:00Z",
    home_team: "Kansas City Chiefs",
    away_team: "Philadelphia Eagles",
    bookmakers: [
      {
        key: "fanduel",
        title: "FanDuel",
        last_update: LAST_UPDATE,
        markets: [
          {
            key: "h2h",
            last_update: LAST_UPDATE,
            outcomes: [
              { name: "Kansas City Chiefs", price: homePrice as number },
              { name: "Philadelphia Eagles", price: awayPrice as number },
            ],
          },
        ],
      },
    ],
  };
}

/** Build a single-bookmaker event with the given spread prices and points. */
function spreadsEvent(homePrice: unknown, awayPrice: unknown, point = -3.5): OddsApiEvent {
  return {
    id: "event-spreads",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2026-04-10T18:00:00Z",
    home_team: "Kansas City Chiefs",
    away_team: "Philadelphia Eagles",
    bookmakers: [
      {
        key: "fanduel",
        title: "FanDuel",
        last_update: LAST_UPDATE,
        markets: [
          {
            key: "spreads",
            last_update: LAST_UPDATE,
            outcomes: [
              { name: "Kansas City Chiefs", price: homePrice as number, point },
              { name: "Philadelphia Eagles", price: awayPrice as number, point: -point },
            ],
          },
        ],
      },
    ],
  };
}

/** Build a single-bookmaker event with the given totals prices and point. */
function totalsEvent(overPrice: unknown, underPrice: unknown, point = 48.5): OddsApiEvent {
  return {
    id: "event-totals",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2026-04-10T18:00:00Z",
    home_team: "Kansas City Chiefs",
    away_team: "Philadelphia Eagles",
    bookmakers: [
      {
        key: "totals",
        title: "FanDuel",
        last_update: LAST_UPDATE,
        markets: [
          {
            key: "totals",
            last_update: LAST_UPDATE,
            outcomes: [
              { name: "Over", price: overPrice as number, point },
              { name: "Under", price: underPrice as number, point },
            ],
          },
        ],
      },
    ],
  };
}

const FETCHED_AT = new Date("2026-04-10T17:05:00Z");

describe("sanitizeAmericanPrice (via normalizeOdds)", () => {
  const normalizer = new DataNormalizer();

  describe("valid American prices pass through unchanged", () => {
    it.each([
      ["heavy favourite", -180],
      ["standard vig", -110],
      ["underdog", 155],
      ["long shot", 900],
      ["very heavy favourite", -2500],
    ])("keeps a %s (%d)", (_label, price) => {
      const [row] = normalizer.normalizeOdds([h2hEvent(price, -110)], FETCHED_AT);
      expect(row!.homePrice).toBe(price);
    });
  });

  describe("the ±100 boundary is inclusive", () => {
    // |price| >= 100 is valid American. This is the exact edge where a decimal
    // and an American price can no longer be told apart, so it must not drift.
    it("keeps exactly +100", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(100, -110)], FETCHED_AT);
      expect(row!.homePrice).toBe(100);
    });

    it("keeps exactly -100", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(-100, -110)], FETCHED_AT);
      expect(row!.homePrice).toBe(-100);
    });

    it("drops +99 — just inside the impossible band", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(99, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops -99", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(-99, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });
  });

  describe("leaked DECIMAL odds are dropped, not misread as American", () => {
    // The bug this guard exists to stop. 1.91 decimal read as "+1.91" American
    // implies ~0.98 — a near-certainty where the book priced a coin flip.
    it.each([
      ["even-money decimal", 2.0],
      ["standard -110 as decimal", 1.91],
      ["favourite as decimal", 1.5],
      ["underdog as decimal", 2.55],
      ["decimal just under the band", 1.01],
    ])("drops a %s (%s)", (_label, price) => {
      const [row] = normalizer.normalizeOdds([h2hEvent(price, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops a decimal price on EVERY market, not just h2h", () => {
      const [spreadRow] = normalizer.normalizeOdds([spreadsEvent(1.91, 1.91)], FETCHED_AT);
      expect(spreadRow!.homeSpreadPrice).toBeUndefined();
      expect(spreadRow!.awaySpreadPrice).toBeUndefined();

      const [totalRow] = normalizer.normalizeOdds([totalsEvent(1.91, 1.91)], FETCHED_AT);
      expect(totalRow!.overPrice).toBeUndefined();
      expect(totalRow!.underPrice).toBeUndefined();
    });
  });

  describe("malformed values are dropped", () => {
    it("drops zero (pick'em is not a valid American price)", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(0, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops NaN", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(Number.NaN, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops Infinity", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(Number.POSITIVE_INFINITY, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops -Infinity", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(Number.NEGATIVE_INFINITY, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops undefined", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(undefined, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });

    it("drops null", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(null, -110)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
    });
  });

  describe("one bad price does not poison its sibling", () => {
    // A market with too few usable prices is skipped downstream by the engine;
    // that decision needs the good side to survive intact.
    it("keeps the valid away price when the home price is a decimal leak", () => {
      const [row] = normalizer.normalizeOdds([h2hEvent(1.91, 155)], FETCHED_AT);
      expect(row!.homePrice).toBeUndefined();
      expect(row!.awayPrice).toBe(155);
    });
  });

  describe("POINTS are not prices and must survive sanitization", () => {
    // The failure mode of an over-eager fix: spreads and totals are points in
    // the (-100, 100) band, so sanitizing them would delete the entire board.
    it("keeps a -3.5 spread POINT while dropping its decimal price", () => {
      const [row] = normalizer.normalizeOdds([spreadsEvent(1.91, 1.91, -3.5)], FETCHED_AT);
      expect(row!.spread).toBe(-3.5);
      expect(row!.homeSpreadPrice).toBeUndefined();
    });

    it("keeps a 48.5 total POINT while dropping its decimal price", () => {
      const [row] = normalizer.normalizeOdds([totalsEvent(1.91, 1.91, 48.5)], FETCHED_AT);
      expect(row!.total).toBe(48.5);
      expect(row!.overPrice).toBeUndefined();
    });

    it("keeps a 0 spread POINT (a pick'em line is real) with valid prices", () => {
      const [row] = normalizer.normalizeOdds([spreadsEvent(-110, -110, 0)], FETCHED_AT);
      expect(row!.spread).toBe(0);
      expect(row!.homeSpreadPrice).toBe(-110);
    });
  });
});
