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
 *
 * C-357 / D15: the credit cap stays where the C-109 governor and
 * EVENT_ODDS_CREDIT_CAP put it on the plan already paid for — this module
 * never raises the cap. Markets are widened only to every key the props-HB
 * engine actually scores; sweep order puts the T-15-minute close first.
 */

export const DEFAULT_EVENT_ODDS_BOOKS = ["draftkings", "fanduel", "betmgm"] as const;
/** Mixed default when the sport is unknown. Prefer {@link defaultEventOddsMarkets}. */
export const DEFAULT_EVENT_ODDS_MARKETS = [
  "player_pass_tds",
  "player_points",
  "player_receptions",
] as const;
/**
 * Every NFL market the props-HB engine scores (C-357).
 *
 * Each key is listed on The Odds API's NFL/NCAAF/CFL player-props table
 * (https://the-odds-api.com/sports-odds-data/betting-markets.html#nfl-ncaaf-cfl-player-props-api,
 * read 2026-09-15). `player_pass_tds` and `player_receptions` were already
 * proven live in production; the rest match a props-hb-* adapter 1:1:
 *
 *   player_pass_tds            ← props-hb-pass-td.ts
 *   player_pass_yds            ← props-hb-pass-yards.ts
 *   player_pass_completions    ← props-hb-comp.ts
 *   player_pass_interceptions  ← props-hb-int.ts
 *   player_rush_yds            ← props-hb-rush.ts
 *   player_rush_attempts       ← props-hb-rush-attempts.ts
 *   player_rush_tds            ← props-hb-rush-td.ts
 *   player_receptions          ← props-hb-catch.ts / props-hb.ts
 *   player_reception_yds       ← props-hb-air-yac.ts
 *   player_reception_tds       ← props-hb-rec-td.ts
 *   player_anytime_td          ← props-hb-atd.ts (Yes/No; see prop-line-rows)
 *   player_sacks               ← props-hb-sacks.ts
 *
 * Feature-only HB modules (obs, nested, snap-exposure, adot-*, *-bind) have
 * no book market of their own and are not listed. No alternate_* ladders.
 *
 * Credits/cycle arithmetic on the existing plan (D15 / C-109; The Odds API
 * bills 1 credit × market × region — `handoff/ODDS_API_TIER_DECISION.md`
 * quoting their docs; ODDS_REGION = "us" so 1 region):
 *   - one getEventOdds call with this list costs 12 vendor credits
 *   - EVENT_ODDS_CREDIT_CAP (default 8) is a CALL cap, so a cap-8 cycle
 *     costs 8 × 12 = 96 vendor credits when EVENT_ODDS_INGEST_ENABLED=true
 *   - a full 16-game slate sweep is 16 × 12 = 192 credits (plan D15's
 *     "~13 markets ≈ 208" is the same arithmetic at 13 keys)
 *   - ingest stays INERT by default; the C-109 governor still paces the
 *     broader paid path; this module never raises the cap
 */
export const NFL_EVENT_ODDS_MARKETS = [
  "player_pass_tds",
  "player_pass_yds",
  "player_pass_completions",
  "player_pass_interceptions",
  "player_rush_yds",
  "player_rush_attempts",
  "player_rush_tds",
  "player_receptions",
  "player_reception_yds",
  "player_reception_tds",
  "player_anytime_td",
  "player_sacks",
] as const;
export const NBA_EVENT_ODDS_MARKETS = ["player_points"] as const;
/**
 * Cap is on getEventOdds CALLS (events), not markets. C-109 / D15: leave it
 * where the governor puts it — do not raise it when widening the market list.
 */
export const DEFAULT_EVENT_ODDS_CREDIT_CAP = 8;

/**
 * Minutes before kickoff in which the prop close must be captured (C-357).
 * An event whose commenceTime falls in [now, now + PROP_CLOSE_SWEEP_MINUTES]
 * is in the close window and sorts ahead of every other prop refresh.
 */
export const PROP_CLOSE_SWEEP_MINUTES = 15;

/**
 * Sport-aware live event-odds keys. NFL lists every props-HB market (C-357).
 * Does not include historical* (10× credits).
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
  /** null when the vendor response carried no usable quota header. */
  readonly remainingRequests: number | null;
  readonly usedRequests: number | null;
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
   *  T-15-close first, then sooner-first, so the credit cap does not starve
   *  the close or late kickoffs on a dense slate (e.g. Sunday 16-game).
   *  Events with a missing time sort last. */
  readonly commenceByEventId?: Record<string, Date>;
  /** Clock for the T-15 close window. Defaults to `new Date()`. Tests inject. */
  readonly now?: Date;
}

export interface EventOddsIngestReport {
  readonly enabled: boolean;
  readonly fetched: number;
  readonly skipped: number;
  readonly failed: number;
  /**
   * The latest x-requests-remaining / x-requests-used the vendor reported in
   * this batch, from a successful response OR the error a failed request
   * carried (the client parses the headers of a 402/429 too); null when no
   * response carried the header. A later header-less response never erases
   * an earlier reading.
   */
  readonly remainingRequests: number | null;
  readonly usedRequests: number | null;
  readonly reason: string;
  readonly snapshots: readonly unknown[];
}

/** Quota headers a thrown OddsApiError carries (duck-typed: this module has no client import). */
function quotaHeadersOf(err: unknown): { remainingRequests?: number; usedRequests?: number } {
  if (typeof err !== "object" || err === null) return {};
  const out: { remainingRequests?: number; usedRequests?: number } = {};
  if ("remainingRequests" in err && typeof err.remainingRequests === "number") {
    out.remainingRequests = err.remainingRequests;
  }
  if ("usedRequests" in err && typeof err.usedRequests === "number") {
    out.usedRequests = err.usedRequests;
  }
  return out;
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
 * Order event ids so the credit cap spends its first calls on the T-15-minute
 * prop close, then on nearer kickoffs (C-357). Returns a NEW array; does not
 * mutate the input.
 *
 * Buckets (stable within each):
 *   0. close-now: commenceTime in [now, now + PROP_CLOSE_SWEEP_MINUTES]
 *      — the close is the one row CLV cannot live without; it outranks every
 *      other prop refresh.
 *   1. future: commenceTime after the close window — sooner first, so late
 *      kickoffs are not preempted on a dense Sunday slate.
 *   2. past: commenceTime before now — already kicked off; the pre-kickoff
 *      close window is gone, so these never starve bucket 0.
 *   3. missing commenceTime — last, preserving input order among themselves.
 *
 * Called from `ingestEventOddsIfEnabled` to build the slice the cap will
 * actually burn on. No DB/network side effects.
 */
export function orderEventIdsForCreditCap(
  eventIds: readonly string[],
  commenceByEventId: Record<string, Date> | undefined,
  now: Date = new Date(),
): string[] {
  if (!commenceByEventId) return [...eventIds];
  const nowMs = now.getTime();
  const closeUntilMs = nowMs + PROP_CLOSE_SWEEP_MINUTES * 60_000;
  const bucketOf = (id: string): 0 | 1 | 2 | 3 => {
    const t = commenceByEventId[id];
    if (!t) return 3;
    const ms = t.getTime();
    if (ms >= nowMs && ms <= closeUntilMs) return 0;
    if (ms > closeUntilMs) return 1;
    return 2;
  };
  return [...eventIds].sort((a, b) => {
    const ba = bucketOf(a);
    const bb = bucketOf(b);
    if (ba !== bb) return ba - bb;
    const ta = commenceByEventId[a];
    const tb = commenceByEventId[b];
    if (ta && tb) return ta.getTime() - tb.getTime(); // sooner first within bucket
    return 0; // missing-time bucket is already stable in input order
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
      usedRequests: null,
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
      usedRequests: null,
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
  let usedRequests: number | null = null;
  const noteHeaders = (h: { remainingRequests?: number | null; usedRequests?: number | null }): void => {
    if (h.remainingRequests != null) remainingRequests = h.remainingRequests;
    if (h.usedRequests != null) usedRequests = h.usedRequests;
  };

  // T-15-close first, then kickoff-sorted, so the credit cap spends its
  // first calls on the close and does not starve late games on a dense slate.
  const orderedIds = orderEventIdsForCreditCap(
    args.eventIds,
    args.commenceByEventId,
    args.now ?? new Date(),
  );
  for (const eventId of orderedIds) {
    if (fetched >= cap) break;
    try {
      const result = await args.client.getEventOdds(args.sportKey, eventId, markets, {
        bookmakers,
      });
      snapshots.push(result.data);
      fetched += 1;
      noteHeaders(result);
      if (result.remainingRequests !== null && result.remainingRequests <= 0) break;
    } catch (err) {
      failed += 1;
      // A failed request still spent a credit and its error still carries the
      // vendor's quota headers when the vendor answered.
      noteHeaders(quotaHeadersOf(err));
    }
  }

  const considered = fetched + failed;
  return {
    enabled: true,
    fetched,
    skipped: Math.max(0, args.eventIds.length - considered),
    failed,
    remainingRequests,
    usedRequests,
    reason: `fetched ${fetched}/${cap} (failed ${failed})`,
    snapshots,
  };
}
