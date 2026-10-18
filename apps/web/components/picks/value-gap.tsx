/**
 * Value gap — the honest "GSE vs market" number.
 *
 * `p` (the model's ranking probability — a sort key, NOT calibrated; the word
 * was removed in v5.2.8 Phase 2 / CAL-11 because no fitted map is applied to
 * it and measuring it against outcomes shows it over-confident through the
 * upper middle) and `q` (the market's
 * de-vig fair probability) are carried on every pick's factor breakdown but
 * are not rendered raw on the public card. This is their subtraction, made a first-class
 * derived value instead of mental arithmetic — the same fields, no new data
 * path, no Kalshi, no additional source.
 *
 * Deliberately does NOT imply profitability. A positive gap is a disagreement
 * with the market's fair price, not a promised edge and not verified ROI.
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
 * fall back to a partial or estimated gap. Never implies profitability: the
 * label states a distance from the market price, not an outcome.
 */
export function ValueGapBadge({ rankingP, marketFairProb }: ValueGapInput) {
  const result = computeValueGap({ rankingP, marketFairProb });
  if (result === null) return null;

  const pct = (Math.abs(result.gap) * 100).toFixed(1);
  const label =
    result.sign === "flat"
      ? "In line with the market price"
      : result.sign === "positive"
        ? `Beats the market price by ${pct} pts`
        : `Below the market price by ${pct} pts`;

  return (
    <span
      data-testid="value-gap-badge"
      className={`mt-2 block text-[10px] font-normal ${SIGN_CLASS[result.sign]}`}
      title="How far our number sits from the market price. It says nothing about whether the bet wins."
    >
      {label}
    </span>
  );
}
