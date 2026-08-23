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
 * Repair drains every cycle: CLV_GRADE, SNAPSHOT_OUTCOME, TEAM_GAME_LOG.
 *
 * Law: oddsApiRequired=false · refuse-default · DISPUTED holds · no invented scores.
 */

import { db } from "@sports/db";
import { getReadinessGates, selectGradingLine } from "@sports/prediction-engine";
import {
  drainPendingTeamGameLogs,
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
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import {
  computeBurnRate,
  planClearanceWaves,
  stpLoadPriority,
  type BurnRateReport,
  type ClearanceWavePlan,
} from "@/lib/settlement/stp-clearance";
import {
  settlementsToLearningSamples,
  summarizeLearningBatch,
  type LearningBatchReport,
} from "@/lib/autonomy/settlement-learning";
import { planAutonomyCycle, type AutonomyPlan } from "@/lib/autonomy/operating-kernel";
import {
  gradeFreePathClv,
  drainPendingClvGrades,
} from "@/lib/settlement/free-path-clv";
import {
  recordFreePathSnapshot,
  drainPendingSnapshotOutcomes,
} from "@/lib/settlement/free-path-snapshot";
import { uniqueScoreboardDates } from "./settlement-score-dates";


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
  /**
   * Operator samples when finals loaded but picks stayed PENDING — team strings
   * + reason so residual OVERDUE_NO_SCORE can be fixed without DB shell access.
   */
  matchDebug?: readonly {
    pickId: string;
    reason: "NO_FINAL" | "ORIENT_FAIL";
    homeTeam: string;
    awayTeam: string;
    gameDate: string;
    ageHours: number;
  }[];
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
  /** Offline learning summary from this cycle's settled grades (no model apply). */
  learning: LearningBatchReport | null;
  /** Autonomy plan snapshot for operator/agent loops. */
  autonomy: AutonomyPlan | null;
  /** Pending CLV_GRADE work drained this cycle. */
  clvRepair: { attempted: number; graded: number; noClose: number; failed: number } | null;
  /** PENDING SNAPSHOT_OUTCOME drained this cycle. */
  snapshotRepair: { attempted: number; done: number; failed: number } | null;
  /** PENDING TEAM_GAME_LOG drained this cycle (crash-safe repair). */
  teamGameLogRepair: { attempted: number; done: number; failed: number } | null;
  /** ESPN/ISO date keys used for score fetch this cycle (empty = undated board). */
  scoreDates: { espnKeys: string[]; isoKeys: string[] } | null;
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
  const graceHours = options?.graceHours ?? SETTLEMENT_DEFAULT_GRACE_HOURS;
  const sports = options?.sportKey
    ? SUPPORTED_SPORTS.filter((s) => s.key === options.sportKey)
    : [...SUPPORTED_SPORTS];

  const out: FreeSettlementSportResult[] = [];
  let picksSettled = 0;
  let picksHeld = 0;

  const rcaInputs: Parameters<typeof classifySettlementRootCause>[0][] = [];
  const scoreDateAcc = new Set<string>();
  const settledPickIds = new Set<string>();
  const confirmationByPickId = new Map<string, "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED">();
  const gradedForLearning: Array<{
    pickId: string;
    sportKey: string;
    pickType: string;
    modelVersion: string;
    result: "WIN" | "LOSS" | "PUSH" | "VOID";
    confirmation: "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED" | "UNKNOWN";
    modelEdge: number | null;
    clv: number | null;
    settledAtIso: string;
  }> = [];


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
        select: {
          id: true,
          pickType: true,
          selection: true,
          line: true,
          modelVersion: true,
          edgeScore: true,
          clvLockLine: true,
          clvLockPrice: true,
          gameId: true,
          isBootstrap: true,
          bookmakerCount: true,
          confidence: true,
          factorBreakdown: true,
          game: {
            select: {
              id: true,
              homeTeamName: true,
              awayTeamName: true,
              commenceTime: true,
              dataQualityScore: true,
            },
          },
        },
        take: 1500,
      });

      // STP load order: overdue first so limited cron time drains the health band.
      // When backlog is large, process overdue-only first (health CRITICAL band).
      const sorted = [...loadedRows].sort((a, b) => {
        const ageA =
          (now.getTime() - a.game.commenceTime.getTime()) / (60 * 60 * 1000);
        const ageB =
          (now.getTime() - b.game.commenceTime.getTime()) / (60 * 60 * 1000);
        const byPri =
          stpLoadPriority(ageB, graceHours) - stpLoadPriority(ageA, graceHours);
        return byPri !== 0 ? byPri : ageB - ageA;
      });
      const overdueOnly = sorted.filter((r) => {
        const ageH =
          (now.getTime() - r.game.commenceTime.getTime()) / (60 * 60 * 1000);
        return ageH > graceHours;
      });
      // Prefer overdue slice when it is non-empty and we would otherwise burn
      // the cycle on within-grace PENDING that do not affect settlement health.
      const pendingRows =
        overdueOnly.length > 0 && overdueOnly.length < sorted.length
          ? overdueOnly
          : sorted;

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

      // Date-target free scoreboards — undated ESPN board is "now" only (overdue never matches).
      const { espnKeys, isoKeys } = uniqueScoreboardDates(
        pendingRows.map((r) => r.game.commenceTime),
        { maxDays: 21 },
      );
      for (const k of espnKeys) scoreDateAcc.add(k);
      const multi = await fetchScoresMultiSource(freeSport, {
        espnDateKeys: espnKeys,
        isoDateKeys: isoKeys,
      });
      const espn: readonly NormalizedGame[] = multi.games;
      const henry = await loadHenrygdFor(freeSport);
      const finals = buildTrustedFinals(espn, henry);

      const pending: PendingPick[] = pendingRows.map((p) => ({
        pickId: p.id,
        pickType: p.pickType as PendingPick["pickType"],
        selection: p.selection,
        line: selectGradingLine({
          clvLockLine: p.clvLockLine,
          line: p.line,
        }),
        homeTeam: p.game.homeTeamName,
        awayTeam: p.game.awayTeamName,
        sportKey: sport.key,
        gameDateIso: p.game.commenceTime.toISOString(),
      }));

      const outcomes = settlePendingPicks(pending, finals, {
        postponedCandidates: espn,
      });
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
            holdReason: o.reason,
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

          // Free-path CLV grade (parity with settleSport) — never blocks settle.
          let clvValue: number | null = null;
          try {
            const clvR = await gradeFreePathClv(
              db as never,
              {
                id: row.id,
                pickType: String(row.pickType),
                selection: String(row.selection),
                clvLockLine:
                  typeof row.clvLockLine === "number" ? row.clvLockLine : null,
                clvLockPrice:
                  typeof row.clvLockPrice === "number" ? row.clvLockPrice : null,
                game: row.game,
              },
              settledAt,
            );
            clvValue = clvR.clvValue;
          } catch (clvErr) {
            console.warn(
              `[free-settle] CLV grade failed ${o.pickId}: ` +
                `${clvErr instanceof Error ? clvErr.message : clvErr}`,
            );
          }

          // Free-path SNAPSHOT_OUTCOME (parity with settleSport) — never blocks settle.
          try {
            await recordFreePathSnapshot(
              db as never,
              {
                id: row.id,
                gameId: row.gameId ?? row.game.id,
                isBootstrap: Boolean(row.isBootstrap),
                bookmakerCount: Number(row.bookmakerCount ?? 0),
                confidence: Number(row.confidence ?? 0),
                modelVersion: row.modelVersion ?? null,
                factorBreakdown: row.factorBreakdown ?? null,
              },
              o.result as "WIN" | "LOSS" | "PUSH" | "VOID",
              settledAt,
              typeof row.game.dataQualityScore === "number"
                ? row.game.dataQualityScore
                : 0,
            );
          } catch (snapErr) {
            console.warn(
              `[free-settle] SNAPSHOT_OUTCOME failed ${o.pickId}: ` +
                `${snapErr instanceof Error ? snapErr.message : snapErr}`,
            );
          }

          gradedForLearning.push({
            pickId: o.pickId,
            sportKey: sport.key,
            pickType: String(row.pickType ?? "UNKNOWN"),
            modelVersion: String(row.modelVersion ?? "unknown"),
            result: o.result as "WIN" | "LOSS" | "PUSH" | "VOID",
            confirmation: o.confirmation,
            modelEdge:
              typeof row.edgeScore === "number" ? row.edgeScore : null,
            clv: clvValue,
            settledAtIso: settledAt.toISOString(),
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

      // Sample unmatched overdue for operator RCA (no secrets — team names only).
      const matchDebug =
        stillPending > 0 && finals.length > 0
          ? outcomes
              .filter(
                (o): o is Extract<typeof o, { status: "PENDING" }> =>
                  o.status === "PENDING",
              )
              .slice(0, 8)
              .map((o) => {
                const row = pendingRows.find((r) => r.id === o.pickId);
                const ageHours = row
                  ? (now.getTime() - row.game.commenceTime.getTime()) /
                    (60 * 60 * 1000)
                  : 0;
                return {
                  pickId: o.pickId,
                  reason: o.reason,
                  homeTeam: row?.game.homeTeamName ?? "",
                  awayTeam: row?.game.awayTeamName ?? "",
                  gameDate:
                    row?.game.commenceTime.toISOString().slice(0, 10) ?? "",
                  ageHours: Math.round(ageHours * 10) / 10,
                };
              })
          : undefined;

      out.push({
        sport: sport.key,
        freeSport,
        ok: true,
        pendingLoaded: pendingRows.length,
        settled,
        held,
        stillPending,
        finals: finals.length,
        ...(matchDebug && matchDebug.length > 0 ? { matchDebug } : {}),
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

  const learning =
    gradedForLearning.length > 0
      ? summarizeLearningBatch(settlementsToLearningSamples(gradedForLearning))
      : null;

  const autonomy = planAutonomyCycle({
    observedAt: new Date().toISOString(),
    deploymentSha: process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ?? null,
    databaseOk: true,
    ingestionOk: true,
    ingestionAgeMinutes: null,
    settlementBand:
      rca.overdue >= 5 ? "CRITICAL" : rca.overdue > 0 ? "DEGRADED" : "HEALTHY",
    settlementOverdue: rca.overdue,
    settlementCommenced: rca.total,
    topRcaCause: rca.topCause,
    rcaHeadline: rca.operatorHeadline,
    stpAutoEligible: stp.autoEligible,
    stpExceptions: stp.exceptionCount,
    burnDraining: burnRate?.draining ?? null,
    liveBoardEnabled: process.env["LIVE_BOARD"]?.trim().toLowerCase() === "true",
    publicPicksEnabled: process.env["PUBLIC_PICKS_ENABLED"]?.trim().toLowerCase() === "true",
    performanceStatsEnabled: process.env["PERFORMANCE_STATS_ENABLED"]?.trim().toLowerCase() === "true",
    publishLedgerEnabled: process.env["PUBLISH_LEDGER"]?.trim().toLowerCase() === "true",
    draftOnly: process.env["LIVE_BOARD"]?.trim().toLowerCase() !== "true",
    boardSuppressed: true,
    openPicks: null,
    canonicalSettled: learning?.nEligible ?? null,
    minSettledForLearning: 100,
  });

  // Repair: grade PENDING CLV_GRADE rows left by prior free settles (pre-grade path).
  let clvRepair: {
    attempted: number;
    graded: number;
    noClose: number;
    failed: number;
  } | null = null;
  try {
    clvRepair = await drainPendingClvGrades(db as never, { take: 100, now });
  } catch (err) {
    console.warn(
      `[free-settle] CLV repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    clvRepair = null;
  }

  let snapshotRepair: {
    attempted: number;
    done: number;
    failed: number;
  } | null = null;
  try {
    snapshotRepair = await drainPendingSnapshotOutcomes(db as never, { take: 100, now });
  } catch (err) {
    console.warn(
      `[free-settle] SNAPSHOT repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    snapshotRepair = null;
  }

  let teamGameLogRepair: {
    attempted: number;
    done: number;
    failed: number;
  } | null = null;
  try {
    const gates = getReadinessGates();
    teamGameLogRepair = await drainPendingTeamGameLogs(db as never, gates, { take: 100 });
  } catch (err) {
    console.warn(
      `[free-settle] TEAM_GAME_LOG repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    teamGameLogRepair = null;
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
    learning,
    autonomy,
    clvRepair,
    snapshotRepair,
    teamGameLogRepair,
    scoreDates:
      scoreDateAcc.size > 0
        ? {
            espnKeys: [...scoreDateAcc].sort().reverse(),
            isoKeys: [...scoreDateAcc]
              .sort()
              .reverse()
              .map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`),
          }
        : null,
  };
}
