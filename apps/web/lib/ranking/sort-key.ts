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
/**
 * Which of the three branches below actually produced the key.
 *
 * WHY THIS IS REPORTED AT ALL. `confidence` is the branch that matters: it is
 * the one measured as ANTI-predictive at the top (AGENTS.md, n 2,385: conf 80+
 * claims 0.8663 and realizes 0.5191, z = -10.7, with realized win rate PEAKING
 * at 75-79 and falling below the lowest band by 90-94). `rankingP` is a
 * different animal, measured MONOTONE on n 1,390. So "the board is ordered by
 * an inverted score" is true only of rows that fall all the way through to
 * `confidence`, and NOBODY HAS EVER MEASURED WHAT SHARE OF ROWS THAT IS.
 * Reporting the basis is what makes that number obtainable.
 */
export type RankingBasis = "rankingP" | "rankingScore" | "confidence";

export interface RankingRead {
  readonly basis: RankingBasis;
  readonly key: number;
}

/**
 * The single branch decision. `rankingSortKey` is a thin wrapper over this, so
 * the basis and the key can never disagree: a second copy of this cascade is
 * how a census drifts from the comparator it claims to describe, and then
 * reports a reassuring number about code that does something else.
 */
export function readRankingKey(pick: {
  readonly confidence: number;
  readonly factorBreakdown?: unknown;
}): RankingRead {
  const conf = Number.isFinite(pick.confidence) ? pick.confidence / 100 : 0;
  const fb = pick.factorBreakdown;
  if (!fb || typeof fb !== "object") return { basis: "confidence", key: conf };

  const rec = fb as Record<string, unknown>;
  const rankingP = rec["rankingP"];
  if (typeof rankingP === "number" && Number.isFinite(rankingP)) {
    return { basis: "rankingP", key: Math.min(1, Math.max(0, rankingP)) };
  }
  const rankingScore = rec["rankingScore"];
  if (typeof rankingScore === "number" && Number.isFinite(rankingScore)) {
    return {
      basis: "rankingScore",
      key: Math.min(1, Math.max(0, rankingScore / 100)),
    };
  }
  return { basis: "confidence", key: conf };
}

export function rankingSortKey(pick: {
  readonly confidence: number;
  readonly factorBreakdown?: unknown;
}): number {
  return readRankingKey(pick).key;
}

export interface RankingBasisCensus {
  readonly rankingP: number;
  readonly rankingScore: number;
  readonly confidence: number;
  readonly total: number;
  /** Share of rows ordered by the anti-predictive branch, 0-1. 0 when empty. */
  readonly confidenceShare: number;
}

/**
 * Count which branch orders each row. This is a MEASUREMENT, not a gate: it
 * reads, never filters, and an empty input is a real answer (all zeros) rather
 * than an error, so a caller cannot mistake "nothing to measure" for a fault.
 */
export function rankingBasisCensus(
  picks: readonly {
    readonly confidence: number;
    readonly factorBreakdown?: unknown;
  }[],
): RankingBasisCensus {
  let rankingP = 0;
  let rankingScore = 0;
  let confidence = 0;
  for (const p of picks) {
    const basis = readRankingKey(p).basis;
    if (basis === "rankingP") rankingP += 1;
    else if (basis === "rankingScore") rankingScore += 1;
    else confidence += 1;
  }
  const total = picks.length;
  return {
    rankingP,
    rankingScore,
    confidence,
    total,
    confidenceShare: total === 0 ? 0 : confidence / total,
  };
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
