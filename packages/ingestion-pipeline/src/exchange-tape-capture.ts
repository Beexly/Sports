/**
 * exchange-tape-capture.ts — Kalshi NFL tape + book, forward-only (C-396, D18a).
 *
 * Every 20-minute refresh cycle (the same cadence as line-archive), when both
 * gates are open, this module:
 *   1. Lists open markets for KXNFLSPREAD / KXNFLTOTAL / KXNFLGAME via the
 *      PredExon free+unlimited markets endpoint.
 *   2. Pulls the free trades history for each matched event (taker_side etc.).
 *   3. Writes one OddsLineSnapshot row per market under book
 *      `kalshi-predexon`, reusing line-archive.ts (OPEN/INTERIM, never throws).
 *
 * LAWS
 *   - PredExon only (D4). Never the Kalshi Trade API. Never HuggingFace dumps.
 *   - Never /v2/data/ticks (paid tick-history, D15). The client hard-refuses.
 *   - Pace ≤1 request/second (free tier). Default interRequestMs = 1100.
 *   - Schema sealed: OddsLineSnapshot has no JSON payload column. Fields the
 *     table cannot hold are named in `EXCHANGE_TAPE_DROPPED_FIELDS` and
 *     reported in evidence — never a migration.
 *   - Fields PredExon's catalog does not carry are stored as null and named.
 *   - Forward-only. No backfill of the 65-game history.
 *
 * DOUBLE-GATED: LINE_ARCHIVE_ENABLED==="true" AND PREDEXON ingest on
 * (PREDEXON_INGEST + PREDEXON_API_KEY + registry verdict). Default OFF.
 */

import {
  PredExonClient,
  eventTickerMatchesGame,
  isIngestible,
  isPredExonIngestEnabled,
  parseKalshiSpreadLine,
  parseKalshiTotalLine,
  type PredExonKalshiMarket,
} from "@sports/data-ingestion";
import { captureLineSnapshotsIfEnabled, type LineSnapshotRow } from "./line-archive.js";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";

/** Bookmaker key written into odds_line_snapshots.book for this tape. */
export const KALSHI_PREDEXON_BOOK = "kalshi-predexon";

/** Source tag written into odds_line_snapshots.source. */
export const EXCHANGE_TAPE_SOURCE = "predexon";

/** NFL series the tape covers (C-396 DoD). */
export const EXCHANGE_TAPE_NFL_SERIES = ["KXNFLSPREAD", "KXNFLTOTAL", "KXNFLGAME"] as const;

/**
 * Fields this capture reads from PredExon (or would want) that
 * odds_line_snapshots has NO column for. The schema is sealed — these are
 * named in every evidence payload as dropped, never forced into a migration.
 *
 *  - volume / dollar_volume / open_interest / dollar_open_interest: markets
 *    catalog carries them (parsed into PredExonKalshiMarket); no column.
 *  - trades.* : the free trades endpoint carries taker_side, count, prices,
 *    created_time; no column and no JSON payload column.
 *  - best_bid / best_ask as distinct columns: the archive has a single
 *    `price` (the mid). The raw legs are not persisted separately.
 */
export const EXCHANGE_TAPE_DROPPED_FIELDS: readonly string[] = [
  "volume",
  "dollar_volume",
  "open_interest",
  "dollar_open_interest",
  "best_bid",
  "best_ask",
  "trades.taker_side",
  "trades.count",
  "trades.trade_id",
  "trades.yes_price",
  "trades.no_price",
  "trades.created_time",
];

/**
 * Fields the PredExon markets catalog does not carry at all (stored as null).
 * Trade prints live on a separate free endpoint, not on the market row.
 */
export const EXCHANGE_TAPE_CATALOG_ABSENT_FIELDS: readonly string[] = [
  "trades",
  "taker_side",
];

/** Default pause between PredExon requests (free tier is 1 rps). */
export const DEFAULT_INTER_REQUEST_MS = 1100;

/** Cap pages per series so a dense slate stays bounded. */
export const MAX_PAGES_PER_SERIES = 10;

/** Cap distinct event_ticker trades pulls per cycle (1 rps budget). */
export const MAX_TRADE_EVENTS_PER_CYCLE = 32;

/** One game the tape may attach rows to (must already exist in `games`). */
export interface ExchangeTapeGame {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  /** Commence time (ISO string or Date) — used for the Kalshi date-fragment match. */
  readonly commenceTime: string | Date;
}

export interface CaptureExchangeTapeArgs {
  readonly db: unknown;
  readonly games: readonly ExchangeTapeGame[];
  readonly capturedAt: Date;
  /** Injected client (tests / createExchangeTapeClient). Null → disabled. */
  readonly client: PredExonClient | null;
  /** Free-tier pace. Default 1100ms. */
  readonly interRequestMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly maxPagesPerSeries?: number;
  readonly maxTradeEvents?: number;
  /** Lookback for the trades window (default: 20 minutes — one cycle). */
  readonly tradeLookbackMs?: number;
  readonly env?: NodeJS.ProcessEnv;
}

export interface CaptureExchangeTapeResult {
  enabled: boolean;
  /** OddsLineSnapshot rows persisted. */
  persisted: number;
  marketsSeen: number;
  marketsMatched: number;
  tradesSeen: number;
  /** PredExon requests issued this cycle (markets + trades). */
  requests: number;
  /** Distinct games that received at least one row. */
  gamesArchived: number;
  /**
   * Fields the table cannot hold — always EXCHANGE_TAPE_DROPPED_FIELDS.
   * Present even when empty capture, so evidence is complete.
   */
  droppedFields: readonly string[];
  /** Fields the catalog does not carry — always EXCHANGE_TAPE_CATALOG_ABSENT_FIELDS. */
  catalogAbsentFields: readonly string[];
  error?: string;
}

/**
 * Build a PredExon client for the tape, or null when the read gate is closed.
 * Read gate: PREDEXON_INGEST + PREDEXON_API_KEY + registry "predexon" ingestible.
 */
export function createExchangeTapeClient(
  env: NodeJS.ProcessEnv = process.env,
): PredExonClient | null {
  if (!isPredExonIngestEnabled(env)) return null;
  if (!(env.PREDEXON_API_KEY ?? "").trim()) return null;
  if (!isIngestible("predexon")) return null;
  return new PredExonClient(env);
}

/** True when both gates are open. Default OFF. */
export function isExchangeTapeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["LINE_ARCHIVE_ENABLED"] === "true" && isPredExonIngestEnabled(env);
}

function midPrice(m: PredExonKalshiMarket): number | null {
  const yes = m.outcomes.find((o) => /^yes$/i.test(o.label.trim())) ?? m.outcomes[0];
  if (yes?.bid != null && yes?.ask != null && yes.ask >= yes.bid) {
    return (yes.bid + yes.ask) / 2;
  }
  return m.last_price;
}

/** Map a Kalshi series ticker → archive market label. */
function archiveMarketForSeries(series: string): "SPREAD" | "MONEYLINE" | "TOTAL" {
  if (series === "KXNFLSPREAD") return "SPREAD";
  if (series === "KXNFLTOTAL") return "TOTAL";
  return "MONEYLINE";
}

/**
 * Encode the Kalshi ticker into `market` so every strike/contract is its own
 * OPEN/INTERIM stream (phase is per (gameId, market)). Prefix keeps the
 * row greppable without a schema change.
 */
function encodeTapeMarket(series: string, ticker: string): string {
  return `${archiveMarketForSeries(series)}|${ticker}`;
}

function sideForMarket(
  series: string,
  m: PredExonKalshiMarket,
  homeAbbr: string,
  awayAbbr: string,
): string {
  if (series === "KXNFLTOTAL") {
    const yes = (m.yes_subtitle || m.title || "").toLowerCase();
    // YES on a total series is the Over leg by convention.
    return yes.includes("under") ? "under" : "over";
  }
  if (series === "KXNFLSPREAD") {
    const parsed = parseKalshiSpreadLine(m, homeAbbr, awayAbbr);
    if (parsed) return parsed.side;
  }
  const tail = m.ticker.slice(m.ticker.lastIndexOf("-") + 1).toUpperCase();
  if (homeAbbr && tail.startsWith(homeAbbr.toUpperCase())) return "home";
  if (awayAbbr && tail.startsWith(awayAbbr.toUpperCase())) return "away";
  return "yes";
}

function effectiveStrikeLine(strike: number, strikeType: string | null): number {
  if (!Number.isInteger(strike)) return strike;
  const t = (strikeType ?? "greater").toLowerCase();
  if (t === "greater_or_equal") return strike - 0.5;
  return strike + 0.5;
}

function lineForMarket(series: string, m: PredExonKalshiMarket): number | null {
  if (series === "KXNFLGAME") return null;
  if (m.floor_strike != null) return effectiveStrikeLine(m.floor_strike, m.strike_type);
  // Same text/strike parser used by the Kalshi book path (Over / "by over N").
  return parseKalshiTotalLine(m);
}

interface MatchedGame {
  game: ExchangeTapeGame;
  homeAbbr: string;
  awayAbbr: string;
}

function resolveMatchedGames(games: readonly ExchangeTapeGame[]): MatchedGame[] {
  const out: MatchedGame[] = [];
  for (const game of games) {
    const homeAbbr = resolveKalshiTeamAbbr("NFL", game.homeTeamName) ?? "";
    const awayAbbr = resolveKalshiTeamAbbr("NFL", game.awayTeamName) ?? "";
    if (!homeAbbr || !awayAbbr) continue;
    out.push({ game, homeAbbr, awayAbbr });
  }
  return out;
}

function toIsoUtc(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

function matchGame(
  m: PredExonKalshiMarket,
  games: readonly MatchedGame[],
): MatchedGame | null {
  if (!m.event_ticker) return null;
  for (const g of games) {
    if (
      eventTickerMatchesGame(m.event_ticker, {
        league: "NFL",
        dateUtc: toIsoUtc(g.game.commenceTime),
        homeAbbr: g.homeAbbr,
        awayAbbr: g.awayAbbr,
      })
    ) {
      return g;
    }
  }
  return null;
}

interface PendingTapeRow {
  readonly gameId: string;
  readonly series: string;
  readonly row: LineSnapshotRow;
  readonly eventTicker: string;
}

function evidenceResult(
  partial: Omit<
    CaptureExchangeTapeResult,
    "droppedFields" | "catalogAbsentFields"
  >,
): CaptureExchangeTapeResult {
  return {
    ...partial,
    droppedFields: EXCHANGE_TAPE_DROPPED_FIELDS,
    catalogAbsentFields: EXCHANGE_TAPE_CATALOG_ABSENT_FIELDS,
  };
}

/**
 * HARD GATE — the only entry point production ingestion should call.
 * No-ops (zero network, zero DB) unless LINE_ARCHIVE_ENABLED=true and a
 * PredExon client is supplied. Never throws.
 */
export async function captureExchangeTapeIfEnabled(
  args: CaptureExchangeTapeArgs,
): Promise<CaptureExchangeTapeResult> {
  const env = args.env ?? process.env;
  if (!isExchangeTapeEnabled(env)) {
    return evidenceResult({
      enabled: false,
      persisted: 0,
      marketsSeen: 0,
      marketsMatched: 0,
      tradesSeen: 0,
      requests: 0,
      gamesArchived: 0,
    });
  }
  if (!args.client) {
    // Read gate closed (no key / registry). Quiet no-op — not an error.
    return evidenceResult({
      enabled: false,
      persisted: 0,
      marketsSeen: 0,
      marketsMatched: 0,
      tradesSeen: 0,
      requests: 0,
      gamesArchived: 0,
    });
  }

  const interRequestMs = Math.max(0, args.interRequestMs ?? DEFAULT_INTER_REQUEST_MS);
  const sleep = args.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const maxPages = Math.max(1, args.maxPagesPerSeries ?? MAX_PAGES_PER_SERIES);
  const maxTradeEvents = Math.max(0, args.maxTradeEvents ?? MAX_TRADE_EVENTS_PER_CYCLE);
  const tradeLookbackMs = args.tradeLookbackMs ?? 20 * 60_000;

  const matched = resolveMatchedGames(args.games);
  let requests = 0;
  let marketsSeen = 0;
  let tradesSeen = 0;

  try {
    const pace = async () => {
      if (requests > 0 && interRequestMs > 0) await sleep(interRequestMs);
      requests += 1;
    };

    const pending: PendingTapeRow[] = [];

    for (const series of EXCHANGE_TAPE_NFL_SERIES) {
      let paginationKey: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        await pace();
        const res = await args.client.listKalshiMarkets({
          seriesTicker: series,
          status: "open",
          limit: 100,
          ...(paginationKey ? { paginationKey } : {}),
        });
        if (res == null) {
          return evidenceResult({
            enabled: true,
            persisted: 0,
            marketsSeen,
            marketsMatched: 0,
            tradesSeen: 0,
            requests,
            gamesArchived: 0,
          });
        }
        for (const m of res.markets) {
          marketsSeen += 1;
          const g = matchGame(m, matched);
          if (!g) continue;
          const price = midPrice(m);
          if (price == null || !Number.isFinite(price)) continue;
          pending.push({
            gameId: g.game.id,
            series,
            eventTicker: m.event_ticker,
            row: {
              book: KALSHI_PREDEXON_BOOK,
              market: encodeTapeMarket(series, m.ticker),
              side: sideForMarket(series, m, g.homeAbbr, g.awayAbbr),
              // PredExon native dollars in [0,1] — the tape keeps the exchange's
              // own scale, never a re-derived American price.
              price,
              line: lineForMarket(series, m),
            },
          });
        }
        if (!res.hasMore || !res.paginationKey) break;
        paginationKey = res.paginationKey;
      }
    }

    // Free trades: one request per distinct matched event_ticker, last cycle window.
    const eventTickers = Array.from(new Set(pending.map((p) => p.eventTicker)))
      .filter(Boolean)
      .slice(0, maxTradeEvents);
    const startUnix = Math.floor((args.capturedAt.getTime() - tradeLookbackMs) / 1000);
    const endUnix = Math.floor(args.capturedAt.getTime() / 1000);
    const tradeIds = new Set<string>();

    for (const eventTicker of eventTickers) {
      await pace();
      const page = await args.client.listKalshiTrades({
        eventTicker,
        startTime: startUnix,
        endTime: endUnix,
        limit: 100,
        order: "desc",
      });
      if (page == null) break;
      for (const t of page.trades) tradeIds.add(t.trade_id);
    }
    tradesSeen = tradeIds.size;

    // Persist book rows. Trade prints are evidence-only (no column).
    const byGame = new Map<string, LineSnapshotRow[]>();
    for (const p of pending) {
      const list = byGame.get(p.gameId);
      if (list) list.push(p.row);
      else byGame.set(p.gameId, [p.row]);
    }

    let persisted = 0;
    let gamesArchived = 0;
    for (const [gameId, rows] of byGame) {
      const result = await captureLineSnapshotsIfEnabled({
        db: args.db,
        gameId,
        capturedAt: args.capturedAt,
        rows,
        source: EXCHANGE_TAPE_SOURCE,
      });
      if (result.error) {
        return evidenceResult({
          enabled: true,
          persisted,
          marketsSeen,
          marketsMatched: pending.length,
          tradesSeen,
          requests,
          gamesArchived,
          error: result.error,
        });
      }
      persisted += result.persisted;
      if (result.persisted > 0) gamesArchived += 1;
    }

    return evidenceResult({
      enabled: true,
      persisted,
      marketsSeen,
      marketsMatched: pending.length,
      tradesSeen,
      requests,
      gamesArchived,
    });
  } catch (err) {
    return evidenceResult({
      enabled: true,
      persisted: 0,
      marketsSeen,
      marketsMatched: 0,
      tradesSeen,
      requests,
      gamesArchived: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
