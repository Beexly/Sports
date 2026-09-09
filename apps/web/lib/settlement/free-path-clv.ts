/**
 * Free-path CLV grading — closes the gap where free settle enqueued CLV_GRADE
 * but never graded (paid settleSport grades inline).
 *
 * Law: CLV failure never blocks settlement. No grade owed when no lock/close
 * is marked DONE (not forever-PENDING). No invented closes.
 */

import {
  deriveClosingSnapshotFromOdds,
  gradePickClv,
  type ClosingOddsRow,
} from "@sports/prediction-engine";
import {
  cancelPostSettlementWork,
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import { CLV_WITHDRAWN_RESULT } from "@/lib/clv/clv-sample-policy";

export type FreePathClvPick = {
  readonly id: string;
  readonly pickType: string;
  readonly selection: string;
  readonly clvLockLine: number | null;
  readonly clvLockPrice: number | null;
  readonly game: {
    readonly id: string;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly commenceTime: Date;
  };
};

export type FreePathClvDb = {
  odds: {
    findMany: (args: {
      where: { gameId: string; fetchedAt: { lte: Date } };
      orderBy: { fetchedAt: "desc" };
      take: number;
      select: {
        market: true;
        fetchedAt: true;
        spread: true;
        total: true;
        homePrice: true;
        awayPrice: true;
      };
    }) => Promise<ClosingOddsRow[]>;
  };
  pick: {
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  postSettlementWork: unknown;
};

export type FreePathClvResult = {
  readonly pickId: string;
  readonly status: "graded" | "no_close" | "failed";
  readonly clvValue: number | null;
};

/**
 * Grade CLV for one just-settled pick. Safe to call after free-path settle write.
 */
export async function gradeFreePathClv(
  db: FreePathClvDb,
  pick: FreePathClvPick,
  settledAt: Date = new Date(),
): Promise<FreePathClvResult> {
  const work = db.postSettlementWork as PostSettlementWorkDelegate;

  let closingSnapshot: ReturnType<typeof deriveClosingSnapshotFromOdds> | null = null;
  try {
    const closingOdds = await db.odds.findMany({
      where: { gameId: pick.game.id, fetchedAt: { lte: pick.game.commenceTime } },
      orderBy: { fetchedAt: "desc" },
      take: 80,
      select: {
        market: true,
        fetchedAt: true,
        spread: true,
        total: true,
        homePrice: true,
        awayPrice: true,
      },
    });
    closingSnapshot = deriveClosingSnapshotFromOdds(closingOdds, pick.game.commenceTime);
  } catch (err) {
    console.warn(
      `[free-path-clv] closing fetch failed pick=${pick.id}: ` +
        `${err instanceof Error ? err.message : err}`,
    );
    await markPostSettlementWorkFailed(work, pick.id, "CLV_GRADE", err);
    return { pickId: pick.id, status: "failed", clvValue: null };
  }

  if (!closingSnapshot?.capturedAt) {
    await markPostSettlementWorkDone(work, pick.id, "CLV_GRADE", settledAt);
    return { pickId: pick.id, status: "no_close", clvValue: null };
  }

  try {
    const grade = gradePickClv({
      pickType: pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
      selection: pick.selection,
      homeTeamName: pick.game.homeTeamName,
      awayTeamName: pick.game.awayTeamName,
      lockLine: pick.clvLockLine,
      lockPrice: pick.clvLockPrice,
      close: closingSnapshot,
    });
    if (grade) {
      await db.pick.update({
        where: { id: pick.id },
        data: {
          clvCloseLine: grade.closeLine,
          clvClosePrice: grade.closePrice,
          clvKind: grade.kind,
          clvValue: grade.value,
          clvVerdict: grade.verdict,
          clvCapturedAt: closingSnapshot.capturedAt,
          clvGradedAt: settledAt,
        },
      });
      await markPostSettlementWorkDone(work, pick.id, "CLV_GRADE", settledAt);
      return { pickId: pick.id, status: "graded", clvValue: grade.value };
    }
    await markPostSettlementWorkDone(work, pick.id, "CLV_GRADE", settledAt);
    return { pickId: pick.id, status: "no_close", clvValue: null };
  } catch (err) {
    console.warn(
      `[free-path-clv] grade failed pick=${pick.id}: ` +
        `${err instanceof Error ? err.message : err}`,
    );
    await markPostSettlementWorkFailed(work, pick.id, "CLV_GRADE", err);
    return { pickId: pick.id, status: "failed", clvValue: null };
  }
}

/**
 * Repair drain: grade PENDING CLV_GRADE work for already-settled picks.
 * Call at end of free settle cycle to clear backlog without waiting for re-settle.
 */
export async function drainPendingClvGrades(
  db: FreePathClvDb & {
    postSettlementWork: {
      findMany: (args: {
        where: { status: string; kind: string };
        take: number;
        orderBy: { createdAt: "asc" };
        select: { subjectId: true };
      }) => Promise<Array<{ subjectId: string }>>;
    };
    pick: FreePathClvDb["pick"] & {
      findMany: (args: {
        where: { id: { in: string[] } };
        select: Record<string, unknown>;
      }) => Promise<Array<FreePathClvPick & { result: string }>>;
    };
  },
  options: { take?: number; now?: Date } = {},
): Promise<{ attempted: number; graded: number; noClose: number; failed: number; retired: number }> {
  const take = options.take ?? 80;
  const settledAt = options.now ?? new Date();
  const pending = await db.postSettlementWork.findMany({
    where: { status: "PENDING", kind: "CLV_GRADE" },
    take,
    orderBy: { createdAt: "asc" },
    select: { subjectId: true },
  });
  if (pending.length === 0) {
    return { attempted: 0, graded: 0, noClose: 0, failed: 0, retired: 0 };
  }

  const ids = pending.map((p) => p.subjectId);
  // Load the selected subjects WITH their result and partition in code rather
  // than filtering them out in the query.
  //
  // Filtering in SQL was the round-4 fix and it introduced a liveness bug
  // (round 7): a VOID subject still consumed one of the `take` slots, was
  // dropped from `picks`, and — because nothing retired its work row — was
  // re-selected on every subsequent cycle. Enough withdrawn picks at the head
  // of the oldest-first queue and no valid repair behind them ever runs.
  //
  //   WIN | LOSS | PUSH -> grade it
  //   VOID             -> RETIRE the work row; there is no bet to grade and no
  //                       repair that would change that. The stored clvVerdict
  //                       is left untouched (settlement history).
  //   PENDING          -> leave PENDING; it is legitimately still waiting.
  const rows = await db.pick.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      result: true,
      pickType: true,
      selection: true,
      clvLockLine: true,
      clvLockPrice: true,
      game: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
        },
      },
    },
  });

  const picks = rows.filter((p) => p.result === "WIN" || p.result === "LOSS" || p.result === "PUSH");
  const withdrawn = rows.filter((p) => p.result === CLV_WITHDRAWN_RESULT);

  // Retire withdrawn work FIRST, so a batch that is entirely VOID still frees
  // its slots for the next cycle instead of reselecting the same rows forever.
  let retired = 0;
  const work = db.postSettlementWork as unknown as PostSettlementWorkDelegate;
  for (const p of withdrawn) {
    await cancelPostSettlementWork(
      work,
      p.id,
      "CLV_GRADE",
      "pick withdrawn to VOID: no bet stood, so there is no closing-line value to grade",
      settledAt,
    );
    retired += 1;
  }

  let graded = 0;
  let noClose = 0;
  let failed = 0;
  for (const pick of picks) {
    const r = await gradeFreePathClv(db, pick, settledAt);
    if (r.status === "graded") graded++;
    else if (r.status === "no_close") noClose++;
    else failed++;
  }

  return { attempted: picks.length, graded, noClose, failed, retired };
}
