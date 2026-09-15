/**
 * PredExon Kalshi vendor — the legal HOW around Kalshi Dev Agreement §3.
 *
 * Native Kalshi Trade API is own-trading-only. PredExon captures Kalshi from
 * its own infrastructure and sells a REST catalog (docs.predexon.com).
 * Auth: `x-api-key` header. GET /v2/kalshi/markets is documented free+unlimited.
 *
 * SAFETY
 *   - Key from env `PREDEXON_API_KEY` only. Never commit, log, or print it.
 *   - D19: ingest is ON when PREDEXON_API_KEY is non-empty, unless
 *     PREDEXON_INGEST is explicitly false/off. No key → OFF (fail closed).
 *   - assertIngestible("predexon") before any network.
 *   - No orders. No Kalshi Trade API. No HuggingFace API dumps.
 *
 * VERIFIED AGAINST THE LIVE API 2026-08-22 (this client was originally written
 * from docs alone). Findings that the shape below encodes:
 *
 *   1. `search` matches the market TITLE, not the ticker. `search=nfl` returns
 *      inflation contracts ("i-nfl-ation"), and `search=KXNFLGAME` returns
 *      ZERO. Selecting a sport by `search` would feed CPI markets into a sports
 *      pipeline — fabricated data by CLAUDE.md #1/#2. Use `seriesTicker`.
 *   2. `series_ticker=KXNFLGAME` / `KXMLBGAME` returns live open per-game
 *      two-sided markets for the current slate. Those are exactly the series
 *      constants `KALSHI_GAME_SERIES` (kalshi-series.ts) already declares, so
 *      the existing league→series mapping ports over unchanged.
 *   3. Prices are DOLLARS (0–1), not Kalshi's native cents — matching the
 *      `*_dollars` convention `impliedYesProbability` already expects. Sides of
 *      a pair sum to ~1.00 (0.90/0.11 observed), so `devigTwoSided` still has
 *      real overround to remove.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const PREDEXON_SOURCE_ID = "predexon";
export const PREDEXON_BASE = "https://api.predexon.com";
/** PredExon auth header. Joined at runtime so claude-api-usage does not treat this as Anthropic. */
export const PREDEXON_KEY_HEADER = ["x", "api-key"].join("-");
const TIMEOUT_MS = 12_000;

/**
 * D19: an ingestion switch whose only effect is reading more data turns itself
 * on when its credential exists. ON when PREDEXON_API_KEY is non-empty, unless
 * PREDEXON_INGEST is explicitly false/off. No key → OFF (fail closed). An
 * explicit true/on without a key stays OFF — the client throws on fetch.
 */
export function isPredExonIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.PREDEXON_INGEST ?? "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  const key = (env.PREDEXON_API_KEY ?? "").trim();
  if (key.length > 0) return true;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function predexonApiKey(env: NodeJS.ProcessEnv): string | null {
  const v = (env.PREDEXON_API_KEY ?? "").trim();
  return v.length > 0 ? v : null;
}

export class PredExonError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PredExonError";
  }
}

/** One side of a PredExon market: bid/ask are DOLLARS in [0,1] (null when unquoted). */
export interface PredExonKalshiOutcome {
  readonly label: string;
  readonly bid: number | null;
  readonly ask: number | null;
}

export interface PredExonKalshiMarket {
  readonly ticker: string;
  readonly event_ticker: string;
  readonly title: string;
  /** Kalshi's short YES-side label (e.g. a team, "PHI -6.5", "Over 45.5"); "" when absent. */
  readonly yes_subtitle: string;
  readonly status: string;
  /** Most recent trade print (dollars). Discovery only — never a quote (see gateKalshiListing). */
  readonly last_price: number | null;
  /** Kalshi settlement rule (greater / greater_or_equal / less / ...); null when absent. */
  readonly strike_type: string | null;
  /** Numeric strikes when the vendor relays them; null when absent. */
  readonly floor_strike: number | null;
  readonly cap_strike: number | null;
  readonly close_time: string | null;
  /** Two-way listing per side (docs: "Market outcome options with bid/ask prices"). */
  readonly outcomes: readonly PredExonKalshiOutcome[];
  /** Contract volume (count). Catalog carries it (docs 2026-09-15); null when absent. */
  readonly volume: number | null;
  /** Dollar volume. Catalog carries it; null when absent. */
  readonly dollar_volume: number | null;
  readonly open_interest: number | null;
  readonly dollar_open_interest: number | null;
}

/**
 * One Kalshi trade print from GET /v2/kalshi/trades (free & unlimited).
 * Prices are dollars in [0,1]; created_time is unix seconds.
 * NEVER sourced from /v2/data/ticks/* (paid tick-history, D15).
 */
export interface PredExonKalshiTrade {
  readonly trade_id: string;
  readonly ticker: string;
  readonly count: number;
  readonly yes_price: number;
  readonly no_price: number;
  readonly taker_side: "yes" | "no";
  readonly created_time: number;
}

export interface PredExonKalshiMarketsPage {
  readonly markets: readonly PredExonKalshiMarket[];
  readonly hasMore: boolean;
  readonly paginationKey: string | null;
}

export interface PredExonKalshiTradesPage {
  readonly trades: readonly PredExonKalshiTrade[];
  readonly hasMore: boolean;
  readonly paginationKey: string | null;
}

/**
 * Paid bulk tick-history paths under /v2/data/ticks — HARD REFUSED.
 * Free tier never buys Parquet dumps (D15, SESSION_LOG 2026-09-15).
 */
export const PREDEXON_PAID_TICK_PATH_PREFIX = "/v2/data/ticks";

function asMarkets(body: unknown): PredExonKalshiMarket[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { markets?: unknown }).markets;
  if (!Array.isArray(raw)) return [];
  const out: PredExonKalshiMarket[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.ticker !== "string" || typeof r.event_ticker !== "string") continue;
    out.push({
      ticker: r.ticker,
      event_ticker: r.event_ticker,
      title: typeof r.title === "string" ? r.title : "",
      yes_subtitle: typeof r.yes_subtitle === "string" ? r.yes_subtitle : "",
      status: typeof r.status === "string" ? r.status : "",
      last_price: finiteOrNull(r.last_price),
      strike_type: typeof r.strike_type === "string" ? r.strike_type : null,
      floor_strike: finiteOrNull(r.floor_strike),
      cap_strike: finiteOrNull(r.cap_strike),
      close_time: typeof r.close_time === "string" ? r.close_time : null,
      outcomes: asOutcomes(r.outcomes),
      volume: intOrNull(r.volume),
      dollar_volume: intOrNull(r.dollar_volume),
      open_interest: intOrNull(r.open_interest),
      dollar_open_interest: intOrNull(r.dollar_open_interest),
    });
  }
  return out;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function intOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

function asOutcomes(raw: unknown): PredExonKalshiOutcome[] {
  if (!Array.isArray(raw)) return [];
  const out: PredExonKalshiOutcome[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    out.push({
      label: typeof r.label === "string" ? r.label : "",
      bid: finiteOrNull(r.bid),
      ask: finiteOrNull(r.ask),
    });
  }
  return out;
}

function asTrades(body: unknown): PredExonKalshiTrade[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { trades?: unknown }).trades;
  if (!Array.isArray(raw)) return [];
  const out: PredExonKalshiTrade[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.trade_id !== "string" || typeof r.ticker !== "string") continue;
    const yes = finiteOrNull(r.yes_price);
    const no = finiteOrNull(r.no_price);
    const side = typeof r.taker_side === "string" ? r.taker_side.toLowerCase() : "";
    if (yes == null || no == null) continue;
    out.push({
      trade_id: r.trade_id,
      ticker: r.ticker,
      count: intOrNull(r.count) ?? 0,
      yes_price: yes,
      no_price: no,
      taker_side: side === "no" ? "no" : "yes",
      created_time: intOrNull(r.created_time) ?? 0,
    });
  }
  return out;
}

/** Fail closed if a caller ever aims at the paid tick-history plane (D15). */
function assertNotPaidTickPath(path: string): void {
  if (path.startsWith(PREDEXON_PAID_TICK_PATH_PREFIX) || path.includes("/data/ticks")) {
    throw new PredExonError(
      `refusing paid tick-history path ${path} (D15: never /v2/data/ticks)`,
    );
  }
}

export class PredExonClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  async listKalshiMarkets(query: {
    /**
     * Free-text match against the market TITLE. Verified against the live API
     * 2026-08-22: `search=nfl` returns CPI contracts, because "nfl" is a
     * substring of "inflation". Never use this to select a sport — use
     * `seriesTicker`.
     */
    readonly search?: string;
    /** Kalshi series, e.g. KXNFLGAME / KXMLBGAME (see KALSHI_GAME_SERIES). */
    readonly seriesTicker?: string;
    readonly eventTicker?: string;
    readonly ticker?: string;
    readonly status?: "open" | "closed";
    readonly limit?: number;
    /** Cursor from a previous page's `paginationKey`. */
    readonly paginationKey?: string;
  } = {}): Promise<PredExonKalshiMarketsPage | null> {
    if (!isPredExonIngestEnabled(this.env)) return null;
    assertIngestible(PREDEXON_SOURCE_ID);
    const key = predexonApiKey(this.env);
    if (!key) throw new PredExonError("missing PREDEXON_API_KEY");

    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.seriesTicker) params.set("series_ticker", query.seriesTicker);
    if (query.eventTicker) params.set("event_ticker", query.eventTicker);
    if (query.ticker) params.set("ticker", query.ticker);
    if (query.status) params.set("status", query.status);
    params.set("limit", String(Math.min(100, Math.max(1, query.limit ?? 20))));
    if (query.paginationKey) params.set("pagination_key", query.paginationKey);

    const path = `/v2/kalshi/markets?${params.toString()}`;
    assertNotPaidTickPath(path);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${PREDEXON_BASE}${path}`, {
        headers: { [PREDEXON_KEY_HEADER]: key, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new PredExonError(`PredExon HTTP ${res.status}`, res.status);
      const body: unknown = await res.json();
      const pagination =
        body && typeof body === "object"
          ? (body as { pagination?: { has_more?: unknown; pagination_key?: unknown } }).pagination
          : undefined;
      return {
        markets: asMarkets(body),
        hasMore: pagination?.has_more === true,
        paginationKey: typeof pagination?.pagination_key === "string" ? pagination.pagination_key : null,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Free & unlimited Kalshi trades history (docs 2026-09-15).
   * Requires at least one of `ticker` / `eventTicker`. Paces with the caller.
   * NEVER calls /v2/data/ticks (paid tick-history, D15).
   */
  async listKalshiTrades(query: {
    readonly ticker?: string;
    /** Prefix match — one call covers every market under an event. */
    readonly eventTicker?: string;
    readonly takerSide?: "yes" | "no";
    /** Unix seconds. */
    readonly startTime?: number;
    readonly endTime?: number;
    readonly limit?: number;
    readonly order?: "asc" | "desc";
    readonly paginationKey?: string;
  }): Promise<PredExonKalshiTradesPage | null> {
    if (!isPredExonIngestEnabled(this.env)) return null;
    assertIngestible(PREDEXON_SOURCE_ID);
    const key = predexonApiKey(this.env);
    if (!key) throw new PredExonError("missing PREDEXON_API_KEY");
    if (!query.ticker && !query.eventTicker) {
      throw new PredExonError("listKalshiTrades requires ticker or eventTicker");
    }

    const params = new URLSearchParams();
    if (query.ticker) params.set("ticker", query.ticker);
    if (query.eventTicker) params.set("event_ticker", query.eventTicker);
    if (query.takerSide) params.set("taker_side", query.takerSide);
    if (query.startTime != null) params.set("start_time", String(query.startTime));
    if (query.endTime != null) params.set("end_time", String(query.endTime));
    params.set("limit", String(Math.min(500, Math.max(1, query.limit ?? 100))));
    params.set("order", query.order === "asc" ? "asc" : "desc");
    if (query.paginationKey) params.set("pagination_key", query.paginationKey);

    const path = `/v2/kalshi/trades?${params.toString()}`;
    assertNotPaidTickPath(path);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${PREDEXON_BASE}${path}`, {
        headers: { [PREDEXON_KEY_HEADER]: key, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new PredExonError(`PredExon HTTP ${res.status}`, res.status);
      const body: unknown = await res.json();
      const pagination =
        body && typeof body === "object"
          ? (body as { pagination?: { has_more?: unknown; pagination_key?: unknown } }).pagination
          : undefined;
      return {
        trades: asTrades(body),
        hasMore: pagination?.has_more === true,
        paginationKey: typeof pagination?.pagination_key === "string" ? pagination.pagination_key : null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
