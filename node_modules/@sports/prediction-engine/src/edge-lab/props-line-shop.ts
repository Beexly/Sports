/**
 * Posted-price line shop — one independent p, N Americans, pick the juice.
 *
 * The juice floor (#537) asks whether p clears ONE posted price. Books do
 * not post the same American. A 53.1% model that fails −115 at Book A can
 * still clear −105 at Book B. Ranking on a single consensus q (or on
 * e = p − q) hides that. This is not Kaunitz (outlier vs median Shin) and
 * not Kalshi-vs-book (X4). It is a taker shop across named books.
 *
 * Fail-closed: non-finite p, empty book list. priced:false.
 * Pure, deterministic, no I/O. Does not ingest a new Odds market.
 */

import { edgeClearsPosted, type JuiceFloorDenied, type JuiceFloorResult } from "./props-juice-floor.js";

export const LINE_SHOP_METHOD_TAG = "props_line_shop_v1" as const;

export type ShopBook = {
  readonly book: string;
  readonly american: number;
};

export type ShopPick = {
  readonly ok: true;
  readonly methodTag: typeof LINE_SHOP_METHOD_TAG;
  readonly book: string;
  readonly american: number;
  readonly surplus: number;
  readonly postedBreakEven: number;
  readonly clears: true;
  readonly priced: false;
};

export type ShopDenied = {
  readonly ok: false;
  readonly methodTag: typeof LINE_SHOP_METHOD_TAG;
  readonly surplus: null;
  readonly clears: false;
  readonly priced: false;
  readonly refuse: "bad_p" | "no_books" | "none_clear";
  readonly considered: number;
};

function finiteProb(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

function bookKey(b: ShopBook): string {
  return `${b.book}\0${b.american}`;
}

/**
 * Among named books, return the one with the largest surplus of p over
 * that book's posted break-even. Ties go to the first book in input order.
 * Books that fail the juice floor are skipped, not ranked.
 */
export function shopPostedPrices(p: number, books: readonly ShopBook[]): ShopPick | ShopDenied {
  const tag = LINE_SHOP_METHOD_TAG;
  if (!finiteProb(p)) {
    return { ok: false, methodTag: tag, surplus: null, clears: false, priced: false, refuse: "bad_p", considered: 0 };
  }
  if (books.length === 0) {
    return { ok: false, methodTag: tag, surplus: null, clears: false, priced: false, refuse: "no_books", considered: 0 };
  }

  const seen = new Set<string>();
  let considered = 0;
  let best: JuiceFloorResult | null = null;
  let bestBook = "";
  for (const b of books) {
    const key = bookKey(b);
    if (seen.has(key)) continue;
    seen.add(key);
    const r: JuiceFloorResult | JuiceFloorDenied = edgeClearsPosted(p, b.american);
    if (!r.ok) continue;
    considered += 1;
    if (!r.clears) continue;
    if (best === null || r.surplus > best.surplus) {
      best = r;
      bestBook = b.book;
    }
  }

  if (best === null) {
    return {
      ok: false,
      methodTag: tag,
      surplus: null,
      clears: false,
      priced: false,
      refuse: considered === 0 ? "no_books" : "none_clear",
      considered,
    };
  }

  return {
    ok: true,
    methodTag: tag,
    book: bestBook,
    american: best.postedAmerican,
    surplus: best.surplus,
    postedBreakEven: best.postedBreakEven,
    clears: true,
    priced: false,
  };
}
