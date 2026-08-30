/**
 * Durable post-settlement work-state (hardening 6.10, PR #161).
 *
 * CLV grading, PickSignalSnapshot outcome writes and TeamGameLog entries
 * all run AFTER the pick-settlement/outbox transaction commits. Before this
 * module, a crash between the settlement commit and those side tasks left
 * no durable record that the work was owed — repair depended on accidental
 * reruns of settleSport() finding something to do.
 *
 * Now: PENDING PostSettlementWork rows are appended INSIDE the settlement
 * transaction (same durability guarantee as the outbox event), and each
 * side task marks its row DONE on success / FAILED with the error on
 * failure. A repair job (or an owner query) can list PENDING/FAILED rows at
 * any time. Rows are never deleted.
 */

export const POST_SETTLEMENT_WORK_KINDS = [
  "CLV_GRADE",
  "SNAPSHOT_OUTCOME",
  "TEAM_GAME_LOG",
] as const;
export type PostSettlementWorkKind = (typeof POST_SETTLEMENT_WORK_KINDS)[number];

/** Minimal Prisma-delegate-shaped surface (structural-db doctrine). */
export interface PostSettlementWorkDelegate {
  createMany(args: {
    data: Array<{ subjectId: string; kind: string }>;
    skipDuplicates: boolean;
  }): Promise<{ count: number }>;
  updateMany(args: {
    where: { subjectId: string; kind: string };
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

/** Appends PENDING work rows (idempotent — unique (subjectId, kind) +
 *  skipDuplicates). Call INSIDE the settlement transaction. */
export async function enqueuePostSettlementWork(
  delegate: PostSettlementWorkDelegate,
  entries: Array<{ subjectId: string; kind: PostSettlementWorkKind }>,
): Promise<void> {
  if (entries.length === 0) return;
  await delegate.createMany({
    data: entries.map((e) => ({ subjectId: e.subjectId, kind: e.kind })),
    skipDuplicates: true,
  });
}

/** Marks one work row DONE. Idempotent; never throws (the side task
 *  already succeeded — bookkeeping failure must not undo that). */
export async function markPostSettlementWorkDone(
  delegate: PostSettlementWorkDelegate,
  subjectId: string,
  kind: PostSettlementWorkKind,
  now: Date = new Date(),
): Promise<void> {
  try {
    await delegate.updateMany({
      where: { subjectId, kind },
      data: { status: "DONE", completedAt: now, attemptCount: { increment: 1 } },
    });
  } catch (err) {
    console.warn(
      `[post-settlement-work] could not mark ${kind}/${subjectId} DONE: ` +
        `${err instanceof Error ? err.message : err}`,
    );
  }
}

/** Marks one work row FAILED with the error (repairable, never deleted).
 *  Never throws. */
export async function markPostSettlementWorkFailed(
  delegate: PostSettlementWorkDelegate,
  subjectId: string,
  kind: PostSettlementWorkKind,
  error: unknown,
): Promise<void> {
  try {
    await delegate.updateMany({
      where: { subjectId, kind },
      data: {
        status: "FAILED",
        lastError: error instanceof Error ? error.message : String(error),
        attemptCount: { increment: 1 },
      },
    });
  } catch (err) {
    console.warn(
      `[post-settlement-work] could not mark ${kind}/${subjectId} FAILED: ` +
        `${err instanceof Error ? err.message : err}`,
    );
  }
}
