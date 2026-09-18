/**
 * Public / cockpit / board sort key for picks.
 *
 * Prefer factorBreakdown.rankingP (0–1) when finite — that is the independent-
 * priced ranking path (MODEL_VERSION ≥ v5.2.1, incl. PASS). Fall back to
 * rankingScore/100, then confidence/100. Never invent values.
 *
 * Used so display order matches generation sort + selective path, instead of
 * re-ordering purely by market-echo confidence after load.
 *
 * RANKING-QUEUE TASK 4: this file CONSULTS SORT_KEY_ORDERING. The committed
 * value is "current", so comparePicksByRanking is byte-identical to the
 * pre-queue body. The named constant in @sports/types (RANKING_ORDERING_SWITCH)
 * is the same value; this file does not import @sports/types because two
 * tests mock that package with no importActual. Other orderings live in
 * packages/types/src/ranking-candidates.ts and are not reached from here
 * until a founder commit moves both constants together.
 */
export const SORT_KEY_ORDERING = "current" as const;

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
  if (SORT_KEY_ORDERING !== "current") {
    throw new Error(
      `SORT_KEY_ORDERING=${SORT_KEY_ORDERING} is not the committed current branch`,
    );
  }
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
