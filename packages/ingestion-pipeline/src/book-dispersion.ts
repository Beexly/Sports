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
 *     Side-agnostic — a spread/total line's dispersion does not depend on which
 *     side the pick is on, so the `side` argument is ignored for these kinds.
 *   - MONEYLINE: implied-probability points (max − min of the implied
 *     probability of the PUBLISHED side across books) — a real dispersion in the
 *     ML unit family. This MUST be computed for the side the pick is actually on:
 *     American odds carry vig and are NOT complementary, so the home and away
 *     implied-probability dispersions genuinely differ. A pick on the away team
 *     must measure the away prices, not the home prices — otherwise an away-ML
 *     pick persists the home side's disagreement (e.g. books agree on the home
 *     price but diverge on the away price → 0 persisted despite real away
 *     disagreement), permanently corrupting the CLV liquidity regressor.
 *
 * Returns null when fewer than two books quote the kind on the requested side:
 * with one line there is no disagreement to measure, and a fabricated 0 would
 * understate uncertainty.
 */

export type DispersionPickType = "SPREAD" | "TOTAL" | "MONEYLINE";

export interface BookOddsRow {
  readonly market: string; // "SPREADS" | "TOTALS" | "H2H"
  readonly spread?: number | null;
  readonly total?: number | null;
  readonly homePrice?: number | null;
  readonly awayPrice?: number | null;
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
  // MONEYLINE only: which side's prices to measure. SPREAD/TOTAL ignore it
  // (their line dispersion is side-agnostic). Defaults to "home" so existing
  // callers/tests measuring the home side are unchanged.
  side: "home" | "away" = "home",
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
  // MONEYLINE: dispersion of the requested side's implied probability across
  // books. Home and away prices are NOT complementary (vig), so the side the
  // pick is actually on must be measured. A zero American price is meaningless
  // (never a real quote) and is skipped.
  const probs = gameOdds
    .filter((o) => o.market === "H2H")
    .map((o) => (side === "home" ? o.homePrice : o.awayPrice))
    .filter((p): p is number => typeof p === "number" && p !== 0)
    .map((p) => americanToImpliedProb(p));
  return spread(probs);
}
