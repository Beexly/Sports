/**
 * Quarantine for post-settlement independent trueProb rewrites.
 *
 * LAW:
 * - Never rewrite selection, line, result, settledAt, confidence, or grade.
 * - Never put a post-settlement number in independentEdge.trueProb — that is
 *   the column trainers read. The leaked value, if any, moves to
 *   postSettlementTrueProb (audit only).
 * - Trainers refuse post_settlement_backfill via tryReadTrainableTrueProb
 *   (ranking-prob.ts, trueprob-admission.ts), never by grepping rationale
 *   prose. requireTrainableTrueProbBasis is the throwing type-level
 *   contract and is not a trainer caller as of 936be9c.
 * - Does not flip PERFORMANCE_STATS / PROVEN / publish policy.
 */

import { db } from "@sports/db";
import { quarantineBackfillIndependentEdge } from "./quarantine-backfill-independent-edge.js";

type FactorBreakdownLike = {
  readonly independentEdge?: Record<string, unknown> | null;
};

function asEdgeRecord(fb: unknown): Record<string, unknown> | null {
  if (!fb || typeof fb !== "object") return null;
  const edge = (fb as FactorBreakdownLike).independentEdge;
  if (!edge || typeof edge !== "object") return null;
  return { ...edge };
}

export type BackfillIndependentResult = {
  readonly ok: boolean;
  readonly scanned: number;
  readonly alreadyPriced: number;
  readonly updated: number;
  readonly skippedNoOpinion: number;
  readonly skippedNonMl: number;
  readonly errors: readonly string[];
  readonly note: string;
};

export async function backfillIndependentTrueProb(opts?: {
  readonly limit?: number;
  readonly logPrefix?: string;
  readonly dryRun?: boolean;
  /** Retained so existing cron callers do not break. Network independents are no longer called. */
  readonly skipNetworkIndependents?: boolean;
  /**
   * Retained for caller compatibility. Quarantine never re-inserts a number
   * into the trainable trueProb column.
   */
  readonly forceReprice?: boolean;
}): Promise<BackfillIndependentResult> {
  const logPrefix = opts?.logPrefix ?? "[backfill-indep]";
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 80));
  const dryRun = opts?.dryRun === true;
  const errors: string[] = [];
  let scanned = 0;
  let alreadyPriced = 0;
  let updated = 0;
  let skippedNoOpinion = 0;
  const skippedNonMl = 0;

  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS"] },
      NOT: { modelVersion: "v5.0.0-seed" },
    },
    select: {
      id: true,
      factorBreakdown: true,
    },
    orderBy: { settledAt: "desc" },
    take: Math.min(2500, Math.max(limit * 12, 200)),
  });

  for (const pick of picks) {
    if (scanned >= limit) break;

    const prevEdge = asEdgeRecord(pick.factorBreakdown);
    if (!prevEdge) {
      skippedNoOpinion += 1;
      continue;
    }

    const nextEdge = quarantineBackfillIndependentEdge(prevEdge);
    if (!nextEdge) {
      alreadyPriced += 1;
      continue;
    }

    scanned += 1;

    const prev =
      pick.factorBreakdown && typeof pick.factorBreakdown === "object"
        ? ({ ...(pick.factorBreakdown as Record<string, unknown>) } as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const next = {
      ...prev,
      independentEdge: nextEdge,
    };

    if (!dryRun) {
      try {
        await db.pick.update({
          where: { id: pick.id },
          data: {
            factorBreakdown: JSON.parse(JSON.stringify(next)),
          },
        });
      } catch (err) {
        errors.push(
          `${pick.id}: update failed — ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
    }
    updated += 1;
  }

  const note =
    `scanned=${scanned} alreadyPriced=${alreadyPriced} updated=${updated} ` +
    `noOpinion=${skippedNoOpinion} nonMl=${skippedNonMl} dryRun=${dryRun} ` +
    `quarantine=strip_trainable_trueProb`;
  console.log(`${logPrefix} ${note}`);
  return {
    ok: true,
    scanned,
    alreadyPriced,
    updated,
    skippedNoOpinion,
    skippedNonMl,
    errors: errors.slice(0, 20),
    note,
  };
}
