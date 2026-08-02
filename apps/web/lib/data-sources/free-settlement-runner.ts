/**
 * Free-path settlement runner — Production auto-run without THE_ODDS_API_KEY.
 *
 * Uses ESPN (+ henrygd for NCAA) free scores, buildTrustedFinals, settlePendingPicks,
 * then writes PENDING→result with transactional outbox + post-settlement work
 * (same durability pattern as settleSport).
 *
 * STP + RCA: overdue picks are processed first; each cycle emits a root-cause
 * Pareto and straight-through clearance plan so settlement-health CRITICAL is
 * actionable (not just a count).
 *
 * Law: oddsApiRequired=false · refuse-default · DISPUTED holds · no invented scores.
 */

import { db } from "@sports/db";
import { selectGradingLine } from "@sports/prediction-engine";
import {
  enqueuePostSettlementWork,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { fetchScoresMultiSource } from "./multi-source-scores";
import {
  fetchHenrygdScoreboard,
  HENRYGD_PATHS,
  type NcaaGame,
} from "./free-adapters/henrygd-ncaa";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { Sport } from "./source-router";
import {
  buildTrustedFinals,
  settlePendingPicks,
  type PendingPick,
} from "./free-settlement";
import {
  aggregateSettlementRca,
  classifySettlementRootCause,
  type SettlementRcaReport,
} from "@/lib/settlement/root-cause-analysis";
import {
  computeBurnRate,
  planClearanceWaves,
  stpLoadPriority,
  type BurnRateReport,
  type ClearanceWavePlan,
} from "@/lib/settlement/stp-clearance";

export const ODDS_KEY_TO_FREE: Record<string, Sport> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  basketball_ncaab: "ncaab",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  soccer_usa_mls: "mls",
};

export type FreeSettlementSportResult = {
  sport: string;
  freeSport: Sport | null;
  ok: boolean;
  pendingLoaded: number;
  settled: number;
  held: number;
  stillPending: number;
  finals: number;
  error?: string;
};

export type FreeSettlementRunResult = {
  path: "free";
  oddsApiRequired: false;
  startedAt: string;
  elapsedMs: number;
  sports: FreeSettlementSportResult[];
  picksSettled: number;
  picksHeld: number;
  /** Root-cause analysis over all inspected PENDING picks this cycle. */
  rca: SettlementRcaReport;
  /** Straight-through clearance wave plan for this cycle. */
  stp: ClearanceWavePlan;
  /** Burn rate when prior overdue count is supplied by the caller. */
  burnRate: BurnRateReport | null;
};

async function loadHenrygdFor(free: Sport): Promise<readonly NcaaGame[]> {
  try {
    if (free === "ncaaf") return await fetchHenrygdScoreboard(HENRYGD_PATHS.cfb);
    if (free === "ncaab") return await fetchHenrygdScoreboard(HENRYGD_PATHS.mbb);
  } catch {
    return [];
  }
  return [];
}

export async function runFreePathSettlement(options?: {
  sportKey?: string | null;
  /** Hours after kickoff before PENDING counts as overdue (RCA/STP). Default 6. */
  graceHours?: number;
  /** Optional prior overdue count for burn-rate (leading indicator drain). */
  priorOverdueCount?: number;
  now?: Date;
}): Promise<FreeSettlementRunResult> {
  const started = Date.now();
  const now = options?.now ?? new Date();
  const graceHours = options?.graceHours ?? 6;
  const sports = options?.sportKey
    ? SUPPORTED_SPORTS.filter((s) => s.key === options.sportKey)
    : [...SUPPORTED_SPORTS];

  const out: FreeSettlementSportResult[] = [];
  let picksSettled = 0;
  let picksHeld = 0;

  const rcaInputs: Parameters<typeof classifySettlementRootCause>[0][] = [];
  const settledPickIds = new Set<string>();
  const confirmationByPickId = new Map<string, "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED">();

  for (const sport of sports) {
    const freeSport = ODDS_KEY_TO_FREE[sport.key] ?? null;
    if (!freeSport) {
      out.push({
        sport: sport.key,
        freeSport: null,
        ok: true,
        pendingLoaded: 0,
        settled: 0,
        held: 0,
        stillPending: 0,
        finals: 0,
        error: "no free sport map",
      });
      continue;
    }

    try {
      const loadedRows = await db.pick.findMany({
        where: {
          result: "PENDING",
          game: { sport: { key: sport.key } },
        },
        include: {
          game: {
            select: {
              id: true,
              homeTeamName: true,
              awayTeamName: true,
              commenceTime: true,
            },
          },
        },
        take: 500,
      });

      // STP load order: overdue first so limited cron time drains the health band.
      const pendingRows = [...loadedRows].sort((a, b) => {
        const ageA =
          (now.getTime() - a.game.commenceTime.getTime()) / (60 * 60 * 1000);
        const ageB =
          (now.getTime() - b.game.commenceTime.getTime()) / (60 * 60 * 1000);
        const byPri =
          stpLoadPriority(ageB, graceHours) - stpLoadPriority(ageA, graceHours);
        return byPri !== 0 ? byPri : ageB - ageA;
      });

      if (pendingRows.length === 0) {
        out.push({
          sport: sport.key,
          freeSport,
          ok: true,
          pendingLoaded: 0,
          settled: 0,
          held: 0,
          stillPending: 0,
          finals: 0,
        });
        continue;
      }

      const multi = await fetchScoresMultiSource(freeSport);
      const espn: readonly NormalizedGame[] = multi.games;
      const henry = await loadHenrygdFor(freeSport);
      const finals = buildTrustedFinals(espn, henry);

      const pending: PendingPick[] = pendingRows.map((p) => ({
        pickId: p.id,
        pickType: p.pickType as PendingPick["pickType"],
        selection: p.selection,
        line: selectGradingLine(p),
        homeTeam: p.game.homeTeamName,
        awayTeam: p.game.awayTeamName,
        sportKey: sport.key,
        gameDateIso: p.game.commenceTime.toISOString(),
      }));

      const outcomes = settlePendingPicks(pending, finals);
      let settled = 0;
      let held = 0;
      let stillPending = 0;
      const settledAt = new Date();

      for (const o of outcomes) {
        const row = pendingRows.find((r) => r.id === o.pickId);
        const ageHours = row
          ? (now.getTime() - row.game.commenceTime.getTime()) / (60 * 60 * 1000)
          : 0;

        if (o.status === "PENDING") {
          stillPending++;
          rcaInputs.push({
            pickId: o.pickId,
            sportKey: sport.key,
            ageHours,
            graceHours,
            outcomeStatus: "PENDING",
            pendingReason: o.reason,
            settlementPath: "free",
          });
          continue;
        }
        if (o.status === "HELD") {
          held++;
          picksHeld++;
          rcaInputs.push({
            pickId: o.pickId,
            sportKey: sport.key,
            ageHours,
            graceHours,
            outcomeStatus: "HELD",
            holdReason: "DISPUTED",
            settlementPath: "free",
          });
          continue;
        }

        if (!row) continue;

        const written = await db.$transaction(async (tx) => {
          const updated = await tx.pick.updateMany({
            where: { id: o.pickId, result: "PENDING" },
            data: { result: o.result, settledAt },
          });
          if (updated.count === 0) return updated;
          await tx.pickSettlementEvent.create({
            data: {
              pickId: o.pickId,
              gameId: row.game.id,
              result: o.result,
              settledAt,
              status: "PENDING",
            },
          });
          await enqueuePostSettlementWork(
            tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
            [
              { subjectId: o.pickId, kind: "CLV_GRADE" },
              { subjectId: o.pickId, kind: "SNAPSHOT_OUTCOME" },
            ],
          );
          if (o.homeScore != null && o.awayScore != null) {
            await tx.game.update({
              where: { id: row.game.id },
              data: {
                homeScore: o.homeScore,
                awayScore: o.awayScore,
                status: "FINAL",
                resultFetched: true,
              },
            });
          }
          return updated;
        });

        if (written.count > 0) {
          settled++;
          picksSettled++;
          settledPickIds.add(o.pickId);
          confirmationByPickId.set(o.pickId, o.confirmation);
          rcaInputs.push({
            pickId: o.pickId,
            sportKey: sport.key,
            ageHours,
            graceHours,
            outcomeStatus: "SETTLED",
            confirmation: o.confirmation,
            settlementPath: "free",
          });
        } else {
          rcaInputs.push({
            pickId: o.pickId,
            sportKey: sport.key,
            ageHours,
            graceHours,
            outcomeStatus: "WRITE_FAILED",
            settlementPath: "free",
          });
        }
      }

      out.push({
        sport: sport.key,
        freeSport,
        ok: true,
        pendingLoaded: pendingRows.length,
        settled,
        held,
        stillPending,
        finals: finals.length,
      });
    } catch (err) {
      out.push({
        sport: sport.key,
        freeSport,
        ok: false,
        pendingLoaded: 0,
        settled: 0,
        held: 0,
        stillPending: 0,
        finals: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const findings = rcaInputs.map((i) => classifySettlementRootCause(i));
  // Actionable + timing context for operators; pure SETTLED/CONFIRMED successes omitted.
  const reportFindings = findings.filter(
    (f) =>
      f.code === "SINGLE_SOURCE_POLICY_HOLD" ||
      f.code === "WRITE_RACE_LOST" ||
      f.code === "DISPUTED_SCORES" ||
      f.code === "TEAM_ORIENT_FAIL" ||
      f.code === "NO_TRUSTED_FINAL" ||
      f.code === "OVERDUE_NO_SCORE" ||
      f.code === "PATH_MISCONFIG" ||
      f.code === "WITHIN_GRACE" ||
      f.code === "NOT_COMMENCED",
  );
  const rca = aggregateSettlementRca(reportFindings);

  const stp = planClearanceWaves(reportFindings, {
    settledPickIds,
    confirmationByPickId,
  });

  let burnRate: BurnRateReport | null = null;
  if (options?.priorOverdueCount !== undefined) {
    const stillOverdue = reportFindings.filter((f) => f.overdue && f.code !== "WRITE_RACE_LOST").length;
    // Approximates inflow as max(0, stillOverdue + cleared - prior); cleared = picksSettled this cycle that were overdue-eligible.
    const clearedOverdue = picksSettled; // conservative: all settles reduce potential overdue
    const inflow = Math.max(0, stillOverdue + clearedOverdue - options.priorOverdueCount);
    burnRate = computeBurnRate({
      cleared: clearedOverdue,
      newOverdueInflow: inflow,
      reopened: 0,
    });
  }

  return {
    path: "free",
    oddsApiRequired: false,
    startedAt: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    sports: out,
    picksSettled,
    picksHeld,
    rca,
    stp,
    burnRate,
  };
}
