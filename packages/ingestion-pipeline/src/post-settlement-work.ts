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

/**
 * REOPENS work rows for a subject whose settled outcome was withdrawn.
 *
 * `enqueuePostSettlementWork` is `createMany` with `skipDuplicates` on unique
 * (subjectId, kind), so for an ALREADY SETTLED pick — whose rows are already
 * DONE from the original settlement — it is a no-op. Without an explicit
 * reopen, a withdrawal leaves the CLV grade and the signal snapshot holding
 * the outcome that was just withdrawn (Devin Review, #733).
 *
 * Sets the rows back to PENDING and clears `completedAt`, so the existing
 * repair path picks them up exactly as it does any other owed work. Rows are
 * never deleted and the attempt history is preserved.
 */
export async function reopenPostSettlementWork(
  delegate: PostSettlementWorkDelegate,
  subjectId: string,
  kinds: readonly PostSettlementWorkKind[],
): Promise<void> {
  for (const kind of kinds) {
    try {
      // No "reopenedAt" column exists and schema.prisma is frozen, so the
      // reopen is recorded by status alone; `attemptCount` preserves the history.
      await delegate.updateMany({
        where: { subjectId, kind },
        data: { status: "PENDING", completedAt: null, lastError: null },
      });
    } catch (err) {
      console.warn(
        `[post-settlement-work] could not reopen ${kind}/${subjectId}: ` +
          `${err instanceof Error ? err.message : err}`,
      );
    }
  }
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

/**
 * RETIRES a work row that can never be performed, so it stops being selected.
 *
 * Distinct from DONE (the work happened) and from FAILED (it should be retried).
 * A CLV grade owed on a pick that was later WITHDRAWN is neither: there is no
 * bet left to grade and no repair that would change that.
 *
 * Why this exists (Devin Review, #733 round 7): the drains select PENDING rows
 * oldest-first with a fixed `take`, then filter the subjects they cannot
 * process. A subject that is filtered but never retired is re-selected every
 * cycle and occupies a slot forever — enough of them and valid repairs behind
 * them never run. Excluding work without retiring it converts a correctness fix
 * into a liveness bug.
 *
 * `status` is a plain String column, not an enum, and the only readers filter on
 * `status: "PENDING"` (the CLV and snapshot drains), so a new terminal value
 * needs no schema change and is invisible to them — which is the point.
 * Nothing is deleted; the row and its reason stay for audit.
 */
export const POST_SETTLEMENT_WORK_CANCELLED = "CANCELLED" as const;

export async function cancelPostSettlementWork(
  delegate: PostSettlementWorkDelegate,
  subjectId: string,
  kind: PostSettlementWorkKind,
  reason: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    await delegate.updateMany({
      where: { subjectId, kind },
      data: {
        status: POST_SETTLEMENT_WORK_CANCELLED,
        completedAt: now,
        lastError: reason,
      },
    });
  } catch (err) {
    console.warn(
      `[post-settlement-work] could not cancel ${kind}/${subjectId}: ` +
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
