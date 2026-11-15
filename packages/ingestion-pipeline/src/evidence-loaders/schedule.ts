/**
 * Schedule / identity loader — one `games` row in, one GameIdentity out.
 *
 * Reads the games row (plus its sport/league labels) in a single SELECT.
 * Team names pass through canonicalTeamCode, which throws on anything
 * unrecognised; that throw becomes MISSING, never a guessed code.
 *
 * Honest gaps:
 *  - venue: the games table has no venue column, so identity.venue is always
 *    MISSING. A stadium name would be invented.
 *  - season/week: derived from the row's own commenceTime (NFL calendar:
 *    week 1 opens the Thursday after Labor Day). No schedule lookup. A
 *    kickoff outside regular-season weeks 1–18 refuses to label a week.
 *
 * SELECT only. A data problem returns missing(reason); only programmer
 * error (or a DB transport failure) throws.
 */
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence, GameIdentity } from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

const GAME_SELECT = `SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g."updatedAt", s.key AS "sportKey", l.key AS "leagueKey" FROM games g LEFT JOIN sports s ON s.id = g."sportId" LEFT JOIN leagues l ON l.id = g."leagueId" WHERE g.id = $1`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Read a column without `any` — rows are plain string-keyed records. */
function field(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/**
 * Postgres timestamps arrive as Date objects (TCP drivers) or as
 * "YYYY-MM-DD HH:MM:SS[.fff]" strings (Neon SQL-over-HTTP). The repo writes
 * UTC, so a zone-less string is stamped UTC rather than parsed as local time.
 */
function asDateIso(v: unknown): string | null {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v.toISOString() : null;
  }
  if (typeof v !== "string" || v.trim().length === 0) return null;
  const raw = v.trim();
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * NFL regular-season week from the kickoff date alone. Week 1 opens on the
 * Thursday after Labor Day (the first Monday of September); each week spans
 * 7 days from that Thursday, which keeps Thursday-night through Monday-night
 * kickoffs (whose UTC dates can slip a day) in the right bucket.
 * Returns null outside weeks 1–18 — preseason and playoff games get no
 * regular-season week label rather than a fabricated one.
 */
export function nflWeekFromKickoff(kickoff: Date): number | null {
  const year = kickoff.getUTCFullYear();
  const sep1Dow = new Date(Date.UTC(year, 8, 1)).getUTCDay();
  const laborDay = 1 + ((8 - sep1Dow) % 7);
  const week1ThursdayMs = Date.UTC(year, 8, laborDay + 3);
  const days = Math.floor((kickoff.getTime() - week1ThursdayMs) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return week >= 1 && week <= 18 ? week : null;
}

/** The odds-api sport key encodes its league: "americanfootball_nfl" -> "NFL". */
function leagueFromSportKey(sportKey: string): string | null {
  const i = sportKey.lastIndexOf("_");
  return i > 0 && i < sportKey.length - 1 ? sportKey.slice(i + 1).toUpperCase() : null;
}

export async function loadGameIdentity(
  db: SqlClient,
  gameId: string,
): Promise<Evidence<GameIdentity>> {
  const result = await db.query(GAME_SELECT, [gameId]);
  const row = result.rows[0];
  if (!isRecord(row)) {
    return missing(`no games row for id ${gameId}`, "games");
  }

  const commenceIso = asDateIso(field(row, "commenceTime"));
  const asOf = asDateIso(field(row, "updatedAt")) ?? commenceIso ?? undefined;

  const homeName = asString(field(row, "homeTeamName"));
  const awayName = asString(field(row, "awayTeamName"));
  if (homeName === null || awayName === null) {
    return missing("games row is missing homeTeamName/awayTeamName", "games", asOf);
  }
  let homeTeam: string;
  let awayTeam: string;
  try {
    homeTeam = canonicalTeamCode(homeName);
    awayTeam = canonicalTeamCode(awayName);
  } catch (err) {
    return missing(
      err instanceof Error ? err.message : `unknown team name in games row ${gameId}`,
      "games",
      asOf,
    );
  }

  if (commenceIso === null) {
    return missing("games row has no valid commenceTime", "games", asOf);
  }

  const sportKey = asString(field(row, "sportKey"));
  if (sportKey === null) {
    return missing(`no sports.key joined for game ${gameId}`, "games", asOf);
  }
  const league = asString(field(row, "leagueKey")) ?? leagueFromSportKey(sportKey);
  if (league === null) {
    return missing(`cannot determine league from sport key "${sportKey}"`, "games", asOf);
  }

  const kickoff = new Date(commenceIso);
  const week = nflWeekFromKickoff(kickoff);
  if (week === null) {
    return missing(
      `kickoff ${commenceIso} falls outside NFL regular-season weeks 1-18; refusing to invent a week`,
      "games",
      asOf,
    );
  }

  const identity: GameIdentity = {
    gameId,
    homeTeam,
    awayTeam,
    commenceTime: commenceIso,
    // No venue column exists on games; anything else would be invented.
    venue: missing("games table has no venue column"),
    sport: sportKey,
    league,
    season: kickoff.getUTCFullYear(),
    week,
  };
  return real(identity, "games", asOf ?? commenceIso);
}
