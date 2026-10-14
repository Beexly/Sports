/**
 * Action Network Second Book — keyless multi-book odds plane exit.
 *
 * Implements GalaxySecondBook for the keyless Galaxy path, querying
 * Action Network's public scoreboard API to attach a second independent
 * real bookmaker quote to ESPN events.
 *
 * This turns the single-book (ESPN-relayed DraftKings) path into a
 * multi-book plane and unblocks MIN_BOOKMAKERS=2, book dispersion,
 * and Shin's z de-vigging without requiring paid keys.
 *
 * BOOK IDS VERIFIED 2026-10-13 against GET https://api.actionnetwork.com/web/v1/books
 * (HTTP 200, 336,006 bytes, 458 books) — id -> {display_name, source_name}:
 *     68 -> "DK NJ"          [draftkings]     <- DraftKings
 *     69 -> "FanDuel NJ"     [fanduel]        <- FanDuel
 *     71 -> "BetRivers NJ"   [njsugarhouse]   <- BetRivers
 *     75 -> "BetMGM NJ"      [njplaymgm]      <- BetMGM
 *     15 -> "Consensus"      [consensus]      <- SYNTHETIC (not a bookmaker)
 *     30 -> "Open"           [open]           <- SYNTHETIC (not a bookmaker)
 *
 * PRIOR VALUES WERE WRONG. The previous map claimed 15=DraftKings,
 * 30=FanDuel, 68=Caesars, 69=BetMGM, 71=PointsBet, 74=Circa, 79=Bovada.
 * Every one of those is a different book than labelled — 15 is the
 * Consensus aggregate and 30 is the Open line. Corrected here; the
 * per-book ids are REGION-SPECIFIC (DraftKings appears as DK NJ / DK NH /
 * DK VA / ... with different ids), so this table describes the DEFAULT
 * (no-params) scoreboard response only. Re-derive if you start passing
 * bookIds or a state/region selector.
 */

import type { OddsApiBookmaker, OddsApiMarket, OddsApiOutcome } from "@sports/types";
import type { GalaxySecondBook, GalaxySecondBookGameRef } from "./espn-odds-client.js";

/**
 * Book ids present in the DEFAULT Action Network scoreboard response.
 * Region-specific: these are the NJ variants the default request returns.
 */
export const ACTION_NETWORK_BOOK_TITLES: Record<number, string> = {
  68: "DraftKings",
  69: "FanDuel",
  71: "BetRivers",
  75: "BetMGM",
};

/**
 * Synthetic rows — aggregates Action Network computes, NOT independent
 * bookmakers. A "second book" drawn from here is NOT independent of the
 * market, and counting one toward MIN_BOOKMAKERS would clear the gate
 * without adding a real second quote. Kept out of the preferred list.
 */
export const ACTION_NETWORK_SYNTHETIC_BOOKS: readonly number[] = [
  15, // Consensus
  30, // Open
];

export function isSyntheticActionNetworkBook(bookId: number): boolean {
  return ACTION_NETWORK_SYNTHETIC_BOOKS.includes(bookId);
}

/**
 * Preference order for the second book. Real, independent bookmakers only.
 *
 * DraftKings is deliberately LAST: the primary Galaxy path already relays
 * DraftKings lines via ESPN (`espn_public`, see espn-odds-client.ts), so
 * taking DraftKings here would pair a source with itself and satisfy
 * MIN_BOOKMAKERS=2 with a duplicate rather than a second opinion.
 */
export const ACTION_NETWORK_PREFERRED_BOOKS: readonly number[] = [
  71, // BetRivers  (independent of the ESPN/DK relay)
  75, // BetMGM     (independent)
  69, // FanDuel    (independent)
  68, // DraftKings (LAST — same book as the ESPN relay; fallback only)
];

const SPORT_KEY_TO_LEAGUE: Record<string, string> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
};

const ABBR_ALIASES: Record<string, string> = {
  JAX: "JAC",
  WSH: "WAS",
  ARI: "AZ",
};

function normAbbr(abbr: string): string {
  const up = (abbr || "").toUpperCase().trim();
  return ABBR_ALIASES[up] ?? up;
}

export interface ActionNetworkBookOptions {
  readonly fetchImpl?: typeof fetch;
  readonly preferredBookIds?: readonly number[];
}

export class ActionNetworkSecondBook implements GalaxySecondBook {
  private readonly fetchFn: typeof fetch;
  private readonly preferredBooks: readonly number[];
  private readonly cache = new Map<string, { timestamp: number; data: any }>();
  private readonly ttlMs = 10 * 60 * 1000; // 10 minutes cache

  constructor(options: ActionNetworkBookOptions = {}) {
    this.fetchFn = options.fetchImpl ?? globalThis.fetch;
    this.preferredBooks = options.preferredBookIds ?? ACTION_NETWORK_PREFERRED_BOOKS;
  }

  private async fetchScoreboard(league: string): Promise<any | null> {
    const cached = this.cache.get(league);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.ttlMs) {
      return cached.data;
    }

    const url = `https://api.actionnetwork.com/web/v1/scoreboard/${encodeURIComponent(league)}`;
    try {
      const res = await this.fetchFn(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      this.cache.set(league, { timestamp: now, data });
      return data;
    } catch {
      return null;
    }
  }

  async bookmakerFor(game: GalaxySecondBookGameRef): Promise<OddsApiBookmaker | null> {
    const league = SPORT_KEY_TO_LEAGUE[game.sportKey];
    if (!league) return null;

    const scoreboard = await this.fetchScoreboard(league);
    if (!scoreboard || !Array.isArray(scoreboard.games)) return null;

    const targetHome = normAbbr(game.homeAbbr);
    const targetAway = normAbbr(game.awayAbbr);

    // Find matching game by team abbreviation
    const matched = scoreboard.games.find((g: any) => {
      const teams = g?.teams ?? [];
      const homeTeamId = g?.home_team_id;
      const awayTeamId = g?.away_team_id;

      let gHomeAbbr: string | undefined;
      let gAwayAbbr: string | undefined;

      for (const t of teams) {
        if (t?.id === homeTeamId) gHomeAbbr = t?.abbr;
        if (t?.id === awayTeamId) gAwayAbbr = t?.abbr;
      }
      if (!gHomeAbbr && teams[1]) gHomeAbbr = teams[1].abbr;
      if (!gAwayAbbr && teams[0]) gAwayAbbr = teams[0].abbr;

      return (
        normAbbr(gHomeAbbr ?? "") === targetHome &&
        normAbbr(gAwayAbbr ?? "") === targetAway
      );
    });

    if (!matched || !Array.isArray(matched.odds) || matched.odds.length === 0) {
      return null;
    }

    // Pick best available book according to preferred order
    let chosenOdd: any = null;
    let chosenBookId: number | null = null;

    for (const bookId of this.preferredBooks) {
      const candidate = matched.odds.find((o: any) => o?.book_id === bookId);
      if (candidate && (candidate.ml_home != null || candidate.spread_home != null || candidate.total != null)) {
        chosenOdd = candidate;
        chosenBookId = bookId;
        break;
      }
    }

    // If none of preferred matched, fall back to any REAL book with odds.
    // Synthetic rows (Consensus/Open) are skipped: they are aggregates, not
    // independent bookmaker quotes, so returning one would violate this
    // module's contract and falsely clear a 2-book gate. Fail closed.
    if (!chosenOdd) {
      for (const o of matched.odds) {
        if (
          o?.book_id != null &&
          !isSyntheticActionNetworkBook(o.book_id) &&
          (o.ml_home != null || o.spread_home != null || o.total != null)
        ) {
          chosenOdd = o;
          chosenBookId = o.book_id;
          break;
        }
      }
    }

    if (!chosenOdd || chosenBookId === null) return null;

    const markets: OddsApiMarket[] = [];

    // 1. Moneyline (h2h)
    if (
      typeof chosenOdd.ml_home === "number" &&
      typeof chosenOdd.ml_away === "number" &&
      Number.isFinite(chosenOdd.ml_home) &&
      Number.isFinite(chosenOdd.ml_away)
    ) {
      markets.push({
        key: "h2h",
        outcomes: [
          { name: game.homeTeam, price: chosenOdd.ml_home },
          { name: game.awayTeam, price: chosenOdd.ml_away },
        ],
      });
    }

    // 2. Spreads
    if (
      typeof chosenOdd.spread_home === "number" &&
      typeof chosenOdd.spread_away === "number" &&
      typeof chosenOdd.spread_home_line === "number" &&
      typeof chosenOdd.spread_away_line === "number" &&
      Number.isFinite(chosenOdd.spread_home) &&
      Number.isFinite(chosenOdd.spread_away) &&
      Number.isFinite(chosenOdd.spread_home_line) &&
      Number.isFinite(chosenOdd.spread_away_line)
    ) {
      markets.push({
        key: "spreads",
        outcomes: [
          { name: game.homeTeam, price: chosenOdd.spread_home_line, point: chosenOdd.spread_home },
          { name: game.awayTeam, price: chosenOdd.spread_away_line, point: chosenOdd.spread_away },
        ],
      });
    }

    // 3. Totals
    if (
      typeof chosenOdd.total === "number" &&
      typeof chosenOdd.over === "number" &&
      typeof chosenOdd.under === "number" &&
      Number.isFinite(chosenOdd.total) &&
      Number.isFinite(chosenOdd.over) &&
      Number.isFinite(chosenOdd.under)
    ) {
      markets.push({
        key: "totals",
        outcomes: [
          { name: "Over", price: chosenOdd.over, point: chosenOdd.total },
          { name: "Under", price: chosenOdd.under, point: chosenOdd.total },
        ],
      });
    }

    if (markets.length === 0) return null;

    const bookTitle = ACTION_NETWORK_BOOK_TITLES[chosenBookId] ?? `Book ${chosenBookId}`;
    return {
      key: `action_network_${chosenBookId}`,
      title: `${bookTitle} (Action Network)`,
      last_update: chosenOdd.inserted ?? new Date().toISOString(),
      markets,
    };
  }
}

export function createActionNetworkSecondBook(
  options: ActionNetworkBookOptions = {},
): ActionNetworkSecondBook {
  return new ActionNetworkSecondBook(options);
}
