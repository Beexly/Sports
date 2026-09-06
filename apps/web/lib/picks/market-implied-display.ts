/**
 * Market-implied win probability, display side (v5.2.8 Phase 2, ledger C-107).
 *
 * The only probability shown on a pick is the number its proof receipt already
 * carries: each book's quoted price for each side converted to an implied
 * probability, averaged across the books in the snapshot, and the two-sided
 * average normalised to sum to one (proportional de-vig). It is fixed at
 * publish time in the receipt and never recomputed. The label text is the
 * verified wording from
 * docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md
 * section 1 and must not drift.
 *
 * Scope rules (same file, same section):
 *   - book-priced two-way MONEYLINE picks only (SPREAD and TOTAL carry cover
 *     probabilities near 0.5 and show no percentage);
 *   - a signal-slate row (bookmakerCount 0) shows no percentage at all;
 *   - shown under the SAME server-side entitlement as the confidence score,
 *     so a viewer the paywall hides confidence from never receives it;
 *   - confidence itself stays a 0-100 selection score rendered as "NN/100".
 */

export interface MarketImpliedDisplay {
  /** Market-implied win probability for the picked side, 0..1, from the receipt. */
  readonly prob: number;
  /** Number of books in the snapshot the probability was averaged across. */
  readonly bookmakerCount: number;
}

export interface MarketImpliedInput {
  readonly pickType: string;
  readonly bookmakerCount: number;
  /** The receipt's committed marketFairProb; null when no receipt exists. */
  readonly receiptMarketFairProb: number | null | undefined;
}

/**
 * Resolve what the viewer may see. Returns null whenever any scope rule fails;
 * callers omit the field entirely in that case (no FREE-tier payload branch
 * ever carries it).
 */
export function resolveMarketImplied(
  pick: MarketImpliedInput,
  viewer: { readonly canSeeConfidence: boolean },
): MarketImpliedDisplay | null {
  if (!viewer.canSeeConfidence) return null;
  if (pick.pickType !== "MONEYLINE") return null;
  if (!Number.isFinite(pick.bookmakerCount) || pick.bookmakerCount <= 0) return null;
  const p = pick.receiptMarketFairProb;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p >= 1) return null;
  return { prob: p, bookmakerCount: Math.round(pick.bookmakerCount) };
}

/** Whole-number percent, the "NN" in the label. */
export function marketImpliedPercent(prob: number): number {
  return Math.round(prob * 100);
}

/**
 * The verified label, exactly as written in the proposal (section 1). NN is the
 * whole-number percent; N is the bookmaker count of the pick's immutable
 * mint-time signal snapshot (PickSignalSnapshot.bookmakerCount, created once
 * in the same cycle as the receipt), never the live Pick column a refresh
 * cycle rewrites.
 */
export function formatMarketImpliedLabel(display: MarketImpliedDisplay): string {
  const pct = marketImpliedPercent(display.prob);
  const n = display.bookmakerCount;
  return (
    `Market-implied win probability ${pct}%: every book's price for each side converted to an ` +
    `implied probability, averaged across the ${n} books in the snapshot, normalised to sum to ` +
    `one, fixed at publish time in this pick's proof receipt.`
  );
}

/**
 * The restated public calibration claim (proposal section 1), scoped to what
 * the PROVEN eligibility measurement actually scores: the market-implied
 * probability on settled two-way MONEYLINE picks (receipt-first, shipped in
 * fbc3784c7). Confidence is a ranking score and is not part of it.
 */
export const MARKET_IMPLIED_CALIBRATION_CLAIM =
  "The calibration we measure ourselves on is the calibration of that market-implied probability " +
  "on our settled two-way moneyline picks: the average implied probability across books, " +
  "normalised to remove the vig, fixed at publish time and committed to the pick's proof receipt, " +
  "never recomputed. Confidence is a ranking score and is not part of that measurement.";
