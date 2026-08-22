/**
 * Posted-price juice floor — e = p − q is not enough.
 *
 * A 51% model vs a 50% de-vigged two-way looks like +1% edge. At −110
 * the taker still loses: break-even is 110/210 ≈ 0.5238. Ranking on
 * e = p − q without this floor is how "priced edge" ships a negative-EV
 * ticket. Distinct from honest-ceiling (claim copy) and from Kelly
 * (sizing). This is the fire gate vs the posted American.
 *
 * Fail-closed: non-finite p, zero/NaN American. priced:false.
 * Pure, deterministic, no I/O.
 */

import { americanToDecimalOdds } from "../kelly.js";

export const JUICE_FLOOR_METHOD_TAG = "props_juice_floor_v1" as const;

/** Classic −110 break-even. 110/210, not 0.52. */
export const BREAK_EVEN_MINUS_110 = 110 / 210;

export type JuiceFloorResult = {
  readonly ok: true;
  readonly methodTag: typeof JUICE_FLOOR_METHOD_TAG;
  readonly p: number;
  readonly postedAmerican: number;
  readonly postedBreakEven: number;
  /** p − postedBreakEven. Positive = clears the juice on THIS price. */
  readonly surplus: number;
  readonly clears: boolean;
  readonly priced: false;
};

export type JuiceFloorDenied = {
  readonly ok: false;
  readonly methodTag: typeof JUICE_FLOOR_METHOD_TAG;
  readonly surplus: null;
  readonly clears: false;
  readonly priced: false;
  readonly refuse: "bad_p" | "bad_price";
};

function finiteProb(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

function finiteAmerican(price: number): boolean {
  return Number.isFinite(price) && price !== 0;
}

/**
 * Break-even win probability against a posted American price.
 * p > 1 / decimalOdds. −110 → 110/210. +100 → 0.5.
 */
export function postedBreakEven(american: number): number {
  if (!finiteAmerican(american)) {
    throw new RangeError(`postedBreakEven: American price must be finite and non-zero (got ${american})`);
  }
  const decimal = americanToDecimalOdds(american);
  if (!(decimal > 1) || !Number.isFinite(decimal)) {
    throw new RangeError(`postedBreakEven: American ${american} is not a valid payout`);
  }
  return 1 / decimal;
}

/**
 * Independent p vs the posted American (not vs de-vigged q).
 * `clears` is true only when p strictly exceeds the juice floor.
 */
export function edgeClearsPosted(p: number, american: number): JuiceFloorResult | JuiceFloorDenied {
  const tag = JUICE_FLOOR_METHOD_TAG;
  if (!finiteProb(p)) {
    return { ok: false, methodTag: tag, surplus: null, clears: false, priced: false, refuse: "bad_p" };
  }
  if (!finiteAmerican(american)) {
    return { ok: false, methodTag: tag, surplus: null, clears: false, priced: false, refuse: "bad_price" };
  }
  let be: number;
  try {
    be = postedBreakEven(american);
  } catch {
    return { ok: false, methodTag: tag, surplus: null, clears: false, priced: false, refuse: "bad_price" };
  }
  const surplus = p - be;
  return {
    ok: true,
    methodTag: tag,
    p,
    postedAmerican: american,
    postedBreakEven: be,
    surplus,
    clears: surplus > 0,
    priced: false,
  };
}
