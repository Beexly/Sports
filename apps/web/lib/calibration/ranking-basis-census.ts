/**
 * ranking-basis-census — the measurement `rankingBasisCensus()` was written for
 * and never received.
 *
 * WHY THIS FILE EXISTS. `apps/web/lib/ranking/sort-key.ts` sorts the public board
 * through a three-branch cascade: prefer `factorBreakdown.rankingP` (measured
 * MONOTONE, n 1,390), else `rankingScore/100`, else `confidence/100` (measured
 * ANTI-predictive, n 2,385, z = -10.7). Its own header has carried the line
 * "NOBODY HAS EVER MEASURED WHAT SHARE OF ROWS THAT IS" since it was written,
 * because `rankingBasisCensus` had zero non-test callers.
 *
 * That matters: if the share of rows resolving to `rankingP` is small, the board
 * is being ordered by the anti-predictive branch while looking like it uses the
 * good one. Nobody can tell from outside, because `/api/board/state` nulls
 * `rankingP` for non-premium viewers (GSE-SEC-026) — a deliberate redaction
 * that makes the public payload unable to answer the question by design.
 *
 * So this is a MEASUREMENT, not a gate. It reads, never filters, and an empty
 * population is a real answer (all zeros) rather than an error, so a caller
 * cannot mistake "nothing to measure" for a fault. Same posture as
 * `loadConfidenceTail` next door, on the SAME published population, so the two
 * numbers are directly comparable rather than describing different slices.
 */

import { readRankingKey, type RankingBasisCensus } from "@/lib/ranking/sort-key";
import { SEED_MODEL_VERSION } from "@/lib/calibration/confidence-tail";

/** The subset of the Prisma client this needs. Injected, never imported. */
export interface RankingBasisDb {
  pick: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        confidence: number;
        factorBreakdown?: unknown;
        result: string | null;
        isPublished: boolean;
        isBootstrap: boolean;
        modelVersion: string | null;
      }>
    >;
  }
}

/**
 * Which branch of the comparator actually orders each published, graded pick.
 *
 * `confidenceShare` is the number the whole file exists to produce: the fraction
 * of real rows ordered by the anti-predictive key. It is reported, never acted
 * on — changing the comparator is a ranking decision with customer-visible
 * consequences and belongs to the founder, not to a census that merely counts.
 */
export async function loadRankingBasisCensus(db: RankingBasisDb): Promise<RankingBasisCensus> {
  // Deliberately the same population `loadConfidenceTail` reads: settled
  // (WIN/LOSS), published, non-bootstrap, not the seed model. A census that
  // counted a different slice than the confidence tail would produce a share
  // that looks comparable and is not.
  const rows = await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS"] },
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: SEED_MODEL_VERSION },
    },
    select: { confidence: true, factorBreakdown: true },
  });

  let rankingP = 0;
  let rankingScore = 0;
  let confidence = 0;
  for (const r of rows) {
    const basis = readRankingKey(r).basis;
    if (basis === "rankingP") rankingP += 1;
    else if (basis === "rankingScore") rankingScore += 1;
    else confidence += 1;
  }
  const total = rows.length;
  return {
    rankingP,
    rankingScore,
    confidence,
    total,
    confidenceShare: total === 0 ? 0 : confidence / total,
  };
}
