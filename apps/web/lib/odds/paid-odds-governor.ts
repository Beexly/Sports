/**
 * Paid odds governor for the refresh-odds cron (C-109, plan 3f item 1).
 *
 * The ledger-backed factory itself lives in `@sports/data-ingestion`
 * (`buildPaidOddsGovernor`), where `refreshOdds()` builds it by default for
 * every caller that injects none (board-fill, free-spine-health, the traffic
 * heartbeat). This module is the cron route's flavour of it: the same ledger
 * rules, with the free ESPN scoreboard read through the app's cleared
 * free-spine adapter (`fetchEspnScoreboard`, group-aware for college football)
 * instead of the package's plain scoreboard fetch.
 *
 *   1. The free ESPN public scoreboard (cleared, facts only): does the sport
 *      have any event in the next EVENT_HORIZON_HOURS? Out-of-season sports
 *      (NBA, NCAAB, NHL in September) answer no and cost nothing. A scoreboard
 *      failure answers null, which is never a reason to skip: a transient ESPN
 *      outage must not blank the board.
 *   2. The durable credit ledger (append-only JarvisMemoryEvent rows): the
 *      latest x-requests-remaining and this sport's latest paid odds call, fed
 *      to the pure `decidePaidOddsCall` reserve rule.
 *
 * Nothing here changes MIN_BOOKMAKERS, a gate, or a cron schedule.
 */

import {
  buildPaidOddsGovernor as buildLedgerBackedGovernor,
  espnScoreboardDateRange,
  EVENT_HORIZON_HOURS,
  STARTED_GRACE_HOURS,
  type PaidOddsGovernor,
  type PaidOddsGovernorDeps,
} from "@sports/data-ingestion";
import { isStubMode } from "@sports/db";
import { fetchEspnScoreboard, type NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";
import type { Sport } from "@/lib/data-sources/source-router";

export { espnScoreboardDateRange };
export type { PaidOddsGovernorDeps };

/** The Odds API sport key to the free-spine sport (same map as the free settlement runner). */
export const ODDS_KEY_TO_ESPN_SPORT: Readonly<Record<string, Sport>> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  basketball_ncaab: "ncaab",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  soccer_usa_mls: "mls",
};

/**
 * Pure, state-aware: a game in progress ("in") counts as live; a finished game
 * ("post") never counts, however recent; otherwise the start time must fall
 * inside [now - STARTED_GRACE_HOURS, now + horizonHours] (UTC instants).
 */
export function hasEventWithinHorizon(
  games: readonly Pick<NormalizedGame, "startTime" | "state">[],
  now: Date,
  horizonHours: number = EVENT_HORIZON_HOURS,
): boolean {
  const from = now.getTime() - STARTED_GRACE_HOURS * 3_600_000;
  const to = now.getTime() + horizonHours * 3_600_000;
  return games.some((g) => {
    if (g.state === "in") return true;
    if (g.state === "post") return false;
    const t = Date.parse(g.startTime);
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

/**
 * Free scoreboard check for one sport through the app's cleared ESPN adapter.
 * true / false when ESPN answered in full; null when the sport is not mapped
 * or ANY part of the fetch failed (the caller proceeds). `requireAllGroups`
 * matters for college football and basketball, whose boards are several
 * division requests: a missing division must never read as an empty board,
 * because an empty board is what skips the paid call.
 */
export async function sportHasEventWithin48h(
  sportKey: string,
  now: Date,
  fetchImpl?: typeof fetch,
): Promise<boolean | null> {
  const sport = ODDS_KEY_TO_ESPN_SPORT[sportKey];
  if (!sport) return null;
  try {
    const games = await fetchEspnScoreboard(sport, {
      dates: espnScoreboardDateRange(now),
      requireAllGroups: true,
      ...(fetchImpl ? { fetchImpl } : {}),
    });
    return hasEventWithinHorizon(games, now);
  } catch (err) {
    console.warn(
      `[credit-governor] ${sportKey}: free scoreboard unavailable, not skipping: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * The governor the refresh-odds cron route injects into `refreshOdds()`: the
 * shared ledger-backed factory with this module's ESPN adapter as the event
 * check (an explicit `hasEventWithin48h` in deps still wins, for tests) and
 * the stub-client flag the ledger cannot compute itself: the stub Prisma
 * client (DATABASE_URL unset) answers `$transaction` with a no-op, so its
 * hourly reservation must run the warned non-atomic path, never report atomic.
 */
export function buildPaidOddsGovernor(deps: PaidOddsGovernorDeps): PaidOddsGovernor {
  return buildLedgerBackedGovernor({
    ...deps,
    hasEventWithin48h:
      deps.hasEventWithin48h ??
      ((sportKey: string, at: Date) => sportHasEventWithin48h(sportKey, at, deps.fetchImpl)),
    atomicCapable: deps.atomicCapable ?? !isStubMode(),
  });
}
