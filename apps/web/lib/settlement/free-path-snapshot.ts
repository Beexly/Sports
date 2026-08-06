/**
 * Free-path SNAPSHOT_OUTCOME — parity with settleSport.
 *
 * Free settle was enqueue-only for SNAPSHOT_OUTCOME (learning eligibility +
 * signal snapshot outcome never written). This grades inline after settle and
 * drains PENDING/FAILED backlog each free settle cycle.
 *
 * Law: snapshot failure never blocks settlement. No invented outcomes.
 */

import {
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  recordPickSettlementSnapshot,
  type PostSettlementWorkDelegate,
  type SettlementSnapshotPick,
  type SettledPickResult,
} from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";

export type FreePathSnapshotDb = {
  pickSignalSnapshot: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
    findUnique: (args: unknown) => Promise<{ settlementResult: string | null } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
  postSettlementWork: unknown;
  pick: {
    findMany: (args: {
      where: { id: { in: string[] }; result: { not: string } };
      select: Record<string, unknown>;
    }) => Promise<
      Array<
        SettlementSnapshotPick & {
          result: SettledPickResult;
          settledAt: Date | null;
          game: { dataQualityScore: number | null };
        }
      >
    >;
  };
};

export type FreePathSnapshotResult = {
  readonly pickId: string;
  readonly status: "written" | "failed";
};

/**
 * Write snapshot outcome for one just-settled free-path pick.
 */
export async function writeFreePathSnapshotOutcome(
  db: FreePathSnapshotDb,
  pick: SettlementSnapshotPick & { result: SettledPickResult },
  settledAt: Date,
  gameDataQualityScore: number,
): Promise<FreePathSnapshotResult> {
  const work = db.postSettlementWork as PostSettlementWorkDelegate;
  const gates = getReadinessGates();
  const isDecisive =
    pick.result === "WIN" || pick.result === "LOSS" || pick.result === "PUSH";
  const isEligibleForLearning =
    gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisive;

  try {
    await recordPickSettlementSnapshot({
      db,
      pick,
      result: pick.result,
      settledAt,
      isEligibleForLearning,
      gameDataQualityScore,
    });
    await markPostSettlementWorkDone(work, pick.id, "SNAPSHOT_OUTCOME", settledAt);
    return { pickId: pick.id, status: "written" };
  } catch (err) {
    console.warn(
      `[free-path-snapshot] write failed pick=${pick.id}: ` +
        `${err instanceof Error ? err.message : err}`,
    );
    await markPostSettlementWorkFailed(work, pick.id, "SNAPSHOT_OUTCOME", err);
    return { pickId: pick.id, status: "failed" };
  }
}

/**
 * Repair drain: SNAPSHOT_OUTCOME PENDING (and optionally FAILED) for settled picks.
 */
export async function drainPendingSnapshotOutcomes(
  db: FreePathSnapshotDb & {
    postSettlementWork: {
      findMany: (args: {
        where: { status: { in: string[] }; kind: string };
        take: number;
        orderBy: { createdAt: "asc" };
        select: { subjectId: true; status: true };
      }) => Promise<Array<{ subjectId: string; status: string }>>;
    };
  },
  options: { take?: number; now?: Date; includeFailed?: boolean } = {},
): Promise<{ attempted: number; written: number; failed: number }> {
  const take = options.take ?? 80;
  const settledAt = options.now ?? new Date();
  const statuses = options.includeFailed ? ["PENDING", "FAILED"] : ["PENDING"];

  const pending = await db.postSettlementWork.findMany({
    where: { status: { in: statuses }, kind: "SNAPSHOT_OUTCOME" },
    take,
    orderBy: { createdAt: "asc" },
    select: { subjectId: true, status: true },
  });
  if (pending.length === 0) {
    return { attempted: 0, written: 0, failed: 0 };
  }

  const ids = pending.map((p) => p.subjectId);
  const picks = await db.pick.findMany({
    where: { id: { in: ids }, result: { not: "PENDING" } },
    select: {
      id: true,
      gameId: true,
      isBootstrap: true,
      bookmakerCount: true,
      confidence: true,
      modelVersion: true,
      factorBreakdown: true,
      result: true,
      settledAt: true,
      game: { select: { dataQualityScore: true } },
    },
  });

  let written = 0;
  let failed = 0;
  for (const pick of picks) {
    if (
      pick.result !== "WIN" &&
      pick.result !== "LOSS" &&
      pick.result !== "PUSH" &&
      pick.result !== "VOID"
    ) {
      continue;
    }
    const r = await writeFreePathSnapshotOutcome(
      db,
      {
        id: pick.id,
        gameId: pick.gameId,
        isBootstrap: Boolean(pick.isBootstrap),
        bookmakerCount: Number(pick.bookmakerCount ?? 0),
        confidence: Number(pick.confidence ?? 0),
        modelVersion: pick.modelVersion ?? null,
        factorBreakdown: pick.factorBreakdown ?? null,
        result: pick.result,
      },
      pick.settledAt ?? settledAt,
      typeof pick.game?.dataQualityScore === "number" ? pick.game.dataQualityScore : 0,
    );
    if (r.status === "written") written++;
    else failed++;
  }

  return { attempted: picks.length, written, failed };
}
