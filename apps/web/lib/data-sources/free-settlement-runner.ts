/**
 * Free-path settlement runner — Production auto-run without THE_ODDS_API_KEY.
 *
 * Uses ESPN (+ henrygd for NCAA) free scores, buildTrustedFinals, settlePendingPicks,
 * then writes PENDING→result with transactional outbox + post-settlement work
 * (same durability pattern as settleSport).
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
import { fetchScoresFreeFirst } from "./free-first-ingest";
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

const ODDS_KEY_TO_FREE: Record<string, Sport> = {
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
}): Promise<FreeSettlementRunResult> {
  const started = Date.now();
  const sports = options?.sportKey
    ? SUPPORTED_SPORTS.filter((s) => s.key === options.sportKey)
    : [...SUPPORTED_SPORTS];

  const out: FreeSettlementSportResult[] = [];
  let picksSettled = 0;
  let picksHeld = 0;

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
      const pendingRows = await db.pick.findMany({
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

      const espnOut = await fetchScoresFreeFirst(freeSport);
      const espn: readonly NormalizedGame[] = espnOut.data ?? [];
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
        if (o.status === "PENDING") {
          stillPending++;
          continue;
        }
        if (o.status === "HELD") {
          held++;
          picksHeld++;
          continue;
        }

        const row = pendingRows.find((r) => r.id === o.pickId);
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

  return {
    path: "free",
    oddsApiRequired: false,
    startedAt: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    sports: out,
    picksSettled,
    picksHeld,
  };
}
