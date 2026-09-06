/**
 * Paid odds governor for the refresh-odds cron (C-109, plan 3f item 1).
 *
 * Builds the `PaidOddsGovernor` that `refreshOdds()` consults before every
 * PAID The Odds API fetch. Two inputs, both free:
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
  decidePaidOddsCall,
  EVENT_HORIZON_HOURS,
  loadLatestCreditObservation,
  loadLatestPaidCallAt,
  recordCreditObservation,
  recordPaidCall,
  type OddsCreditLedgerDb,
} from "@sports/data-ingestion";
import type { PaidOddsGovernor } from "@sports/ingestion-pipeline";
import { fetchEspnScoreboard, type NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";
import type { Sport } from "@/lib/data-sources/source-router";

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

/** How far back an already-started game still counts as a live event for odds. */
const STARTED_GRACE_HOURS = 6;

function yyyymmddUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * ESPN `dates` range covering `now` through `now + horizonHours` in UTC days
 * (inclusive on both ends), e.g. "20260906-20260908".
 */
export function espnScoreboardDateRange(now: Date, horizonHours: number = EVENT_HORIZON_HOURS): string {
  const end = new Date(now.getTime() + horizonHours * 3_600_000);
  return `${yyyymmddUtc(now)}-${yyyymmddUtc(end)}`;
}

/** Pure: any game in progress, or starting within the horizon (UTC instants). */
export function hasEventWithinHorizon(
  games: readonly Pick<NormalizedGame, "startTime" | "state">[],
  now: Date,
  horizonHours: number = EVENT_HORIZON_HOURS,
): boolean {
  const from = now.getTime() - STARTED_GRACE_HOURS * 3_600_000;
  const to = now.getTime() + horizonHours * 3_600_000;
  return games.some((g) => {
    if (g.state === "in") return true;
    const t = Date.parse(g.startTime);
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

/**
 * Free scoreboard check for one sport. true / false when ESPN answered; null
 * when the sport is not mapped or the fetch failed (the caller proceeds).
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

export interface PaidOddsGovernorDeps {
  readonly db: OddsCreditLedgerDb;
  readonly now?: () => Date;
  readonly fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to the live ESPN check. */
  readonly hasEventWithin48h?: (sportKey: string, now: Date) => Promise<boolean | null>;
  readonly source?: string;
}

/** The governor `refreshOdds()` consults on the paid path. */
export function buildPaidOddsGovernor(deps: PaidOddsGovernorDeps): PaidOddsGovernor {
  const now = deps.now ?? (() => new Date());
  const eventCheck =
    deps.hasEventWithin48h ??
    ((sportKey: string, at: Date) => sportHasEventWithin48h(sportKey, at, deps.fetchImpl));
  const source = deps.source ?? "refresh-odds";
  return {
    async decide(sportKey) {
      const at = now();
      const [hasEvent, lastPaidCallAt, latest] = await Promise.all([
        eventCheck(sportKey, at),
        loadLatestPaidCallAt(deps.db, "odds", sportKey),
        loadLatestCreditObservation(deps.db),
      ]);
      return decidePaidOddsCall({
        remaining: latest?.remaining ?? null,
        now: at,
        purpose: "odds",
        hasEventWithin48h: hasEvent,
        freeCoversPurpose: false,
        lastPaidCallAt,
        observedAt: latest?.observedAt ?? null,
      });
    },
    async recordCall(sportKey, at) {
      await recordPaidCall(deps.db, { sport: sportKey, purpose: "odds", at: at.toISOString() });
    },
    async recordCredits(observation) {
      await recordCreditObservation(deps.db, {
        remaining: observation.remaining,
        used: null,
        observedAt: observation.observedAt.toISOString(),
        source,
      });
    },
  };
}
