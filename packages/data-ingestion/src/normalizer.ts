import type {
  OddsApiEvent,
  OddsApiScore,
  NormalizedGame,
  NormalizedOdds,
} from "@sports/types";
import { FRESHNESS_THRESHOLD_MS } from "./config.js";

export class DataNormalizer {
  /**
   * Guard the odds-format boundary.
   *
   * We request American odds (config.ODDS_FORMAT="american"), but nothing
   * downstream validates that the upstream actually honored it. Valid American
   * prices are integers with magnitude >= 100 (e.g. -110, +120). Decimal odds
   * (e.g. 1.91, 2.05) and malformed values fall in (-100, 100). If a decimal
   * value leaked through, `americanToImpliedProbability` would read 1.91 as
   * "+1.91" → ~0.98 implied, corrupting de-vig math and fabricating a spurious
   * pricing edge (the root of the "Edge Index 100" board bug). Drop any price
   * that is not a valid American number so it never enters scoring; a market
   * with too few usable prices is simply skipped by the engine.
   */
  private sanitizeAmericanPrice(price: number | undefined): number | undefined {
    if (price === undefined || price === null) return undefined;
    if (!Number.isFinite(price)) return undefined;
    if (Math.abs(price) < 100) return undefined; // decimal / malformed — not American
    return price;
  }

  normalizeGames(events: OddsApiEvent[]): NormalizedGame[] {
    return events.map((event) => ({
      externalId: event.id,
      sportKey: event.sport_key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: new Date(event.commence_time),
    }));
  }

  normalizeOdds(events: OddsApiEvent[], fetchedAt: Date): NormalizedOdds[] {
    const results: NormalizedOdds[] = [];

    for (const event of events) {
      for (const bookmaker of event.bookmakers) {
        for (const market of bookmaker.markets) {
          const base: Omit<
            NormalizedOdds,
            | "homePrice"
            | "awayPrice"
            | "drawPrice"
            | "spread"
            | "homeSpreadPrice"
            | "awaySpreadPrice"
            | "total"
            | "overPrice"
            | "underPrice"
          > & Partial<NormalizedOdds> = {
            gameExternalId: event.id,
            bookmaker: bookmaker.key,
            bookmakerLastUpdate: new Date(bookmaker.last_update),
            market: this.mapMarket(market.key),
            fetchedAt,
          };

          if (market.key === "h2h") {
            const home = market.outcomes.find(
              (o) => o.name === event.home_team
            );
            const away = market.outcomes.find(
              (o) => o.name === event.away_team
            );
            const draw = market.outcomes.find((o) => o.name === "Draw");
            results.push({
              ...base,
              market: "H2H",
              homePrice: this.sanitizeAmericanPrice(home?.price),
              awayPrice: this.sanitizeAmericanPrice(away?.price),
              drawPrice: this.sanitizeAmericanPrice(draw?.price),
            });
          } else if (market.key === "spreads") {
            const home = market.outcomes.find(
              (o) => o.name === event.home_team
            );
            const away = market.outcomes.find(
              (o) => o.name === event.away_team
            );
            results.push({
              ...base,
              market: "SPREADS",
              spread: home?.point,
              // Sanitize the PRICES the same way h2h does — a leaked decimal
              // price (e.g. 1.91 when oddsFormat=american) otherwise flows raw
              // into implied-probability math and fabricates a spurious edge.
              // `spread` above is a POINT (e.g. -3.5), not a price — left as-is.
              homeSpreadPrice: this.sanitizeAmericanPrice(home?.price),
              awaySpreadPrice: this.sanitizeAmericanPrice(away?.price),
            });
          } else if (market.key === "totals") {
            const over = market.outcomes.find((o) => o.name === "Over");
            const under = market.outcomes.find((o) => o.name === "Under");
            results.push({
              ...base,
              market: "TOTALS",
              total: over?.point ?? under?.point,
              // Sanitize the PRICES (see SPREADS note); `total` is a POINT.
              overPrice: this.sanitizeAmericanPrice(over?.price),
              underPrice: this.sanitizeAmericanPrice(under?.price),
            });
          }
        }
      }
    }

    return results;
  }

  validateFreshness(fetchedAt: Date): boolean {
    const age = Date.now() - fetchedAt.getTime();
    return age < FRESHNESS_THRESHOLD_MS;
  }

  /**
   * Game ids whose UPSTREAM odds are fresh — i.e. the game's most recently-updated
   * bookmaker is within the threshold. Decided PER GAME (not a single global max across
   * the whole sport fetch), so a fresh game elsewhere in the same pull can never mask a
   * stale game. `validateFreshness(fetchedAt)` only proves we polled now; this checks each
   * bookmaker's own `last_update`. A game with no parseable upstream timestamp is omitted
   * (fail-safe: not provably fresh → treated as stale). Callers DROP games not in this set.
   */
  freshGameIds(odds: readonly NormalizedOdds[]): Set<string> {
    const cutoff = Date.now() - FRESHNESS_THRESHOLD_MS;
    const freshestByGame = new Map<string, number>();
    for (const o of odds) {
      const t = o.bookmakerLastUpdate.getTime();
      if (!Number.isFinite(t)) continue;
      const prev = freshestByGame.get(o.gameExternalId);
      if (prev === undefined || t > prev) freshestByGame.set(o.gameExternalId, t);
    }
    const fresh = new Set<string>();
    for (const [game, freshest] of freshestByGame) {
      if (freshest > cutoff) fresh.add(game);
    }
    return fresh;
  }

  /**
   * Whole-feed liveness: true iff AT LEAST ONE game has fresh upstream odds. A non-empty
   * fetch where no game is fresh is a dead/cached feed and the caller MUST stop the job.
   * Per-game dropping of individual stale games is done via `freshGameIds`. An empty set
   * is vacuously fresh (no odds to be stale). The "no stale data" invariant is enforced on
   * real upstream data age, not the local clock.
   */
  validateOddsFreshness(odds: readonly NormalizedOdds[]): boolean {
    if (odds.length === 0) return true;
    return this.freshGameIds(odds).size > 0;
  }

  normalizeScores(
    scores: OddsApiScore[]
  ): Array<{
    externalId: string;
    homeScore: number | null;
    awayScore: number | null;
    completed: boolean;
  }> {
    return scores.map((score) => {
      const homeScoreEntry = score.scores?.find(
        (s) => s.name === score.home_team
      );
      const awayScoreEntry = score.scores?.find(
        (s) => s.name === score.away_team
      );

      // A present-but-non-numeric score ("", "-", "PPD" for a postponed/
      // abandoned game) must normalize to null, NOT NaN. parseInt("PPD") is
      // NaN, and `NaN !== null` is true — so a NaN score slips the settlement
      // null-guard and mis-grades a non-game as a real WIN/LOSS, corrupting the
      // published record. Number.isFinite collapses any non-number to null,
      // which correctly leaves the pick PENDING.
      const parseScore = (entry: { score: string } | undefined): number | null => {
        if (!entry) return null;
        const n = Number.parseInt(entry.score, 10);
        return Number.isFinite(n) ? n : null;
      };

      return {
        externalId: score.id,
        homeScore: parseScore(homeScoreEntry),
        awayScore: parseScore(awayScoreEntry),
        completed: score.completed,
      };
    });
  }

  private mapMarket(key: string): "H2H" | "SPREADS" | "TOTALS" {
    switch (key) {
      case "h2h":
        return "H2H";
      case "spreads":
        return "SPREADS";
      case "totals":
        return "TOTALS";
      default:
        throw new Error(`Unknown market key: ${key}`);
    }
  }
}
