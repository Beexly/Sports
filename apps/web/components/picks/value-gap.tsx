/**
 * Value gap — the honest "GSE vs market" number.
 *
 * `p` (the model's calibrated ranking probability) and `q` (the market's
 * de-vig fair probability) already render separately on every pick card
 * (see pick-card.tsx's "Ranking P" / "Market fair (de-vig)" lines). Nobody
 * subtracts them for the reader. This is that subtraction, made a first-class
 * derived value instead of mental arithmetic — the same fields, no new data
 * path, no Kalshi, no additional source.
 *
 * Deliberately does NOT imply profitability. A positive gap is a disagreement
 * with the market's fair price, not a guaranteed edge — see the ranking-P
 * badge's own "not verified ROI" language, which this component does not
 * relax.
 */

export interface ValueGapInput {
  readonly rankingP: number | null | undefined;
  readonly marketFairProb: number | null | undefined;
}

export interface ValueGap {
  /** p - q, in [-1, 1]. */
  readonly gap: number;
  readonly sign: "positive" | "negative" | "flat";
}

const FLAT_EPSILON = 0.0005; // 0.05 percentage points — below display precision.

/** Pure: p - q, or null when either input is not a real finite probability. */
export function computeValueGap(input: ValueGapInput): ValueGap | null {
  const { rankingP, marketFairProb } = input;
  if (
    typeof rankingP !== "number" ||
    !Number.isFinite(rankingP) ||
    rankingP < 0 ||
    rankingP > 1 ||
    typeof marketFairProb !== "number" ||
    !Number.isFinite(marketFairProb) ||
    marketFairProb < 0 ||
    marketFairProb > 1
  ) {
    return null;
  }
  const gap = rankingP - marketFairProb;
  const sign = Math.abs(gap) < FLAT_EPSILON ? "flat" : gap > 0 ? "positive" : "negative";
  return { gap, sign };
}

const SIGN_CLASS: Record<ValueGap["sign"], string> = {
  positive: "text-orbital-cyan",
  negative: "text-ion-2",
  flat: "text-ion-3",
};

/**
 * Renders `null` (nothing) when either input is missing — callers must not
 * fall back to a partial or estimated gap. Never implies profitability
 * beyond what `pick-card.tsx`'s existing ranking-P disclaimer already states.
 */
export function ValueGapBadge({ rankingP, marketFairProb }: ValueGapInput) {
  const result = computeValueGap({ rankingP, marketFairProb });
  if (result === null) return null;

  const pct = (Math.abs(result.gap) * 100).toFixed(1);
  const label =
    result.sign === "flat"
      ? "GSE vs market: aligned"
      : `GSE vs market: ${result.sign === "positive" ? "+" : "−"}${pct}pp`;

  return (
    <span
      data-testid="value-gap-badge"
      className={`ml-2 text-[10px] font-normal ${SIGN_CLASS[result.sign]}`}
      title="Model ranking probability minus market fair (de-vig) probability. A disagreement with the market's price, not a guaranteed edge."
    >
      {label}
    </span>
  );
}
