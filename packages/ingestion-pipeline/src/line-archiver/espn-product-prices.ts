/**
 * espn-product-prices.ts — the product-price extension of the ESPN/DK line
 * archiver (see espn-line-archive.ts for the featured leg and README.md in
 * this folder for the operator runbook, including the GAP table).
 *
 * WHY THIS EXISTS: SPEC-B (the pick spec) can only score products the
 * archive actually captures — alternate spread/total lines, buy-point
 * prices, teaser-relevant prices. The featured leg archives exactly the
 * main line (SPREAD / MONEYLINE / TOTAL, 6 rows per game). This leg is the
 * additive counterpart: it probes the keyless ESPN surfaces per event for
 * alternate-line ladders and persists whatever genuinely exists as
 * OddsLineSnapshot rows under the additive market values ALT_SPREAD /
 * ALT_TOTAL — field-for-field the featured row shape, the same stores, the
 * same serializer, the same OPEN/INTERIM phase classification per
 * (gameId, market), the same source stamp ("espn-public-dk"). Existing
 * rows and consumers are untouched: ALT_* rows are new market values, and
 * a consumer filtering on the featured markets never sees them.
 *
 * WHAT THE KEYLESS SURFACES ACTUALLY EXPOSE (verified live 2026-10-15
 * against event 401872995, SEA@DEN — see README "Product-price gaps"):
 * the ESPN scoreboard inline odds block, the ESPN summary pickcenter (its
 * bet-type links enumerate only Moneyline / Point Spread / Total), and
 * the ESPN core-API odds index + provider detail all carry the MAIN line
 * only (open + current). No alternate ladder is published on any of them.
 * DraftKings' own guest API (sportsbook-nash.draftkings.com) answers
 * HTTP 403 (Akamai edge) from the capture environment, so its contents
 * are unverifiable from here and are NOT routed around. This leg
 * therefore captures zero product rows today — by evidence, not by
 * assumption: every run re-probes the surfaces, reports per-class
 * exposure, and names the unexposed classes in `gaps`. The day a keyless
 * surface ships a ladder, this leg archives it with no code change.
 *
 * EXTRACTION CONTRACT (never invent a price): a ladder is an array found
 * under a key whose path names it an alternate (key matches /alternat/i)
 * AND names its market (path matches /spread/i → ALT_SPREAD, /total/i or
 * /overunder/i → ALT_TOTAL). Entries are accepted in the two forms
 * ESPN/DK-shaped JSON uses for priced outcomes:
 *   - outcome form: { name, price, point } (the OddsApiMarket outcome
 *     shape this codebase already consumes) — side from the name
 *     (team name / home / away for spreads, Over / Under for totals);
 *   - side form: { home: { line, price }, away: { line, price } } or
 *     { over: { line, price }, under: { line, price } }.
 * Every value is strictly validated (finite point, finite non-zero
 * American price, resolvable side); anything else is dropped and
 * counted, never coerced. A rung identical to the featured row (same
 * market, side, line AND price) is the main line wearing a ladder's
 * clothing — it is dropped and counted separately, so the featured price
 * is never double-archived as a product.
 *
 * DELIBERATELY NOT CAPTURED: the payloads also carry each book's OPENING
 * line next to the current one. An opening price is not a product price,
 * and stamping it with this run's capturedAt would falsify the series
 * (phase OPEN already means "first captured", not "opened at"). This leg
 * leaves open lines alone.
 *
 * GATING mirrors the featured leg: the production entry point
 * (`runEspnProductPriceArchiverIfEnabled`) hard-gates on
 * LINE_ARCHIVE_ENABLED=true; the un-gated runner backs the operator CLI's
 * explicit --dry-run. Failure isolation mirrors it too: one event's
 * payload failure is recorded in `errors` and the slate continues.
 */

import type { OddsApiEvent } from "@sports/types";
import { isLineArchiveEnabled } from "../line-archive.js";
import {
  classifyLineArchivePhase,
  selectEventsInWindow,
  ESPN_LINE_ARCHIVE_SOURCE,
  LINE_ARCHIVER_MAX_EVENTS,
  LINE_ARCHIVER_SPORT_KEY,
  LINE_ARCHIVER_WINDOW_DAYS,
  type LineArchiveInsertRow,
  type LineArchiveStore,
} from "./espn-line-archive.js";

/** Additive market values this leg persists. Featured markets
 *  (SPREAD / MONEYLINE / TOTAL) belong to espn-line-archive.ts. */
export const PRODUCT_MARKET_ALT_SPREAD = "ALT_SPREAD";
export const PRODUCT_MARKET_ALT_TOTAL = "ALT_TOTAL";
export const PRODUCT_MARKETS = [
  PRODUCT_MARKET_ALT_SPREAD,
  PRODUCT_MARKET_ALT_TOTAL,
] as const;
export type ProductMarket = (typeof PRODUCT_MARKETS)[number];

/** Book key for product rows — the only book the keyless payloads carry
 *  is the ESPN-routed DraftKings block, keyed `espn_public` by codebase
 *  law (see espn-line-archive.ts). */
export const PRODUCT_PRICE_BOOK = "espn_public";

/** Keyless surfaces consulted per event (named for exposure accounting;
 *  the production fetcher lives in run-product-prices.ts). */
export const PRODUCT_SOURCE_CORE_ODDS = "espn-core-odds";
export const PRODUCT_SOURCE_SUMMARY_PICKCENTER = "espn-summary-pickcenter";

/**
 * The raw per-event payloads the extractor reads. Both are the verbatim
 * JSON of keyless ESPN responses — the extractor, not the fetcher, owns
 * every interpretation, so tests drive it with real captured payloads.
 */
export interface ProductPricePayloads {
  /** ESPN core-API provider odds detail objects (one per provider the
   *  event's odds index lists). */
  readonly coreProviderDetails: readonly unknown[];
  /** ESPN summary `pickcenter` array (0–n provider entries). */
  readonly summaryPickcenter: readonly unknown[];
  /** Surfaces that were actually consulted (subset of the
   *  PRODUCT_SOURCE_* constants) — a surface that failed to fetch is
   *  absent here, never claimed. */
  readonly sourcesChecked: readonly string[];
}

export interface ProductExtractionContext {
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** The featured (main) line for the duplicate guard, when known:
   *  the home side's spread point and the total point. */
  readonly featuredSpreadHomeLine?: number | null;
  readonly featuredTotalLine?: number | null;
  /** Featured prices by `${market}:${side}` for the duplicate guard. */
  readonly featuredPrices?: ReadonlyMap<string, number>;
}

export interface ExtractedProductPrice {
  readonly market: ProductMarket;
  /** "home" | "away" for ALT_SPREAD; "over" | "under" for ALT_TOTAL. */
  readonly side: string;
  /** American odds. */
  readonly price: number;
  /** The side's own point (ALT_SPREAD) or the total point (ALT_TOTAL). */
  readonly line: number;
}

export interface ProductExtraction {
  readonly rows: readonly ExtractedProductPrice[];
  /** Alternate-named ladder arrays found in the payloads. */
  readonly laddersFound: number;
  /** Ladder entries rejected by strict validation. */
  readonly entriesDropped: number;
  /** Ladder rungs dropped as identical to the featured row. */
  readonly featuredRungsDropped: number;
  /** True iff at least one valid row was extracted for the class. */
  readonly altSpreadExposed: boolean;
  readonly altTotalExposed: boolean;
}

// ── payload walking ─────────────────────────────────────────────────────

type Loose = Record<string, unknown>;

function asLoose(v: unknown): Loose | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Loose)
    : null;
}

/** Finite number from a number or a numeric string ("-2.5", "+120").
 *  Null for anything else — no coercion of booleans, no NaN passage. */
function numValue(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/^\+/, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** American price: a finite, non-zero number (0 is not a price). */
function americanPrice(v: unknown): number | null {
  const n = numValue(v);
  return n !== null && n !== 0 ? Math.round(n) : null;
}

function firstNum(obj: Loose, keys: readonly string[]): number | null {
  for (const k of keys) {
    const n = numValue(obj[k]);
    if (n !== null) return n;
  }
  return null;
}

function firstPrice(obj: Loose, keys: readonly string[]): number | null {
  for (const k of keys) {
    const p = americanPrice(obj[k]);
    if (p !== null) return p;
  }
  return null;
}

const PRICE_KEYS = ["price", "odds", "american"] as const;
const POINT_KEYS = ["point", "line", "points"] as const;

interface LadderHit {
  readonly market: ProductMarket;
  readonly entries: readonly unknown[];
}

/** Market named by a key path, iff the path also names it an alternate. */
function ladderMarketForPath(path: string): ProductMarket | null {
  if (!/alternat/i.test(path)) return null;
  if (/spread/i.test(path)) return PRODUCT_MARKET_ALT_SPREAD;
  if (/total|overunder/i.test(path)) return PRODUCT_MARKET_ALT_TOTAL;
  return null;
}

function findAlternateLadders(
  node: unknown,
  path: string,
  out: LadderHit[],
): void {
  if (Array.isArray(node)) {
    const market = ladderMarketForPath(path);
    if (market) {
      out.push({ market, entries: node });
      return; // a ladder's entries are leaves for this walk
    }
    for (const item of node) findAlternateLadders(item, path, out);
    return;
  }
  const obj = asLoose(node);
  if (!obj) return;
  for (const [key, value] of Object.entries(obj)) {
    findAlternateLadders(value, path ? `${path}.${key}` : key, out);
  }
}

// ── ladder entry parsing ────────────────────────────────────────────────

function resolveSpreadSide(
  rawName: unknown,
  ctx: ProductExtractionContext,
): "home" | "away" | null {
  if (typeof rawName !== "string" || !rawName.trim()) return null;
  const name = rawName.trim().toLowerCase();
  if (name === "home") return "home";
  if (name === "away") return "away";
  if (name === ctx.homeTeam.trim().toLowerCase()) return "home";
  if (name === ctx.awayTeam.trim().toLowerCase()) return "away";
  return null;
}

function resolveTotalSide(rawName: unknown): "over" | "under" | null {
  if (typeof rawName !== "string") return null;
  const name = rawName.trim().toLowerCase();
  if (name === "over" || name === "o") return "over";
  if (name === "under" || name === "u") return "under";
  return null;
}

interface ParseOutcome {
  readonly rows: ExtractedProductPrice[];
  readonly dropped: number;
}

/** One ladder entry → 0, 1, or 2 rows (outcome form yields ≤1, side form
 *  yields ≤2). Invalid halves of a side-form entry drop independently —
 *  a priced home rung is real even if its away twin is malformed. */
function parseLadderEntry(
  market: ProductMarket,
  entry: unknown,
  ctx: ProductExtractionContext,
): ParseOutcome {
  const obj = asLoose(entry);
  if (!obj) return { rows: [], dropped: 1 };

  const rows: ExtractedProductPrice[] = [];
  let dropped = 0;

  // Side form: { home: {line, price}, away: {...} } / { over, under }.
  const sideKeys =
    market === PRODUCT_MARKET_ALT_SPREAD
      ? (["home", "away"] as const)
      : (["over", "under"] as const);
  let sawSideForm = false;
  for (const side of sideKeys) {
    const sub = asLoose(obj[side]);
    if (!sub) continue;
    sawSideForm = true;
    const line = firstNum(sub, POINT_KEYS);
    const price = firstPrice(sub, PRICE_KEYS);
    if (line === null || price === null) {
      dropped++;
      continue;
    }
    rows.push({ market, side, price, line });
  }
  if (sawSideForm) return { rows, dropped };

  // Outcome form: { name, price, point }.
  const name = obj["name"] ?? obj["label"] ?? obj["side"];
  const side =
    market === PRODUCT_MARKET_ALT_SPREAD
      ? resolveSpreadSide(name, ctx)
      : resolveTotalSide(name);
  const price = firstPrice(obj, PRICE_KEYS);
  const line = firstNum(obj, POINT_KEYS);
  if (side === null || price === null || line === null) {
    return { rows: [], dropped: 1 };
  }
  rows.push({ market, side, price, line });
  return { rows, dropped: 0 };
}

/** The featured rung of a ladder duplicates the featured leg's row —
 *  same market family, side, line AND price. Featured SPREAD compares
 *  against ALT_SPREAD (the home line negates for the away side, exactly
 *  as toLineSnapshotRows derives it); TOTAL against ALT_TOTAL. */
function isFeaturedRung(
  row: ExtractedProductPrice,
  ctx: ProductExtractionContext,
): boolean {
  if (!ctx.featuredPrices) return false;
  const featuredMarket =
    row.market === PRODUCT_MARKET_ALT_SPREAD ? "SPREAD" : "TOTAL";
  const featuredLine =
    row.market === PRODUCT_MARKET_ALT_SPREAD
      ? row.side === "home"
        ? ctx.featuredSpreadHomeLine
        : ctx.featuredSpreadHomeLine != null
          ? -ctx.featuredSpreadHomeLine + 0
          : null
      : ctx.featuredTotalLine;
  if (featuredLine == null || row.line !== featuredLine) return false;
  return ctx.featuredPrices.get(`${featuredMarket}:${row.side}`) === row.price;
}

/**
 * The featured context the duplicate guard needs, derived from the first
 * core provider detail — the same payload the extractor already scans, so
 * the guard is always on for real payloads with no extra fetch. Returns
 * null when the detail doesn't carry the flat featured fields (the guard
 * then simply stays off; extraction is unaffected).
 */
function deriveFeaturedContext(
  payloads: ProductPricePayloads,
): Pick<
  ProductExtractionContext,
  "featuredSpreadHomeLine" | "featuredTotalLine" | "featuredPrices"
> | null {
  const detail = asLoose(payloads.coreProviderDetails[0]);
  if (!detail) return null;
  const home = asLoose(detail["homeTeamOdds"]);
  const away = asLoose(detail["awayTeamOdds"]);
  if (!home || !away) return null;
  const homeCurrent = asLoose(home["current"]);
  const homePointSpread = homeCurrent
    ? asLoose(homeCurrent["pointSpread"])
    : null;
  const featuredSpreadHomeLine = homePointSpread
    ? numValue(homePointSpread["american"])
    : null;
  const featuredTotalLine = numValue(detail["overUnder"]);
  const prices = new Map<string, number>();
  const homeSpread = americanPrice(home["spreadOdds"]);
  const awaySpread = americanPrice(away["spreadOdds"]);
  const over = americanPrice(detail["overOdds"]);
  const under = americanPrice(detail["underOdds"]);
  if (homeSpread !== null) prices.set("SPREAD:home", homeSpread);
  if (awaySpread !== null) prices.set("SPREAD:away", awaySpread);
  if (over !== null) prices.set("TOTAL:over", over);
  if (under !== null) prices.set("TOTAL:under", under);
  if (featuredSpreadHomeLine === null && featuredTotalLine === null) {
    return null;
  }
  return { featuredSpreadHomeLine, featuredTotalLine, featuredPrices: prices };
}

/**
 * Extract every genuinely-present alternate-line row from one event's
 * keyless payloads. Pure; never throws on malformed input — malformed
 * ladders surface as `entriesDropped`, absent ladders as exposure=false.
 * When the caller supplies no featured context, it is derived from the
 * payloads themselves (see deriveFeaturedContext).
 */
export function extractProductPrices(
  payloads: ProductPricePayloads,
  ctx: ProductExtractionContext,
): ProductExtraction {
  if (!ctx.featuredPrices) {
    const derived = deriveFeaturedContext(payloads);
    if (derived) ctx = { ...ctx, ...derived };
  }
  const ladders: LadderHit[] = [];
  for (const detail of payloads.coreProviderDetails) {
    findAlternateLadders(detail, "", ladders);
  }
  for (const entry of payloads.summaryPickcenter) {
    findAlternateLadders(entry, "", ladders);
  }

  const rows: ExtractedProductPrice[] = [];
  let entriesDropped = 0;
  let featuredRungsDropped = 0;
  for (const ladder of ladders) {
    for (const entry of ladder.entries) {
      const parsed = parseLadderEntry(ladder.market, entry, ctx);
      entriesDropped += parsed.dropped;
      for (const row of parsed.rows) {
        if (isFeaturedRung(row, ctx)) {
          featuredRungsDropped++;
          continue;
        }
        rows.push(row);
      }
    }
  }

  return {
    rows,
    laddersFound: ladders.length,
    entriesDropped,
    featuredRungsDropped,
    altSpreadExposed: rows.some((r) => r.market === PRODUCT_MARKET_ALT_SPREAD),
    altTotalExposed: rows.some((r) => r.market === PRODUCT_MARKET_ALT_TOTAL),
  };
}

// ── runner ──────────────────────────────────────────────────────────────

export interface EspnProductPriceArchiverDeps {
  /** Same seam as the featured leg: keyless ESPN board fetch. Used for
   *  the capture window and game resolution only — product payloads come
   *  from fetchProductPayloads. */
  fetchEvents: (
    sportKey: string,
    options: { horizonDays: number; maxEvents: number },
  ) => Promise<{ events: readonly OddsApiEvent[]; error?: string }>;
  /** Per-event keyless product payloads (core odds detail + summary
   *  pickcenter in production). Throwing fails only that event. */
  fetchProductPayloads: (
    event: OddsApiEvent,
  ) => Promise<ProductPricePayloads>;
  /** ESPN event → canonical Game.id, or null when not tracked. */
  resolveGameId: (event: OddsApiEvent) => Promise<string | null>;
  /** The featured leg's store seam — product rows are the same shape
   *  under additive market values. */
  store: LineArchiveStore;
  now?: () => Date;
  windowDays?: number;
  logPrefix?: string;
}

export interface EspnProductPriceArchiverResult {
  /** ISO-8601 UTC — the single capture timestamp shared by every row. */
  readonly capturedAt: string;
  readonly fetchedEvents: number;
  readonly windowEvents: number;
  readonly skippedStartedOrInvalid: number;
  readonly skippedBeyondWindow: number;
  /** In-window, resolved games whose payloads were probed. */
  readonly gamesScanned: number;
  readonly productRowsPersisted: number;
  readonly altSpreadRows: number;
  readonly altTotalRows: number;
  readonly gamesWithAltSpread: number;
  readonly gamesWithAltTotal: number;
  /** Union of surfaces actually consulted across the slate. */
  readonly sourcesChecked: readonly string[];
  /**
   * Product classes exposed by NO source on the whole slate — the run's
   * GAP finding. Empty when nothing was scanned (an empty slate is no
   * evidence about the surfaces) and empty for a class the moment any
   * game exposes it.
   */
  readonly gaps: readonly ProductMarket[];
  readonly unresolvedEventIds: readonly string[];
  readonly errors: readonly string[];
}

export function zeroEspnProductPriceArchiverResult(
  capturedAt: Date,
): EspnProductPriceArchiverResult {
  return {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: 0,
    windowEvents: 0,
    skippedStartedOrInvalid: 0,
    skippedBeyondWindow: 0,
    gamesScanned: 0,
    productRowsPersisted: 0,
    altSpreadRows: 0,
    altTotalRows: 0,
    gamesWithAltSpread: 0,
    gamesWithAltTotal: 0,
    sourcesChecked: [],
    gaps: [],
    unresolvedEventIds: [],
    errors: [],
  };
}

/**
 * One product-price run. Un-gated — the caller owns the gate (production
 * goes through runEspnProductPriceArchiverIfEnabled; the CLI's --dry-run
 * is an explicit operator action). Never throws for upstream/store
 * failures; a run that finds no ladders is a successful run whose `gaps`
 * name the unexposed classes.
 */
export async function runEspnProductPriceArchiver(
  deps: EspnProductPriceArchiverDeps,
): Promise<EspnProductPriceArchiverResult> {
  const now = deps.now ?? (() => new Date());
  const windowDays = deps.windowDays ?? LINE_ARCHIVER_WINDOW_DAYS;
  const logPrefix = deps.logPrefix ?? "[line-archiver-products]";
  const capturedAt = now();
  const errors: string[] = [];

  let fetched: { events: readonly OddsApiEvent[]; error?: string };
  try {
    fetched = await deps.fetchEvents(LINE_ARCHIVER_SPORT_KEY, {
      horizonDays: windowDays,
      maxEvents: LINE_ARCHIVER_MAX_EVENTS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...zeroEspnProductPriceArchiverResult(capturedAt),
      errors: [`fetch failed: ${message}`],
    };
  }
  if (fetched.error) errors.push(fetched.error);

  const events = fetched.events;
  const window = selectEventsInWindow(events, capturedAt, windowDays);

  let gamesScanned = 0;
  let productRowsPersisted = 0;
  let altSpreadRows = 0;
  let altTotalRows = 0;
  let gamesWithAltSpread = 0;
  let gamesWithAltTotal = 0;
  const sourcesChecked = new Set<string>();
  const unresolvedEventIds: string[] = [];

  for (const event of window.selected) {
    try {
      const gameId = await deps.resolveGameId(event);
      if (!gameId) {
        unresolvedEventIds.push(event.id);
        continue;
      }
      const payloads = await deps.fetchProductPayloads(event);
      gamesScanned++;
      for (const s of payloads.sourcesChecked) sourcesChecked.add(s);

      const extraction = extractProductPrices(payloads, {
        homeTeam: event.home_team,
        awayTeam: event.away_team,
      });
      if (extraction.altSpreadExposed) gamesWithAltSpread++;
      if (extraction.altTotalExposed) gamesWithAltTotal++;
      if (extraction.rows.length === 0) continue;

      const existing = await deps.store.existingMarkets(gameId, PRODUCT_MARKETS);
      const insertRows: LineArchiveInsertRow[] = extraction.rows.map((row) => ({
        gameId,
        capturedAt,
        phase: classifyLineArchivePhase(existing, row.market),
        book: PRODUCT_PRICE_BOOK,
        market: row.market,
        side: row.side,
        price: row.price,
        line: row.line,
        source: ESPN_LINE_ARCHIVE_SOURCE,
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

  const result: EspnProductPriceArchiverResult = {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: events.length,
    windowEvents: window.selected.length,
    skippedStartedOrInvalid: window.skippedStartedOrInvalid,
    skippedBeyondWindow: window.skippedBeyondWindow,
    gamesScanned,
    productRowsPersisted,
    altSpreadRows,
    altTotalRows,
    gamesWithAltSpread,
    gamesWithAltTotal,
    sourcesChecked: [...sourcesChecked].sort(),
    gaps,
    unresolvedEventIds,
    errors,
  };
  console.log(
    `${logPrefix} espn-dk products run capturedAt=${result.capturedAt} fetched=${result.fetchedEvents} ` +
      `window=${result.windowEvents} scanned=${result.gamesScanned} rows=${result.productRowsPersisted} ` +
      `gaps=${result.gaps.join(",") || "none"} unresolved=${result.unresolvedEventIds.length} ` +
      `errors=${result.errors.length}`,
  );
  return result;
}

export interface EspnProductPriceArchiverIfEnabledResult
  extends EspnProductPriceArchiverResult {
  readonly enabled: boolean;
}

/**
 * HARD GATE — the only entry point production code should call. Unless
 * LINE_ARCHIVE_ENABLED=true this returns `{ enabled: false }` having made
 * ZERO fetch calls and ZERO store calls (the deps are never invoked).
 */
export async function runEspnProductPriceArchiverIfEnabled(
  deps: EspnProductPriceArchiverDeps,
  env: NodeJS.ProcessEnv = process.env,
): Promise<EspnProductPriceArchiverIfEnabledResult> {
  if (!isLineArchiveEnabled(env)) {
    return {
      enabled: false,
      ...zeroEspnProductPriceArchiverResult((deps.now ?? (() => new Date()))()),
    };
  }
  const result = await runEspnProductPriceArchiver(deps);
  return { enabled: true, ...result };
}
