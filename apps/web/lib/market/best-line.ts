import { americanToImpliedProbability } from "@sports/prediction-engine";
import {
  formatAmericanOdds,
  formatMarketPoint,
  formatSignedMarketPoint,
  normalizeAmericanOdds,
  normalizeMarketPoint,
} from "@sports/types";

/**
 * Line shop — the best AVAILABLE price/line for each side across captured books.
 *
 * This is transparency, not an arbitrage tool: "here is where the price is best
 * right now," from odds we already ingest. It complements game-market-read.ts
 * (which builds the no-vig CONSENSUS) — consensus says what the market thinks;
 * the line shop says where to get the best of it. Pure, no I/O.
 *
 * Conventions match game-market-read.ts: each bookmaker's LATEST row per market
 * only (a stale quote never wins the shop), and a price must be finite/non-zero.
 * Spread `spread` is home-perspective; the bettor-facing line is mirrored for the
 * away side. "Best" = best for the bettor: longest payout (lowest implied prob),
 * and for spread/total the most favorable number first, ties broken by price.
 */

export interface OddsRowForShop {
  readonly bookmaker: string;
  readonly market: string; // "H2H" | "SPREADS" | "TOTALS"
  readonly fetchedAt: Date;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly spread: number | null;
  readonly homeSpreadPrice: number | null;
  readonly awaySpreadPrice: number | null;
  readonly total: number | null;
  readonly overPrice: number | null;
  readonly underPrice: number | null;
}

export interface BestPrice {
  readonly bookmaker: string;
  /** American price. */
  readonly price: number;
  /** Bettor-perspective line for spread/total markets (omitted for moneyline). */
  readonly line?: number;
}

export interface BestLines {
  readonly moneyline: { readonly home: BestPrice | null; readonly away: BestPrice | null };
  readonly spread: { readonly home: BestPrice | null; readonly away: BestPrice | null };
  readonly total: { readonly over: BestPrice | null; readonly under: BestPrice | null };
  /** Distinct books that contributed at least one usable quote. */
  readonly bookCount: number;
  /** ISO timestamp of the freshest row used, or null when no usable rows. */
  readonly freshestFetchedAt: string | null;
}

function canonicalPrice(v: number | null | undefined): number | null {
  return normalizeAmericanOdds(v)?.normalized ?? null;
}

/** American odds → implied probability. Lower = longer payout = better for bettor. */
function impliedProb(american: number): number {
  return american < 0 ? -american / (-american + 100) : 100 / (american + 100);
}

function latestPerBook(rows: readonly OddsRowForShop[], market: string): OddsRowForShop[] {
  const m = new Map<string, OddsRowForShop>();
  for (const r of rows) {
    if (r.market !== market) continue;
    const existing = m.get(r.bookmaker);
    if (!existing || r.fetchedAt > existing.fetchedAt) m.set(r.bookmaker, r);
  }
  return [...m.values()];
}

function bestMoneyline(rows: readonly OddsRowForShop[], side: "home" | "away"): BestPrice | null {
  let best: BestPrice | null = null;
  let bestImplied = Infinity;
  for (const r of latestPerBook(rows, "H2H")) {
    const price = canonicalPrice(side === "home" ? r.homePrice : r.awayPrice);
    if (price === null) continue;
    const ip = impliedProb(price);
    if (ip < bestImplied) {
      bestImplied = ip;
      best = { bookmaker: r.bookmaker, price };
    }
  }
  return best;
}

function bestSpread(
  rows: readonly OddsRowForShop[],
  side: "home" | "away",
  sport: string,
): BestPrice | null {
  let best: BestPrice | null = null;
  let bestLine = -Infinity; // bettor-perspective points (more is always better)
  let bestImplied = Infinity;
  for (const r of latestPerBook(rows, "SPREADS")) {
    const point = normalizeMarketPoint("SPREAD_POINTS", sport, r.spread);
    if (!point) continue;
    const price = canonicalPrice(side === "home" ? r.homeSpreadPrice : r.awaySpreadPrice);
    if (price === null) continue;
    const line = side === "home" ? point.normalized : -point.normalized;
    const ip = impliedProb(price);
    if (line > bestLine || (line === bestLine && ip < bestImplied)) {
      bestLine = line;
      bestImplied = ip;
      best = { bookmaker: r.bookmaker, price, line };
    }
  }
  return best;
}

function bestTotal(
  rows: readonly OddsRowForShop[],
  side: "over" | "under",
  sport: string,
): BestPrice | null {
  let best: BestPrice | null = null;
  // OVER wants the LOWEST number; UNDER wants the HIGHEST. Normalise to "more is
  // better" by negating the total for the over side.
  let bestScore = -Infinity;
  let bestImplied = Infinity;
  for (const r of latestPerBook(rows, "TOTALS")) {
    const point = normalizeMarketPoint("TOTAL_POINTS", sport, r.total);
    if (!point) continue;
    const price = canonicalPrice(side === "over" ? r.overPrice : r.underPrice);
    if (price === null) continue;
    const score = side === "over" ? -point.normalized : point.normalized;
    const ip = impliedProb(price);
    if (score > bestScore || (score === bestScore && ip < bestImplied)) {
      bestScore = score;
      bestImplied = ip;
      best = { bookmaker: r.bookmaker, price, line: point.normalized };
    }
  }
  return best;
}

export function buildBestLines(rows: readonly OddsRowForShop[], sport = "NFL"): BestLines {
  const usable = rows.filter(
    (row) => {
      if (row.market === "H2H") {
        return canonicalPrice(row.homePrice) !== null || canonicalPrice(row.awayPrice) !== null;
      }
      if (row.market === "SPREADS") {
        return Boolean(normalizeMarketPoint("SPREAD_POINTS", sport, row.spread)) &&
          (canonicalPrice(row.homeSpreadPrice) !== null || canonicalPrice(row.awaySpreadPrice) !== null);
      }
      if (row.market === "TOTALS") {
        return Boolean(normalizeMarketPoint("TOTAL_POINTS", sport, row.total)) &&
          (canonicalPrice(row.overPrice) !== null || canonicalPrice(row.underPrice) !== null);
      }
      return false;
    },
  );
  const books = new Set(usable.map((r) => r.bookmaker));
  const freshest = usable.reduce<Date | null>(
    (max, r) => (!max || r.fetchedAt > max ? r.fetchedAt : max),
    null
  );

  return {
    moneyline: { home: bestMoneyline(rows, "home"), away: bestMoneyline(rows, "away") },
    spread: { home: bestSpread(rows, "home", sport), away: bestSpread(rows, "away", sport) },
    total: { over: bestTotal(rows, "over", sport), under: bestTotal(rows, "under", sport) },
    bookCount: books.size,
    freshestFetchedAt: freshest ? freshest.toISOString() : null,
  };
}

/** Format an American price with an explicit sign (e.g. +150, -110). */
export function formatAmerican(price: number): string {
  return formatAmericanOdds(price);
}

/** Format a bettor-perspective spread/total line with sign for spreads. */
export function formatLine(line: number, kind: "spread" | "total"): string {
  return kind === "total" ? formatMarketPoint(line) : formatSignedMarketPoint(line);
}

// Re-export for callers that want to mirror the shop's payout ranking.
export { americanToImpliedProbability };
