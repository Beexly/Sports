/**
 * Persist free scores into Game rows (team+date match).
 *
 * Does not invent games — only updates existing rows when a free final matches.
 * Used so free path can move resultFetched without THE_ODDS_API_KEY.
 *
 * Law: oddsApiRequired=false · refuse-default · no score overwrite with null.
 *
 * Date-targets ESPN/secondary boards from pending game commence days (undated
 * boards are "now" only and starve historical rows). Matching uses the same
 * nickname/alias expansion as free settlement.
 *
 * Also records an honest IngestionRun SUCCESS when the persist cycle completes
 * so /api/health recovers under free mode.
 */

import { db } from "@sports/db";
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
  expandTeamMatchTokens,
  teamTokensMatch,
  type TrustedFinal,
} from "./free-settlement";
import { uniqueScoreboardDates } from "./settlement-score-dates";
import { recordFreeIngestionRun } from "./free-ingestion-run";

const ODDS_KEY_TO_FREE: Record<string, Sport> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  basketball_ncaab: "ncaab",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  soccer_usa_mls: "mls",
};

export type FreeScorePersistSportResult = {
  sport: string;
  freeSport: Sport | null;
  ok: boolean;
  finals: number;
  gamesMatched: number;
  gamesUpdated: number;
  error?: string;
};

export type FreeScorePersistResult = {
  path: "free-score-persist";
  oddsApiRequired: false;
  elapsedMs: number;
  sports: FreeScorePersistSportResult[];
  gamesUpdated: number;
  ingestionRunId?: string | null;
};

function sideTokens(side: { name: string; abbr: string }): string[] {
  return [
    ...expandTeamMatchTokens(side.name),
    ...expandTeamMatchTokens(side.abbr),
  ].filter(Boolean);
}

function finalMatchesGame(
  f: TrustedFinal,
  home: string,
  away: string,
): { homeScore: number; awayScore: number } | null {
  const homeTok = expandTeamMatchTokens(home);
  const awayTok = expandTeamMatchTokens(away);
  const fHome = sideTokens(f.home);
  const fAway = sideTokens(f.away);
  const homeOnHome = homeTok.some((t) => fHome.some((ft) => teamTokensMatch(t, ft)));
  const awayOnAway = awayTok.some((t) => fAway.some((ft) => teamTokensMatch(t, ft)));
  if (homeOnHome && awayOnAway) {
    return { homeScore: f.home.score, awayScore: f.away.score };
  }
  const homeOnAway = homeTok.some((t) => fAway.some((ft) => teamTokensMatch(t, ft)));
  const awayOnHome = awayTok.some((t) => fHome.some((ft) => teamTokensMatch(t, ft)));
  if (homeOnAway && awayOnHome) {
    return { homeScore: f.away.score, awayScore: f.home.score };
  }
  return null;
}

async function loadHenry(free: Sport): Promise<readonly NcaaGame[]> {
  try {
    if (free === "ncaaf") return await fetchHenrygdScoreboard(HENRYGD_PATHS.cfb);
    if (free === "ncaab") return await fetchHenrygdScoreboard(HENRYGD_PATHS.mbb);
  } catch {
    return [];
  }
  return [];
}

/**
 * For each sport: fetch free finals, match pending/incomplete games in DB, stamp scores.
 * Skips DISPUTED finals. Prefer CONFIRMED then SINGLE_SOURCE.
 */
export async function persistFreeScores(options?: {
  sportKey?: string | null;
}): Promise<FreeScorePersistResult> {
  const started = Date.now();
  const sports = options?.sportKey
    ? SUPPORTED_SPORTS.filter((s) => s.key === options.sportKey)
    : [...SUPPORTED_SPORTS];

  const out: FreeScorePersistSportResult[] = [];
  let gamesUpdated = 0;

  for (const sport of sports) {
    const freeSport = ODDS_KEY_TO_FREE[sport.key] ?? null;
    if (!freeSport) {
      out.push({
        sport: sport.key,
        freeSport: null,
        ok: true,
        finals: 0,
        gamesMatched: 0,
        gamesUpdated: 0,
      });
      continue;
    }

    try {
      // Look at recent games not yet fully result-fetched (load first for date keys)
      const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
      const games = await db.game.findMany({
        where: {
          sport: { key: sport.key },
          commenceTime: { gte: since },
          OR: [
            { resultFetched: false },
            { status: { in: ["SCHEDULED", "LIVE"] } },
            { homeScore: null },
          ],
        },
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          homeScore: true,
          awayScore: true,
        },
        take: 300,
      });

      const { espnKeys, isoKeys } = uniqueScoreboardDates(
        games.map((g) => g.commenceTime),
        { maxDays: 21 },
      );

      const multi = await fetchScoresMultiSource(freeSport, {
        ...(espnKeys.length > 0
          ? { espnDateKeys: espnKeys, isoDateKeys: isoKeys }
          : {}),
      });
      const espn: readonly NormalizedGame[] = multi.games;
      const henry = await loadHenry(freeSport);
      const finals = buildTrustedFinals(espn, henry).filter(
        (f) => f.confirmation !== "DISPUTED",
      );

      let matched = 0;
      let updated = 0;

      for (const g of games) {
        const day = g.commenceTime.toISOString().slice(0, 10);
        const candidates = finals.filter((f) => {
          const fd = f.date.slice(0, 10);
          const d0 = Date.parse(day);
          const d1 = Date.parse(fd);
          if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false;
          return Math.abs(d0 - d1) <= 36e5 * 48; // ~2 days (TZ edge)
        });

        let hit: { homeScore: number; awayScore: number } | null = null;
        for (const f of candidates) {
          hit = finalMatchesGame(f, g.homeTeamName, g.awayTeamName);
          if (hit) break;
        }
        if (!hit) continue;
        matched++;

        // Do not blank existing scores with null; only write concrete scores.
        const res = await db.game.updateMany({
          where: { id: g.id },
          data: {
            homeScore: hit.homeScore,
            awayScore: hit.awayScore,
            status: "FINAL",
            resultFetched: true,
          },
        });
        if (res.count > 0) {
          updated++;
          gamesUpdated++;
        }
      }

      out.push({
        sport: sport.key,
        freeSport,
        ok: true,
        finals: finals.length,
        gamesMatched: matched,
        gamesUpdated: updated,
      });
    } catch (err) {
      out.push({
        sport: sport.key,
        freeSport,
        ok: false,
        finals: 0,
        gamesMatched: 0,
        gamesUpdated: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const anyOk = out.some((s) => s.ok);
  const allFailed = out.length > 0 && out.every((s) => !s.ok);
  const ingestionRun = await recordFreeIngestionRun({
    sport: options?.sportKey ?? "free-scores",
    gamesUpserted: gamesUpdated,
    oddsInserted: 0,
    failed: allFailed,
    errorMessage: allFailed
      ? out
          .map((s) => s.error)
          .filter(Boolean)
          .slice(0, 3)
          .join("; ") || "free-score-persist: all sports failed"
      : null,
  });

  return {
    path: "free-score-persist",
    oddsApiRequired: false,
    elapsedMs: Date.now() - started,
    sports: out,
    gamesUpdated,
    ingestionRunId: anyOk || allFailed ? ingestionRun?.id ?? null : null,
  };
}
