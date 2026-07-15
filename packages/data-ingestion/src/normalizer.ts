import type {
  OddsApiEvent,
  OddsApiScore,
  NormalizedGame,
  NormalizedOdds,
} from "@sports/types";
import { normalizeAmericanOdds, normalizeMarketPoint } from "@sports/types";
import { FRESHNESS_THRESHOLD_MS } from "./config.js";
import { freshnessMode, resolveFreshnessThresholdMs } from "./freshness-schedule.js";

// Clock-skew allowance for UPSTREAM timestamps. A bookmaker `last_update` a few
// minutes ahead of our host clock is normal (server clocks drift); one that is
// HOURS or DAYS in the future is corrupt/poisoned and must NOT be trusted as
// fresh. Rows beyond this ceiling are treated as not-provably-fresh — the same
// fail-safe applied to an unparseable timestamp — so a future-dated row can
// neither manufacture a fake-fresh signal nor keep a stale game/dead feed
// classified live.
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

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
    return normalizeAmericanOdds(price)?.normalized;
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
            // Bookmaker-level last_update, falling back to the market-level one.
            // Both are UPSTREAM timestamps (never the local clock, preserving the
            // anti-tautology freshness design); some payloads omit the bookmaker-
            // level field, and without the fallback every row parsed as Invalid
            // Date -> every game dropped as "not provably fresh" -> the whole run
            // failed "Upstream odds are stale" even on a live slate.
            bookmakerLastUpdate: new Date(bookmaker.last_update ?? market.last_update),
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
            const homePrice = this.sanitizeAmericanPrice(home?.price);
            const awayPrice = this.sanitizeAmericanPrice(away?.price);
            const drawPrice = this.sanitizeAmericanPrice(draw?.price);
            if (
              homePrice === undefined ||
              awayPrice === undefined ||
              (draw !== undefined && drawPrice === undefined)
            ) {
              continue;
            }
            results.push({
              ...base,
              market: "H2H",
              homePrice,
              awayPrice,
              drawPrice,
            });
          } else if (market.key === "spreads") {
            const home = market.outcomes.find(
              (o) => o.name === event.home_team
            );
            const away = market.outcomes.find(
              (o) => o.name === event.away_team
            );
            const homePoint = normalizeMarketPoint(
              "SPREAD_POINTS",
              event.sport_key,
              home?.point,
            );
            const awayPoint = normalizeMarketPoint(
              "SPREAD_POINTS",
              event.sport_key,
              away?.point,
            );
            const homeSpreadPrice = this.sanitizeAmericanPrice(home?.price);
            const awaySpreadPrice = this.sanitizeAmericanPrice(away?.price);
            if (
              !homePoint ||
              !awayPoint ||
              homePoint.normalized !== -awayPoint.normalized ||
              homeSpreadPrice === undefined ||
              awaySpreadPrice === undefined
            ) {
              continue;
            }
            results.push({
              ...base,
              market: "SPREADS",
              spread: homePoint.normalized,
              homeSpreadPrice,
              awaySpreadPrice,
            });
          } else if (market.key === "totals") {
            const over = market.outcomes.find((o) => o.name === "Over");
            const under = market.outcomes.find((o) => o.name === "Under");
            const overPoint = normalizeMarketPoint(
              "TOTAL_POINTS",
              event.sport_key,
              over?.point,
            );
            const underPoint = normalizeMarketPoint(
              "TOTAL_POINTS",
              event.sport_key,
              under?.point,
            );
            const overPrice = this.sanitizeAmericanPrice(over?.price);
            const underPrice = this.sanitizeAmericanPrice(under?.price);
            if (
              !overPoint ||
              !underPoint ||
              overPoint.normalized !== underPoint.normalized ||
              overPrice === undefined ||
              underPrice === undefined
            ) {
              continue;
            }
            results.push({
              ...base,
              market: "TOTALS",
              total: overPoint.normalized,
              overPrice,
              underPrice,
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
  freshGameIds(
    odds: readonly NormalizedOdds[],
    opts?: {
      /** externalId -> commence time; enables the time-to-game dynamic gate. */
      commenceTimeByGame?: ReadonlyMap<string, Date>;
      now?: Date;
    },
  ): Set<string> {
    const now = opts?.now ?? new Date();
    const futureCeiling = now.getTime() + MAX_CLOCK_SKEW_MS;
    const freshestByGame = new Map<string, number>();
    for (const o of odds) {
      const t = o.bookmakerLastUpdate.getTime();
      if (!Number.isFinite(t)) continue;
      // Implausible future timestamp (corrupt/poisoned upstream row): not
      // provably fresh. Skip it exactly like an unparseable row so it can
      // neither supply a fake-fresh signal nor mask a genuinely stale game.
      if (t > futureCeiling) continue;
      const prev = freshestByGame.get(o.gameExternalId);
      if (prev === undefined || t > prev) freshestByGame.set(o.gameExternalId, t);
    }
    const fresh = new Set<string>();
    for (const [game, freshest] of freshestByGame) {
      // Per-game threshold: under ODDS_FRESHNESS_MODE=dynamic a game near
      // first pitch demands a fresher line than one a day out (never looser
      // than the fixed ceiling). Without a commence time: fixed threshold.
      const threshold = resolveFreshnessThresholdMs(
        opts?.commenceTimeByGame?.get(game),
        now,
      );
      if (freshest > now.getTime() - threshold) fresh.add(game);
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
  validateOddsFreshness(
    odds: readonly NormalizedOdds[],
    opts?: { commenceTimeByGame?: ReadonlyMap<string, Date>; now?: Date },
  ): boolean {
    if (odds.length === 0) return true;
    return this.freshGameIds(odds, opts).size > 0;
  }

  /**
   * Why did (or would) the freshness gate reject this feed? Pure observability:
   * the threshold in effect at runtime, row/game counts, how many rows carried
   * an unparseable upstream timestamp, and the age of the newest parseable one.
   * Callers embed this in the "Upstream odds are stale" error so a failing prod
   * run is self-diagnosing (env-var not effective vs. shape drift vs. genuinely
   * old lines) instead of a bare one-liner.
   */
  freshnessDiagnostics(odds: readonly NormalizedOdds[]): {
    thresholdHours: number;
    mode: "fixed" | "dynamic";
    rows: number;
    games: number;
    unparseableRows: number;
    futureDatedRows: number;
    newestAgeMinutes: number | null;
  } {
    const now = Date.now();
    const futureCeiling = now + MAX_CLOCK_SKEW_MS;
    const games = new Set<string>();
    let unparseableRows = 0;
    let futureDatedRows = 0;
    let newest = Number.NEGATIVE_INFINITY;
    for (const o of odds) {
      games.add(o.gameExternalId);
      const t = o.bookmakerLastUpdate.getTime();
      if (!Number.isFinite(t)) {
        unparseableRows++;
        continue;
      }
      // Implausible future timestamp: counted separately and excluded from the
      // newest-age readout so a poisoned +10-day row can't report a bogus
      // (negative-minute) "newest line age" that reads as freshly updated.
      if (t > futureCeiling) {
        futureDatedRows++;
        continue;
      }
      if (t > newest) newest = t;
    }
    return {
      thresholdHours: FRESHNESS_THRESHOLD_MS / (60 * 60 * 1000),
      mode: freshnessMode(),
      rows: odds.length,
      games: games.size,
      unparseableRows,
      futureDatedRows,
      newestAgeMinutes: Number.isFinite(newest)
        ? Math.round((now - newest) / 60_000)
        : null,
    };
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
