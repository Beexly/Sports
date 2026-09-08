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
  reason:
    | "NO_FINAL"
    | "ORIENT_FAIL"
    | "AMBIGUOUS_MATCH"
    | "DISPUTED"
    | "SCORE_MISMATCH"
    | "KICKOFF_MOVED"
    | "WRITE_NOT_APPLIED";
  sourcesTried: readonly string[];
  olderThanGrace: boolean;
  /**
   * True when `commenceTime` and `ageDays` above are the values this cycle
   * LOADED, which the write then proved the row no longer carries. Only
   * `KICKOFF_MOVED` sets it. The age is therefore measured against a kickoff
   * that no longer exists and must not drive escalation: `olderThanGrace` is
   * reported false on these rows, and the next cycle re-inspects the pick
   * against the corrected kickoff and escalates honestly then (Devin Review,
   * #717). Suppression is bounded to one cycle; an inflated age on a game
   * that moved into the future is not.
   */
  kickoffStale: boolean;
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
  /**
   * Writes that neither succeeded nor named a refusal: an injected persister
   * returning boolean `false`, a db shim with no `$transaction`, or an
   * `updateMany` that matched 0 rows because another lane settled the pick
   * first. These used to fall through every branch and appear in no count at
   * all (Devin Review, #717). They are NOT `held` — a hold is a decision this
   * lane made, and this is the absence of one — so they are counted here and
   * listed in `unresolved` under `WRITE_NOT_APPLIED`.
   */
  writeNotApplied: number;
  /**
   * Picks another lane had already graded by the time this one wrote. NOT
   * unresolved and NOT held: there is nothing outstanding about them, so they
   * are counted here and deliberately kept out of `unresolved` (Devin Review,
   * #717). A steadily rising number here means the schedulers overlap, which
   * is an efficiency signal rather than a correctness one — the write refused
   * exactly as designed.
   */
  alreadySettledElsewhere: number;
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
      pick: {
        updateMany: (args: unknown) => Promise<{ count: number }>;
        /**
         * Diagnostic read used ONLY when the settle write matches 0 rows, to
         * say WHY. Optional so every injected test double keeps working: a
         * shim without it falls back to the undiagnosed WRITE_NOT_APPLIED,
         * which is what this lane reported for every such case before.
         */
        findUnique?: (args: unknown) => Promise<{
          result: string;
          game: { commenceTime: Date } | null;
        } | null>;
      };
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
  /** Source ids the final came from, recorded as settle-time evidence (C-120). */
  sources?: readonly string[];
  /** The line the grade was computed against (selectGradingLine's output), settle-time evidence (C-120 / C-143). */
  gradedLine?: number | null;
  /**
   * The kickoff this candidate was loaded with. The final was bound to it
   * before the network work, so the write must refuse if the row no longer
   * carries it (Devin Review, #717).
   */
  commenceTime: Date;
};

/**
 * What one persist attempt did. A refusal is NOT a silent no-op: the pick is
 * still PENDING and the caller records it, so nothing sits unaccounted.
 * `boolean` stays accepted for injected persisters: `true` means written.
 */
export type PersistSettledOutcome = {
  readonly written: boolean;
  readonly refusal: "SCORE_MISMATCH" | "KICKOFF_MOVED" | "ALREADY_SETTLED" | null;
};

/**
 * The settle write matched 0 rows because ANOTHER lane had already graded the
 * pick. It is not unresolved and it is not a hold: nothing is left to do, and
 * listing it as either would misreport a completed pick as outstanding work
 * (Devin Review, #717).
 */
export class BackfillAlreadySettled extends Error {
  constructor(readonly pickId: string) {
    super(`pick ${pickId} was settled by another lane`);
    this.name = "BackfillAlreadySettled";
  }
}

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
  let writeNotApplied = 0;
  let alreadySettledElsewhere = 0;
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
    // The grading line each pick was graded on, keyed for the evidence write:
    // the value settlePendingPicks received, not a recomputation.
    const gradingLineByPickId = new Map(pending.map((p) => [p.pickId, p.line]));

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
          kickoffStale: false,
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
          kickoffStale: false,
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
        sources: o.sources,
        gradedLine: gradingLineByPickId.get(o.pickId) ?? null,
        commenceTime: row.game.commenceTime,
      });
      const persisted: PersistSettledOutcome =
        typeof outcome === "boolean" ? { written: outcome, refusal: null } : outcome;
      if (persisted.written) {
        settled++;
        continue;
      }
      if (persisted.refusal === "KICKOFF_MOVED") {
        // The game moved while this cycle was out on the network. The whole
        // settlement rolled back, so the pick is still PENDING and the next
        // cycle re-inspects it against the corrected kickoff.
        held++;
        unresolved.push({
          pickId: o.pickId,
          gameId: row.game.id,
          commenceTime: row.game.commenceTime.toISOString(),
          ageDays: Math.round(ageDays * 10) / 10,
          reason: "KICKOFF_MOVED",
          sourcesTried: o.sources.length ? o.sources : sourcesTried,
          // The write refused BECAUSE the row no longer carries the kickoff
          // above, so `ageDays` is measured against a time that no longer
          // exists and could read as weeks overdue on a game that moved into
          // the future. Escalation is withheld for this one cycle rather than
          // raised on a number we know is wrong.
          olderThanGrace: false,
          kickoffStale: true,
        });
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
          kickoffStale: false,
        });
        continue;
      }

      if (persisted.refusal === "ALREADY_SETTLED") {
        // Another lane graded it while this cycle was out on the network. The
        // pick is DONE, not outstanding: counting it as held or listing it as
        // unresolved would report finished work as a backlog item.
        alreadySettledElsewhere++;
        continue;
      }

      // Neither written nor refused. Nothing decided this pick's fate, so it
      // is still PENDING and must surface: the founder policy is that no pick
      // ever sits. Counted apart from `held` because this lane made no
      // decision here (Devin Review, #717).
      writeNotApplied++;
      unresolved.push({
        pickId: o.pickId,
        gameId: row.game.id,
        commenceTime: row.game.commenceTime.toISOString(),
        ageDays: Math.round(ageDays * 10) / 10,
        reason: "WRITE_NOT_APPLIED",
        sourcesTried: o.sources.length ? o.sources : sourcesTried,
        olderThanGrace: ageDays > BACKFILL_UNRESOLVED_GRACE_DAYS,
        kickoffStale: false,
      });
    }
  }

  return {
    inspected: stale.length,
    capReached,
    settled,
    held,
    writeNotApplied,
    alreadySettledElsewhere,
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
class BackfillKickoffMoved extends Error {
  constructor(readonly gameId: string) {
    super(`settle-backfill: kickoff moved for game ${gameId}`);
    this.name = "BackfillKickoffMoved";
  }
}

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
      if (err instanceof BackfillKickoffMoved) return { written: false, refusal: "KICKOFF_MOVED" };
      if (err instanceof BackfillAlreadySettled) return { written: false, refusal: "ALREADY_SETTLED" };
      throw err;
    }
  };
}

async function persistInTx(db: BackfillDb, args: PersistSettledArgs): Promise<PersistSettledOutcome> {
  const $transaction = db.$transaction;
  if (!$transaction) return { written: false, refusal: null };
  const written = await $transaction(async (tx) => {
    // LOCK ORDER: PICK then GAME, the order every settlement transaction here
    // uses (free-settlement-runner, zero-sit). Taking them the other way round
    // deadlocks against those lanes, whose candidate sets overlap with this one.
    //
    // The started bound rides in the WRITE, not only in the candidate read: a
    // schedule correction can commit while this lane is out fetching
    // scoreboards, and grading a game that has not been played is the one
    // outcome this lane must never commit (Devin Review, #717).
    const updated = await tx.pick.updateMany({
      where: {
        id: args.pickId,
        result: "PENDING",
        game: { commenceTime: { lte: args.settledAt } },
      },
      data: { result: args.result, settledAt: args.settledAt },
    });
    if (updated.count === 0) {
      // Three different situations produce count 0 and they are not the same
      // pick state: another lane graded it (done, not outstanding), the kickoff
      // moved past `settledAt` (still PENDING, and its loaded age is now wrong),
      // or the row is gone. Reporting all three as one undiagnosed outcome
      // listed a completed pick as unresolved and dropped the stale-kickoff
      // marking (Devin Review, #717).
      const probe = tx.pick.findUnique
        ? await tx.pick.findUnique({
            where: { id: args.pickId },
            select: { result: true, game: { select: { commenceTime: true } } },
          })
        : null;
      if (probe !== null) {
        if (probe.result !== "PENDING") throw new BackfillAlreadySettled(args.pickId);
        const moved = probe.game?.commenceTime;
        if (moved !== undefined && moved !== null && moved.getTime() > args.settledAt.getTime()) {
          throw new BackfillKickoffMoved(args.gameId);
        }
      }
      return updated;
    }
    await tx.pickSettlementEvent.create({
      data: {
        pickId: args.pickId,
        gameId: args.gameId,
        result: args.result,
        settledAt: args.settledAt,
        status: "PENDING",
        // SETTLE-TIME EVIDENCE (C-120), same contract as the free runner: the
        // score this grade was computed from, recorded inside the settlement
        // transaction, because nothing else records it and a later game-row
        // overwrite makes it unrecoverable.
        payload: {
          settledWith: {
            homeScore: args.homeScore,
            awayScore: args.awayScore,
            sources: [...(args.sources ?? [])],
            path: "free-backfill",
            // The exact number the grade used (C-143): the card's `line` is
            // not always this number.
            gradedLine:
              typeof args.gradedLine === "number" && Number.isFinite(args.gradedLine)
                ? args.gradedLine
                : null,
          },
        },
      },
    });
    await enqueuePostSettlementWork(
      tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
      [
        { subjectId: args.pickId, kind: "CLV_GRADE" },
        { subjectId: args.pickId, kind: "SNAPSHOT_OUTCOME" },
      ],
    );
    // HOLD THE GAME ROW, unconditionally, before this transaction commits.
    // The pick statement locks the PICK, so a correction can still land between
    // it and anything below. Matched on the EXACT kickoff the candidate carried,
    // which refuses any move at all, including to a different PAST time that
    // would silently invalidate the final's 12h binding. Refusing means rolling
    // back, never returning: the pick write above has already happened.
    //
    // Unconditional, NOT only on the scored path: a scoreless VOID writes no
    // other game statement, so without this it committed with no game check at
    // all (Devin Review, #717).
    const held = await tx.game.updateMany({
      where: { id: args.gameId, commenceTime: args.commenceTime },
      data: { commenceTime: args.commenceTime },
    });
    if (held.count === 0) throw new BackfillKickoffMoved(args.gameId);

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
