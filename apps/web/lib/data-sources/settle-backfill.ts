/**
 * T11 stale-settlement backfill — free-source lane for PENDING picks older
 * than the paid Odds API scores window (3 days).
 *
 * The paid path (`settleSport`) can only see games inside `daysFrom=3`.
 * Anything older becomes a ratchet unless a free-source lane grades it.
 *
 * Hard rules:
 *  - Free sources only (ESPN via fetchScoresMultiSource — already clearance-gated).
 *  - Same settlePendingPicks grader as the live free path. No new grading.
 *  - No schema. Unresolvable picks stay PENDING with an operator-readable
 *    reason in the run result (MASTER-HANDOFF deleted spec B.4 VOID).
 *  - VOID remains the postponed-evidence path inside settlePendingPicks.
 *  - Overdue health math is unchanged; settled picks leave the set by result.
 *
 * Pure-injectable for tests. No live DB/network unless the caller supplies them.
 */

import { selectGradingLine } from "@sports/prediction-engine";
import {
  enqueuePostSettlementWork,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import { fetchScoresMultiSource } from "./multi-source-scores";
import { uniqueScoreboardDates } from "./settlement-score-dates";
import {
  buildTrustedFinals,
  settlePendingPicks,
  type PendingPick,
} from "./free-settlement";
import { ODDS_KEY_TO_FREE } from "./free-settlement-runner";
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { Sport } from "./source-router";

/** Kept for callers/tests that reference the old paid window; no longer the cutoff. */
export const PAID_SCORES_WINDOW_DAYS = 3;
/**
 * Backfill inspects every published PENDING pick whose game started more than
 * this many hours ago. It equals SETTLEMENT_DEFAULT_GRACE_HOURS
 * (lib/performance/settlement-health.ts) on purpose: the settlement-health
 * band counts a pick overdue after the same 6h, so nothing can be "overdue" and
 * yet outside this lane. The old 3-day cutoff assumed the paid Odds API scores
 * path covered the 6h–3d band; that path has been failing since 2026-08-24
 * (provider outage), which left every game in that band ungraded and produced
 * the CRITICAL backlog observed 2026-09-02.
 */
export const BACKFILL_WINDOW_HOURS: number = SETTLEMENT_DEFAULT_GRACE_HOURS;
/**
 * Per-run cap. 50 re-read the same oldest 50 every hour once that many picks
 * were HELD or unmatched, and everything behind them was never inspected.
 */
export const BACKFILL_CAP = 200;
export const BACKFILL_UNRESOLVED_GRACE_DAYS = 14;

export type UnresolvedStalePick = {
  pickId: string;
  gameId: string;
  commenceTime: string;
  ageDays: number;
  reason: "NO_FINAL" | "ORIENT_FAIL" | "AMBIGUOUS_MATCH" | "DISPUTED" | "SCORE_MISMATCH";
  sourcesTried: readonly string[];
  olderThanGrace: boolean;
};

export type BackfillResult = {
  inspected: number;
  /**
   * True when the lane inspected a full cap's worth of rows: the oldest
   * `cap` overdue picks filled the run, so anything behind them was not
   * looked at this hour. If this stays true run after run while `settled` is
   * 0, the head of the backlog is stuck on HELD/unmatched rows and the
   * operator has to resolve them (or raise the cap) before later picks are
   * ever reached.
   */
  capReached: boolean;
  settled: number;
  held: number;
  skippedInWindow: number;
  unresolved: UnresolvedStalePick[];
  cap: number;
  /** Fractional days; kept for older readers. `windowHours` is the real unit. */
  windowDays: number;
  windowHours: number;
};

type StalePickRow = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  clvLockLine: number | null;
  gameId: string;
  game: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sportKey: string;
  };
};

type LoadedPickRow = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  clvLockLine: number | null;
  gameId: string;
  game: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sport?: { key?: string };
    sportKey?: string;
  };
};

export type BackfillDb = {
  pick: {
    findMany: (args: Record<string, unknown>) => Promise<LoadedPickRow[]>;
  };
  $transaction?: (
    fn: (tx: {
      pick: { updateMany: (args: unknown) => Promise<{ count: number }> };
      pickSettlementEvent: { create: (args: unknown) => Promise<unknown> };
      postSettlementWork: unknown;
      game: {
        updateMany: (args: unknown) => Promise<{ count: number }>;
        findUnique: (args: unknown) => Promise<{
          homeScore: number | null;
          awayScore: number | null;
        } | null>;
      };
    }) => Promise<{ count: number }>,
  ) => Promise<{ count: number }>;
};

export type PersistSettledArgs = {
  pickId: string;
  gameId: string;
  result: "WIN" | "LOSS" | "PUSH" | "VOID";
  settledAt: Date;
  homeScore: number | null;
  awayScore: number | null;
};

/**
 * What one persist attempt did. A refusal is NOT a silent no-op: the pick is
 * still PENDING and the caller records it, so nothing sits unaccounted.
 * `boolean` stays accepted for injected persisters: `true` means written.
 */
export type PersistSettledOutcome = {
  readonly written: boolean;
  readonly refusal: "SCORE_MISMATCH" | null;
};

export async function backfillStaleSettlement(input: {
  db: BackfillDb;
  now?: Date;
  cap?: number;
  /**
   * Restrict the lane to one sport (the cron's `?sport=` scope). Without it
   * the lane covers every sport. A scoped settle cycle must not count another
   * sport's backfill as its own work, so the scope reaches this query too.
   */
  sportKey?: string | null;
  fetchScores?: typeof fetchScoresMultiSource;
  persistSettled?: (args: PersistSettledArgs) => Promise<boolean | PersistSettledOutcome>;
}): Promise<BackfillResult> {
  const now = input.now ?? new Date();
  const cap = input.cap ?? BACKFILL_CAP;
  const windowMs = BACKFILL_WINDOW_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - windowMs);
  const fetchScores = input.fetchScores ?? fetchScoresMultiSource;
  const persistSettled = input.persistSettled ?? defaultPersist(input.db);

  const rows = await input.db.pick.findMany({
    where: {
      result: "PENDING",
      isPublished: true,
      game: {
        commenceTime: { lt: cutoff },
        ...(input.sportKey ? { sport: { key: input.sportKey } } : {}),
      },
    },
    orderBy: { game: { commenceTime: "asc" } },
    take: cap + 1, // +1 so capReached (rows beyond cap) is decidable
    select: {
      id: true,
      pickType: true,
      selection: true,
      line: true,
      clvLockLine: true,
      gameId: true,
      game: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          sport: { select: { key: true } },
        },
      },
    },
  });

  const normalized: StalePickRow[] = rows.map((r) => ({
    id: r.id,
    pickType: r.pickType,
    selection: r.selection,
    line: r.line,
    clvLockLine: r.clvLockLine,
    gameId: r.gameId,
    game: {
      id: r.game.id,
      homeTeamName: r.game.homeTeamName,
      awayTeamName: r.game.awayTeamName,
      commenceTime: r.game.commenceTime,
      sportKey: r.game.sport?.key ?? r.game.sportKey ?? "",
    },
  }));

  const inWindowSkipped = normalized.filter((r) => r.game.commenceTime >= cutoff);
  const staleUntrimmed = normalized.filter((r) => r.game.commenceTime < cutoff);
  // capReached must mean "rows exist BEYOND the cap that were not looked at".
  // We fetch cap + 1 rows precisely so this is decidable: exactly-cap backlogs
  // report false; anything deeper reports true.
  const capReached = staleUntrimmed.length > cap;
  const stale = staleUntrimmed.slice(0, cap);

  const bySport = new Map<string, StalePickRow[]>();
  for (const row of stale) {
    const key = row.game.sportKey;
    const list = bySport.get(key) ?? [];
    list.push(row);
    bySport.set(key, list);
  }

  let settled = 0;
  let held = 0;
  const unresolved: UnresolvedStalePick[] = [];
  const settledAt = now;

  for (const [sportKey, sportRows] of bySport) {
    const freeSport: Sport | null = ODDS_KEY_TO_FREE[sportKey] ?? null;
    const sourcesTried: string[] = freeSport
      ? ["espn-public-api"]
      : [];
    let games: readonly NormalizedGame[] = [];
    if (freeSport) {
      // This lane drains the tail, so when the loaded rows span more than the
      // date cap the OLDEST days must be the ones fetched (the runner keeps the
      // newest). Before 2026-09-05 both lanes kept the newest 21, so the oldest
      // overdue picks never got their board fetched by either lane.
      const { espnKeys, isoKeys } = uniqueScoreboardDates(
        sportRows.map((r) => r.game.commenceTime),
        { maxDays: 21, now, order: "oldest" },
      );
      const multi = await fetchScores(freeSport, {
        espnDateKeys: espnKeys,
        isoDateKeys: isoKeys,
      });
      games = multi.games;
    }

    const finals = buildTrustedFinals(games, []);
    const pending: PendingPick[] = sportRows.map((p) => ({
      pickId: p.id,
      pickType: p.pickType as PendingPick["pickType"],
      selection: p.selection,
      line: selectGradingLine({ clvLockLine: p.clvLockLine, line: p.line }),
      homeTeam: p.game.homeTeamName,
      awayTeam: p.game.awayTeamName,
      sportKey,
      gameDateIso: p.game.commenceTime.toISOString(),
    }));
    const outcomes = settlePendingPicks(pending, finals, {
      postponedCandidates: games,
    });

    for (const o of outcomes) {
      const row = sportRows.find((r) => r.id === o.pickId);
      if (!row) continue;
      const ageDays =
        (now.getTime() - row.game.commenceTime.getTime()) / (24 * 60 * 60 * 1000);

      if (o.status === "HELD") {
        // A hold is a decision, not a disappearance: record it with its reason
        // so the operator surface can tell "no final" from "two finals".
        held++;
        unresolved.push({
          pickId: o.pickId,
          gameId: row.gameId,
          commenceTime: row.game.commenceTime.toISOString(),
          ageDays: Math.round(ageDays * 10) / 10,
          reason: o.reason,
          sourcesTried: o.sources.length ? o.sources : sourcesTried,
          olderThanGrace: ageDays > BACKFILL_UNRESOLVED_GRACE_DAYS,
        });
        continue;
      }
      if (o.status === "PENDING") {
        unresolved.push({
          pickId: o.pickId,
          gameId: row.game.id,
          commenceTime: row.game.commenceTime.toISOString(),
          ageDays,
          reason: o.reason,
          sourcesTried,
          olderThanGrace: ageDays > BACKFILL_UNRESOLVED_GRACE_DAYS,
        });
        continue;
      }

      const outcome = await persistSettled({
        pickId: o.pickId,
        gameId: row.game.id,
        result: o.result,
        settledAt,
        homeScore: o.homeScore,
        awayScore: o.awayScore,
      });
      const persisted: PersistSettledOutcome =
        typeof outcome === "boolean" ? { written: outcome, refusal: null } : outcome;
      if (persisted.written) {
        settled++;
        continue;
      }
      if (persisted.refusal === "SCORE_MISMATCH") {
        // The Game row already carries a DIFFERENT recorded final. The whole
        // transaction rolled back, so the pick is still PENDING rather than
        // graded against a score its own game row contradicts. Record it the
        // way a hold is recorded: the zero-sit lane takes it from here under
        // SCORE_MISMATCH_CROSS_PATH, the code built for exactly this.
        held++;
        unresolved.push({
          pickId: o.pickId,
          gameId: row.game.id,
          commenceTime: row.game.commenceTime.toISOString(),
          ageDays: Math.round(ageDays * 10) / 10,
          reason: "SCORE_MISMATCH",
          sourcesTried: o.sources.length ? o.sources : sourcesTried,
          olderThanGrace: ageDays > BACKFILL_UNRESOLVED_GRACE_DAYS,
        });
      }
    }
  }

  return {
    inspected: stale.length,
    capReached,
    settled,
    held,
    skippedInWindow: inWindowSkipped.length,
    unresolved,
    cap,
    windowDays: BACKFILL_WINDOW_HOURS / 24,
    windowHours: BACKFILL_WINDOW_HOURS,
  };
}

/**
 * Thrown inside the persist transaction to roll it back when the Game row
 * already carries a different recorded final. Grading a pick against a score
 * its own game row contradicts is the one outcome this lane must never
 * commit, and a throw is the only way to undo the pick write that already
 * happened earlier in the same transaction.
 */
class BackfillScoreMismatch extends Error {
  constructor(readonly gameId: string) {
    super(`settle-backfill: recorded final conflicts for game ${gameId}`);
    this.name = "BackfillScoreMismatch";
  }
}

function defaultPersist(db: BackfillDb): (args: PersistSettledArgs) => Promise<PersistSettledOutcome> {
  return async (args) => {
    if (!db.$transaction) return { written: false, refusal: null };
    try {
      return await persistInTx(db, args);
    } catch (err) {
      if (err instanceof BackfillScoreMismatch) return { written: false, refusal: "SCORE_MISMATCH" };
      throw err;
    }
  };
}

async function persistInTx(db: BackfillDb, args: PersistSettledArgs): Promise<PersistSettledOutcome> {
  const $transaction = db.$transaction;
  if (!$transaction) return { written: false, refusal: null };
  const written = await $transaction(async (tx) => {
    const updated = await tx.pick.updateMany({
      where: { id: args.pickId, result: "PENDING" },
      data: { result: args.result, settledAt: args.settledAt },
    });
    if (updated.count === 0) return updated;
    await tx.pickSettlementEvent.create({
      data: {
        pickId: args.pickId,
        gameId: args.gameId,
        result: args.result,
        settledAt: args.settledAt,
        status: "PENDING",
      },
    });
    await enqueuePostSettlementWork(
      tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
      [
        { subjectId: args.pickId, kind: "CLV_GRADE" },
        { subjectId: args.pickId, kind: "SNAPSHOT_OUTCOME" },
      ],
    );
    if (args.homeScore != null && args.awayScore != null) {
      // Never overwrite a recorded final with a different one. Same rule as
      // free-score-persist.ts (SCORE_MISMATCH_CROSS_PATH), but the rule rides
      // in the WRITE rather than in a preceding read: updateMany, not update.
      // A read followed by an unguarded update by id is a race under Prisma's
      // default isolation, which does not lock the game row, so a competing
      // FINAL committing in between would be clobbered by the very statement
      // meant to protect it. The predicate allows the write only when the row
      // is not yet a scored FINAL, or already carries this exact pair
      // (idempotent re-run).
      const scored = await tx.game.updateMany({
        where: {
          id: args.gameId,
          OR: [
            { status: { not: "FINAL" } },
            { homeScore: null },
            { awayScore: null },
            { homeScore: args.homeScore, awayScore: args.awayScore },
          ],
        },
        data: {
          homeScore: args.homeScore,
          awayScore: args.awayScore,
          status: "FINAL",
          resultFetched: true,
        },
      });
      if (scored.count === 0) {
        // A different final is recorded. Read it once, only on this path, so
        // the operator sees both sides, then ROLL THE TRANSACTION BACK.
        //
        // This used to fall through with "the pick settlement already
        // happened above", which committed a grade computed from the
        // incoming score while the game row kept a different one: a settled
        // pick contradicting its own game row, and no record that it had
        // happened. Refusing the score write is not enough; the grade rests
        // on the same contested number, so both go or neither does.
        const existing = await tx.game.findUnique({
          where: { id: args.gameId },
          select: { homeScore: true, awayScore: true },
        });
        console.warn(
          `[settle-backfill] SCORE_MISMATCH game=${args.gameId} ` +
            `existing=${existing?.homeScore ?? "null"}-${existing?.awayScore ?? "null"} ` +
            `incoming=${args.homeScore}-${args.awayScore}; rolling back, the pick stays PENDING.`,
        );
        throw new BackfillScoreMismatch(args.gameId);
      }
    }
    return updated;
  });
  return { written: written.count > 0, refusal: null };
}
