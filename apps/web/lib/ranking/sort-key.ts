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

  const ta = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
  const tb = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
  return tb - ta;
}
