/**
 * Fire gate: Shin e = p − q is not enough; the ticket must also clear juice.
 *
 * pricePropAgainstMarket (#524) ranks on de-vigged q. A 51% model vs a 50%
 * two-way looks like +edge and still loses at −110 (break-even 110/210).
 * This composes that Shin diagnostic with shopPostedPrices on the posted
 * American(s). Fire only when a named book strictly clears the juice floor.
 *
 * priced:false until a prop-line archive settles CLV. Pure, no I/O.
 * Does not ingest a new Odds market. Does not flip MODEL_VERSION.
 */

import { pricePropAgainstMarket, type PropBookQuote, type PropEdgeResult } from "./props-priced-edge.js";
import { shopPostedPrices, type ShopBook, type ShopPick, type ShopDenied } from "./props-line-shop.js";

export const FIRE_GATE_METHOD_TAG = "props_fire_gate_v1" as const;

export type FireOpen = {
  readonly ok: true;
  readonly fire: true;
  readonly methodTag: typeof FIRE_GATE_METHOD_TAG;
  readonly p: number;
  readonly shop: ShopPick;
  readonly shin: PropEdgeResult;
  readonly priced: false;
};

export type FireClosed = {
  readonly ok: true;
  readonly fire: false;
  readonly methodTag: typeof FIRE_GATE_METHOD_TAG;
  readonly p: number;
  readonly shop: ShopDenied | ShopPick;
  readonly shin: PropEdgeResult;
  readonly priced: false;
  readonly refuse: "no_book_clears" | "shin_unpriced" | "shin_no_edge";
};

export type FireDenied = {
  readonly ok: false;
  readonly fire: false;
  readonly methodTag: typeof FIRE_GATE_METHOD_TAG;
  readonly priced: false;
  readonly refuse: "bad_p" | "no_books";
};

/**
 * Posted Americans to shop. If `books` is empty and `quote` is a two-way,
 * shop the Over American as a single unnamed book — still fail-closed if
 * that price does not clear.
 */
export function firePostedProp(
  p: number,
  quote: PropBookQuote | null | undefined,
  books: readonly ShopBook[] = [],
): FireOpen | FireClosed | FireDenied {
  const tag = FIRE_GATE_METHOD_TAG;
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    return { ok: false, fire: false, methodTag: tag, priced: false, refuse: "bad_p" };
  }

  const shopBooks: readonly ShopBook[] =
    books.length > 0
      ? books
      : quote && Number.isFinite(quote.overAmerican) && quote.overAmerican !== 0
        ? [{ book: "posted_over", american: quote.overAmerican }]
        : [];

  if (shopBooks.length === 0) {
    return { ok: false, fire: false, methodTag: tag, priced: false, refuse: "no_books" };
  }

  const shin = pricePropAgainstMarket(p, quote);
  const shop = shopPostedPrices(p, shopBooks);

  if (!shop.ok) {
    return {
      ok: true,
      fire: false,
      methodTag: tag,
      p,
      shop,
      shin,
      priced: false,
      refuse: "no_book_clears",
    };
  }
  if (!shin.ok) {
    return { ok: true, fire: false, methodTag: tag, p, shop, shin, priced: false, refuse: "shin_unpriced" };
  }
  if (!(shin.edgeOver > 0)) {
    return { ok: true, fire: false, methodTag: tag, p, shop, shin, priced: false, refuse: "shin_no_edge" };
  }
  return { ok: true, fire: true, methodTag: tag, p, shop, shin, priced: false };
}
