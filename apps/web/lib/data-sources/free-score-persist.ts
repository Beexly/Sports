/**
 * Persist free scores into Game rows (team+date match).
 *
 * Does not invent games — only updates existing rows when a free final matches.
 * Used so free path can move resultFetched without THE_ODDS_API_KEY.
 *
 * Law: oddsApiRequired=false · refuse-default · no score overwrite with null.
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
import { buildTrustedFinals, type TrustedFinal } from "./free-settlement";
import { normalizeTeamToken } from "./score-verification";

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
};

function teamsMatch(a: string, b: string): boolean {
  const x = normalizeTeamToken(a);
  const y = normalizeTeamToken(b);
  return x === y || x.includes(y) || y.includes(x);
}

function finalMatchesGame(
  f: TrustedFinal,
  home: string,
  away: string,
): { homeScore: number; awayScore: number } | null {
  const fh = f.home.name;
  const fa = f.away.name;
  if (teamsMatch(home, fh) && teamsMatch(away, fa)) {
    return { homeScore: f.home.score, awayScore: f.away.score };
  }
  if (teamsMatch(home, fa) && teamsMatch(away, fh)) {
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
      const multi = await fetchScoresMultiSource(freeSport);
      const espn: readonly NormalizedGame[] = multi.games;
      const henry = await loadHenry(freeSport);
      const finals = buildTrustedFinals(espn, henry).filter((f) => f.confirmation !== "DISPUTED");

      // Look at recent games not yet fully result-fetched
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const games = await db.game.findMany({
        where: {
          sport: { key: sport.key },
          commenceTime: { gte: since },
          OR: [{ resultFetched: false }, { status: { in: ["SCHEDULED", "LIVE"] } }, { homeScore: null }],
        },
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          homeScore: true,
          awayScore: true,
        },
        take: 200,
      });

      let matched = 0;
      let updated = 0;

      for (const g of games) {
        const day = g.commenceTime.toISOString().slice(0, 10);
        const candidates = finals.filter((f) => {
          const fd = f.date.slice(0, 10);
          const d0 = Date.parse(day);
          const d1 = Date.parse(fd);
          if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false;
          return Math.abs(d0 - d1) <= 36e5 * 36; // ~1.5 days
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

  return {
    path: "free-score-persist",
    oddsApiRequired: false,
    elapsedMs: Date.now() - started,
    sports: out,
    gamesUpdated,
  };
}
