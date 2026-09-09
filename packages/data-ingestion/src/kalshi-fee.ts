/**
 * Kalshi taker fee — the cost of actually taking a Kalshi quote.
 *
 * TheRundown's free feed carries Kalshi as affiliate 25 (see
 * RUNDOWN_AFFILIATE_BOOK_KEYS in rundown-client.ts), and those quotes are
 * EXCHANGE prices, not sportsbook prices. A sportsbook's American price already
 * contains its margin; a Kalshi ask does not — the taker pays a fee on top, so
 * the raw ask understates what the contract costs. Feeding the raw ask into
 * de-vig therefore reports an edge the member could not have taken.
 *
 * Kalshi's published trading fee: `fees = ceil(0.07 * C * P * (1 - P))`, where
 * C is the number of contracts, P the price in dollars (0..1), and the result
 * is rounded UP to the next whole cent. The effective per-contract cost is
 * `P + fee/C`.
 *
 * Pure: no I/O, no clock, no env.
 */

import type { OddsApiBookmaker, OddsApiMarket, OddsApiOutcome } from "@sports/types";
import { americanToDecimal } from "./galaxy-devig.js";
// KALSHI_BOOK_KEY is the repo's ONE Kalshi book key ("kalshi"), and it is also
// what TheRundown affiliate 25 maps to (RUNDOWN_AFFILIATE_BOOK_KEYS in
// rundown-client.ts) — one identity, not two.
import { KALSHI_BOOK_KEY, probToAmerican } from "./galaxy-kalshi-book.js";

/** Kalshi's published taker fee coefficient. */
export const KALSHI_TAKER_FEE_RATE = 0.07;

/**
 * Total taker fee in DOLLARS for `contracts` contracts at price `price`,
 * rounded up to the next whole cent exactly as Kalshi charges it.
 *
 * Returns NaN for a non-finite or out-of-range input rather than inventing a
 * fee — callers leave the quote untouched in that case.
 */
export function kalshiTakerFeeDollars(price: number, contracts: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(contracts)) return NaN;
  if (price <= 0 || price >= 1 || contracts <= 0) return NaN;
  // Snap binary-floating-point dust before the ceil. 0.07*100*0.6*0.4*100
  // evaluates to 168.00000000000003, and a raw Math.ceil would charge 169
  // cents on an order whose exact fee is 168 — an invented cost. Nine decimal
  // places is far coarser than the dust (~1e-14) and far finer than any real
  // fee step (prices are whole cents, contracts whole numbers).
  const rawCents = KALSHI_TAKER_FEE_RATE * contracts * price * (1 - price) * 100;
  const snapped = Number(rawCents.toFixed(9));
  return Math.ceil(snapped) / 100;
}

/**
 * Effective per-contract cost of taking the ask: `P + fee/C`.
 * The fee is charged on the whole order, so a larger order does not change the
 * per-contract cost except through the single ceil-to-a-cent rounding.
 */
export function kalshiEffectiveAskPrice(price: number, contracts = 1): number {
  const fee = kalshiTakerFeeDollars(price, contracts);
  if (!Number.isFinite(fee)) return NaN;
  return price + fee / contracts;
}

/**
 * American price → the cost of the side as a 0..1 price, which is what Kalshi
 * charges its fee on. Built on the repo's own americanToDecimal so there is one
 * American-odds conversion here, not a second copy of the algebra.
 */
export function americanToImpliedPrice(american: number): number {
  const decimal = americanToDecimal(american);
  if (decimal == null || decimal <= 0) return NaN;
  return 1 / decimal;
}

/**
 * Restate one American Kalshi quote as the price a taker actually pays.
 * Returns the input unchanged when the fee is not computable (price at or
 * outside the 0..1 bounds, non-finite input) — refuse to invent, never guess.
 */
export function applyKalshiTakerFeeToAmericanPrice(american: number, contracts = 1): number {
  const price = americanToImpliedPrice(american);
  if (!Number.isFinite(price)) return american;
  const effective = kalshiEffectiveAskPrice(price, contracts);
  if (!Number.isFinite(effective) || effective >= 1) return american;
  // probToAmerican emits the repo's canonical whole-number American price and
  // returns null rather than an artifact at the p -> 0/1 edges.
  return probToAmerican(effective) ?? american;
}

function feeAdjustOutcome(outcome: OddsApiOutcome, contracts: number): OddsApiOutcome {
  // An unpriced outcome stays unpriced. Rule 1: never mint a price.
  if (outcome.price == null) return outcome;
  return { ...outcome, price: applyKalshiTakerFeeToAmericanPrice(outcome.price, contracts) };
}

function feeAdjustMarket(market: OddsApiMarket, contracts: number): OddsApiMarket {
  return { ...market, outcomes: market.outcomes.map((o) => feeAdjustOutcome(o, contracts)) };
}

/**
 * Restate every Kalshi book in `bookmakers` at its taker-inclusive price.
 * Non-Kalshi books are returned by identity — a sportsbook price already
 * carries its own margin and must not be touched.
 */
export function applyKalshiTakerFeeToBookmakers(
  bookmakers: readonly OddsApiBookmaker[],
  contracts = 1,
): OddsApiBookmaker[] {
  return bookmakers.map((book) =>
    book?.key === KALSHI_BOOK_KEY
      ? { ...book, markets: (book.markets ?? []).map((m) => feeAdjustMarket(m, contracts)) }
      : book,
  );
}
