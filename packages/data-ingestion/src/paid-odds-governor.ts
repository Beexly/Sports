/**
 * Ledger-backed paid odds governor (C-109, plan 3f item 1).
 *
 * Builds the `PaidOddsGovernor` that `refreshOdds()` consults before every
 * PAID The Odds API fetch. It lives in this package (not apps/web) so that the
 * refresh loop can build it by default: the refresh-odds cron, the board-fill
 * cron, free-spine-health, the traffic heartbeat and any worker all pace the
 * paid path against the same durable budget, whether or not the caller
 * remembered to inject one. apps/web imports the same factory and only swaps
 * in its richer ESPN scoreboard adapter for the event check.
 *
 * Two inputs, both free:
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
  evaluatePaidOddsCall,
  EVENT_HORIZON_HOURS,
  PAID_CALL_MIN_INTERVAL_MS,
  PAID_CALL_PURPOSES,
} from "./odds-credit-governor.js";
import {
  loadLatestCreditObservation,
  loadLatestPaidCallAnyPurposeAt,
  loadLatestPaidCallAt,
  recordCreditObservation,
  recordPaidCall,
  reservePaidCallSlot,
  type OddsCreditLedgerDb,
} from "./odds-credit-ledger.js";
import {
  ESPN_SCOREBOARD_LIMIT,
  parseEspnScoreboardForSeed,
  SHORT_TO_ODDS_SPORT,
  type EspnSeedGame,
  type ShortSportKey,
} from "./espn-schedule-seed.js";

/**
 * The governor `refreshOdds()` consults on the paid path. Consulted only when
 * a real The Odds API key is in use; the Rundown / ESPN free paths cost no
 * credits and are never gated by it.
 */
export interface PaidOddsGovernor {
  /**
   * May this sport's paid odds fetch go out now? A positive answer has already
   * RESERVED this sport's hourly slot atomically in the ledger and written the
   * call marker for the first paid request, so concurrent callers see it
   * before the fetch and at most one of them proceeds when the hourly rule
   * binds.
   */
  decide(sportKey: string): Promise<{ readonly allow: boolean; readonly reason: string }>;
  /**
   * Append a marker for each ADDITIONAL paid request the run made beyond the
   * reserved one (a preseason leg, a Pinnacle archive request), so the ledger
   * counts every spend.
   */
  recordCall(sportKey: string, at: Date): Promise<void>;
  /**
   * Called after a paid fetch that reported x-requests-remaining. `used` is
   * x-requests-used from the same response when the caller saw it; omitted or
   * null when the header was absent (never coerced to 0).
   */
  recordCredits(observation: {
    readonly remaining: number;
    readonly used?: number | null;
    readonly observedAt: Date;
  }): Promise<void>;
}

/** The Odds API sport key to the free-spine short key (inverse of SHORT_TO_ODDS_SPORT). */
export const ODDS_KEY_TO_ESPN_SHORT: Readonly<Record<string, ShortSportKey>> = Object.fromEntries(
  (Object.entries(SHORT_TO_ODDS_SPORT) as Array<[ShortSportKey, { readonly key: string }]>).map(
    ([short, meta]) => [meta.key, short],
  ),
);

/** How far back an already-started game still counts as a live event for odds. */
export const STARTED_GRACE_HOURS = 6;

/** Free scoreboard request timeout; a slow ESPN answers null, never a skip. */
const SCOREBOARD_TIMEOUT_MS = 12_000;

/**
 * ESPN `groups` (division) selectors that widen a college board beyond its
 * default: college football defaults to FBS (`80`), `81` adds FCS; men's
 * college basketball defaults to a featured page, `50` is all of Division I.
 * Without them an FCS-only football slate or an unfeatured basketball slate
 * reads as an empty board, and an empty board is exactly what skips the paid
 * call for a live sport. Twin of `ESPN_FIXTURE_GROUPS` in
 * `packages/ingestion-pipeline/src/fixture-confirmation.ts` (and of
 * `ESPN_SCOREBOARD_GROUPS` in the app's free settlement adapter); this package
 * cannot import the pipeline, so the mapping is kept here and must stay in
 * step with it. Sports absent here return a complete default board.
 */
export const ESPN_GOVERNOR_GROUPS: Partial<Record<ShortSportKey, readonly string[]>> = {
  ncaaf: ["80", "81"],
  ncaab: ["50"],
};

/** The group requests covering a sport's full board (one default request when none). */
export function espnGovernorGroups(short: ShortSportKey): readonly (string | undefined)[] {
  const groups = ESPN_GOVERNOR_GROUPS[short];
  return groups && groups.length > 0 ? groups : [undefined];
}

function yyyymmddUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * ESPN `dates` range covering `now - STARTED_GRACE_HOURS` through
 * `now + horizonHours` in UTC days (inclusive on both ends), e.g.
 * "20260906-20260908". Starting at the grace boundary, not at `now`, keeps a
 * game that kicked off up to six hours ago on the board across UTC midnight.
 */
export function espnScoreboardDateRange(now: Date, horizonHours: number = EVENT_HORIZON_HOURS): string {
  const start = new Date(now.getTime() - STARTED_GRACE_HOURS * 3_600_000);
  const end = new Date(now.getTime() + horizonHours * 3_600_000);
  return `${yyyymmddUtc(start)}-${yyyymmddUtc(end)}`;
}

/**
 * Pure, state-aware: a game in progress ("in") counts as live; a finished game
 * ("post") never counts, however recent; otherwise the commence time must fall
 * inside [now - STARTED_GRACE_HOURS, now + horizonHours] (UTC instants).
 */
export function hasEventWithinHorizon(
  games: readonly Pick<EspnSeedGame, "commenceTime" | "state">[],
  now: Date,
  horizonHours: number = EVENT_HORIZON_HOURS,
): boolean {
  const from = now.getTime() - STARTED_GRACE_HOURS * 3_600_000;
  const to = now.getTime() + horizonHours * 3_600_000;
  return games.some((g) => {
    if (g.state === "in") return true;
    if (g.state === "post") return false;
    const t = g.commenceTime.getTime();
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

/**
 * Free scoreboard check for one sport. true / false when ESPN answered IN
 * FULL; null when the sport is not mapped or ANY required group request
 * failed (the caller proceeds). College boards are several division requests
 * (`espnGovernorGroups`), merged and deduplicated by event id: a missing
 * division must never read as an empty board, because an empty board is what
 * skips the paid call.
 */
export async function sportHasEventWithin48h(
  sportKey: string,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean | null> {
  const short = ODDS_KEY_TO_ESPN_SHORT[sportKey];
  if (!short) return null;
  const meta = SHORT_TO_ODDS_SPORT[short];
  const byId = new Map<string, EspnSeedGame>();
  for (const group of espnGovernorGroups(short)) {
    const params = new URLSearchParams({
      dates: espnScoreboardDateRange(now),
      limit: String(ESPN_SCOREBOARD_LIMIT),
    });
    if (group !== undefined) params.set("groups", group);
    const url = `https://site.api.espn.com/apis/site/v2/sports/${meta.espnPath}/scoreboard?${params.toString()}`;
    const label = group === undefined ? "free scoreboard" : `free scoreboard groups=${group}`;
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(SCOREBOARD_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Parameters<typeof parseEspnScoreboardForSeed>[1];
      for (const game of parseEspnScoreboardForSeed(short, body)) byId.set(game.externalId, game);
    } catch (err) {
      console.warn(
        `[credit-governor] ${sportKey}: ${label} unavailable, not skipping: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
  return hasEventWithinHorizon([...byId.values()], now);
}

export interface PaidOddsGovernorDeps {
  readonly db: OddsCreditLedgerDb;
  readonly now?: () => Date;
  readonly fetchImpl?: typeof fetch;
  /** Injectable for tests or a richer adapter; defaults to the ESPN check above. */
  readonly hasEventWithin48h?: (sportKey: string, now: Date) => Promise<boolean | null>;
  readonly source?: string;
  /**
   * false when `db` is the @sports/db stub client (DATABASE_URL unset): its
   * no-op `$transaction` would otherwise pass the ledger's shape check and the
   * hourly reservation would report atomic while taking no mutex. Callers with
   * access to @sports/db pass `!isStubMode()`; omitted, the ledger detects
   * from the client's shape. See `reservePaidCallSlot`.
   */
  readonly atomicCapable?: boolean;
}

/** The ledger-backed governor `refreshOdds()` consults on the paid path. */
export function buildPaidOddsGovernor(deps: PaidOddsGovernorDeps): PaidOddsGovernor {
  const now = deps.now ?? (() => new Date());
  const eventCheck =
    deps.hasEventWithin48h ??
    ((sportKey: string, at: Date) => sportHasEventWithin48h(sportKey, at, deps.fetchImpl));
  const source = deps.source ?? "refresh-odds";
  return {
    async decide(sportKey) {
      const at = now();
      const [hasEvent, lastPaidCallAt, lastPaidCallAnyPurposeAt, latest] = await Promise.all([
        eventCheck(sportKey, at),
        loadLatestPaidCallAt(deps.db, "odds", sportKey),
        loadLatestPaidCallAnyPurposeAt(deps.db, sportKey),
        loadLatestCreditObservation(deps.db),
      ]);
      const { decision, slot } = evaluatePaidOddsCall({
        remaining: latest?.remaining ?? null,
        now: at,
        purpose: "odds",
        hasEventWithin48h: hasEvent,
        freeCoversPurpose: false,
        lastPaidCallAt,
        lastPaidCallAnyPurposeAt,
        observedAt: latest?.observedAt ?? null,
      });
      if (!decision.allow) return decision;
      // The hourly slot is claimed atomically (advisory mutex + read + marker in
      // one transaction), so two overlapping runs for the same sport cannot
      // both pass the hourly rule. Pace-ok odds are not hourly-capped
      // (intervalMs 0 records the marker without ever holding); a stale-zero
      // probe is one per sport per hour across purposes.
      const reservation = await reservePaidCallSlot(deps.db, {
        sport: sportKey,
        purpose: "odds",
        now: at,
        intervalMs: slot === "none" ? 0 : PAID_CALL_MIN_INTERVAL_MS,
        checkPurposes: slot === "any-purpose" ? PAID_CALL_PURPOSES : ["odds"],
        ...(deps.atomicCapable !== undefined ? { atomicCapable: deps.atomicCapable } : {}),
      });
      if (!reservation.reserved) {
        return {
          allow: false,
          reason:
            `${decision.reason}; but this sport's hourly slot was reserved by a concurrent ` +
            `caller at ${reservation.lastAt.toISOString()}`,
        };
      }
      return decision;
    },
    async recordCall(sportKey, at) {
      await recordPaidCall(deps.db, { sport: sportKey, purpose: "odds", at: at.toISOString() });
    },
    async recordCredits(observation) {
      await recordCreditObservation(deps.db, {
        remaining: observation.remaining,
        used: observation.used ?? null,
        observedAt: observation.observedAt.toISOString(),
        source,
      });
    },
  };
}
