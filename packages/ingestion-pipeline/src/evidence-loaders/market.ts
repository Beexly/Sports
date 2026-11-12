/**
 * Market loader — the odds table in, a MarketEvidence out.
 *
 * Market enum values verified against Neon: 'H2H', 'SPREADS', 'TOTALS'
 * (uppercase — a lowercase 'h2h' filter matches nothing). Moneylines live on
 * H2H rows, point spreads on SPREADS rows, totals on TOTALS rows.
 *
 * Repeat ingestion cycles store many rows per book; each book contributes
 * its LATEST row per market, so one book is never counted twice. The
 * consensus de-vig is consensusNoVig (Shin) over those per-book quotes.
 *
 * Zero odds rows -> every field MISSING("no odds rows for game"). A NULL
 * price is never coerced to 0 and never backfilled from a constant.
 *
 * SELECT only. `now` is the bundle build time kept for the Stage A caller;
 * every stamp comes from the odds' own fetchedAt, never the wall clock.
 */
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence, MarketEvidence } from "@sports/prediction-engine/src/evidence/types.js";
import { derived, missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { consensusNoVig } from "@sports/prediction-engine/src/market-read.js";

const ODDS_SELECT = `SELECT bookmaker, market, "homePrice", "awayPrice", "drawPrice", spread, total, "fetchedAt" FROM odds WHERE "gameId" = $1 AND market IN ('H2H', 'SPREADS', 'TOTALS')`;

interface ParsedOddsRow {
  readonly bookmaker: string;
  readonly market: string;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly drawPrice: number | null;
  readonly spread: number | null;
  readonly total: number | null;
  readonly fetchedMs: number;
  readonly fetchedIso: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function field(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** Numbers arrive as JSON numbers or numeric strings depending on the driver. */
function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asDateIso(v: unknown): string | null {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v.toISOString() : null;
  }
  if (typeof v !== "string" || v.trim().length === 0) return null;
  const raw = v.trim();
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseRow(raw: unknown): ParsedOddsRow | null {
  if (!isRecord(raw)) return null;
  const bookmaker = asString(field(raw, "bookmaker"));
  const market = asString(field(raw, "market"));
  const fetchedIso = asDateIso(field(raw, "fetchedAt"));
  if (bookmaker === null || market === null || fetchedIso === null) return null;
  return {
    bookmaker,
    market,
    homePrice: asNumber(field(raw, "homePrice")),
    awayPrice: asNumber(field(raw, "awayPrice")),
    drawPrice: asNumber(field(raw, "drawPrice")),
    spread: asNumber(field(raw, "spread")),
    total: asNumber(field(raw, "total")),
    fetchedMs: new Date(fetchedIso).getTime(),
    fetchedIso,
  };
}

/** Latest row per bookmaker for one market — repeat cycles count once. */
function latestPerBook(
  rows: readonly ParsedOddsRow[],
  market: string,
): Map<string, ParsedOddsRow> {
  const out = new Map<string, ParsedOddsRow>();
  for (const r of rows) {
    if (r.market !== market) continue;
    const prev = out.get(r.bookmaker);
    if (prev === undefined || r.fetchedMs > prev.fetchedMs) out.set(r.bookmaker, r);
  }
  return out;
}

/** American price -> implied probability. Used only to spot outlier quotes. */
function americanToProb(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid];
  if (hi === undefined) return null;
  if (sorted.length % 2 === 1) return hi;
  const lo = sorted[mid - 1];
  return lo === undefined ? null : (lo + hi) / 2;
}

function allMissing(reason: string): MarketEvidence {
  return {
    consensusNoVigHome: missing(reason, "the-odds-api"),
    spread: missing(reason, "the-odds-api"),
    total: missing(reason, "the-odds-api"),
    homeMoneyline: missing(reason, "the-odds-api"),
    awayMoneyline: missing(reason, "the-odds-api"),
    bookmakerCount: missing(reason, "the-odds-api"),
    bestHomePrice: missing(reason, "the-odds-api"),
    bestAwayPrice: missing(reason, "the-odds-api"),
  };
}

export async function loadMarket(
  db: SqlClient,
  gameId: string,
  now: Date,
): Promise<MarketEvidence> {
  void now; // build-time anchor for the Stage A signature; stamps come from fetchedAt
  const result = await db.query(ODDS_SELECT, [gameId]);
  if (result.rows.length === 0) return allMissing("no odds rows for game");

  const rows: ParsedOddsRow[] = [];
  for (const raw of result.rows) {
    const parsed = parseRow(raw);
    if (parsed !== null) rows.push(parsed);
  }
  if (rows.length === 0) {
    return allMissing("odds rows exist but none carry a readable bookmaker/market/fetchedAt");
  }

  let maxMs = -Infinity;
  let maxIso = "";
  for (const r of rows) {
    if (r.fetchedMs > maxMs) {
      maxMs = r.fetchedMs;
      maxIso = r.fetchedIso;
    }
  }

  // H2H: one latest quote per book, two-sided prices only.
  const perBook: { home: number; away: number; draw: number | null }[] = [];
  const homePrices: number[] = [];
  const awayPrices: number[] = [];
  for (const r of latestPerBook(rows, "H2H").values()) {
    if (r.homePrice === null || r.awayPrice === null) continue;
    perBook.push({ home: r.homePrice, away: r.awayPrice, draw: r.drawPrice });
    homePrices.push(r.homePrice);
    awayPrices.push(r.awayPrice);
  }
  const read = consensusNoVig(perBook);
  const noH2hReason = "no h2h odds rows with two-sided prices for game";

  // A "best price" is only usable if it is a real quote. A +440 on a team the
  // market prices at +150 is a 290-cent outlier — a stale row, a different
  // market, or a mislabelled book — and using it manufactures a 19-point edge
  // out of nothing. Keep only prices whose implied probability is within
  // PRICE_OUTLIER_TOLERANCE of the de-vigged consensus, and report how many
  // were dropped.
  const PRICE_OUTLIER_TOLERANCE = 0.05;
  const consensusHome = read?.fairHomeProb ?? null;
  const consensusAway = read?.fairAwayProb ?? null;
  let bestHome: number | null = null;
  let bestAway: number | null = null;
  let homeOutliers = 0;
  let awayOutliers = 0;
  // Prices that agree with the consensus. The representative moneyline is the
  // median of THESE, not of every row: a book whose H2H row is really a spread
  // price (observed on SF @ DAL: draftkings -120/-102, williamhill -131/+100,
  // 886 rows each) drags a raw median to a number no book ever quoted.
  const inToleranceHome: number[] = [];
  const inToleranceAway: number[] = [];
  for (const r of latestPerBook(rows, "H2H").values()) {
    if (r.homePrice === null || r.awayPrice === null) continue;
    if (consensusHome !== null && Math.abs(americanToProb(r.homePrice) - consensusHome) > PRICE_OUTLIER_TOLERANCE) {
      homeOutliers += 1;
    } else {
      bestHome = bestHome === null ? r.homePrice : Math.max(bestHome, r.homePrice);
      inToleranceHome.push(r.homePrice);
    }
    if (consensusAway !== null && Math.abs(americanToProb(r.awayPrice) - consensusAway) > PRICE_OUTLIER_TOLERANCE) {
      awayOutliers += 1;
    } else {
      bestAway = bestAway === null ? r.awayPrice : Math.max(bestAway, r.awayPrice);
      inToleranceAway.push(r.awayPrice);
    }
  }

  const consensusNoVigHome: Evidence<number> =
    read !== null
      ? derived(read.fairHomeProb, "consensusNoVig", maxIso)
      : missing(perBook.length === 0 ? noH2hReason : "no book de-vigs cleanly", "consensusNoVig", maxIso);

  const spreadValues: number[] = [];
  for (const r of latestPerBook(rows, "SPREADS").values()) {
    if (r.spread !== null) spreadValues.push(r.spread);
  }
  const spreadMedian = median(spreadValues);
  const spread: Evidence<number> =
    spreadMedian !== null
      ? real(spreadMedian, "the-odds-api", maxIso)
      : missing("no spread odds rows for game", "the-odds-api", maxIso);

  const totalValues: number[] = [];
  for (const r of latestPerBook(rows, "TOTALS").values()) {
    if (r.total !== null) totalValues.push(r.total);
  }
  const totalMedian = median(totalValues);
  const total: Evidence<number> =
    totalMedian !== null
      ? real(totalMedian, "the-odds-api", maxIso)
      : missing("no total odds rows for game", "the-odds-api", maxIso);

  // Representative moneylines: median across books (the best available price
  // is reported separately in bestHomePrice/bestAwayPrice).
  const homeMlMedian = median(inToleranceHome);
  const awayMlMedian = median(inToleranceAway);
  const homeMoneyline: Evidence<number> =
    homeMlMedian !== null
      ? real(homeMlMedian, "the-odds-api", maxIso)
      : missing("no moneyline rows for game", "the-odds-api", maxIso);
  const awayMoneyline: Evidence<number> =
    awayMlMedian !== null
      ? real(awayMlMedian, "the-odds-api", maxIso)
      : missing("no moneyline rows for game", "the-odds-api", maxIso);

  const bookmakerCount: Evidence<number> =
    perBook.length > 0
      ? real(perBook.length, "the-odds-api", maxIso)
      : missing(noH2hReason, "the-odds-api", maxIso);

  const bestHomePrice: Evidence<number> =
    bestHome !== null
      ? real(
          bestHome,
          "the-odds-api",
          maxIso,
          homeOutliers > 0
            ? `best price within ${PRICE_OUTLIER_TOLERANCE} of consensus; ${homeOutliers} outlier quote(s) excluded`
            : undefined,
        )
      : missing(
          homeOutliers > 0
            ? `every home price was more than ${PRICE_OUTLIER_TOLERANCE} from consensus (${homeOutliers} outliers)`
            : noH2hReason,
          "the-odds-api",
          maxIso,
        );

  const bestAwayPrice: Evidence<number> =
    bestAway !== null
      ? real(
          bestAway,
          "the-odds-api",
          maxIso,
          awayOutliers > 0
            ? `best price within ${PRICE_OUTLIER_TOLERANCE} of consensus; ${awayOutliers} outlier quote(s) excluded`
            : undefined,
        )
      : missing(
          awayOutliers > 0
            ? `every away price was more than ${PRICE_OUTLIER_TOLERANCE} from consensus (${awayOutliers} outliers)`
            : noH2hReason,
          "the-odds-api",
          maxIso,
        );

  return {
    consensusNoVigHome,
    spread,
    total,
    homeMoneyline,
    awayMoneyline,
    bookmakerCount,
    bestHomePrice,
    bestAwayPrice,
  };
}
