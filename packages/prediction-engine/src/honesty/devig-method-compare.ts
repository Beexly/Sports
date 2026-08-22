/**
 * Honesty helper: multiplicative (proportional) de-vig vs Shin vs goto
 * on the same two-way book.
 *
 * Hegarty & Whelan (2025) / sportcal: multiplicative de-vig manufactures
 * longshot "value" by shrinking the favourite too little and the longshot
 * too much. GSE still stamps multiplicative_devig_v1 on some quote-plane
 * paths while Shin lives in prediction-engine. This module does not change
 * live scoring — it exposes the three fairs so an honesty surface can show
 * the disagreement instead of pretending they are the same p.
 *
 * Not wired into pick minting. MODEL_VERSION untouched.
 */

import { removeVig } from "../scoring.js";
import { gotoConversion, shinDevig } from "../shin-devig.js";

export type DevigMethodName = "multiplicative" | "shin" | "goto";

export interface TwoWayBook {
  /** Raw implied probability (1/decimal), vig still in. */
  readonly homeImplied: number;
  readonly awayImplied: number;
}

export interface MethodFair {
  readonly method: DevigMethodName;
  readonly home: number;
  readonly away: number;
}

export interface DevigMethodCompare {
  readonly booksum: number;
  readonly multiplicative: MethodFair;
  readonly shin: MethodFair;
  readonly goto: MethodFair;
  /**
   * multiplicative[longshot] − shin[longshot]. Positive means multiplicative
   * inflated the longshot relative to Shin (the Hegarty/Whelan pattern).
   */
  readonly longshotInflation: number;
  readonly longshotSide: "home" | "away";
}

function longshotSide(homeImplied: number, awayImplied: number): "home" | "away" {
  return homeImplied <= awayImplied ? "home" : "away";
}

/**
 * Compare three de-vig methods on one two-way market.
 * Degenerate (non-finite / non-positive) inputs return null — no invented p.
 */
export function compareDevigMethods(book: TwoWayBook): DevigMethodCompare | null {
  const h = book.homeImplied;
  const a = book.awayImplied;
  if (!(h > 0) || !(a > 0) || !Number.isFinite(h) || !Number.isFinite(a)) {
    return null;
  }

  const multiplicative = removeVig(h, a);
  const shin = shinDevig([h, a]);
  const goto = gotoConversion([h, a]);
  if (goto.length < 2 || shin.probabilities.length < 2) return null;

  const side = longshotSide(h, a);
  const multiLong = side === "home" ? multiplicative.home : multiplicative.away;
  const shinLong = side === "home" ? shin.probabilities[0]! : shin.probabilities[1]!;

  return {
    booksum: h + a,
    multiplicative: {
      method: "multiplicative",
      home: multiplicative.home,
      away: multiplicative.away,
    },
    shin: {
      method: "shin",
      home: shin.probabilities[0]!,
      away: shin.probabilities[1]!,
    },
    goto: {
      method: "goto",
      home: goto[0]!,
      away: goto[1]!,
    },
    longshotInflation: multiLong - shinLong,
    longshotSide: side,
  };
}
