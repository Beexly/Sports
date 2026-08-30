/**
 * Kalshi taker fee as friction on q — not a bot, not an edge.
 *
 * Official schedule (help.kalshi.com fees): fee = 0.07 × C × P × (1−P).
 * Peak 1.75¢ per contract at P=0.5. The listing mid (#516) and two-way
 * gate (#512) are informational q. Ranking p against that mid without
 * the fee invents ~175 bp of "edge" that a taker never collects.
 *
 * Unique closed-form lift: side-specific break-even.
 *   YES taker pays the ask:  p* = ask + 0.07·ask·(1−ask)
 *   NO  taker pays 1−bid:    p*_no = (1−bid) + 0.07·(1−bid)·bid
 * Fire only if independent p clears the side they would actually take.
 * Mid-only quotes are refused — the fee is path-dependent.
 *
 * Informational. No order, no size, no sportsbook scrape. priced:false.
 * Pure, deterministic, no I/O.
 */

export const KALSHI_TAKER_FEE_RATE = 0.07;
export const KALSHI_TAKER_METHOD_TAG = "kalshi_taker_friction_v1" as const;

export type TakerRefuse =
  | "missing_two_way"
  | "out_of_range"
  | "inverted_book"
  | "fee_dominates";

export type TakerSide = "yes" | "no";

export type TakerFrictionQuote = {
  readonly bid: number;
  readonly ask: number;
};

export type TakerBreakEven = {
  readonly side: TakerSide;
  /** Posted price the taker lifts (ask for YES, 1−bid for NO). */
  readonly posted: number;
  /** Continuous fee in probability units: 0.07 · P · (1−P). */
  readonly fee: number;
  /** Posted + fee. Independent p must clear this to be +EV as a taker. */
  readonly breakEven: number;
  /** Cent-rounded fee on 1 contract (settlement granularity, diagnostic). */
  readonly feeRoundedCents: number;
};

export type PricedTakerEdge = {
  readonly ok: true;
  readonly methodTag: typeof KALSHI_TAKER_METHOD_TAG;
  readonly pYes: number;
  readonly side: TakerSide;
  readonly posted: number;
  readonly fee: number;
  readonly breakEven: number;
  /** e = p_side − (posted + fee). Positive = model clears taker friction. */
  readonly edge: number;
  readonly priced: false;
};

export type UnpricedTakerEdge = {
  readonly ok: false;
  readonly methodTag: typeof KALSHI_TAKER_METHOD_TAG;
  readonly pYes: number | null;
  readonly side: null;
  readonly posted: null;
  readonly fee: null;
  readonly breakEven: null;
  readonly edge: null;
  readonly priced: false;
  readonly refuse: TakerRefuse;
};

export type TakerEdgeResult = PricedTakerEdge | UnpricedTakerEdge;

function finiteUnit(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x < 1;
}

function finiteProb(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

/**
 * Continuous Kalshi taker fee in dollars (also probability units on a
 * $1 contract). Not the cent-rounded settlement figure.
 */
export function kalshiTakerFee(price: number, contracts: number = 1): number {
  if (!Number.isFinite(price) || price <= 0 || price >= 1) {
    throw new RangeError(`kalshiTakerFee: price must be in (0, 1) (got ${price})`);
  }
  if (!Number.isFinite(contracts) || contracts <= 0) {
    throw new RangeError(`kalshiTakerFee: contracts must be finite and > 0 (got ${contracts})`);
  }
  return KALSHI_TAKER_FEE_RATE * contracts * price * (1 - price);
}

/**
 * Settlement rounding: ceil to the next cent. Diagnostic only — do not
 * substitute this into q. One-contract rounding is a granularity artifact;
 * the probability-space haircut is {@link kalshiTakerFee}.
 */
export function kalshiTakerFeeRoundedCents(price: number, contracts: number = 1): number {
  const dollars = kalshiTakerFee(price, contracts);
  return Math.ceil(dollars * 100 - 1e-12);
}

/** Break-even probability for a YES taker lifting `ask`. */
export function yesTakerBreakEven(ask: number): TakerBreakEven {
  if (!finiteUnit(ask)) {
    throw new RangeError(`yesTakerBreakEven: ask must be in (0, 1) (got ${ask})`);
  }
  const fee = kalshiTakerFee(ask);
  return {
    side: "yes",
    posted: ask,
    fee,
    breakEven: ask + fee,
    feeRoundedCents: kalshiTakerFeeRoundedCents(ask),
  };
}

/** Break-even probability of the NO event for a NO taker lifting `1 − bid`. */
export function noTakerBreakEven(bid: number): TakerBreakEven {
  if (!finiteUnit(bid)) {
    throw new RangeError(`noTakerBreakEven: bid must be in (0, 1) (got ${bid})`);
  }
  const posted = 1 - bid;
  const fee = kalshiTakerFee(posted);
  return {
    side: "no",
    posted,
    fee,
    breakEven: posted + fee,
    feeRoundedCents: kalshiTakerFeeRoundedCents(posted),
  };
}

function refuse(pYes: number | null, why: TakerRefuse): UnpricedTakerEdge {
  return {
    ok: false,
    methodTag: KALSHI_TAKER_METHOD_TAG,
    pYes,
    side: null,
    posted: null,
    fee: null,
    breakEven: null,
    edge: null,
    priced: false,
    refuse: why,
  };
}

/**
 * Independent P(YES) vs a two-way Kalshi book after taker friction.
 * Picks the side (if any) whose break-even the model clears. Both sides
 * cannot clear a tight book — the fee makes them mutually exclusive.
 * Fail-closed: no mid-only, no last-trade, no one-sided.
 */
export function pricePmAgainstTakerFriction(
  pYes: number,
  quote: TakerFrictionQuote | null | undefined,
): TakerEdgeResult {
  if (!finiteProb(pYes)) return refuse(Number.isFinite(pYes) ? pYes : null, "out_of_range");
  if (quote == null) return refuse(pYes, "missing_two_way");
  if (!finiteUnit(quote.bid) || !finiteUnit(quote.ask)) return refuse(pYes, "out_of_range");
  if (quote.ask < quote.bid) return refuse(pYes, "inverted_book");

  const yesBe = yesTakerBreakEven(quote.ask);
  const noBe = noTakerBreakEven(quote.bid);
  if (!(yesBe.breakEven < 1) || !(noBe.breakEven < 1)) return refuse(pYes, "fee_dominates");

  const edgeYes = pYes - yesBe.breakEven;
  const edgeNo = 1 - pYes - noBe.breakEven;

  if (edgeYes > 0 && edgeYes >= edgeNo) {
    return {
      ok: true,
      methodTag: KALSHI_TAKER_METHOD_TAG,
      pYes,
      side: "yes",
      posted: yesBe.posted,
      fee: yesBe.fee,
      breakEven: yesBe.breakEven,
      edge: edgeYes,
      priced: false,
    };
  }
  if (edgeNo > 0) {
    return {
      ok: true,
      methodTag: KALSHI_TAKER_METHOD_TAG,
      pYes,
      side: "no",
      posted: noBe.posted,
      fee: noBe.fee,
      breakEven: noBe.breakEven,
      edge: edgeNo,
      priced: false,
    };
  }
  return refuse(pYes, "fee_dominates");
}
