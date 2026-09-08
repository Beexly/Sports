/**
 * Galaxy second book — Kalshi exchange quotes as a real bookmaker, fed from
 * the PredExon Kalshi catalog (never the Kalshi Trade API directly).
 *
 * WHY: the keyless Galaxy path carries exactly one book (ESPN-relayed
 * DraftKings), and MIN_BOOKMAKERS=2 rightly refuses to mint picks off a
 * single quote. Kalshi is a CFTC-regulated exchange; its two-way listing
 * quote is a second, genuinely independent market observation.
 *
 * HOW (legal route, ledger C-104 / registry "predexon"): Kalshi Dev Agreement
 * section 3 makes the native Trade API own-trading-only, so ingestion reads
 * PredExon's captured catalog (`predexon-client.ts`, verdict use-with-caution,
 * default OFF via PREDEXON_INGEST). This module never imports the Kalshi
 * client and never issues a Kalshi request.
 *
 * Law (unchanged from PR #680):
 *  - Never invent the other side: a market contributes only when the listing
 *    gate (`gateKalshiListing`) accepts a live two-way YES quote.
 *  - Moneyline for every mapped league; SPREAD and TOTAL only where Kalshi
 *    lists a line series (NFL: KXNFLSPREAD / KXNFLTOTAL). Everything else
 *    stays single-book and therefore honestly un-mintable.
 *  - last_update is the catalog snapshot's real capture time — never a
 *    fabricated clock.
 *  - One catalog load per series per cycle (the free tier is 1 rps and 1k
 *    requests a month): the catalog is cached for the lifetime of the
 *    instance, and a failed load is cached too so a 429 is not retried per
 *    event.
 *  - A market we cannot read (no strike, no team, no two-way quote) is an
 *    honest miss for that market only.
 */

import type { OddsApiBookmaker, OddsApiMarket, OddsApiOutcome } from "@sports/types";
import type { GalaxySecondBook, GalaxySecondBookGameRef } from "./espn-odds-client.js";
import { eventTickerMatchesGame, type KalshiFairValue } from "./kalshi-client.js";
import { gateKalshiListing } from "./kalshi-listing-quote.js";
import {
  gameSeriesForLeague,
  sportKeyToKalshiLeagueCode,
  type KalshiLeagueCode,
} from "./kalshi-series.js";
import {
  PredExonClient,
  isPredExonIngestEnabled,
  type PredExonKalshiMarket,
} from "./predexon-client.js";
import { isIngestible } from "./source-registry.js";

export const KALSHI_BOOK_KEY = "kalshi" as const;
export const KALSHI_BOOK_TITLE = "Kalshi (exchange, via PredExon)";

/**
 * Line (spread / total) series per league. Only leagues listed here get a
 * second book beyond the moneyline. Strings must match `KALSHI_SERIES`
 * (kalshi-series.ts) — pinned by test.
 */
export const KALSHI_LINE_SERIES: Readonly<
  Partial<Record<KalshiLeagueCode, { readonly spread: string; readonly total: string }>>
> = {
  NFL: { spread: "KXNFLSPREAD", total: "KXNFLTOTAL" },
};

/**
 * Probability → American price. p in (0,1); favorites negative.
 * Uses the side's RAW market-implied probability (pre-de-vig), so the pair
 * keeps the exchange's actual (tiny) overround like any real book quote.
 */
export function probToAmerican(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  const price = p >= 0.5 ? -Math.round((100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p);
  // |price| >= 100 always holds mathematically here; guard anyway so a
  // rounding edge (p ~ 0.5) can never emit a sub-American artifact.
  return Math.abs(price) >= 100 ? price : p >= 0.5 ? -100 : 100;
}

/**
 * Build the Kalshi H2H bookmaker for one game from a fair-value snapshot.
 * Sides resolve by ticker tail = the exchange's own YES-side abbreviation
 * (same deterministic rule as toIndependentFairValue). Returns null on any
 * missing leg — an honest miss, never a partial or invented book.
 */
export function kalshiH2hBookmaker(args: {
  readonly fairValue: KalshiFairValue;
  readonly homeAbbr: string;
  readonly awayAbbr: string;
  /** Full display names — DataNormalizer matches outcomes by event names. */
  readonly homeTeam: string;
  readonly awayTeam: string;
}): OddsApiBookmaker | null {
  const { fairValue, homeAbbr, awayAbbr, homeTeam, awayTeam } = args;
  if (!homeAbbr || !awayAbbr) return null;
  const home = fairValue.sides.find((s) => tickerTail(s.ticker) === homeAbbr.toUpperCase());
  const away = fairValue.sides.find((s) => tickerTail(s.ticker) === awayAbbr.toUpperCase());
  const homeP = home?.rawImpliedProb ?? null;
  const awayP = away?.rawImpliedProb ?? null;
  if (homeP == null || awayP == null) return null;
  const homePrice = probToAmerican(homeP);
  const awayPrice = probToAmerican(awayP);
  if (homePrice == null || awayPrice == null) return null;
  return {
    key: KALSHI_BOOK_KEY,
    title: KALSHI_BOOK_TITLE,
    last_update: fairValue.capturedAt,
    markets: [
      {
        key: "h2h",
        last_update: fairValue.capturedAt,
        outcomes: [
          { name: awayTeam, price: awayPrice },
          { name: homeTeam, price: homePrice },
        ],
      },
    ],
  };
}

function tickerTail(ticker: string): string {
  return ticker.slice(ticker.lastIndexOf("-") + 1).toUpperCase();
}

/** Two-way listing quote for one PredExon market: YES mid and NO mid, or null. */
export interface PredExonTwoWay {
  readonly yes: number;
  readonly no: number;
}

/**
 * The market's live two-way quote. YES comes from the listing gate (bid/ask
 * interior only — never last_price). NO is the NO side's own bid/ask mid when
 * PredExon relays it; otherwise it is the same order book read from the other
 * side (1 − YES), which is not an invented complement on a binary exchange
 * market. Null when the gate refuses.
 */
export function predexonTwoWay(m: PredExonKalshiMarket): PredExonTwoWay | null {
  const yes = m.outcomes.find((o) => /^yes$/i.test(o.label.trim())) ?? m.outcomes[0];
  const no = m.outcomes.find((o) => /^no$/i.test(o.label.trim())) ?? m.outcomes[1];
  if (!yes) return null;
  const gate = gateKalshiListing({
    yesBid: yes.bid,
    yesAsk: yes.ask,
    noBid: no?.bid ?? null,
    last: m.last_price,
    status: m.status,
  });
  if (!gate.usable || gate.q == null) return null;
  const noMid =
    no?.bid != null && no?.ask != null && no.bid > 0 && no.ask < 1 && no.ask >= no.bid
      ? (no.bid + no.ask) / 2
      : 1 - gate.q;
  if (!(noMid > 0 && noMid < 1)) return null;
  return { yes: gate.q, no: noMid };
}

/** Numeric line the YES side needs to clear, with Kalshi's strict/inclusive rule applied. */
function effectiveLine(strike: number, strikeType: string | null): number {
  if (!Number.isInteger(strike)) return strike;
  const t = (strikeType ?? "greater").toLowerCase();
  // "greater": YES iff value > strike, so an integer strike behaves as strike+0.5
  // (a push at the number settles NO). "greater_or_equal": YES iff value >= strike,
  // which behaves as strike-0.5. Half-point strikes need no adjustment.
  if (t === "greater_or_equal") return strike - 0.5;
  return strike + 0.5;
}

const LINE_RE = /(?:by\s+)?(?:over|more than|at least|\+)\s*(\d+(?:\.\d+)?)/i;

function strikeFromText(m: PredExonKalshiMarket): number | null {
  if (m.floor_strike != null) return m.floor_strike;
  const text = `${m.yes_subtitle} ${m.title}`;
  const hit = LINE_RE.exec(text);
  if (!hit) return null;
  const n = Number(hit[1]);
  return Number.isFinite(n) ? n : null;
}

function hasWord(text: string, word: string): boolean {
  if (!word) return false;
  return new RegExp(`(^|[^A-Z0-9])${word}([^A-Z0-9]|$)`, "i").test(text);
}

export interface KalshiSpreadLine {
  readonly side: "home" | "away";
  /** Points the YES team must win by (positive). */
  readonly line: number;
}

/**
 * Read a KXNFLSPREAD-style market: which team is the YES side and by how much.
 * Team resolves from the ticker tail prefix (…-BUF3) or a whole-word
 * abbreviation in the YES subtitle/title; the line from floor_strike or the
 * "by over N" wording. Null when either is unreadable — never guessed.
 */
export function parseKalshiSpreadLine(
  m: PredExonKalshiMarket,
  homeAbbr: string,
  awayAbbr: string,
): KalshiSpreadLine | null {
  const home = homeAbbr.toUpperCase();
  const away = awayAbbr.toUpperCase();
  if (!home || !away || home === away) return null;
  const tail = tickerTail(m.ticker);
  const text = `${m.yes_subtitle} ${m.title}`;
  let side: "home" | "away" | null = null;
  const tailHome = tail.startsWith(home) && !tail.startsWith(away);
  const tailAway = tail.startsWith(away) && !tail.startsWith(home);
  if (tailHome) side = "home";
  else if (tailAway) side = "away";
  else {
    const textHome = hasWord(text, home);
    const textAway = hasWord(text, away);
    if (textHome && !textAway) side = "home";
    else if (textAway && !textHome) side = "away";
  }
  if (!side) return null;
  const strike = strikeFromText(m);
  if (strike == null || strike <= 0) return null;
  return { side, line: effectiveLine(strike, m.strike_type) };
}

/** Read a KXNFLTOTAL-style market: the total the YES ("Over") side needs. */
export function parseKalshiTotalLine(m: PredExonKalshiMarket): number | null {
  const strike = strikeFromText(m);
  if (strike == null || strike <= 0) return null;
  return effectiveLine(strike, m.strike_type);
}

/** Among live-quoted markets, the exchange's own main line: YES mid closest to 0.5. */
function mainLine<T>(rows: readonly { readonly row: T; readonly quote: PredExonTwoWay }[]) {
  let best: { readonly row: T; readonly quote: PredExonTwoWay } | null = null;
  for (const r of rows) {
    if (!best || Math.abs(r.quote.yes - 0.5) < Math.abs(best.quote.yes - 0.5)) best = r;
  }
  return best;
}

export interface PredExonCatalogSeries {
  readonly series: string;
  readonly markets: readonly PredExonKalshiMarket[];
  /** ISO time the catalog page(s) were captured — the book's last_update. */
  readonly capturedAt: string;
  /** True when PredExon ingest is disabled (client returned null). */
  readonly disabled: boolean;
}

export interface PredExonKalshiCatalogOptions {
  readonly now?: () => Date;
  /** Pages per series per cycle (100 markets each). Default 5. */
  readonly maxPages?: number;
  /** Free tier is 1 rps: pause between catalog requests. Default 1100ms. */
  readonly interRequestMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * Per-cycle PredExon Kalshi catalog. Construct one per processSport run, hand
 * it to `fetchEspnOddsForSport({ secondBook })`; each series is fetched at
 * most once for the instance's lifetime.
 */
export class PredExonKalshiCatalog implements GalaxySecondBook {
  private readonly cache = new Map<string, Promise<PredExonCatalogSeries>>();
  private requestCount = 0;
  private readonly now: () => Date;
  private readonly maxPages: number;
  private readonly interRequestMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly client: PredExonClient,
    opts: PredExonKalshiCatalogOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.maxPages = Math.min(20, Math.max(1, opts.maxPages ?? 5));
    this.interRequestMs = Math.max(0, opts.interRequestMs ?? 1100);
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Load one series (cached, including a failure, for this instance). */
  series(seriesTicker: string): Promise<PredExonCatalogSeries> {
    const hit = this.cache.get(seriesTicker);
    if (hit) return hit;
    const load = this.loadSeries(seriesTicker);
    this.cache.set(seriesTicker, load);
    return load;
  }

  private async loadSeries(seriesTicker: string): Promise<PredExonCatalogSeries> {
    const markets: PredExonKalshiMarket[] = [];
    let paginationKey: string | undefined;
    for (let page = 0; page < this.maxPages; page++) {
      // 1 rps free tier: pace every request after the instance's first one.
      if (this.requestCount > 0 && this.interRequestMs > 0) await this.sleep(this.interRequestMs);
      this.requestCount += 1;
      const res = await this.client.listKalshiMarkets({
        seriesTicker,
        status: "open",
        limit: 100,
        ...(paginationKey ? { paginationKey } : {}),
      });
      if (res == null) {
        return { series: seriesTicker, markets: [], capturedAt: this.now().toISOString(), disabled: true };
      }
      markets.push(...res.markets);
      if (!res.hasMore || !res.paginationKey) break;
      paginationKey = res.paginationKey;
    }
    return { series: seriesTicker, markets, capturedAt: this.now().toISOString(), disabled: false };
  }

  async bookmakerFor(game: GalaxySecondBookGameRef): Promise<OddsApiBookmaker | null> {
    const league = sportKeyToKalshiLeagueCode(game.sportKey);
    if (!league || !game.homeAbbr || !game.awayAbbr) return null;
    const ref = {
      league,
      dateUtc: game.commenceTime,
      homeAbbr: game.homeAbbr,
      awayAbbr: game.awayAbbr,
    };
    const forGame = (rows: readonly PredExonKalshiMarket[]) =>
      rows.filter((m) => m.event_ticker && eventTickerMatchesGame(m.event_ticker, ref));

    // Moneyline (game series): one market per team, side by ticker tail.
    let h2h: OddsApiMarket | null = null;
    let capturedAt: string | null = null;
    for (const series of gameSeriesForLeague(league)) {
      const cat = await this.series(series);
      if (cat.disabled) return null;
      const sides = forGame(cat.markets)
        .map((m) => ({ ticker: m.ticker, team: m.yes_subtitle || m.ticker, quote: predexonTwoWay(m) }))
        .filter((s): s is { ticker: string; team: string; quote: PredExonTwoWay } => s.quote != null);
      const fv: KalshiFairValue = {
        eventTicker: forGame(cat.markets)[0]?.event_ticker ?? "",
        capturedAt: cat.capturedAt,
        overround: null,
        sides: sides.map((s) => ({
          team: s.team,
          ticker: s.ticker,
          rawImpliedProb: s.quote.yes,
          fairProb: null,
        })),
      };
      const book = kalshiH2hBookmaker({
        fairValue: fv,
        homeAbbr: game.homeAbbr,
        awayAbbr: game.awayAbbr,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
      });
      if (book) {
        h2h = book.markets[0] ?? null;
        capturedAt = cat.capturedAt;
        break;
      }
    }

    const markets: OddsApiMarket[] = [];
    if (h2h) markets.push(h2h);

    const line = KALSHI_LINE_SERIES[league];
    if (line) {
      const spreadCat = await this.series(line.spread);
      if (spreadCat.disabled) return null;
      const spreadRows = forGame(spreadCat.markets)
        .map((m) => ({ row: parseKalshiSpreadLine(m, game.homeAbbr, game.awayAbbr), quote: predexonTwoWay(m) }))
        .filter((r): r is { row: KalshiSpreadLine; quote: PredExonTwoWay } => r.row != null && r.quote != null);
      const main = mainLine(spreadRows);
      if (main) {
        const yesPx = probToAmerican(main.quote.yes);
        const noPx = probToAmerican(main.quote.no);
        if (yesPx != null && noPx != null) {
          const yesTeam = main.row.side === "home" ? game.homeTeam : game.awayTeam;
          const noTeam = main.row.side === "home" ? game.awayTeam : game.homeTeam;
          const outcomes: OddsApiOutcome[] = [
            { name: yesTeam, point: -main.row.line, price: yesPx },
            { name: noTeam, point: main.row.line, price: noPx },
          ];
          markets.push({ key: "spreads", last_update: spreadCat.capturedAt, outcomes });
          capturedAt = capturedAt ?? spreadCat.capturedAt;
        }
      }

      const totalCat = await this.series(line.total);
      if (totalCat.disabled) return null;
      const totalRows = forGame(totalCat.markets)
        .map((m) => ({ row: parseKalshiTotalLine(m), quote: predexonTwoWay(m) }))
        .filter((r): r is { row: number; quote: PredExonTwoWay } => r.row != null && r.quote != null);
      const mainTotal = mainLine(totalRows);
      if (mainTotal) {
        const overPx = probToAmerican(mainTotal.quote.yes);
        const underPx = probToAmerican(mainTotal.quote.no);
        if (overPx != null && underPx != null) {
          markets.push({
            key: "totals",
            last_update: totalCat.capturedAt,
            outcomes: [
              { name: "Over", point: mainTotal.row, price: overPx },
              { name: "Under", point: mainTotal.row, price: underPx },
            ],
          });
          capturedAt = capturedAt ?? totalCat.capturedAt;
        }
      }
    }

    if (markets.length === 0 || capturedAt == null) return null;
    return { key: KALSHI_BOOK_KEY, title: KALSHI_BOOK_TITLE, last_update: capturedAt, markets };
  }
}

/**
 * The second book for this cycle, or undefined when it is switched off:
 * PREDEXON_INGEST must be on, PREDEXON_API_KEY present, and the "predexon"
 * registry verdict ingestible. Default OFF — the founder flips it (ledger F-34).
 */
export function createGalaxySecondBook(
  env: NodeJS.ProcessEnv = process.env,
  opts: PredExonKalshiCatalogOptions & { readonly fetchImpl?: typeof fetch } = {},
): GalaxySecondBook | undefined {
  if (!isPredExonIngestEnabled(env)) return undefined;
  if (!(env.PREDEXON_API_KEY ?? "").trim()) return undefined;
  if (!isIngestible("predexon")) return undefined;
  const { fetchImpl, ...catalogOpts } = opts;
  const client = fetchImpl ? new PredExonClient(env, fetchImpl) : new PredExonClient(env);
  return new PredExonKalshiCatalog(client, catalogOpts);
}
