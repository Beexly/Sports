/**
 * oddsapi-product-prices.ts — the KEYED product-price leg of the forward
 * line archive: The Odds API's event-level alternate markets, persisted
 * as OddsLineSnapshot rows under the same additive market values the
 * keyless product leg (espn-product-prices.ts) introduced — ALT_SPREAD /
 * ALT_TOTAL — with the same row shape, the same stores, the same
 * OPEN/INTERIM phase classification per (gameId, market). It extends that
 * leg's design, it does not fork it: what differs is the source, and the
 * source is stamped on every row (`source: "oddsapi"`, vs the keyless
 * leg's "espn-public-dk", the US refresh's "the-odds-api", and the EU
 * Pinnacle leg's "the-odds-api-eu" in the same table).
 *
 * WHY THIS LEG EXISTS: the keyless extension measured the gap — no
 * keyless ESPN surface exposes an alternate ladder (see README
 * "Product-price gaps"). The Odds API's catalog carries
 * `alternate_spreads` / `alternate_totals` on keyed plans, so SPEC-B's
 * alt-line products can only be scored once this leg captures them.
 * Buy-point prices are rungs of these same ladders (adjacent to the main
 * line) and are captured as ALT_* rows like any other rung. The Odds API
 * exposes NO teaser market — a teaser is a book-side parlay construct,
 * not a priced market — so teasers remain a named gap (README).
 *
 * ONE REQUEST PER CAPTURE: each capture is a single event-odds call
 * (OddsApiClient#getEventOdds) requesting h2h + spreads + totals (the
 * featured markets — they give the duplicate guard its featured context
 * from the same book at the same instant, and the moneyline its
 * cross-check) plus alternate_spreads + alternate_totals (the products).
 * Rows are persisted for ONE book per capture — the first of
 * ODDSAPI_BOOK_PREFERENCE carrying an alternate market, else the first
 * carrying any requested market — and `book` records that bookmaker's
 * own key, exactly as the US refresh's rows do. Mixed-book rows would
 * make a ladder unsourceable; a single book keeps provenance clean.
 *
 * EXTRACTION CONTRACT (never invent a price) mirrors the keyless leg:
 * outcomes are accepted in The Odds API's native outcome form
 * ({ name, price, point }) under the market keys this leg requested;
 * every value is strictly validated (finite point, finite non-zero
 * American price, side resolvable from the outcome name); anything else
 * is dropped and counted, never coerced. A rung identical to the book's
 * own featured row (same side, line AND price) is the main line inside
 * the ladder — dropped and counted separately, so the featured price is
 * never double-archived as a product.
 *
 * CREDIT BUDGET (hard, enforced in this module — not a convention):
 *   - Window: alternate captures ONLY for games kicking off within
 *     ODDSAPI_CAPTURE_WINDOW_HOURS (48h). The 7-day featured window does
 *     not apply here; a game further out is skipped, never fetched.
 *   - Cadence: at most ODDSAPI_MAX_CAPTURES_PER_GAME (3) captures per
 *     game across this leg's whole history (the store-counted prior
 *     captures for (gameId, source="oddsapi") — OPEN-class, INTERIM,
 *     and the final pre-kickoff capture that settle-time
 *     markClosingSnapshots re-tags CLOSE; this leg never stamps CLOSE
 *     itself, per codebase law). A game at the cap is skipped BEFORE any
 *     API call — the cap saves credits, it doesn't just count them.
 *   - Burn cap: before every event-odds call the run projects the leg's
 *     monthly burn at the capped cadence (see projectedMonthlyBurn) and
 *     ABORTS the alternate capture for the rest of the run if the
 *     projection exceeds ODDSAPI_MONTHLY_BURN_CAP. The abort touches
 *     only this leg — the featured/keyless legs are separate modules
 *     and proceed independently. Realized per-capture cost is measured
 *     from the vendor's x-requests-used header deltas, never from docs;
 *     the market-count estimate is used only until the first measured
 *     delta exists, and is labeled as an estimate wherever reported.
 *
 * KEY HANDLING: this module never reads the key and never builds an HTTP
 * client. The fetch seam is injected (`fetchEventOdds`) — production
 * wiring (run-oddsapi-product-prices.ts) binds the caller's own
 * OddsApiClient, constructed from process.env["THE_ODDS_API_KEY"]
 * exactly as every other keyed leg in this repo does. The key value
 * appears nowhere in this module, its logs, or its results.
 *
 * GATING mirrors the sibling legs: the production entry point
 * (runOddsApiProductPriceArchiverIfEnabled) hard-gates on
 * LINE_ARCHIVE_ENABLED=true; the un-gated runner backs the operator
 * CLI's explicit --dry-run. Failure isolation mirrors them too: one
 * event's failure is recorded in `errors` and the slate continues.
 */

import type { OddsApiEvent } from "@sports/types";
import { isLineArchiveEnabled } from "../line-archive.js";
import {
  classifyLineArchivePhase,
  selectEventsInWindow,
  LINE_ARCHIVER_SPORT_KEY,
  type LineArchiveInsertRow,
  type LineArchiveStore,
} from "./espn-line-archive.js";
import {
  PRODUCT_MARKET_ALT_SPREAD,
  PRODUCT_MARKET_ALT_TOTAL,
  PRODUCT_MARKETS,
  type ExtractedProductPrice,
  type ProductMarket,
} from "./espn-product-prices.js";

/** `source` stamped on every row this leg persists — distinct from the
 *  keyless leg's "espn-public-dk", the US refresh's "the-odds-api", and
 *  the Pinnacle leg's "the-odds-api-eu" in the same table. */
export const ODDSAPI_LINE_ARCHIVE_SOURCE = "oddsapi";

/**
 * Markets requested in the single event-odds call per capture: the
 * featured three (duplicate-guard context + moneyline cross-check) and
 * the two alternate markets that are this leg's products.
 */
export const ODDSAPI_EVENT_MARKETS = [
  "h2h",
  "spreads",
  "totals",
  "alternate_spreads",
  "alternate_totals",
] as const;

/** Alternate captures only for games kicking off within this horizon. */
export const ODDSAPI_CAPTURE_WINDOW_HOURS = 48;

/** At most this many captures per game across this leg's history. */
export const ODDSAPI_MAX_CAPTURES_PER_GAME = 3;

/** Projected monthly burn (credits) above which the alt capture aborts. */
export const ODDSAPI_MONTHLY_BURN_CAP = 2_000;

/**
 * Book preference for the single book persisted per capture. DraftKings
 * first: it is the book the rest of this archive carries (the keyless
 * leg's `espn_public` rows ARE DraftKings lines), so keyed ladders join
 * the featured series book-for-book. Books outside the list rank after
 * it, in payload order.
 */
export const ODDSAPI_BOOK_PREFERENCE = [
  "draftkings",
  "fanduel",
  "betmgm",
  "caesars",
] as const;

// ── monthly-burn projection ─────────────────────────────────────────────

/** NFL slate size used by the projection (a full week is 16 games). */
export const ODDSAPI_PROJECTION_GAMES_PER_SLATE = 16;
/** Slates per month used by the projection (generous: 5, not 4.33). */
export const ODDSAPI_PROJECTION_SLATES_PER_MONTH = 5;

/**
 * Pre-measurement per-capture estimate: one credit per requested market
 * in one region — the request's own shape, used ONLY until the first
 * header delta is measured, and labeled an estimate wherever reported.
 */
export function estimatePerCaptureCredits(): number {
  return ODDSAPI_EVENT_MARKETS.length;
}

/**
 * The leg's projected monthly burn at the capped cadence:
 * per-capture cost × captures-per-game cap × games per slate × slates
 * per month. Deterministic; the run aborts the alt capture when this
 * exceeds ODDSAPI_MONTHLY_BURN_CAP.
 */
export function projectedMonthlyBurn(perCaptureCredits: number): number {
  return (
    perCaptureCredits *
    ODDSAPI_MAX_CAPTURES_PER_GAME *
    ODDSAPI_PROJECTION_GAMES_PER_SLATE *
    ODDSAPI_PROJECTION_SLATES_PER_MONTH
  );
}

// ── payload walking (strict, never coerce) ──────────────────────────────

type Loose = Record<string, unknown>;

function asLoose(v: unknown): Loose | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Loose)
    : null;
}

function numValue(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/^\+/, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function americanPrice(v: unknown): number | null {
  const n = numValue(v);
  return n !== null && n !== 0 ? Math.round(n) : null;
}

interface LooseOutcome {
  readonly name: string;
  readonly price: number | null;
  readonly point: number | null;
}

interface LooseMarket {
  readonly key: string;
  readonly outcomes: readonly LooseOutcome[];
}

interface LooseBookmaker {
  readonly key: string;
  readonly markets: readonly LooseMarket[];
}

function parseOutcome(v: unknown): LooseOutcome | null {
  const obj = asLoose(v);
  if (!obj || typeof obj["name"] !== "string" || !obj["name"].trim()) {
    return null;
  }
  return {
    name: obj["name"].trim(),
    price: americanPrice(obj["price"]),
    point: numValue(obj["point"]),
  };
}

function parseBookmakers(payload: unknown): LooseBookmaker[] {
  const event = asLoose(payload);
  const rawBooks = event?.["bookmakers"];
  if (!Array.isArray(rawBooks)) return [];
  const books: LooseBookmaker[] = [];
  for (const rawBook of rawBooks) {
    const book = asLoose(rawBook);
    if (!book || typeof book["key"] !== "string") continue;
    const markets: LooseMarket[] = [];
    const rawMarkets = Array.isArray(book["markets"]) ? book["markets"] : [];
    for (const rawMarket of rawMarkets) {
      const market = asLoose(rawMarket);
      if (!market || typeof market["key"] !== "string") continue;
      const outcomes: LooseOutcome[] = [];
      const rawOutcomes = Array.isArray(market["outcomes"])
        ? market["outcomes"]
        : [];
      for (const rawOutcome of rawOutcomes) {
        const outcome = parseOutcome(rawOutcome);
        if (outcome) outcomes.push(outcome);
      }
      markets.push({ key: market["key"], outcomes });
    }
    books.push({ key: book["key"], markets });
  }
  return books;
}

function marketOf(book: LooseBookmaker, key: string): LooseMarket | null {
  return book.markets.find((m) => m.key === key) ?? null;
}

function bookRank(key: string): number {
  const idx = (ODDSAPI_BOOK_PREFERENCE as readonly string[]).indexOf(key);
  return idx >= 0 ? idx : ODDSAPI_BOOK_PREFERENCE.length;
}

/** The one book this capture persists: preference-first among books
 *  carrying an alternate market; if none does, preference-first among
 *  all books (featured reporting / cross-check still have a source). */
function chooseBook(books: readonly LooseBookmaker[]): LooseBookmaker | null {
  if (books.length === 0) return null;
  const ranked = books
    .map((book, i) => ({ book, i }))
    .sort((a, b) => bookRank(a.book.key) - bookRank(b.book.key) || a.i - b.i);
  const withAlt = ranked.find(
    ({ book }) =>
      marketOf(book, "alternate_spreads") || marketOf(book, "alternate_totals"),
  );
  return (withAlt ?? ranked[0])!.book;
}

// ── extraction ──────────────────────────────────────────────────────────

export interface OddsApiFeaturedLines {
  readonly moneylineHome: number | null;
  readonly moneylineAway: number | null;
  /** Home outcome's point in the featured spreads market (negative for
   *  a home favorite); the away line is its negation, as the archive
   *  derives it. */
  readonly spreadHomeLine: number | null;
  readonly spreadHomePrice: number | null;
  readonly spreadAwayPrice: number | null;
  readonly totalLine: number | null;
  readonly overPrice: number | null;
  readonly underPrice: number | null;
}

export type MoneylineCrossCheck = "match" | "mismatch" | "not_checked";

export interface OddsApiProductExtraction {
  readonly rows: readonly ExtractedProductPrice[];
  /** The bookmaker key the rows (and featured lines) came from. */
  readonly book: string | null;
  /** Alternate market arrays present on the chosen book. */
  readonly laddersFound: number;
  /** Ladder outcomes rejected by strict validation or de-duplication. */
  readonly entriesDropped: number;
  /** Ladder rungs dropped as identical to the featured row. */
  readonly featuredRungsDropped: number;
  readonly altSpreadExposed: boolean;
  readonly altTotalExposed: boolean;
  /** The chosen book's featured lines from the same payload, or null
   *  when the payload carried no bookmaker at all. */
  readonly featured: OddsApiFeaturedLines | null;
  readonly moneylineCrossCheck: MoneylineCrossCheck;
}

export interface OddsApiExtractionContext {
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** The featured moneyline this capture is checked against (e.g. the
   *  keyless archive's ESPN/DK prices for the same game), when known. */
  readonly expectedMoneyline?: { home: number; away: number } | null;
}

function sideForTeamOutcome(
  name: string,
  ctx: OddsApiExtractionContext,
): "home" | "away" | null {
  const n = name.trim().toLowerCase();
  if (n === "home") return "home";
  if (n === "away") return "away";
  if (n === ctx.homeTeam.trim().toLowerCase()) return "home";
  if (n === ctx.awayTeam.trim().toLowerCase()) return "away";
  return null;
}

function featuredFromBook(
  book: LooseBookmaker,
  ctx: OddsApiExtractionContext,
): OddsApiFeaturedLines {
  const featured: OddsApiFeaturedLines = {
    moneylineHome: null,
    moneylineAway: null,
    spreadHomeLine: null,
    spreadHomePrice: null,
    spreadAwayPrice: null,
    totalLine: null,
    overPrice: null,
    underPrice: null,
  };
  const out = { ...featured };

  const h2h = marketOf(book, "h2h");
  if (h2h) {
    for (const o of h2h.outcomes) {
      const side = sideForTeamOutcome(o.name, ctx);
      if (side === "home") out.moneylineHome = o.price;
      else if (side === "away") out.moneylineAway = o.price;
    }
  }
  const spreads = marketOf(book, "spreads");
  if (spreads) {
    for (const o of spreads.outcomes) {
      const side = sideForTeamOutcome(o.name, ctx);
      if (side === "home") {
        out.spreadHomeLine = o.point;
        out.spreadHomePrice = o.price;
      } else if (side === "away") {
        out.spreadAwayPrice = o.price;
      }
    }
  }
  const totals = marketOf(book, "totals");
  if (totals) {
    for (const o of totals.outcomes) {
      const n = o.name.trim().toLowerCase();
      if (n === "over" || n === "o") {
        out.totalLine = o.point;
        out.overPrice = o.price;
      } else if (n === "under" || n === "u") {
        out.totalLine = out.totalLine ?? o.point;
        out.underPrice = o.price;
      }
    }
  }
  return out;
}

/** A ladder rung duplicates the featured row — same market family,
 *  side, line AND price as the chosen book's featured market. */
function isFeaturedRung(
  row: ExtractedProductPrice,
  featured: OddsApiFeaturedLines,
): boolean {
  if (row.market === PRODUCT_MARKET_ALT_SPREAD) {
    if (featured.spreadHomeLine === null) return false;
    const featuredLine =
      row.side === "home"
        ? featured.spreadHomeLine
        : -featured.spreadHomeLine + 0;
    const featuredPrice =
      row.side === "home" ? featured.spreadHomePrice : featured.spreadAwayPrice;
    return row.line === featuredLine && featuredPrice !== null && row.price === featuredPrice;
  }
  if (featured.totalLine === null) return false;
  const featuredPrice =
    row.side === "over" ? featured.overPrice : featured.underPrice;
  return row.line === featured.totalLine && featuredPrice !== null && row.price === featuredPrice;
}

/**
 * Extract every genuinely-present alternate-line row from one event's
 * Odds API event-odds payload. Pure; never throws on malformed input —
 * malformed outcomes surface as `entriesDropped`, absent ladders as
 * exposure=false.
 */
export function extractOddsApiProductPrices(
  payload: unknown,
  ctx: OddsApiExtractionContext,
): OddsApiProductExtraction {
  const books = parseBookmakers(payload);
  const book = chooseBook(books);
  if (!book) {
    return {
      rows: [],
      book: null,
      laddersFound: 0,
      entriesDropped: 0,
      featuredRungsDropped: 0,
      altSpreadExposed: false,
      altTotalExposed: false,
      featured: null,
      moneylineCrossCheck: "not_checked",
    };
  }

  const featured = featuredFromBook(book, ctx);
  const rows: ExtractedProductPrice[] = [];
  const seen = new Set<string>();
  let laddersFound = 0;
  let entriesDropped = 0;
  let featuredRungsDropped = 0;

  const ladderSpecs: readonly {
    key: string;
    market: ProductMarket;
    teamSides: boolean;
  }[] = [
    { key: "alternate_spreads", market: PRODUCT_MARKET_ALT_SPREAD, teamSides: true },
    { key: "alternate_totals", market: PRODUCT_MARKET_ALT_TOTAL, teamSides: false },
  ];

  for (const spec of ladderSpecs) {
    const ladder = marketOf(book, spec.key);
    if (!ladder) continue;
    laddersFound++;
    for (const outcome of ladder.outcomes) {
      const side = spec.teamSides
        ? sideForTeamOutcome(outcome.name, ctx)
        : outcome.name.trim().toLowerCase() === "over" ||
            outcome.name.trim().toLowerCase() === "o"
          ? "over"
          : outcome.name.trim().toLowerCase() === "under" ||
              outcome.name.trim().toLowerCase() === "u"
            ? "under"
            : null;
      if (side === null || outcome.price === null || outcome.point === null) {
        entriesDropped++;
        continue;
      }
      const row: ExtractedProductPrice = {
        market: spec.market,
        side,
        price: outcome.price,
        line: outcome.point,
      };
      const dedupeKey = `${row.market}|${row.side}|${row.line}|${row.price}`;
      if (seen.has(dedupeKey)) {
        entriesDropped++;
        continue;
      }
      seen.add(dedupeKey);
      if (isFeaturedRung(row, featured)) {
        featuredRungsDropped++;
        continue;
      }
      rows.push(row);
    }
  }

  let moneylineCrossCheck: MoneylineCrossCheck = "not_checked";
  const expected = ctx.expectedMoneyline ?? null;
  if (
    expected &&
    featured.moneylineHome !== null &&
    featured.moneylineAway !== null
  ) {
    moneylineCrossCheck =
      featured.moneylineHome === expected.home &&
      featured.moneylineAway === expected.away
        ? "match"
        : "mismatch";
  }

  return {
    rows,
    book: book.key,
    laddersFound,
    entriesDropped,
    featuredRungsDropped,
    altSpreadExposed: rows.some((r) => r.market === PRODUCT_MARKET_ALT_SPREAD),
    altTotalExposed: rows.some((r) => r.market === PRODUCT_MARKET_ALT_TOTAL),
    featured,
    moneylineCrossCheck,
  };
}

// ── runner ──────────────────────────────────────────────────────────────

/** The vendor's quota headers as one response reported them. Null when
 *  the header was absent — a header-less response is NOT a zero-credit
 *  reading (same rule as OddsApiClient's OddsApiFetchResult). */
export interface OddsApiQuotaReading {
  readonly usedRequests: number | null;
  readonly remainingRequests: number | null;
}

export interface OddsApiProductPriceArchiverDeps {
  /** The Odds API events list (no odds) — production binds
   *  OddsApiClient#getEvents. Quota readings ride along for accounting. */
  fetchEvents: (
    sportKey: string,
  ) => Promise<
    { events: readonly OddsApiEvent[]; error?: string } & OddsApiQuotaReading
  >;
  /** One event-odds call per capture — production binds
   *  OddsApiClient#getEventOdds with ODDSAPI_EVENT_MARKETS. Throwing
   *  fails only that event; returning `error` does the same while
   *  still contributing its quota readings. */
  fetchEventOdds: (
    event: OddsApiEvent,
  ) => Promise<{ data: unknown; error?: string } & OddsApiQuotaReading>;
  /** Odds API event → canonical Game.id, or null when not tracked. */
  resolveGameId: (event: OddsApiEvent) => Promise<string | null>;
  /** This leg's prior capture count for the game — DISTINCT capturedAt
   *  values among rows with this leg's source. Enforces the cadence cap
   *  BEFORE any API call is spent on the game. */
  priorCaptureCount: (gameId: string) => Promise<number>;
  /** Featured moneyline per Odds API event id for the cross-check,
   *  when the wiring can supply it (dry-run: from the keyless ESPN
   *  board it already fetched for game resolution). */
  expectedMoneylineByEventId?: ReadonlyMap<
    string,
    { home: number; away: number }
  >;
  /** The featured leg's store seam — product rows are the same shape
   *  under additive market values. */
  store: LineArchiveStore;
  now?: () => Date;
  logPrefix?: string;
}

export interface OddsApiGameFeatured {
  readonly gameId: string;
  readonly eventId: string;
  readonly book: string | null;
  readonly featured: OddsApiFeaturedLines | null;
  readonly moneylineCrossCheck: MoneylineCrossCheck;
}

export interface OddsApiCreditAccounting {
  /** Measured delta of x-requests-used across the events-list call —
   *  null when no baseline reading existed to diff against. */
  readonly eventsListCost: number | null;
  /** Realized per-capture cost: the x-requests-used delta of the most
   *  recent event-odds call. Null until one is measured. */
  readonly perCaptureCost: number | null;
  /** Whether perCaptureCost (or the value the projection used) is a
   *  header measurement or the market-count estimate. */
  readonly perCaptureCostSource: "measured" | "estimate";
  /** Sum of measured deltas across this run's event-odds calls. */
  readonly totalEventOddsCredits: number;
  /** Latest x-requests-used header seen (account cumulative). */
  readonly usedRequests: number | null;
  /** Latest x-requests-remaining header seen. */
  readonly remainingRequests: number | null;
  /** Projected monthly burn at the capped cadence, from the per-capture
   *  cost in effect when the run ended (or aborted). */
  readonly projectedMonthlyBurn: number;
  readonly monthlyBurnCap: number;
  readonly abortedForBudget: boolean;
}

export interface OddsApiProductPriceArchiverResult {
  /** ISO-8601 UTC — the single capture timestamp shared by every row. */
  readonly capturedAt: string;
  readonly fetchedEvents: number;
  /** Events kicking off within the 48h capture window. */
  readonly windowEvents: number;
  readonly skippedStartedOrInvalid: number;
  /** Kickoff beyond the 48h window — never fetched, by the budget. */
  readonly skippedBeyondWindow: number;
  /** In-window, resolved, under-cap games whose odds were fetched. */
  readonly gamesScanned: number;
  /** In-window games skipped at the 3-capture cap (no API call made). */
  readonly gamesSkippedCaptureCap: number;
  /** In-window games never reached because the budget aborted the run. */
  readonly gamesSkippedBudget: number;
  readonly productRowsPersisted: number;
  readonly altSpreadRows: number;
  readonly altTotalRows: number;
  readonly gamesWithAltSpread: number;
  readonly gamesWithAltTotal: number;
  /** Product classes exposed by NO book on the whole slate — the run's
   *  GAP finding. Empty when nothing was scanned. */
  readonly gaps: readonly ProductMarket[];
  readonly moneylineCrossChecks: {
    readonly match: number;
    readonly mismatch: number;
    readonly notChecked: number;
  };
  /** Per-game featured lines from the capture payloads — the operator's
   *  cross-check surface against the featured archive. */
  readonly featuredByGame: readonly OddsApiGameFeatured[];
  readonly credits: OddsApiCreditAccounting;
  readonly unresolvedEventIds: readonly string[];
  readonly errors: readonly string[];
}

export function zeroOddsApiProductPriceArchiverResult(
  capturedAt: Date,
): OddsApiProductPriceArchiverResult {
  return {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: 0,
    windowEvents: 0,
    skippedStartedOrInvalid: 0,
    skippedBeyondWindow: 0,
    gamesScanned: 0,
    gamesSkippedCaptureCap: 0,
    gamesSkippedBudget: 0,
    productRowsPersisted: 0,
    altSpreadRows: 0,
    altTotalRows: 0,
    gamesWithAltSpread: 0,
    gamesWithAltTotal: 0,
    gaps: [],
    moneylineCrossChecks: { match: 0, mismatch: 0, notChecked: 0 },
    featuredByGame: [],
    credits: {
      eventsListCost: null,
      perCaptureCost: null,
      perCaptureCostSource: "estimate",
      totalEventOddsCredits: 0,
      usedRequests: null,
      remainingRequests: null,
      projectedMonthlyBurn: projectedMonthlyBurn(estimatePerCaptureCredits()),
      monthlyBurnCap: ODDSAPI_MONTHLY_BURN_CAP,
      abortedForBudget: false,
    },
    unresolvedEventIds: [],
    errors: [],
  };
}

/**
 * One keyed product-price run. Un-gated — the caller owns the gate
 * (production goes through runOddsApiProductPriceArchiverIfEnabled; the
 * CLI's --dry-run is an explicit operator action). Never throws for
 * upstream/store failures. Budget rules are enforced here, before spend.
 */
export async function runOddsApiProductPriceArchiver(
  deps: OddsApiProductPriceArchiverDeps,
): Promise<OddsApiProductPriceArchiverResult> {
  const now = deps.now ?? (() => new Date());
  const logPrefix = deps.logPrefix ?? "[line-archiver-oddsapi]";
  const capturedAt = now();
  const errors: string[] = [];
  const zero = zeroOddsApiProductPriceArchiverResult(capturedAt);

  // Quota bookkeeping: prevUsed is the last x-requests-used reading;
  // a call's realized cost is the delta across it.
  let prevUsed: number | null = null;
  let latestRemaining: number | null = null;
  let eventsListCost: number | null = null;
  let perCaptureCost: number | null = null;
  let totalEventOddsCredits = 0;

  const noteQuota = (
    reading: OddsApiQuotaReading,
  ): { delta: number | null } => {
    let delta: number | null = null;
    if (reading.usedRequests !== null) {
      if (prevUsed !== null) delta = reading.usedRequests - prevUsed;
      prevUsed = reading.usedRequests;
    }
    if (reading.remainingRequests !== null) {
      latestRemaining = reading.remainingRequests;
    }
    return { delta };
  };
  const perCaptureForProjection = (): number =>
    perCaptureCost ?? estimatePerCaptureCredits();

  let fetched: { events: readonly OddsApiEvent[]; error?: string } & OddsApiQuotaReading;
  try {
    fetched = await deps.fetchEvents(LINE_ARCHIVER_SPORT_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...zero, errors: [`fetch failed: ${message}`] };
  }
  if (fetched.error) errors.push(fetched.error);
  eventsListCost = noteQuota(fetched).delta;

  const events = fetched.events;
  const window = selectEventsInWindow(
    events,
    capturedAt,
    ODDSAPI_CAPTURE_WINDOW_HOURS / 24,
  );

  let gamesScanned = 0;
  let gamesSkippedCaptureCap = 0;
  let gamesSkippedBudget = 0;
  let productRowsPersisted = 0;
  let altSpreadRows = 0;
  let altTotalRows = 0;
  let gamesWithAltSpread = 0;
  let gamesWithAltTotal = 0;
  let abortedForBudget = false;
  const crossChecks = { match: 0, mismatch: 0, notChecked: 0 };
  const featuredByGame: OddsApiGameFeatured[] = [];
  const unresolvedEventIds: string[] = [];

  for (const event of window.selected) {
    if (abortedForBudget) {
      gamesSkippedBudget++;
      continue;
    }
    try {
      const gameId = await deps.resolveGameId(event);
      if (!gameId) {
        unresolvedEventIds.push(event.id);
        continue;
      }

      // Cadence cap — enforced BEFORE any credit is spent on the game.
      const priorCaptures = await deps.priorCaptureCount(gameId);
      if (priorCaptures >= ODDSAPI_MAX_CAPTURES_PER_GAME) {
        gamesSkippedCaptureCap++;
        continue;
      }

      // Burn cap — projected at the capped cadence from the best
      // per-capture cost known (measured once available, else the
      // request-shape estimate). Crossing it aborts the alt capture
      // for the rest of the run; other legs are separate modules and
      // are unaffected.
      if (
        projectedMonthlyBurn(perCaptureForProjection()) >
        ODDSAPI_MONTHLY_BURN_CAP
      ) {
        abortedForBudget = true;
        gamesSkippedBudget++;
        errors.push(
          `budget abort: projected monthly burn ${projectedMonthlyBurn(perCaptureForProjection())} ` +
            `exceeds cap ${ODDSAPI_MONTHLY_BURN_CAP} credits — alt capture stopped, ` +
            `remaining games unscanned`,
        );
        continue;
      }

      const response = await deps.fetchEventOdds(event);
      const { delta } = noteQuota(response);
      if (delta !== null) {
        perCaptureCost = delta;
        totalEventOddsCredits += delta;
      }
      if (response.error) {
        errors.push(`event ${event.id}: ${response.error}`);
        continue;
      }
      gamesScanned++;

      const extraction = extractOddsApiProductPrices(response.data, {
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        expectedMoneyline:
          deps.expectedMoneylineByEventId?.get(event.id) ?? null,
      });
      if (extraction.moneylineCrossCheck === "match") crossChecks.match++;
      else if (extraction.moneylineCrossCheck === "mismatch") {
        crossChecks.mismatch++;
      } else crossChecks.notChecked++;
      featuredByGame.push({
        gameId,
        eventId: event.id,
        book: extraction.book,
        featured: extraction.featured,
        moneylineCrossCheck: extraction.moneylineCrossCheck,
      });
      if (extraction.altSpreadExposed) gamesWithAltSpread++;
      if (extraction.altTotalExposed) gamesWithAltTotal++;
      if (extraction.rows.length === 0 || !extraction.book) continue;

      const existing = await deps.store.existingMarkets(gameId, PRODUCT_MARKETS);
      const insertRows: LineArchiveInsertRow[] = extraction.rows.map((row) => ({
        gameId,
        capturedAt,
        phase: classifyLineArchivePhase(existing, row.market),
        book: extraction.book as string,
        market: row.market,
        side: row.side,
        price: row.price,
        line: row.line,
        source: ODDSAPI_LINE_ARCHIVE_SOURCE,
      }));
      const appended = await deps.store.append(insertRows);
      productRowsPersisted += appended;
      if (appended > 0) {
        altSpreadRows += extraction.rows.filter(
          (r) => r.market === PRODUCT_MARKET_ALT_SPREAD,
        ).length;
        altTotalRows += extraction.rows.filter(
          (r) => r.market === PRODUCT_MARKET_ALT_TOTAL,
        ).length;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`event ${event.id}: ${message}`);
    }
  }

  const gaps: ProductMarket[] =
    gamesScanned === 0
      ? []
      : [
          ...(gamesWithAltSpread === 0
            ? [PRODUCT_MARKET_ALT_SPREAD as ProductMarket]
            : []),
          ...(gamesWithAltTotal === 0
            ? [PRODUCT_MARKET_ALT_TOTAL as ProductMarket]
            : []),
        ];

  const result: OddsApiProductPriceArchiverResult = {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: events.length,
    windowEvents: window.selected.length,
    skippedStartedOrInvalid: window.skippedStartedOrInvalid,
    skippedBeyondWindow: window.skippedBeyondWindow,
    gamesScanned,
    gamesSkippedCaptureCap,
    gamesSkippedBudget,
    productRowsPersisted,
    altSpreadRows,
    altTotalRows,
    gamesWithAltSpread,
    gamesWithAltTotal,
    gaps,
    moneylineCrossChecks: crossChecks,
    featuredByGame,
    credits: {
      eventsListCost,
      perCaptureCost,
      perCaptureCostSource: perCaptureCost !== null ? "measured" : "estimate",
      totalEventOddsCredits,
      usedRequests: prevUsed,
      remainingRequests: latestRemaining,
      projectedMonthlyBurn: projectedMonthlyBurn(perCaptureForProjection()),
      monthlyBurnCap: ODDSAPI_MONTHLY_BURN_CAP,
      abortedForBudget,
    },
    unresolvedEventIds,
    errors,
  };
  console.log(
    `${logPrefix} oddsapi products run capturedAt=${result.capturedAt} fetched=${result.fetchedEvents} ` +
      `window=${result.windowEvents} scanned=${result.gamesScanned} rows=${result.productRowsPersisted} ` +
      `creditsPerCapture=${result.credits.perCaptureCost ?? "unmeasured"} ` +
      `projectedMonthly=${result.credits.projectedMonthlyBurn}/${result.credits.monthlyBurnCap} ` +
      `gaps=${result.gaps.join(",") || "none"} unresolved=${result.unresolvedEventIds.length} ` +
      `errors=${result.errors.length}`,
  );
  return result;
}

export interface OddsApiProductPriceArchiverIfEnabledResult
  extends OddsApiProductPriceArchiverResult {
  readonly enabled: boolean;
}

/**
 * HARD GATE — the only entry point production code should call. Unless
 * LINE_ARCHIVE_ENABLED=true this returns `{ enabled: false }` having made
 * ZERO fetch calls and ZERO store calls (the deps are never invoked).
 */
export async function runOddsApiProductPriceArchiverIfEnabled(
  deps: OddsApiProductPriceArchiverDeps,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OddsApiProductPriceArchiverIfEnabledResult> {
  if (!isLineArchiveEnabled(env)) {
    return {
      enabled: false,
      ...zeroOddsApiProductPriceArchiverResult((deps.now ?? (() => new Date()))()),
    };
  }
  const result = await runOddsApiProductPriceArchiver(deps);
  return { enabled: true, ...result };
}
