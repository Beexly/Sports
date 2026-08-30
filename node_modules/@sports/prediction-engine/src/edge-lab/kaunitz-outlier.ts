/**
 * Kaunitz cross-book Shin outlier — X1 math, log-only.
 *
 * Kaunitz et al. 2017 (arXiv:1710.02824): the persistent Resolution source
 * is a named book's Shin-devigged probability sitting ≥ τ below the
 * cross-book consensus. That book's price is too long. GSE sells the flag;
 * it does not bet, so account-limiting is irrelevant.
 *
 * Distinct from market-read.consensusNoVig (median fair, drops book ids)
 * and from consensus.ts (independent referees, 2σ z, not books).
 * Distinct from #524 (Shin as the q inside one two-way priced-edge).
 *
 * Inputs: per-book two-way American prices with names. Each book is
 * Shin-devigged independently via noVigFromAmericanPrices. Consensus is
 * the MEDIAN of those Shin q's. Roadmap X1 said "mean"; on a 5–7 book
 * US recreational field the mean is not robust — one longshot drags
 * every other book across τ and the whole board flags. Median is the
 * same estimator market-read already uses for fair value. Flag the side
 * whose q is ≥ τ below that median (price too long).
 *
 * Fail-closed: <3 clean books, one-sided quotes, τ out of range.
 * priced:false — no product surface, no CLV claim. Pure, no I/O.
 */

import { noVigFromAmericanPrices } from "../market-read.js";

export const KAUNITZ_METHOD_TAG = "kaunitz_shin_outlier_v1" as const;

/** Roadmap X1 default: 3 probability points below consensus. */
export const DEFAULT_KAUNITZ_TAU = 0.03;

/** Need a field, not a two-book argument. */
export const MIN_KAUNITZ_BOOKS = 3;

export type KaunitzSide = "home" | "away";

export type KaunitzBookQuote = {
  readonly book: string;
  readonly homeAmerican: number;
  readonly awayAmerican: number;
};

export type KaunitzBookRead = {
  readonly book: string;
  readonly qHome: number;
  readonly qAway: number;
  readonly z: number;
};

export type KaunitzFlag = {
  readonly book: string;
  readonly side: KaunitzSide;
  /** Shin q on the flagged (too-long) side. */
  readonly qBook: number;
  /** Cross-book mean Shin q on that side. */
  readonly qConsensus: number;
  /** consensus − qBook. Positive = too long by this many probability points. */
  readonly gap: number;
};

export type KaunitzResult = {
  readonly ok: true;
  readonly methodTag: typeof KAUNITZ_METHOD_TAG;
  readonly tau: number;
  readonly bookCount: number;
  readonly qHomeConsensus: number;
  readonly qAwayConsensus: number;
  readonly books: readonly KaunitzBookRead[];
  readonly flags: readonly KaunitzFlag[];
  readonly priced: false;
};

export type KaunitzRefuse = "too_few_books" | "empty_field" | "bad_tau";

export type KaunitzDenied = {
  readonly ok: false;
  readonly methodTag: typeof KAUNITZ_METHOD_TAG;
  readonly flags: readonly [];
  readonly priced: false;
  readonly refuse: KaunitzRefuse;
};

export type KaunitzScan = KaunitzResult | KaunitzDenied;

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function deny(why: KaunitzRefuse): KaunitzDenied {
  return {
    ok: false,
    methodTag: KAUNITZ_METHOD_TAG,
    flags: [],
    priced: false,
    refuse: why,
  };
}

/**
 * Scan a named-book two-way field for Kaunitz too-long prices.
 * `tau` is a probability gap, not a moneyline. Default 0.03.
 */
export function scanKaunitzOutliers(
  quotes: readonly KaunitzBookQuote[],
  opts: { readonly tau?: number } = {},
): KaunitzScan {
  const tau = opts.tau ?? DEFAULT_KAUNITZ_TAU;
  if (!Number.isFinite(tau) || tau <= 0 || tau >= 1) return deny("bad_tau");
  if (quotes.length === 0) return deny("empty_field");

  const books: KaunitzBookRead[] = [];
  for (const q of quotes) {
    if (typeof q.book !== "string" || q.book.length === 0) continue;
    const read = noVigFromAmericanPrices([q.homeAmerican, q.awayAmerican]);
    if (!read || read.fairProbabilities.length < 2) continue;
    const qHome = read.fairProbabilities[0]!;
    const qAway = read.fairProbabilities[1]!;
    if (!Number.isFinite(qHome) || !Number.isFinite(qAway)) continue;
    books.push({ book: q.book, qHome, qAway, z: read.insiderShareZ });
  }

  if (books.length < MIN_KAUNITZ_BOOKS) return deny("too_few_books");

  const qHomeConsensus = median(books.map((b) => b.qHome));
  const qAwayConsensus = median(books.map((b) => b.qAway));

  const flags: KaunitzFlag[] = [];
  for (const b of books) {
    const gapHome = qHomeConsensus - b.qHome;
    const gapAway = qAwayConsensus - b.qAway;
    if (gapHome >= tau) {
      flags.push({
        book: b.book,
        side: "home",
        qBook: b.qHome,
        qConsensus: qHomeConsensus,
        gap: gapHome,
      });
    } else if (gapAway >= tau) {
      flags.push({
        book: b.book,
        side: "away",
        qBook: b.qAway,
        qConsensus: qAwayConsensus,
        gap: gapAway,
      });
    }
  }

  return {
    ok: true,
    methodTag: KAUNITZ_METHOD_TAG,
    tau,
    bookCount: books.length,
    qHomeConsensus,
    qAwayConsensus,
    books,
    flags,
    priced: false,
  };
}
