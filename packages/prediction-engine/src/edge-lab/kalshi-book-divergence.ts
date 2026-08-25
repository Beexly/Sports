/**
 * X4 math: Kalshi two-way vs Shin-devigged book — log-only.
 *
 * Kaunitz (#527) flags a book vs the *book* median. X4 flags a book vs
 * Kalshi. Kalshi taker fee (#529) is a separate friction on PM q; this
 * module uses the listing mid as an informational consensus, not as a
 * contract to lift. Direction is "the book is too long vs Kalshi."
 *
 * Fail-closed: missing Kalshi two-way, inverted/wide Kalshi, <1 clean book,
 * mid out of (0,1). priced:false. Pure, no I/O, no orders, no scrape.
 */

import { noVigFromAmericanPrices } from "../market-read.js";

export const KALSHI_BOOK_METHOD_TAG = "kalshi_book_div_v1" as const;
export const DEFAULT_KALSHI_BOOK_TAU = 0.03;
export const DEFAULT_KALSHI_MAX_SPREAD = 0.1;

export type KalshiTwoWay = {
  readonly bid: number;
  readonly ask: number;
};

export type NamedBookTwoWay = {
  readonly book: string;
  readonly homeAmerican: number;
  readonly awayAmerican: number;
};

export type KalshiBookFlag = {
  readonly book: string;
  readonly side: "home" | "away";
  readonly qBook: number;
  readonly qKalshi: number;
  readonly gap: number;
};

export type KalshiBookResult = {
  readonly ok: true;
  readonly methodTag: typeof KALSHI_BOOK_METHOD_TAG;
  readonly qKalshiHome: number;
  readonly spread: number;
  readonly tau: number;
  readonly flags: readonly KalshiBookFlag[];
  readonly priced: false;
};

export type KalshiBookDenied = {
  readonly ok: false;
  readonly methodTag: typeof KALSHI_BOOK_METHOD_TAG;
  readonly flags: readonly [];
  readonly priced: false;
  readonly refuse: "missing_two_way" | "wide_spread" | "inverted" | "out_of_range" | "no_books" | "bad_tau";
};

function finiteUnit(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x < 1;
}

function deny(why: KalshiBookDenied["refuse"]): KalshiBookDenied {
  return {
    ok: false,
    methodTag: KALSHI_BOOK_METHOD_TAG,
    flags: [],
    priced: false,
    refuse: why,
  };
}

/**
 * Informational Kalshi mid vs each book's Shin q. Flag when the book's q
 * on a side is ≥ τ below Kalshi (price too long). Kalshi is home-referenced:
 * bid/ask are P(home) in (0,1).
 */
export function scanKalshiVsBooks(
  kalshi: KalshiTwoWay | null | undefined,
  books: readonly NamedBookTwoWay[],
  opts: { readonly tau?: number; readonly maxSpread?: number } = {},
): KalshiBookResult | KalshiBookDenied {
  const tau = opts.tau ?? DEFAULT_KALSHI_BOOK_TAU;
  const maxSpread = opts.maxSpread ?? DEFAULT_KALSHI_MAX_SPREAD;
  if (!Number.isFinite(tau) || tau <= 0 || tau >= 1) return deny("bad_tau");
  if (kalshi == null) return deny("missing_two_way");
  if (!finiteUnit(kalshi.bid) || !finiteUnit(kalshi.ask)) return deny("out_of_range");
  if (kalshi.ask < kalshi.bid) return deny("inverted");
  const spread = kalshi.ask - kalshi.bid;
  if (spread > maxSpread) return deny("wide_spread");
  const qKalshiHome = (kalshi.bid + kalshi.ask) / 2;
  if (!finiteUnit(qKalshiHome)) return deny("out_of_range");
  const qKalshiAway = 1 - qKalshiHome;

  const flags: KalshiBookFlag[] = [];
  let clean = 0;
  for (const b of books) {
    if (typeof b.book !== "string" || b.book.length === 0) continue;
    const read = noVigFromAmericanPrices([b.homeAmerican, b.awayAmerican]);
    if (!read || read.fairProbabilities.length < 2) continue;
    const qHome = read.fairProbabilities[0]!;
    const qAway = read.fairProbabilities[1]!;
    if (!Number.isFinite(qHome) || !Number.isFinite(qAway)) continue;
    clean += 1;
    const gapHome = qKalshiHome - qHome;
    const gapAway = qKalshiAway - qAway;
    if (gapHome >= tau) {
      flags.push({ book: b.book, side: "home", qBook: qHome, qKalshi: qKalshiHome, gap: gapHome });
    } else if (gapAway >= tau) {
      flags.push({ book: b.book, side: "away", qBook: qAway, qKalshi: qKalshiAway, gap: gapAway });
    }
  }
  if (clean === 0) return deny("no_books");

  return {
    ok: true,
    methodTag: KALSHI_BOOK_METHOD_TAG,
    qKalshiHome,
    spread,
    tau,
    flags,
    priced: false,
  };
}
