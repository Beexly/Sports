/**
 * Free-path SNAPSHOT_OUTCOME — parity with settleSport.
 * Free settle enqueued SNAPSHOT_OUTCOME but never wrote PickSignalSnapshot.
 * Law: snapshot failure never blocks settlement.
 */

import {
  recordPickSettlementSnapshot,
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";

export type FreePathSnapshotPick = {
  readonly id: string;
  readonly gameId: string;
  readonly isBootstrap: boolean;
  readonly bookmakerCount: number;
  readonly confidence: number;
  readonly modelVersion: string | null;
  readonly factorBreakdown: unknown;
};

export type FreePathSnapshotDb = {
  pickSignalSnapshot: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
    findUnique: (args: unknown) => Promise<{ settlementResult: string | null } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
  postSettlementWork: unknown;
};

export type FreePathSnapshotResult = {
  readonly pickId: string;
  readonly status: "updated-existing" | "already-settled" | "created-fallback" | "failed";
};

/**
 * Record settlement outcome on PickSignalSnapshot after free-path settle.
 */
export async function recordFreePathSnapshot(
  db: FreePathSnapshotDb,
  pick: FreePathSnapshotPick,
  result: "WIN" | "LOSS" | "PUSH" | "VOID",
  settledAt: Date,
  gameDataQualityScore: number = 0,
): Promise<FreePathSnapshotResult> {
  const work = db.postSettlementWork as PostSettlementWorkDelegate;
  const gates = getReadinessGates();
  const isDecisive = result === "WIN" || result === "LOSS" || result === "PUSH";
  const isEligibleForLearning =
    gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisive;

  try {
    const status = await recordPickSettlementSnapshot({
      db: db as never,
      pick,
      result,
      settledAt,
      isEligibleForLearning,
      gameDataQualityScore,
    });
    await markPostSettlementWorkDone(work, pick.id, "SNAPSHOT_OUTCOME", settledAt);
    return { pickId: pick.id, status };
  } catch (err) {
    console.warn(
      `[free-path-snapshot] failed pick=${pick.id}: ` +
        `${err instanceof Error ? err.message : err}`,
    );
    await markPostSettlementWorkFailed(work, pick.id, "SNAPSHOT_OUTCOME", err);
    return { pickId: pick.id, status: "failed" };
  }
}

/**
 * Repair drain: complete PENDING SNAPSHOT_OUTCOME for already-settled picks.
 */
export async function drainPendingSnapshotOutcomes(
  db: FreePathSnapshotDb & {
    postSettlementWork: {
      findMany: (args: {
        where: { status: string; kind: string };
        take: number;
        orderBy: { createdAt: "asc" };
        select: { subjectId: true };
      }) => Promise<Array<{ subjectId: string }>>;
    };
    pick: {
      findMany: (args: {
        where: { id: { in: string[] }; result: { not: string } };
        select: Record<string, unknown>;
      }) => Promise<
        Array<{
          id: string;
          result: string;
          isBootstrap: boolean;
          bookmakerCount: number;
          confidence: number;
          modelVersion: string | null;
          factorBreakdown: unknown;
          gameId: string;
          game?: { dataQualityScore?: number | null };
        }>
      >;
    };
  },
  options: { take?: number; now?: Date } = {},
): Promise<{ attempted: number; done: number; failed: number }> {
  const take = options.take ?? 80;
  const settledAt = options.now ?? new Date();
  const pending = await db.postSettlementWork.findMany({
    where: { status: "PENDING", kind: "SNAPSHOT_OUTCOME" },
    take,
    orderBy: { createdAt: "asc" },
    select: { subjectId: true },
  });
  if (pending.length === 0) return { attempted: 0, done: 0, failed: 0 };

  const ids = pending.map((p) => p.subjectId);
  const picks = await db.pick.findMany({
    where: { id: { in: ids }, result: { not: "PENDING" } },
    select: {
      id: true,
      result: true,
      isBootstrap: true,
      bookmakerCount: true,
      confidence: true,
      modelVersion: true,
      factorBreakdown: true,
      gameId: true,
      game: { select: { dataQualityScore: true } },
    },
  });

  let done = 0;
  let failed = 0;
  for (const p of picks) {
    const result = p.result as "WIN" | "LOSS" | "PUSH" | "VOID";
    if (!["WIN", "LOSS", "PUSH", "VOID"].includes(result)) continue;
    const r = await recordFreePathSnapshot(
      db,
      {
        id: p.id,
        gameId: p.gameId,
        isBootstrap: Boolean(p.isBootstrap),
        bookmakerCount: typeof p.bookmakerCount === "number" ? p.bookmakerCount : 0,
        confidence: typeof p.confidence === "number" ? p.confidence : 0,
        modelVersion: p.modelVersion ?? null,
        factorBreakdown: p.factorBreakdown ?? null,
      },
      result,
      settledAt,
      typeof p.game?.dataQualityScore === "number" ? p.game.dataQualityScore : 0,
    );
    if (r.status === "failed") failed++;
    else done++;
  }
  return { attempted: picks.length, done, failed };
}
