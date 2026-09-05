/**
 * Ops-only settlement RCA: WHY is each overdue pick still PENDING?
 *
 * The public truth surface reports a count (36 overdue on 2026-09-05) and the
 * cockpit lists matchups, but no surface said why. The per-pick reasons only
 * existed inside the settle-picks cron response, behind CRON_SECRET, and were
 * never stored. This route loads the overdue population (same filter as
 * settlement-health.ts), fetches the dated free boards once per sport, runs the
 * PRODUCTION matcher and grader in dry-run (settlePendingPicks is pure), and
 * returns one row per pick with its reason code and the finals on the board
 * that touch either team. It never writes: no Pick is updated, no outbox row is
 * appended, no ledger receipt is minted.
 *
 * Reasons:
 *   NO_FINAL          no completed final on the fetched boards matched both teams
 *   AMBIGUOUS_MATCH   more than one disagreeing final, or a city-only name
 *   DISPUTED          the sources disagree on the score (policy hold)
 *   ORIENT_FAIL       a final matched but the pick's home side could not be placed
 *   WOULD_SETTLE      the next settle-picks cycle should grade it; if it persists
 *                     across cycles the WRITER is failing, not the matcher
 *   WOULD_VOID        postponed/cancelled on the board; the cycle should void it
 *   NO_FREE_SPORT_MAP the sport has no free scores adapter
 *
 * Auth: Bearer CRON_SECRET (lib/ops/ops-auth.ts). Read-only. no-store.
 */

import { db } from "@sports/db";
import { selectGradingLine } from "@sports/prediction-engine";
import { jsonNoStore } from "@/lib/api/no-store";
import { hasOpsAuth } from "@/lib/ops/ops-auth";
import { fetchScoresMultiSource } from "@/lib/data-sources/multi-source-scores";
import { ODDS_KEY_TO_FREE } from "@/lib/data-sources/free-settlement-runner";
import {
  buildTrustedFinals,
  expandTeamMatchTokens,
  settlePendingPicks,
  teamTokensMatch,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";
import { uniqueScoreboardDates } from "@/lib/data-sources/settlement-score-dates";
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** Hard cap on rows inspected per call; the truth surface counts the rest. */
export const SETTLEMENT_RCA_MAX_ROWS = 500;

export type SettlementRcaReason =
  | "NO_FINAL"
  | "AMBIGUOUS_MATCH"
  | "DISPUTED"
  | "ORIENT_FAIL"
  | "WOULD_SETTLE"
  | "WOULD_VOID"
  | "NO_FREE_SPORT_MAP";

export type SettlementRcaCandidate = {
  readonly home: string;
  readonly away: string;
  readonly score: string;
  readonly startIso: string | null;
  readonly confirmation: TrustedFinal["confirmation"];
};

export type SettlementRcaPick = {
  readonly pickId: string;
  readonly sport: string;
  readonly gameId: string;
  readonly externalId: string;
  readonly matchup: string;
  readonly kickoff: string;
  readonly ageHours: number;
  readonly pickType: string;
  readonly selection: string;
  readonly gradingLine: number;
  readonly modelVersion: string;
  readonly bookmakerCount: number;
  readonly reason: SettlementRcaReason;
  readonly candidateFinals: readonly SettlementRcaCandidate[];
};

export type SettlementRcaSport = {
  readonly sport: string;
  readonly freeSport: string | null;
  readonly overdue: number;
  readonly boardDates: readonly string[];
  readonly finalsOnBoard: number;
  readonly sourceErrors: readonly string[];
  readonly reasons: Readonly<Record<string, number>>;
};

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

function daysApartIso(a: string, b: string): number {
  const ta = Date.parse(a.slice(0, 10));
  const tb = Date.parse(b.slice(0, 10));
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  return Math.abs(ta - tb) / UTC_DAY_MS;
}

function sideTouches(pickSide: string, f: TrustedFinal): boolean {
  const tokens = expandTeamMatchTokens(pickSide);
  const finalTokens = [
    ...expandTeamMatchTokens(f.home.name),
    ...expandTeamMatchTokens(f.away.name),
    f.home.abbr.toLowerCase().replace(/[^a-z0-9]/g, ""),
    f.away.abbr.toLowerCase().replace(/[^a-z0-9]/g, ""),
  ].filter(Boolean);
  return tokens.some((t) => finalTokens.some((ft) => teamTokensMatch(t, ft)));
}

/** Finals within two days that touch EITHER team of the pick (diagnostic, not grading). */
export function candidateFinalsFor(pick: PendingPick, finals: readonly TrustedFinal[], limit = 4): SettlementRcaCandidate[] {
  return finals
    .filter((f) => daysApartIso(f.date, pick.gameDateIso) <= 2)
    .filter((f) => sideTouches(pick.homeTeam, f) || sideTouches(pick.awayTeam, f))
    .slice(0, limit)
    .map((f) => ({
      home: f.home.name,
      away: f.away.name,
      score: `${f.home.score}-${f.away.score}`,
      startIso: f.startIso ?? null,
      confirmation: f.confirmation,
    }));
}

export async function GET(request: Request) {
  if (!hasOpsAuth(request)) {
    return jsonNoStore({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sportFilter = url.searchParams.get("sport")?.trim() || null;
  const now = new Date();
  const graceHours = SETTLEMENT_DEFAULT_GRACE_HOURS;
  const cutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

  const rows = await db.pick.findMany({
    where: {
      isPublished: true,
      result: "PENDING",
      NOT: { modelVersion: { contains: "seed" } },
      game: {
        commenceTime: { lt: cutoff },
        ...(sportFilter ? { sport: { key: sportFilter } } : {}),
      },
    },
    select: {
      id: true,
      pickType: true,
      selection: true,
      line: true,
      clvLockLine: true,
      modelVersion: true,
      bookmakerCount: true,
      game: {
        select: {
          id: true,
          externalId: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          sport: { select: { key: true } },
        },
      },
    },
    orderBy: { game: { commenceTime: "asc" } },
    take: SETTLEMENT_RCA_MAX_ROWS + 1,
  });

  const truncated = rows.length > SETTLEMENT_RCA_MAX_ROWS;
  const inspected = rows.slice(0, SETTLEMENT_RCA_MAX_ROWS);

  const bySport = new Map<string, typeof inspected>();
  for (const r of inspected) {
    const key = r.game.sport.key;
    const list = bySport.get(key) ?? [];
    list.push(r);
    bySport.set(key, list);
  }

  const picks: SettlementRcaPick[] = [];
  const sports: SettlementRcaSport[] = [];

  for (const [sportKey, sportRows] of bySport) {
    const freeSport = ODDS_KEY_TO_FREE[sportKey] ?? null;
    const reasons: Record<string, number> = {};
    const bump = (reason: SettlementRcaReason) => {
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    };

    if (!freeSport) {
      for (const r of sportRows) {
        bump("NO_FREE_SPORT_MAP");
        picks.push(toRow(r, sportKey, now, "NO_FREE_SPORT_MAP", []));
      }
      sports.push({ sport: sportKey, freeSport: null, overdue: sportRows.length, boardDates: [], finalsOnBoard: 0, sourceErrors: [], reasons });
      continue;
    }

    // Oldest-first, like the backfill lane: the tail is what an operator is asking about.
    const { espnKeys, isoKeys } = uniqueScoreboardDates(
      sportRows.map((r) => r.game.commenceTime),
      { maxDays: 21, now, order: "oldest" },
    );
    const multi = await fetchScoresMultiSource(freeSport, { espnDateKeys: espnKeys, isoDateKeys: isoKeys });
    const finals = buildTrustedFinals(multi.games, []);

    const pending: PendingPick[] = sportRows.map((r) => ({
      pickId: r.id,
      pickType: r.pickType as PendingPick["pickType"],
      selection: r.selection,
      line: selectGradingLine({ clvLockLine: r.clvLockLine, line: r.line }),
      homeTeam: r.game.homeTeamName,
      awayTeam: r.game.awayTeamName,
      sportKey,
      gameDateIso: r.game.commenceTime.toISOString(),
    }));

    const outcomes = settlePendingPicks(pending, finals, { postponedCandidates: multi.games });
    for (const [i, o] of outcomes.entries()) {
      const r = sportRows[i]!;
      const pick = pending[i]!;
      const reason: SettlementRcaReason =
        o.status === "SETTLED" ? (o.result === "VOID" ? "WOULD_VOID" : "WOULD_SETTLE") : o.reason;
      bump(reason);
      picks.push(toRow(r, sportKey, now, reason, candidateFinalsFor(pick, finals)));
    }

    sports.push({
      sport: sportKey,
      freeSport,
      overdue: sportRows.length,
      boardDates: espnKeys,
      finalsOnBoard: finals.length,
      sourceErrors: multi.errors,
      reasons,
    });
  }

  return jsonNoStore({
    ok: true,
    generatedAt: now.toISOString(),
    graceHours,
    overdue: inspected.length,
    truncated,
    maxRows: SETTLEMENT_RCA_MAX_ROWS,
    readOnly: true,
    note:
      "Dry-run of the production free grader over the overdue population. Nothing is written. " +
      "WOULD_SETTLE rows that persist across cycles point at the writer, not the matcher.",
    bySport: sports,
    picks,
  });
}

type Row = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  clvLockLine: number | null;
  modelVersion: string;
  bookmakerCount: number;
  game: {
    id: string;
    externalId: string;
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sport: { key: string };
  };
};

function toRow(
  r: Row,
  sport: string,
  now: Date,
  reason: SettlementRcaReason,
  candidateFinals: readonly SettlementRcaCandidate[],
): SettlementRcaPick {
  return {
    pickId: r.id,
    sport,
    gameId: r.game.id,
    externalId: r.game.externalId,
    matchup: `${r.game.awayTeamName} @ ${r.game.homeTeamName}`,
    kickoff: r.game.commenceTime.toISOString(),
    ageHours: Math.round(((now.getTime() - r.game.commenceTime.getTime()) / (60 * 60 * 1000)) * 10) / 10,
    pickType: r.pickType,
    selection: r.selection,
    gradingLine: selectGradingLine({ clvLockLine: r.clvLockLine, line: r.line }),
    modelVersion: r.modelVersion,
    bookmakerCount: r.bookmakerCount,
    reason,
    candidateFinals,
  };
}
