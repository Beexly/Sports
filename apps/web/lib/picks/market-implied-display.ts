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
 *   - at least TWO books in the mint-time snapshot. One book is not a
 *     consensus, and the label's "averaged across the N books" would be false
 *     at N = 1. A signal-slate row (bookmakerCount 0) shows nothing at all;
 *   - **every tier sees it.** Phase 1 gated this behind `canSeeConfidence`.
 *     Phase 2 removes that gate on the proposal's recorded founder decision
 *     ("for every tier ... FREE viewers get it too: it is public arithmetic"),
 *     for a reason worth keeping: this number is a de-vig of quoted prices any
 *     reader can recompute, not a model output, and the calibration claim we
 *     publish is ABOUT this number. Publishing a reliability curve for a figure
 *     the free tier cannot see is incoherent. What stays paid is what is
 *     actually ours: which side we took, the confidence score, the factor
 *     trail, the Edge Index;
 *   - confidence itself stays a 0-100 selection score rendered as "NN/100",
 *     never a percent, and is never the source of this number.
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

/** Fewer books than this is not a consensus, and the label would misdescribe it. */
export const MIN_BOOKS_FOR_MARKET_IMPLIED = 2;

/**
 * The public `winProbability` payload (v5.2.8 Phase 2). One resolver feeds both
 * this and the deprecated `marketImplied` alias so the two can never disagree.
 */
export interface WinProbabilityDisplay {
  readonly value: number;
  readonly basis: "market_devig";
  readonly books: number;
  readonly method: "proportional";
}

/**
 * Resolve the published probability. Returns null whenever any scope rule
 * fails; callers omit the field entirely in that case.
 *
 * Takes no viewer: the result does not vary by tier (see the scope rules
 * above). Keeping a viewer parameter would invite a future edit to re-gate it
 * silently.
 */
export function resolveMarketImplied(pick: MarketImpliedInput): MarketImpliedDisplay | null {
  if (pick.pickType !== "MONEYLINE") return null;
  if (
    !Number.isFinite(pick.bookmakerCount) ||
    pick.bookmakerCount < MIN_BOOKS_FOR_MARKET_IMPLIED
  ) {
    return null;
  }
  const p = pick.receiptMarketFairProb;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p >= 1) return null;
  // The synthetic coin-flip 0.5 is the placeholder a receipt carries when no
  // market probability was resolved. Every public calibration path rejects it
  // (receiptMarketFairProb in lib/calibration/proven-path-rows.ts, same
  // tolerance), so the display must never claim "50%" as a market price.
  if (Math.abs(p - 0.5) < 1e-9) return null;
  return { prob: p, bookmakerCount: Math.round(pick.bookmakerCount) };
}

/**
 * The v5.2.8 public shape. `basis` is hard-coded to "market_devig" and `method`
 * to "proportional" because that is what the receipt actually holds: the
 * proportional de-vig of averaged book prices. Neither is inferred, and neither
 * may be set from `confidence`.
 *
 * Measured 2026-09-13 (read-only SQL, n 621 settled book-priced picks carrying
 * both fields): swapping this to the Shin de-vig the proposal's phase table
 * once suggested is NOT supported. Paired Brier difference is +0.0022 overall
 * (t = 1.80, not significant) and the entire moneyline advantage comes from 11
 * rows where the two methods disagree by more than 10 points — pathological
 * books. Excluding those, Shin is slightly WORSE (-0.0014, t = -1.13). So the
 * published number stays the proportional one the receipts already carry and
 * section 3b of the proposal actually measured.
 */
export function resolveWinProbability(pick: MarketImpliedInput): WinProbabilityDisplay | null {
  const display = resolveMarketImplied(pick);
  if (!display) return null;
  return {
    value: display.prob,
    basis: "market_devig",
    books: display.bookmakerCount,
    method: "proportional",
  };
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
