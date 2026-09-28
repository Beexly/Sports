import { describe, it, expect } from "vitest";
import { DataNormalizer } from "./normalizer.js";
import type { OddsApiEvent } from "@sports/types";

/**
 * Regression guard for the runaway-moneyline-price defect.
 *
 * Measured 2026-09-28 on live Neon: 509,201 `odds` rows carried `market='H2H'`
 * prices outside -500..+500, reaching -100,000. The sanitizer had a magnitude
 * FLOOR (>= 100, rejecting decimal odds) but no ceiling, so those rows entered
 * the feed and produced published picks priced at -21200. A -21200 "price" is
 * not a quoted market price; it makes moneyline CLV/EV unpublishable.
 *
 * These tests pin BOTH ends of the bound. The floor side already existed and is
 * pinned here so a future "simplification" cannot quietly drop it.
 *
 * WHY THE CEILING IS 500 (derived in commit a865e72e7; full price-shape tables
 * in normalizer.ts): the round-to-the-hundred share rises 3.7% -> 28.2% -> 82.4%
 * -> 95.9% across -100..-500, -500..-1000, -1000..-3000 and beyond -3000, and is
 * 100% at exactly -1000. The original "-535 was the tail" justification in
 * f4b20f2d8 was too thin to support a hard bound. Both -500 and -1000 were then
 * tested against a two-book two-sided quorum and keep the SAME 259 of 976
 * moneyline games, so the tighter bound costs no games.
 */

function h2hEvent(prices: { home: number; away: number }): OddsApiEvent {
  return {
    id: "evt_1",
    sport_key: "basketball_nba",
    commence_time: "2026-01-01T00:00:00Z",
    home_team: "Boston Red Sox",
    away_team: "New York Yankees",
    bookmakers: [
      {
        key: "draftkings",
        last_update: "2026-01-01T00:00:00Z",
        title: "DK",
        markets: [
          {
            key: "h2h",
            last_update: "2026-01-01T00:00:00Z",
            outcomes: [
              { name: "Boston Red Sox", price: prices.home },
              { name: "New York Yankees", price: prices.away },
            ],
          },
        ],
      },
    ],
  } as unknown as OddsApiEvent;
}

describe("sanitizeAmericanPrice bounds", () => {
  const n = new DataNormalizer();

  it("accepts real American prices", () => {
    const out = n.normalizeOdds([h2hEvent({ home: -110, away: +120 })], new Date());
    expect(out).toHaveLength(1);
    expect(out[0]?.homePrice).toBe(-110);
    expect(out[0]?.awayPrice).toBe(120);
  });

  it("accepts the genuine tail (heavy favourite near -500)", () => {
    const out = n.normalizeOdds([h2hEvent({ home: -495, away: +380 })], new Date());
    expect(out[0]?.homePrice).toBe(-495);
    expect(out[0]?.awayPrice).toBe(380);
  });

  // The existing floor: decimal odds must never enter scoring.
  it("rejects decimal odds below the floor", () => {
    const out = n.normalizeOdds([h2hEvent({ home: 1.91, away: 2.05 })], new Date());
    expect(out[0]?.homePrice).toBeUndefined();
    expect(out[0]?.awayPrice).toBeUndefined();
  });

  // The defect: no ceiling meant these sailed through into published picks.
  it("rejects runaway negative prices", () => {
    for (const bad of [-535, -1000, -21200, -100000, -200000]) {
      const out = n.normalizeOdds([h2hEvent({ home: bad, away: +105 })], new Date());
      expect(out[0]?.homePrice, `expected ${bad} to be refused`).toBeUndefined();
      // The sane side of the same market survives.
      expect(out[0]?.awayPrice).toBe(105);
    }
  });

  it("rejects runaway positive prices", () => {
    const out = n.normalizeOdds([h2hEvent({ home: -110, away: 100000 })], new Date());
    expect(out[0]?.awayPrice).toBeUndefined();
    expect(out[0]?.homePrice).toBe(-110);
  });

  it("keeps the market row when a side is refused, never dropping the sane side", () => {
    const out = n.normalizeOdds([h2hEvent({ home: -21200, away: -110 })], new Date());
    expect(out).toHaveLength(1);
    expect(out[0]?.homePrice).toBeUndefined();
    expect(out[0]?.awayPrice).toBe(-110);
  });
});
