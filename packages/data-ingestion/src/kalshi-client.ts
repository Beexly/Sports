/**
 * Kalshi fair-value client — a READ-ONLY market-data source for Closing-Line
 * Value (CLV), the make-or-break credibility metric (see prediction-engine/clv.ts).
 *
 * WHY KALSHI: Kalshi is a regulated event-contract exchange. Its public market
 * prices are market-implied probabilities with a near-zero overround (~0–0.5% vs
 * a sportsbook's 4–5%), making the de-vigged price an unusually clean fair-value
 * anchor to grade picks against. Verified live 2026-06-03 (docs/source-providers/
 * kalshi-and-odds-api-io-evaluation-2026-06-03.md).
 *
 * SAFETY — non-negotiable:
 *   • PUBLIC market-data reads ONLY. We touch `/events` and `/markets` (GET).
 *   • NO API key, NO request signing, NO `/portfolio` or `/orders` endpoints.
 *   • We NEVER place an order. Placing an order on Kalshi is automated betting,
 *     which is prohibited. This module has no code path that can.
 *
 * Coverage path (v5.2.1+ harvest):
 *   1) Constructed event ticker (US majors without time-encoding).
 *   2) Series-aware search by date fragment + team abbrs (MLB time-encoded
 *      tickers, soccer, college). Cursor-paged; soft-fail → unquoted nulls.
 *
 * This file is pure ingestion: it returns a fair-value snapshot. Persisting that
 * snapshot at lock + near start, and grading picks against it, is a separate,
 * deliberate step (a schema field + computeMoneylineClv at settlement).
 */

import type { IndependentMarketFairValue } from "@sports/types";
import { noStoreFetch } from "./no-store-fetch.js";
import {
  constructedEventSeriesStem,
  gameSeriesForLeague,
  toKalshiDateFragment,
  toKalshiTimeFragment,
  type KalshiLeagueCode,
} from "./kalshi-series.js";

// Public Trade API. Despite the host, this serves all Kalshi markets.
const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";
// A hung exchange call must never block the ingestion cron.
const KALSHI_TIMEOUT_MS = 15 * 1000;
/** Cap series-search pages so a single game lookup stays bounded. */
const SERIES_SEARCH_MAX_PAGES = 5;
const SERIES_SEARCH_PAGE_LIMIT = 100;

/** @deprecated Prefer KalshiLeagueCode from kalshi-series — kept for callers. */
export type KalshiLeague = KalshiLeagueCode;

/** A game described in the terms Kalshi tickers use: league, date, and the
 *  exchange's own team abbreviations (e.g. NYK, SAS). Mapping an internal team id
 *  to a Kalshi abbreviation is the caller's concern (a lookup table), kept out of
 *  here so this stays pure and testable. */
export interface KalshiGameRef {
  readonly league: KalshiLeagueCode;
  /** Game date. Date-only string (YYYY-MM-DD) or ISO; interpreted in UTC. */
  readonly dateUtc: string;
  readonly awayAbbr: string;
  readonly homeAbbr: string;
}

/** Minimal shape of a Kalshi market we read. Prices are `*_dollars` strings in [0,1]. */
interface KalshiMarketRaw {
  readonly ticker: string;
  readonly event_ticker?: string;
  readonly yes_sub_title?: string;
  readonly title?: string;
  readonly status?: string;
  readonly yes_bid_dollars?: string;
  readonly yes_ask_dollars?: string;
  readonly last_price_dollars?: string;
  readonly occurrence_datetime?: string;
}

interface KalshiMarketsListResponse {
  readonly markets?: readonly KalshiMarketRaw[];
  readonly cursor?: string;
}
interface KalshiMarketDetailResponse {
  readonly market?: KalshiMarketRaw;
}

export interface KalshiSideFairValue {
  /** Team name as Kalshi labels the YES side (e.g. "New York"). */
  readonly team: string;
  readonly ticker: string;
  /** Raw market-implied YES probability before de-vig; null if unquoted. */
  readonly rawImpliedProb: number | null;
  /** De-vigged fair probability (the two sides sum to 1); null if unquoted. */
  readonly fairProb: number | null;
}

export interface KalshiFairValue {
  readonly eventTicker: string;
  /** When this snapshot was captured (ISO). Use as the CLV "as-of" timestamp. */
  readonly capturedAt: string;
  /** Sum of raw implied probabilities — 1.0 means a perfectly balanced book. */
  readonly overround: number | null;
  readonly sides: readonly KalshiSideFairValue[];
  /** How the event ticker was resolved (provenance for ops). */
  readonly resolvePath?: "constructed" | "series_search";
}

export class KalshiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "KalshiError";
  }
}

/**
 * Map a game to its Kalshi event ticker (legacy constructed form).
 * Grammar (verified live): `KX<LEAGUE>GAME-<YYMMMDD><AWAY><HOME>`, e.g.
 * Game 1 New York at San Antonio on 2026-06-03 → `KXNBAGAME-26JUN03NYKSAS`.
 *
 * MLB often appends local HHMM between date and teams; constructed form without
 * time is still tried first, then series search recovers time-encoded events.
 */
export function toKalshiEventTicker(game: KalshiGameRef): string {
  let dateFrag: string;
  try {
    dateFrag = toKalshiDateFragment(game.dateUtc);
  } catch (err) {
    throw new KalshiError(err instanceof Error ? err.message : `Invalid game date: ${game.dateUtc}`);
  }
  const matchup = `${game.awayAbbr}${game.homeAbbr}`.toUpperCase();
  const stem = constructedEventSeriesStem(game.league);
  // Optional time fragment for MLB-style stems when commence carries a clock.
  const time = game.league === "MLB" ? toKalshiTimeFragment(game.dateUtc) : null;
  if (time) {
    return `${stem}-${dateFrag}${time}${matchup}`;
  }
  return `${stem}-${dateFrag}${matchup}`;
}

/**
 * Kalshi market statuses in which the market is live and trading, so its quote is a
 * real-time price. Any other status (closed/settled/determined/finalized/…) — or an
 * absent status — means the quote is NOT provably live: a residual bid/ask/last from
 * a non-trading market must never be served as a fresh fair-value anchor. Freshness
 * is proven, not assumed from a missing field (honesty doctrine: no stale data).
 */
const LIVE_KALSHI_STATUSES: ReadonlySet<string> = new Set(["active", "open"]);

/** True only when a market is provably open for trading (explicit live status). */
function isLiveMarket(market: KalshiMarketRaw): boolean {
  return market.status != null && LIVE_KALSHI_STATUSES.has(market.status.toLowerCase());
}

/**
 * Market-implied YES probability from a quote. Prefer the bid/ask mid; fall back
 * to the last trade. Returns null when there is no live quote at all.
 */
export function impliedYesProbability(market: KalshiMarketRaw): number | null {
  const bid = Number(market.yes_bid_dollars);
  const ask = Number(market.yes_ask_dollars);
  const last = Number(market.last_price_dollars);
  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
    return (bid + ask) / 2;
  }
  if (Number.isFinite(last) && last > 0) return last;
  return null;
}

/**
 * De-vig two raw YES implied probabilities by normalising them to sum to 1,
 * removing the (tiny, on an exchange) overround. Returns the fair probabilities
 * plus the overround. If either side is unpriced, fair values are null.
 */
export function devigTwoSided(
  rawA: number | null,
  rawB: number | null,
): { fairA: number | null; fairB: number | null; overround: number | null } {
  if (rawA == null || rawB == null) {
    return { fairA: null, fairB: null, overround: rawA != null && rawB != null ? rawA + rawB : null };
  }
  const overround = rawA + rawB;
  if (overround <= 0) return { fairA: null, fairB: null, overround };
  return { fairA: rawA / overround, fairB: rawB / overround, overround };
}

/**
 * True when event ticker looks like this matchup on this date.
 * Handles time-encoded MLB stems: KXMLBGAME-26AUG121610MILSD
 */
export function eventTickerMatchesGame(
  eventTicker: string,
  game: KalshiGameRef,
): boolean {
  const et = eventTicker.toUpperCase();
  const away = game.awayAbbr.toUpperCase();
  const home = game.homeAbbr.toUpperCase();
  if (!away || !home) return false;
  // Both abbrs must appear (order is typically AWAY then HOME at end).
  if (!et.includes(away) || !et.includes(home)) return false;
  // Prefer matchup suffix AWAYHOME (ignore TIE markets' event still has both).
  const matchup = `${away}${home}`;
  if (!et.includes(matchup) && !et.includes(`${home}${away}`)) {
    // Abbrs present but not adjacent — reject (avoids false positives).
    return false;
  }
  try {
    const dateFrag = toKalshiDateFragment(game.dateUtc);
    if (!et.includes(dateFrag)) {
      // Allow ±1 calendar day for timezone edge (UTC vs ET).
      const d = new Date(game.dateUtc);
      if (Number.isNaN(d.getTime())) return false;
      const prev = new Date(d.getTime() - 24 * 60 * 60_000);
      const next = new Date(d.getTime() + 24 * 60 * 60_000);
      const alt = [prev, next].some((x) => {
        try {
          return et.includes(toKalshiDateFragment(x.toISOString()));
        } catch {
          return false;
        }
      });
      if (!alt) return false;
    }
  } catch {
    return false;
  }
  return true;
}

/** Drop Tie/draw market legs for 2-way fair value (soccer). */
function isTieSide(market: KalshiMarketRaw): boolean {
  const sub = (market.yes_sub_title ?? "").trim().toLowerCase();
  const tail = market.ticker.slice(market.ticker.lastIndexOf("-") + 1).toUpperCase();
  return sub === "tie" || sub === "draw" || tail === "TIE" || tail === "DRAW";
}

interface KalshiClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  /** Injectable clock so snapshots are deterministic in tests. */
  readonly now?: () => Date;
  /** Skip series search (tests that only exercise constructed path). */
  readonly skipSeriesSearch?: boolean;
}

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  skipSeriesSearch: false,
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Read-only client for Kalshi public market data. No credentials: the endpoints
 * used require none, and the client exposes no order/portfolio methods.
 */
export class KalshiClient {
  private readonly opts: Required<KalshiClientOptions>;

  constructor(options: KalshiClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
      jitterRatio: options.jitterRatio ?? DEFAULTS.jitterRatio,
      random: options.random ?? DEFAULTS.random,
      sleep: options.sleep ?? DEFAULTS.sleep,
      now: options.now ?? DEFAULTS.now,
      skipSeriesSearch: options.skipSeriesSearch ?? DEFAULTS.skipSeriesSearch,
    };
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await noStoreFetch(`${KALSHI_BASE_URL}${path}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(KALSHI_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new KalshiError(`Kalshi request timed out after ${KALSHI_TIMEOUT_MS}ms`, 408);
        }
        throw new KalshiError(
          `Kalshi request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;

      const exp = Math.min(this.opts.baseDelayMs * 2 ** attempt, this.opts.maxDelayMs);
      const jitter = Math.round(exp * this.opts.jitterRatio * this.opts.random());
      await this.opts.sleep(exp + jitter);
    }

    if (!response) throw new KalshiError("Kalshi request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new KalshiError(`Kalshi error: ${response.status} — ${body}`, response.status);
    }
    try {
      return (await response.json()) as T;
    } catch (err) {
      throw new KalshiError(
        `Kalshi returned a non-JSON body (status ${response.status}): ${err instanceof Error ? err.message : String(err)}`,
        response.status,
      );
    }
  }

  /** List the markets (one per outcome) for an event ticker. Read-only. */
  async getEventMarkets(eventTicker: string): Promise<readonly KalshiMarketRaw[]> {
    const res = await this.get<KalshiMarketsListResponse>(
      `/markets?event_ticker=${encodeURIComponent(eventTicker)}&limit=10`,
    );
    return res.markets ?? [];
  }

  /** Fetch one market's full quote (`*_dollars` fields live on the detail object). */
  private async getMarket(ticker: string): Promise<KalshiMarketRaw | null> {
    const res = await this.get<KalshiMarketDetailResponse>(`/markets/${encodeURIComponent(ticker)}`);
    return res.market ?? null;
  }

  /**
   * Cursor-page markets for a series ticker (status=open). Bounded pages.
   * Used when constructed event ticker misses (MLB time encoding, etc.).
   */
  async listSeriesMarkets(
    seriesTicker: string,
    options?: { readonly maxPages?: number; readonly status?: string },
  ): Promise<readonly KalshiMarketRaw[]> {
    const maxPages = options?.maxPages ?? SERIES_SEARCH_MAX_PAGES;
    const status = options?.status ?? "open";
    const out: KalshiMarketRaw[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const qs = new URLSearchParams({
        series_ticker: seriesTicker,
        status,
        limit: String(SERIES_SEARCH_PAGE_LIMIT),
      });
      if (cursor) qs.set("cursor", cursor);
      const res = await this.get<KalshiMarketsListResponse>(`/markets?${qs.toString()}`);
      const batch = res.markets ?? [];
      out.push(...batch);
      if (!res.cursor || batch.length === 0) break;
      cursor = res.cursor;
    }
    return out;
  }

  /**
   * Resolve event ticker via series search: date fragment + away/home abbrs.
   * Among matches, prefer closest occurrence_datetime to commence (dateUtc).
   */
  async findEventTickerBySeries(game: KalshiGameRef): Promise<string | null> {
    const seriesList = gameSeriesForLeague(game.league);
    if (seriesList.length === 0) return null;

    const commenceMs = Date.parse(game.dateUtc);
    let best: { eventTicker: string; score: number } | null = null;

    for (const series of seriesList) {
      let markets: readonly KalshiMarketRaw[];
      try {
        markets = await this.listSeriesMarkets(series);
      } catch {
        continue;
      }
      const byEvent = new Map<string, KalshiMarketRaw[]>();
      for (const m of markets) {
        const et = (m.event_ticker ?? "").toUpperCase();
        if (!et) continue;
        if (!eventTickerMatchesGame(et, game)) continue;
        const list = byEvent.get(et) ?? [];
        list.push(m);
        byEvent.set(et, list);
      }
      for (const [et, legs] of byEvent) {
        const nonTie = legs.filter((l) => !isTieSide(l));
        if (nonTie.length < 1 && legs.length < 2) continue;
        let score = 0;
        const occ = legs.find((l) => l.occurrence_datetime)?.occurrence_datetime;
        if (occ && Number.isFinite(commenceMs)) {
          const delta = Math.abs(Date.parse(occ) - commenceMs);
          score = -delta;
        }
        const tails = new Set(
          legs.map((l) => l.ticker.slice(l.ticker.lastIndexOf("-") + 1).toUpperCase()),
        );
        if (tails.has(game.homeAbbr.toUpperCase())) score += 1e12;
        if (tails.has(game.awayAbbr.toUpperCase())) score += 1e12;
        if (!best || score > best.score) {
          best = { eventTicker: et, score };
        }
      }
    }
    return best?.eventTicker ?? null;
  }

  private async snapshotFromEvent(
    eventTicker: string,
    resolvePath: "constructed" | "series_search",
  ): Promise<KalshiFairValue> {
    const listed = await this.getEventMarkets(eventTicker);

    const detailed: KalshiMarketRaw[] = [];
    for (const m of listed) {
      const full = (await this.getMarket(m.ticker)) ?? m;
      detailed.push(full);
    }

    // Soccer: drop Tie legs; de-vig the two team sides only.
    const moneyline = detailed.filter((m) => !isTieSide(m));
    const use = moneyline.length >= 2 ? moneyline : detailed;

    const raws = use.map((m) => (isLiveMarket(m) ? impliedYesProbability(m) : null));
    const { fairA, fairB, overround } =
      use.length >= 2
        ? devigTwoSided(raws[0] ?? null, raws[1] ?? null)
        : { fairA: null, fairB: null, overround: raws[0] ?? null };
    const fairs = [fairA, fairB];

    const sides: KalshiSideFairValue[] = use.map((m, i) => ({
      team: m.yes_sub_title ?? m.ticker,
      ticker: m.ticker,
      rawImpliedProb: raws[i] ?? null,
      fairProb: i < 2 ? (fairs[i] ?? null) : null,
    }));

    return {
      eventTicker,
      capturedAt: this.opts.now().toISOString(),
      overround: overround ?? null,
      sides,
      resolvePath,
    };
  }

  /**
   * Compute a de-vigged fair-value snapshot for a game.
   * 1) Constructed ticker (with MLB time fragment when available)
   * 2) Series search only when constructed finds **no markets** (wrong ticker
   *    grammar / time-encoded MLB). Markets present but unquoted stay as null
   *    fair probs — honest thin market, not a miss.
   *
   * Transport failures (timeout 408, 5xx) rethrow — they are not "no coverage".
   */
  async getFairValue(game: KalshiGameRef): Promise<KalshiFairValue> {
    const constructed = toKalshiEventTicker(game);
    let constructedFv: KalshiFairValue | null = null;

    try {
      constructedFv = await this.snapshotFromEvent(constructed, "constructed");
      // Found the event (any legs) → accept. Unquoted nulls are honest.
      if (constructedFv.sides.length > 0 || this.opts.skipSeriesSearch) {
        return constructedFv;
      }
    } catch (err) {
      // Hard transport failures must surface (timeouts, upstream 5xx).
      if (err instanceof KalshiError && (err.status === 408 || (err.status != null && err.status >= 500))) {
        throw err;
      }
      if (this.opts.skipSeriesSearch) throw err;
    }

    if (!this.opts.skipSeriesSearch) {
      const found = await this.findEventTickerBySeries(game);
      if (found) {
        return this.snapshotFromEvent(found, "series_search");
      }
    }

    return (
      constructedFv ?? {
        eventTicker: constructed,
        capturedAt: this.opts.now().toISOString(),
        overround: null,
        sides: [],
        resolvePath: "constructed",
      }
    );
  }
}

/**
 * Bridge a Kalshi fair-value snapshot into the engine's independent-fair-value
 * shape (the thing threaded through `OddsInput.context.independentFairValues`).
 *
 * Side → home/away is resolved deterministically from the market ticker, whose
 * final segment is the YES-side team abbreviation (verified live: a market under
 * event `KXNBAGAME-26JUN03NYKSAS` is `…-NYK`). The caller passes the same Kalshi
 * abbreviations it used to build the event ticker, so no fuzzy name-matching is
 * needed. A side with no quote stays null — a supplementary signal, never sole
 * (honesty doctrine: never overclaim from a thin market).
 *
 * Pure: no I/O. Wiring this into the ingestion cron (with the team-abbreviation
 * lookup table) is a separate, founder-gated step.
 */
export function toIndependentFairValue(
  fairValue: KalshiFairValue,
  homeAbbr: string,
  awayAbbr: string,
): IndependentMarketFairValue {
  const tail = (ticker: string) => ticker.slice(ticker.lastIndexOf("-") + 1).toUpperCase();
  const home = fairValue.sides.find((s) => tail(s.ticker) === homeAbbr.toUpperCase());
  const away = fairValue.sides.find((s) => tail(s.ticker) === awayAbbr.toUpperCase());
  return {
    source: "kalshi",
    homeFairProb: home?.fairProb ?? null,
    awayFairProb: away?.fairProb ?? null,
    capturedAt: fairValue.capturedAt,
  };
}

// Re-export series helpers so existing import paths stay thin.
export {
  sportKeyToKalshiLeagueCode,
  gameSeriesForLeague,
  type KalshiLeagueCode,
} from "./kalshi-series.js";
