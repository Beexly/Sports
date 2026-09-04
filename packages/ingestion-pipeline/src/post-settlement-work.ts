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
 * failure. Rows are never deleted.
 *
 * RETRY / TERMINAL STATE (this file's `*WorkWhere` helpers).
 *
 * The module header used to claim "a repair job (or an owner query) can list
 * PENDING/FAILED rows at any time". No such job existed, and all three drains
 * (`drainPendingClvGrades`, `drainPendingSnapshotOutcomes`,
 * `drainPendingTeamGameLogs`) selected `status: "PENDING"` only. FAILED was
 * therefore TERMINAL: one transient Postgres blip during a CLV grade
 * permanently abandoned that pick — Elite's CLV/line-value ledger grew silent
 * holes and calibration inputs thinned out, with nothing alerting.
 * `attemptCount` was incremented on every DONE/FAILED write and never read.
 *
 * The drains now claim via `retryablePostSettlementWorkWhere(kind)`, which is
 * strictly ADDITIVE to the old predicate:
 *
 *   PENDING                                            → claimed (unchanged)
 *   FAILED, attemptCount <  POST_SETTLEMENT_WORK_MAX_ATTEMPTS → claimed (new)
 *   FAILED, attemptCount >= POST_SETTLEMENT_WORK_MAX_ATTEMPTS → never claimed
 *
 * That last row is the TERMINAL state, and it needs no schema change: a row
 * above the cap is simply never re-selected again. `exhaustedPostSettlementWorkWhere`
 * is the owner query for exactly those rows. This mirrors the shape that already
 * works in `apps/web/lib/settlement-outbox/worker.ts` (`OUTBOX_MAX_ATTEMPTS = 5`,
 * a terminal state at the cap) with one deliberate difference:
 *
 * NO PER-ROW BACKOFF TIMESTAMP. The outbox stores `nextAttemptAt` on
 * PickSettlementDelivery and spaces retries with `computeNextAttemptAt`
 * (exponential + jitter). PostSettlementWork has no such column and adding one
 * is a schema migration, which is out of scope here. Retries are instead spaced
 * by the drains' own cadence: a drain attempts each claimed row AT MOST ONCE per
 * run, and runs only at the end of a settlement cycle — so attempts are already
 * separated by the cron interval, never tight-looped. The cap bounds total
 * attempts across cycles. See the PR body for the `nextAttemptAt` migration the
 * owner may want instead.
 */

export const POST_SETTLEMENT_WORK_KINDS = [
  "CLV_GRADE",
  "SNAPSHOT_OUTCOME",
  "TEAM_GAME_LOG",
] as const;
export type PostSettlementWorkKind = (typeof POST_SETTLEMENT_WORK_KINDS)[number];

/**
 * Maximum times one PostSettlementWork row may be attempted before it is
 * terminal. Mirrors `OUTBOX_MAX_ATTEMPTS` in the settlement outbox worker so
 * both durable side-effect queues give up after the same number of tries.
 *
 * `markPostSettlementWorkFailed` increments `attemptCount` on every failure, so
 * a row created PENDING(0) is attempted at most this many times in total before
 * `retryablePostSettlementWorkWhere` stops selecting it.
 */
export const POST_SETTLEMENT_WORK_MAX_ATTEMPTS = 5;

/**
 * Prisma `where` fragment shared by all three drains. Widening a drain's claim
 * predicate in one place keeps CLV, snapshot and game-log retries from drifting.
 */
export type PostSettlementWorkClaimWhere = {
  readonly kind: string;
  readonly OR: ReadonlyArray<
    | { readonly status: "PENDING" }
    | { readonly status: "FAILED"; readonly attemptCount: { readonly lt: number } }
  >;
};

/** Rows a drain may claim for `kind`: PENDING, or FAILED under the attempt cap. */
export function retryablePostSettlementWorkWhere(
  kind: PostSettlementWorkKind,
  maxAttempts: number = POST_SETTLEMENT_WORK_MAX_ATTEMPTS,
): PostSettlementWorkClaimWhere {
  return {
    kind,
    OR: [{ status: "PENDING" }, { status: "FAILED", attemptCount: { lt: maxAttempts } }],
  };
}

/**
 * Owner query: rows that exhausted the attempt cap and will never be retried.
 * These are the poison rows worth a human look — the honest replacement for the
 * "a repair job can list PENDING/FAILED rows" claim this module used to make.
 */
export function exhaustedPostSettlementWorkWhere(
  kind?: PostSettlementWorkKind,
  maxAttempts: number = POST_SETTLEMENT_WORK_MAX_ATTEMPTS,
): {
  readonly status: "FAILED";
  readonly attemptCount: { readonly gte: number };
  readonly kind?: string;
} {
  return {
    status: "FAILED",
    attemptCount: { gte: maxAttempts },
    ...(kind ? { kind } : {}),
  };
}

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
