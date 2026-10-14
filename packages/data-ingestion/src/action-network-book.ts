/**
 * Action Network Second Book — keyless multi-book odds plane exit.
 *
 * Implements GalaxySecondBook for the keyless Galaxy path, querying
 * Action Network's public scoreboard API (Caesars, DraftKings, BetMGM, FanDuel)
 * to attach a second independent real bookmaker quote to ESPN events.
 *
 * This turns the single-book (ESPN-relayed DraftKings) path into a
 * multi-book plane and unblocks MIN_BOOKMAKERS=2, book dispersion,
 * and Shin's z de-vigging without requiring paid keys.
 */

import type { OddsApiBookmaker, OddsApiMarket, OddsApiOutcome } from "@sports/types";
import type { GalaxySecondBook, GalaxySecondBookGameRef } from "./espn-odds-client.js";

export const ACTION_NETWORK_BOOK_TITLES: Record<number, string> = {
  15: "DraftKings",
  30: "FanDuel",
  68: "Caesars",
  69: "BetMGM",
  71: "PointsBet",
  74: "Circa Sports",
  79: "Bovada",
};

export const ACTION_NETWORK_PREFERRED_BOOKS: readonly number[] = [
  68, // Caesars (first choice - distinct from ESPN's DK relay)
  69, // BetMGM
  30, // FanDuel
  74, // Circa
  71, // PointsBet
  15, // DraftKings (fallback if no others present)
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

    // If none of preferred matched, pick any book with odds
    if (!chosenOdd) {
      for (const o of matched.odds) {
        if (o?.book_id != null && (o.ml_home != null || o.spread_home != null || o.total != null)) {
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
