/**
 * Galaxy second book — Kalshi exchange H2H quotes as a real bookmaker.
 *
 * WHY: the keyless Galaxy path carries exactly one book (ESPN-relayed
 * DraftKings), and MIN_BOOKMAKERS=2 rightly refuses to mint picks off a
 * single quote. Kalshi is a CFTC-regulated exchange with free public market
 * data and an existing cleared registry entry ("kalshi") — its two-way
 * listing quote is a second, genuinely independent market observation.
 *
 * Law (unchanged):
 *  - Never invent the other side: both sides must carry a live two-way
 *    implied probability (gateKalshiListing upstream) or NO book is added.
 *  - H2H only. Kalshi has no spread/total book here; those markets stay
 *    single-book and therefore honestly un-mintable.
 *  - last_update is the exchange snapshot's real capturedAt — never a
 *    fabricated local clock.
 */

import type { OddsApiBookmaker } from "@sports/types";
import type { KalshiFairValue } from "./kalshi-client.js";

export const KALSHI_BOOK_KEY = "kalshi" as const;

/**
 * Probability → American price. p in (0,1); favorites negative.
 * Uses the side's RAW market-implied probability (pre-de-vig), so the pair
 * keeps the exchange's actual (tiny) overround like any real book quote.
 */
export function probToAmerican(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  const price = p >= 0.5 ? -Math.round((100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p);
  // |price| >= 100 always holds mathematically here; guard anyway so a
  // rounding edge (p ~ 0.5) can never emit a sub-American artifact.
  return Math.abs(price) >= 100 ? price : p >= 0.5 ? -100 : 100;
}

/**
 * Build the Kalshi H2H bookmaker for one game from a fair-value snapshot.
 * Sides resolve by ticker tail = the exchange's own YES-side abbreviation
 * (same deterministic rule as toIndependentFairValue). Returns null on any
 * missing leg — an honest miss, never a partial or invented book.
 */
export function kalshiH2hBookmaker(args: {
  readonly fairValue: KalshiFairValue;
  readonly homeAbbr: string;
  readonly awayAbbr: string;
  /** Full display names — DataNormalizer matches outcomes by event names. */
  readonly homeTeam: string;
  readonly awayTeam: string;
}): OddsApiBookmaker | null {
  const { fairValue, homeAbbr, awayAbbr, homeTeam, awayTeam } = args;
  if (!homeAbbr || !awayAbbr) return null;
  const tail = (ticker: string) => ticker.slice(ticker.lastIndexOf("-") + 1).toUpperCase();
  const home = fairValue.sides.find((s) => tail(s.ticker) === homeAbbr.toUpperCase());
  const away = fairValue.sides.find((s) => tail(s.ticker) === awayAbbr.toUpperCase());
  const homeP = home?.rawImpliedProb ?? null;
  const awayP = away?.rawImpliedProb ?? null;
  if (homeP == null || awayP == null) return null;
  const homePrice = probToAmerican(homeP);
  const awayPrice = probToAmerican(awayP);
  if (homePrice == null || awayPrice == null) return null;
  return {
    key: KALSHI_BOOK_KEY,
    title: "Kalshi (exchange)",
    last_update: fairValue.capturedAt,
    markets: [
      {
        key: "h2h",
        last_update: fairValue.capturedAt,
        outcomes: [
          { name: awayTeam, price: awayPrice },
          { name: homeTeam, price: homePrice },
        ],
      },
    ],
  };
}
