/**
 * ESPN public scoreboard adapter — FREE, cleared (approved_public_logged_off), FACTS ONLY.
 *
 * This is a free-first ingestion source: scores, schedules, status, and venue for all
 * seven sports at zero marginal cost (no key). It must never be used for commercial
 * display/storage without a license (rights-registry: commercial_display_allowed=false)
 * — facts and derived signals only, with attribution.
 *
 * The schema was verified live against:
 *   https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard
 * `parseEspnScoreboard` is a pure function tested against a captured fixture; the fetch
 * wrapper is a thin shell so tests stay deterministic.
 */

import type { Sport } from "../source-router";

export const ESPN_ATTRIBUTION = "Scores data via ESPN";

/** Verified sport → ESPN path map (each path returns HTTP 200). */
const ESPN_PATHS: Record<Sport, string> = {
  nfl: "football/nfl",
  ncaaf: "football/college-football",
  nba: "basketball/nba",
  ncaab: "basketball/mens-college-basketball",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  mls: "soccer/usa.1",
};

export type GameState = "pre" | "in" | "post" | "unknown";

export type NormalizedTeamScore = {
  readonly team: string;
  readonly abbreviation: string;
  readonly score: number | null;
};

export type NormalizedGame = {
  readonly sourceId: "espn-public-api";
  readonly sport: Sport;
  readonly gameId: string;
  readonly startTime: string; // ISO 8601
  readonly state: GameState;
  readonly completed: boolean;
  readonly statusDetail: string;
  readonly venue: string | null;
  readonly home: NormalizedTeamScore | null;
  readonly away: NormalizedTeamScore | null;
  readonly attribution: string;
};

// ── Minimal shapes of the verified ESPN response (only fields we read) ───────────

type EspnCompetitor = {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; abbreviation?: string };
};
type EspnStatusType = { state?: string; completed?: boolean; shortDetail?: string; detail?: string };
type EspnCompetition = {
  venue?: { fullName?: string };
  competitors?: EspnCompetitor[];
  status?: { type?: EspnStatusType };
};
type EspnEvent = {
  id?: string;
  date?: string;
  status?: { type?: EspnStatusType };
  competitions?: EspnCompetition[];
};
export type EspnScoreboard = { events?: EspnEvent[] };

function toState(raw: string | undefined): GameState {
  return raw === "pre" || raw === "in" || raw === "post" ? raw : "unknown";
}

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeTeam(c: EspnCompetitor | undefined): NormalizedTeamScore | null {
  if (!c?.team) return null;
  return {
    team: c.team.displayName ?? "",
    abbreviation: c.team.abbreviation ?? "",
    score: parseScore(c.score),
  };
}

/** Pure parser — verified against the live ESPN scoreboard schema. */
export function parseEspnScoreboard(json: EspnScoreboard, sport: Sport): NormalizedGame[] {
  const events = Array.isArray(json.events) ? json.events : [];
  const games: NormalizedGame[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const statusType = comp.status?.type ?? event.status?.type ?? {};
    const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
    const home = normalizeTeam(competitors.find((c) => c.homeAway === "home"));
    const away = normalizeTeam(competitors.find((c) => c.homeAway === "away"));

    games.push({
      sourceId: "espn-public-api",
      sport,
      gameId: event.id ?? "",
      startTime: event.date ?? "",
      state: toState(statusType.state),
      completed: Boolean(statusType.completed),
      statusDetail: statusType.shortDetail ?? statusType.detail ?? "",
      venue: comp.venue?.fullName ?? null,
      home,
      away,
      attribution: ESPN_ATTRIBUTION,
    });
  }

  return games;
}

/**
 * Scoreboard URL. `dates` targets a specific slate — "YYYYMMDD" for one day or
 * "YYYYMMDD-YYYYMMDD" for a range. Without it ESPN returns the *current* scoreboard,
 * which in the offseason rolls to the next season — so date-targeting is required to
 * verify finals for a past game.
 */
export function espnScoreboardUrl(sport: Sport, dates?: string): string {
  const base = `https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATHS[sport]}/scoreboard`;
  return dates ? `${base}?dates=${encodeURIComponent(dates)}` : base;
}

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number; readonly dates?: string };

/**
 * Fetch + normalize a scoreboard for a sport. Pass `opts.dates` to target a specific
 * slate (required to settle/verify past finals). Facts only; attribution attached.
 * Throws on non-200 so the pipeline can fall through to the next source.
 */
export async function fetchEspnScoreboard(
  sport: Sport,
  opts: FetchOptions = {},
): Promise<NormalizedGame[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(espnScoreboardUrl(sport, opts.dates), { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN scoreboard ${sport} HTTP ${res.status}`);
    const json = (await res.json()) as EspnScoreboard;
    return parseEspnScoreboard(json, sport);
  } finally {
    clearTimeout(timer);
  }
}
