/**
 * Public / cockpit / board sort key for picks.
 *
 * Prefer factorBreakdown.rankingP (0–1) when finite — that is the independent-
 * priced ranking path (MODEL_VERSION ≥ v5.2.1, incl. PASS). Fall back to
 * rankingScore/100, then confidence/100. Never invent values.
 *
 * Used so display order matches generation sort + selective path, instead of
 * re-ordering purely by market-echo confidence after load.
 */
export function rankingSortKey(pick: {
  readonly confidence: number;
  readonly factorBreakdown?: unknown;
}): number {
  const conf = Number.isFinite(pick.confidence) ? pick.confidence / 100 : 0;
  const fb = pick.factorBreakdown;
  if (!fb || typeof fb !== "object") return conf;

  const rec = fb as Record<string, unknown>;
  const rankingP = rec["rankingP"];
  if (typeof rankingP === "number" && Number.isFinite(rankingP)) {
    return Math.min(1, Math.max(0, rankingP));
  }
  const rankingScore = rec["rankingScore"];
  if (typeof rankingScore === "number" && Number.isFinite(rankingScore)) {
    return Math.min(1, Math.max(0, rankingScore / 100));
  }
  return conf;
}

/** Higher ranking first; optional featured pin; then newer generatedAt. */
export function comparePicksByRanking(
  a: {
    readonly confidence: number;
    readonly factorBreakdown?: unknown;
    readonly isFeatured?: boolean;
    readonly generatedAt?: Date | string | null;
  },
  b: {
    readonly confidence: number;
    readonly factorBreakdown?: unknown;
    readonly isFeatured?: boolean;
    readonly generatedAt?: Date | string | null;
  },
): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const ra = rankingSortKey(a);
  const rb = rankingSortKey(b);
  if (ra !== rb) return rb - ra;

  // C-192. `new Date("garbage").getTime()` is NaN, and `NaN - NaN` is NaN, so
  // an unparseable generatedAt made this comparator return NaN. A comparator
  // that returns NaN does not throw: Array.prototype.sort silently produces an
  // implementation-defined order, which on this product means the same slate
  // can render in two different orders. Property fuzz (C-192) showed the NaN
  // path breaks all four total-order laws at once - reflexivity included.
  //
  // NOT reachable from today's seven call sites: every one passes Prisma rows
  // whose generatedAt is a DateTime column, so it is always a real Date. This
  // is closing the hole the SIGNATURE leaves open (it accepts `string`), and
  // matching rankingSortKey directly above, which already guards every one of
  // its numeric reads the same way. Unparseable sorts as epoch 0 - oldest -
  // rather than poisoning the whole comparison.
  const timeOf = (value: Date | string | null | undefined): number => {
    if (!value) return 0;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  return timeOf(b.generatedAt) - timeOf(a.generatedAt);
}
