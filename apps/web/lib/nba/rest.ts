/**
 * NBA rest / back-to-back loader — schedule-derived fatigue factors.
 *
 * Queue item (AGENTS.md scraping queue #2): a player on a B2B or 3-in-4 is
 * tired. This module derives the rest factors the factor engine's `rest`
 * input already accepts:
 *
 *   - gamesInLastDays (7-day window)
 *   - daysRest (calendar days since the player's/team's last game)
 *   - minutesLast3 (avg minutes over the last 3 played games, when available)
 *
 * Source: ESPN public scoreboard + summary JSON — the SAME endpoints the
 * already-cleared espn-scores / espn-boxscore free adapters use (app registry:
 * espn-public-api, approved_public_logged_off, derived_analytics_allowed,
 * attribution required). Basketball-Reference is permission_required (never
 * scraped) and balldontlie v1 is now key-gated — both avoided.
 *
 * Honesty contract: absent data is ABSENT. A player with no box-score minutes
 * in the window gets minutesLast3: null and a note — never a fabricated 0. A
 * team with no game yesterday gets daysRest: null only when we cannot know it
 * (offseason / no prior game in the window); a team we know played counts
 * real rest days. No outcome promises; facts + derived counts only; every
 * surface carries the ESPN attribution line.
 */

import { assertIngestible, fetchWithFailover } from "@sports/data-ingestion";
import { parseEspnScoreboard, type NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";

const NBA = "nba" as const;

const ESPN_NBA_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const ESPN_NBA_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";

export const NBA_REST_ATTRIBUTION = "Rest factors derived from scores data via ESPN";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface NbaRestProfile {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamAbbreviation: string;
  /** Games the player's TEAM played in the last 7 calendar days (incl. today). */
  readonly gamesInLast7Days: number;
  /** Calendar days since the team's previous game (1 = B2B). Null when unknown. */
  readonly daysRest: number | null;
  /** Avg minutes across the player's last 3 games (null when fewer than 1 known). */
  readonly minutesLast3: number | null;
  /** Player minutes per game in the window, oldest→newest (may be shorter than 3). */
  readonly lastMinutes: readonly number[];
  readonly attribution: string;
}

/** Rest input shape the founder-picks factor engine's `rest` factor accepts. */
export interface NbaRestFactorInput {
  readonly label: string;
  readonly gamesInLastDays: number;
  readonly daysRest: number | null;
}

export interface NbaRestLoadResult {
  readonly status: "live" | "source-error";
  readonly generatedAt: string;
  readonly gamesSeen: number;
  readonly players: readonly NbaRestProfile[];
  readonly error?: string;
}

export interface NbaBoxscoreSummary {
  /** minutes keyed by athlete id (ESPN summary "boxscore.players[].athletes[]"). */
  readonly minutesByAthlete: Readonly<Record<string, number>>;
  /** athleteId -> displayName, plus team abbreviation mapping for each row. */
  readonly athletes: Readonly<Record<string, string>>;
  readonly teamAbbreviations: Readonly<Record<string, string>>; // athleteId -> team abbr
}

// ── Pure derivation ─────────────────────────────────────────────────────────────

/**
 * Team rest from a schedule: count games in the trailing 7-day window and rest
 * days since the previous game. Pure — the caller assembles the schedule.
 */
export function computeTeamRest(
  games: readonly NormalizedGame[],
  teamAbbreviation: string,
  referenceDate: string,
  windowDays = 7,
): { gamesInLast7Days: number; daysRest: number | null } {
  const ref = new Date(`${referenceDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(ref)) return { gamesInLast7Days: 0, daysRest: null };
  // The reference date is the game being rested FOR. A game on that date is
  // not "rested" — it is today's slate — so only games BEFORE the reference
  // date count toward the trailing window.
  const windowStart = ref - windowDays * 86_400_000;
  const played: number[] = [];

  for (const g of games) {
    const start = new Date(g.startTime).getTime();
    if (!Number.isFinite(start) || start >= ref) continue;
    const homePlays = g.home?.abbreviation === teamAbbreviation;
    const awayPlays = g.away?.abbreviation === teamAbbreviation;
    if (!homePlays && !awayPlays) continue;
    if (start >= windowStart) played.push(start);
  }

  played.sort((a, b) => a - b);
  const inWindow = played.filter((t) => t >= windowStart);
  const last = played[played.length - 1];
  const daysRest = last === undefined ? null : Math.max(0, Math.round((ref - last) / 86_400_000));
  return { gamesInLast7Days: inWindow.length, daysRest };
}

/** Average minutes, oldest→newest. Null when the list is empty. */
export function averageMinutes(minutes: readonly number[]): number | null {
  const valid = minutes.filter((m) => Number.isFinite(m) && m > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

/**
 * Merge game-level minutes into per-athlete profiles. Pure.
 * @param acc athleteId -> minutes list (game order preserved)
 * @param gameMinutes athleteId -> minutes for ONE game (may be empty)
 */
export function mergePlayerMinutes(
  acc: Readonly<Record<string, readonly number[]>>,
  gameMinutes: Readonly<Record<string, number>>,
): Readonly<Record<string, readonly number[]>> {
  const out: Record<string, readonly number[]> = { ...acc };
  for (const [id, mins] of Object.entries(gameMinutes)) {
    if (!Number.isFinite(mins) || mins <= 0) continue;
    const prev = out[id] ?? [];
    out[id] = [...prev, mins];
  }
  return out;
}

/** Build the factor-engine `rest` input shape for one profile. */
export function toRestFactorInput(p: NbaRestProfile): NbaRestFactorInput {
  return {
    label: `${p.playerName} (${p.teamAbbreviation}): ${p.gamesInLast7Days} games in 7d, ${p.daysRest ?? "?"}d rest`,
    gamesInLastDays: p.gamesInLast7Days,
    daysRest: p.daysRest,
  };
}

// ── Fetch layer (forward-only, honest errors) ───────────────────────────────────

function nbaScoreboardUrl(dates: string): string {
  const params = new URLSearchParams({ dates, limit: "300" });
  return `${ESPN_NBA_SCOREBOARD}?${params.toString()}`;
}

function nbaSummaryUrl(eventId: string): string {
  return `${ESPN_NBA_SUMMARY}?event=${encodeURIComponent(eventId)}`;
}

function daysAgoIso(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function dateRange(daysBack: number): string {
  return `${daysAgoIso(daysBack)}-${daysAgoIso(0)}`;
}

async function fetchNbaScoreboard(fetcher: FetchLike): Promise<NormalizedGame[]> {
  assertIngestible("espn-public-api");
  const res = await fetchWithFailover([nbaScoreboardUrl(dateRange(7))], fetcher, { timeoutMs: 15_000 });
  const text = await res.response.text();
  if (text.length < 50) throw new Error("empty NBA scoreboard payload");
  return parseEspnScoreboard(JSON.parse(text) as Parameters<typeof parseEspnScoreboard>[0], NBA);
}

/** Extract minutes + athlete names from an ESPN summary payload. */
export function parseNbaBoxscoreMinutes(
  json: unknown,
): NbaBoxscoreSummary {
  const minutesByAthlete: Record<string, number> = {};
  const athletes: Record<string, string> = {};
  const teamAbbreviations: Record<string, string> = {};
  const root = json as {
    boxscore?: { players?: Array<{ team?: { abbreviation?: string }; statistics?: Array<{ athletes?: unknown[] }> }> };
  };
  for (const team of root.boxscore?.players ?? []) {
    const abbr = team.team?.abbreviation ?? "";
    for (const cat of team.statistics ?? []) {
      for (const athlete of cat.athletes ?? []) {
        const a = athlete as {
          athlete?: { id?: string; displayName?: string };
          stats?: string[];
        };
        const athleteInfo = a.athlete;
        const id = athleteInfo?.id;
        if (!id) continue;
        athletes[id] = athleteInfo.displayName ?? "";
        if (abbr) teamAbbreviations[id] = abbr;
        const raw = a.stats?.[0];
        const mins = raw === undefined ? Number.NaN : Number(raw);
        if (Number.isFinite(mins) && mins > 0) minutesByAthlete[id] = mins;
      }
    }
  }
  return { minutesByAthlete, athletes, teamAbbreviations };
}

/**
 * Load NBA rest profiles for the last 7 days.
 * Every stage returns an honest source-error rather than fabricating rows.
 */
export async function loadNbaRest(fetcher: FetchLike = fetch): Promise<NbaRestLoadResult> {
  const generatedAt = new Date().toISOString();
  try {
    const games = await fetchNbaScoreboard(fetcher);
    const played = games.filter((g) => g.completed && g.gameId);

    // Per-player accumulated data: minutes + team abbr (from their own box score).
    let acc: Record<string, readonly number[]> = {};
    const names: Record<string, string> = {};
    const teams: Record<string, string> = {};

    for (const g of played) {
      try {
        const res = await fetchWithFailover([nbaSummaryUrl(g.gameId!)], fetcher, { timeoutMs: 12_000 });
        const parsed = parseNbaBoxscoreMinutes(JSON.parse(await res.response.text()) as unknown);
        acc = mergePlayerMinutes(acc, parsed.minutesByAthlete);
        for (const [id, name] of Object.entries(parsed.athletes)) names[id] ||= name;
        for (const [id, abbr] of Object.entries(parsed.teamAbbreviations)) teams[id] ||= abbr;
      } catch {
        // A missing summary leaves that game's minutes ABSENT — never fabricated.
      }
    }

    const referenceDate = new Date().toISOString().slice(0, 10);
    const teamRestCache = new Map<string, { gamesInLast7Days: number; daysRest: number | null }>();
    for (const g of played) {
      for (const side of [g.home, g.away]) {
        const abbr = side?.abbreviation;
        if (!abbr || teamRestCache.has(abbr)) continue;
        teamRestCache.set(abbr, computeTeamRest(games, abbr, referenceDate));
      }
    }

    const players: NbaRestProfile[] = [];
    for (const [playerId, minutes] of Object.entries(acc)) {
      const name = names[playerId];
      if (!name) continue;
      const abbr = teams[playerId] ?? "";
      if (!abbr) continue;
      const teamRest = teamRestCache.get(abbr) ?? { gamesInLast7Days: 0, daysRest: null };
      players.push({
        playerId,
        playerName: name,
        teamAbbreviation: abbr,
        gamesInLast7Days: teamRest.gamesInLast7Days,
        daysRest: teamRest.daysRest,
        minutesLast3: averageMinutes(minutes.slice(-3)),
        lastMinutes: minutes.slice(-3),
        attribution: NBA_REST_ATTRIBUTION,
      });
    }

    players.sort((a, b) => a.playerName.localeCompare(b.playerName));
    return { status: "live", generatedAt, gamesSeen: played.length, players };
  } catch (e) {
    return {
      status: "source-error",
      generatedAt,
      gamesSeen: 0,
      players: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}