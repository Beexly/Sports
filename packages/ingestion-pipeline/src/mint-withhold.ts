/**
 * C-353 — book-priced mint withhold (WITHHOLD-ONLY).
 *
 * These gates can only PREVENT a pick from being created or refreshed. They
 * never invent a pick, never reorder the board, and never re-price an existing
 * row. A withheld candidate logs exactly one structured line and is skipped.
 *
 * D2 policy:
 *   - NFL preseason          → withhold every market (exhibition product)
 *   - MLB SPREAD / TOTAL     → withhold (run-line / totals calibration lanes
 *                               are not ready; MLB MONEYLINE keeps publishing)
 *   - soccer MONEYLINE       → withhold on every path (three-way market; the
 *                               engine de-vig is two-way — scoring.ts)
 *   - 0-book book-priced row → withhold (no market behind the claim)
 *
 * Signal-slate `bookmakerCount: 0` is BY DESIGN and is NOT gated here; the
 * zero-book rule applies only to the book-priced path.
 */

import {
  isBaseballSport,
  isThreeWayMoneylineSport,
} from "@sports/prediction-engine";
import {
  isNflPreseasonFetchWindow,
  NFL_CANONICAL_SPORT_KEY,
} from "@sports/data-ingestion";

export type MintWithholdReason =
  | "nfl_preseason"
  | "mlb_spread"
  | "mlb_total"
  | "soccer_moneyline"
  | "zero_books";

/**
 * Book-priced mint gate. Returns the withhold reason, or null when the
 * candidate may proceed to the existing create/refresh path.
 *
 * Order is policy-stable: preseason first (whole-game refusal), then
 * soccer-ML, then MLB market, then zero-books.
 */
export function bookPricedMintWithholdReason(input: {
  readonly sportKey: string;
  readonly pickType: string;
  readonly bookmakerCount: number;
  /** True when this game came from the NFL preseason feed/window. */
  readonly isNflPreseasonGame: boolean;
}): MintWithholdReason | null {
  if (input.isNflPreseasonGame) return "nfl_preseason";
  if (
    input.pickType === "MONEYLINE" &&
    isThreeWayMoneylineSport(input.sportKey)
  ) {
    return "soccer_moneyline";
  }
  if (isBaseballSport(input.sportKey)) {
    if (input.pickType === "SPREAD") return "mlb_spread";
    if (input.pickType === "TOTAL") return "mlb_total";
  }
  // Signal-slate rows are bookmakerCount 0 by design and never reach this
  // helper. A book-priced candidate with no books has no market claim.
  if (input.bookmakerCount < 1) return "zero_books";
  return null;
}

/**
 * Is this kickoff an NFL preseason contest?
 * Delegates to isNflPreseasonFetchWindow (July–August UTC): regular-season NFL
 * does not kick off inside those months.
 */
export function isNflPreseasonKickoff(
  sportKey: string,
  commenceTime: Date,
): boolean {
  if (sportKey !== NFL_CANONICAL_SPORT_KEY) return false;
  return isNflPreseasonFetchWindow(commenceTime);
}

/**
 * One structured line per withheld candidate. Shape is stable for log scrapers:
 *   `<prefix> withheld: reason=<r> gameId=<id> pickType=<T>`
 */
export function logMintWithhold(
  logPrefix: string,
  reason: MintWithholdReason,
  gameId: string,
  pickType: string,
): void {
  console.warn(
    `${logPrefix} withheld: reason=${reason} gameId=${gameId} pickType=${pickType}`,
  );
}
