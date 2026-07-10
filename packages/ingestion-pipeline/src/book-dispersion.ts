/**
 * Book-line dispersion at lock — the liquidity/disagreement regressor the CLV
 * decomposition needs (clv-decomposition.ts `bookDisagreementAtLock`: "max-minus-
 * min line spread across books at lock").
 *
 * Captured at PUBLISH time, when every book's line for the game is in hand. It
 * is NOT reconstructable cheaply after the fact and has no honest substitute
 * among stored fields (consensusPct is agreement, a different quantity), so the
 * honest path is to measure and persist it once, write-once, at pick creation.
 *
 * Unit per pick kind (same unit family the CLV of that kind is graded in):
 *   - SPREAD / TOTAL: points (max − min of the point lines across books).
 *   - MONEYLINE: implied-probability points (max − min of the home implied
 *     probability across books) — a real dispersion in the ML unit family.
 *
 * Returns null when fewer than two books quote the kind: with one line there is
 * no disagreement to measure, and a fabricated 0 would understate uncertainty.
 */

export type DispersionPickType = "SPREAD" | "TOTAL" | "MONEYLINE";

export interface BookOddsRow {
  readonly market: string; // "SPREADS" | "TOTALS" | "H2H"
  readonly spread?: number | null;
  readonly total?: number | null;
  readonly homePrice?: number | null;
}

/** American odds → implied probability in [0,1]. Pure; 0 is undefined and skipped upstream. */
function americanToImpliedProb(american: number): number {
  return american >= 0 ? 100 / (american + 100) : -american / (-american + 100);
}

/** max − min of a numeric sample; null when fewer than two finite values. */
function spread(values: readonly number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return null;
  return Math.max(...finite) - Math.min(...finite);
}

export function bookLineDispersion(
  pickType: DispersionPickType,
  gameOdds: readonly BookOddsRow[],
): number | null {
  if (pickType === "SPREAD") {
    const pts = gameOdds
      .filter((o) => o.market === "SPREADS" && typeof o.spread === "number")
      .map((o) => o.spread as number);
    return spread(pts);
  }
  if (pickType === "TOTAL") {
    const pts = gameOdds
      .filter((o) => o.market === "TOTALS" && typeof o.total === "number")
      .map((o) => o.total as number);
    return spread(pts);
  }
  // MONEYLINE: dispersion of the home implied probability across books. A zero
  // American price is meaningless (never a real quote) and is skipped.
  const probs = gameOdds
    .filter((o) => o.market === "H2H" && typeof o.homePrice === "number" && o.homePrice !== 0)
    .map((o) => americanToImpliedProb(o.homePrice as number));
  return spread(probs);
}
