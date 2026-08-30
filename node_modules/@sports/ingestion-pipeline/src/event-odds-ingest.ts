/**
 * Credit-capped licensed event-odds (player props) fetch.
 *
 * INERT BY DEFAULT. `ingestEventOddsIfEnabled` is the only production entry.
 * It no-ops unless EVENT_ODDS_INGEST_ENABLED=true. Hard-stops after
 * EVENT_ODDS_CREDIT_CAP getEventOdds calls (default 8). Never calls
 * historical endpoints (10× credits). Never throws — a fetch error is
 * recorded and the cycle continues, so props cannot block featured odds.
 *
 * Books: draftkings, fanduel, betmgm — already on the licensed Odds API plan.
 * Persistence is the caller's job (LINE_ARCHIVE / Odds rows). This module
 * only fetches. Schema is sealed; we do not invent an EventOdds table.
 */

export const DEFAULT_EVENT_ODDS_BOOKS = ["draftkings", "fanduel", "betmgm"] as const;
/** Mixed default when the sport is unknown. Prefer {@link defaultEventOddsMarkets}. */
export const DEFAULT_EVENT_ODDS_MARKETS = [
  "player_pass_tds",
  "player_points",
  "player_receptions",
] as const;
export const NFL_EVENT_ODDS_MARKETS = ["player_pass_tds", "player_receptions"] as const;
export const NBA_EVENT_ODDS_MARKETS = ["player_points"] as const;
export const DEFAULT_EVENT_ODDS_CREDIT_CAP = 8;

/**
 * Sport-aware live event-odds keys. Receptions is the props-HB validated
 * count. Does not include historical* (10× credits).
 */
export function defaultEventOddsMarkets(sportKey: string): readonly string[] {
  const k = sportKey.toLowerCase();
  if (k.includes("americanfootball") || k.includes("nfl") || k.includes("ncaaf")) {
    return NFL_EVENT_ODDS_MARKETS;
  }
  if (k.includes("basketball") || k.includes("nba") || k.includes("ncaab")) {
    return NBA_EVENT_ODDS_MARKETS;
  }
  return DEFAULT_EVENT_ODDS_MARKETS;
}

export interface EventOddsFetchResult<T = unknown> {
  readonly data: T;
  readonly remainingRequests: number;
  readonly usedRequests: number;
}

export interface EventOddsClient {
  getEventOdds(
    sportKey: string,
    eventId: string,
    markets: readonly string[],
    options?: { bookmakers?: readonly string[] },
  ): Promise<EventOddsFetchResult>;
}

export interface EventOddsIngestArgs {
  readonly client: EventOddsClient;
  readonly sportKey: string;
  readonly eventIds: readonly string[];
  readonly env?: Record<string, string | undefined>;
  readonly markets?: readonly string[];
  readonly bookmakers?: readonly string[];
  /** Optional kickoff time per event id. When provided, events are processed
   *  sooner-first so the credit cap does not starve late kickoffs on a dense
   *  slate (e.g. Sunday 16-game). Events with a missing time sort last. */
  readonly commenceByEventId?: Record<string, Date>;
}

export interface EventOddsIngestReport {
  readonly enabled: boolean;
  readonly fetched: number;
  readonly skipped: number;
  readonly failed: number;
  readonly remainingRequests: number | null;
  readonly reason: string;
  readonly snapshots: readonly unknown[];
}

export function isEventOddsIngestEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["EVENT_ODDS_INGEST_ENABLED"] === "true";
}

export function eventOddsCreditCap(
  env: Record<string, string | undefined> = process.env,
): number {
  const n = Number(env["EVENT_ODDS_CREDIT_CAP"]);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return DEFAULT_EVENT_ODDS_CREDIT_CAP;
}

/**
 * Order event ids so the credit cap does not starve late kickoffs on a dense
 * slate (Sunday 16-game). Returns a NEW array; does not mutate the input.
 *
 * Sort: sooner commenceTime first. Events with a missing time sort AFTER all
 * events with known times, preserving input order among themselves (stable).
 *
 * Called from `process-sport.ts` to build the slice the cap will actually
 * burn on — early games first, so late games are not preempted.
 *
 * Tests: sooner first; missing times last (stable). No DB/network side effects.
 */
export function orderEventIdsForCreditCap(
  eventIds: readonly string[],
  commenceByEventId: Record<string, Date> | undefined,
): string[] {
  if (!commenceByEventId) return [...eventIds];
  return [...eventIds].sort((a, b) => {
    const ta = commenceByEventId[a];
    const tb = commenceByEventId[b];
    if (ta && tb) return ta.getTime() - tb.getTime(); // sooner first
    if (ta && !tb) return -1; // known before unknown
    if (!ta && tb) return 1; // unknown after known
    return 0; // both missing — stable, keep input order
  });
}

/**
 * Fetch event-odds for up to `creditCap` event ids. Default OFF.
 * Callers must not pass historical dates — this path is live-slate only.
 */
export async function ingestEventOddsIfEnabled(
  args: EventOddsIngestArgs,
): Promise<EventOddsIngestReport> {
  const env = args.env ?? process.env;
  if (!isEventOddsIngestEnabled(env)) {
    return {
      enabled: false,
      fetched: 0,
      skipped: args.eventIds.length,
      failed: 0,
      remainingRequests: null,
      reason: "EVENT_ODDS_INGEST_ENABLED is not true — no credits spent.",
      snapshots: [],
    };
  }

  const cap = eventOddsCreditCap(env);
  if (cap <= 0 || args.eventIds.length === 0) {
    return {
      enabled: true,
      fetched: 0,
      skipped: args.eventIds.length,
      failed: 0,
      remainingRequests: null,
      reason: cap <= 0 ? "credit cap is 0" : "no events on the slate",
      snapshots: [],
    };
  }

  const markets = args.markets ?? defaultEventOddsMarkets(args.sportKey);
  const bookmakers = args.bookmakers ?? DEFAULT_EVENT_ODDS_BOOKS;
  const snapshots: unknown[] = [];
  let fetched = 0;
  let failed = 0;
  let remainingRequests: number | null = null;

  // Kickoff-sorted so the credit cap does not starve late games on a dense slate.
  const orderedIds = orderEventIdsForCreditCap(args.eventIds, args.commenceByEventId);
  for (const eventId of orderedIds) {
    if (fetched >= cap) break;
    try {
      const result = await args.client.getEventOdds(args.sportKey, eventId, markets, {
        bookmakers,
      });
      snapshots.push(result.data);
      fetched += 1;
      remainingRequests = result.remainingRequests;
      if (remainingRequests !== null && remainingRequests <= 0) break;
    } catch {
      failed += 1;
    }
  }

  const considered = fetched + failed;
  return {
    enabled: true,
    fetched,
    skipped: Math.max(0, args.eventIds.length - considered),
    failed,
    remainingRequests,
    reason: `fetched ${fetched}/${cap} (failed ${failed})`,
    snapshots,
  };
}
