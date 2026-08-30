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
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { Sport } from "./source-router";

export const PAID_SCORES_WINDOW_DAYS = 3;
export const BACKFILL_CAP = 50;
export const BACKFILL_UNRESOLVED_GRACE_DAYS = 14;

export type UnresolvedStalePick = {
  pickId: string;
  gameId: string;
  commenceTime: string;
  ageDays: number;
  reason: "NO_FINAL" | "ORIENT_FAIL";
  sourcesTried: readonly string[];
  olderThanGrace: boolean;
};

export type BackfillResult = {
  inspected: number;
  settled: number;
  held: number;
  skippedInWindow: number;
  unresolved: UnresolvedStalePick[];
  cap: number;
  windowDays: number;
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
      game: { update: (args: unknown) => Promise<unknown> };
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

export async function backfillStaleSettlement(input: {
  db: BackfillDb;
  now?: Date;
  cap?: number;
  fetchScores?: typeof fetchScoresMultiSource;
  persistSettled?: (args: PersistSettledArgs) => Promise<boolean>;
}): Promise<BackfillResult> {
  const now = input.now ?? new Date();
  const cap = input.cap ?? BACKFILL_CAP;
  const windowMs = PAID_SCORES_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - windowMs);
  const fetchScores = input.fetchScores ?? fetchScoresMultiSource;
  const persistSettled = input.persistSettled ?? defaultPersist(input.db);

  const rows = await input.db.pick.findMany({
    where: {
      result: "PENDING",
      isPublished: true,
      game: { commenceTime: { lt: cutoff } },
    },
    orderBy: { game: { commenceTime: "asc" } },
    take: cap,
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
  const stale = normalized
    .filter((r) => r.game.commenceTime < cutoff)
    .slice(0, cap);

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
      const { espnKeys, isoKeys } = uniqueScoreboardDates(
        sportRows.map((r) => r.game.commenceTime),
        { maxDays: 21, now },
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
        held++;
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

      const written = await persistSettled({
        pickId: o.pickId,
        gameId: row.game.id,
        result: o.result,
        settledAt,
        homeScore: o.homeScore,
        awayScore: o.awayScore,
      });
      if (written) settled++;
    }
  }

  return {
    inspected: stale.length,
    settled,
    held,
    skippedInWindow: inWindowSkipped.length,
    unresolved,
    cap,
    windowDays: PAID_SCORES_WINDOW_DAYS,
  };
}

function defaultPersist(db: BackfillDb): (args: PersistSettledArgs) => Promise<boolean> {
  return async (args) => {
    if (!db.$transaction) return false;
    const written = await db.$transaction(async (tx) => {
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
        await tx.game.update({
          where: { id: args.gameId },
          data: {
            homeScore: args.homeScore,
            awayScore: args.awayScore,
            status: "FINAL",
            resultFetched: true,
          },
        });
      }
      return updated;
    });
    return written.count > 0;
  };
}
