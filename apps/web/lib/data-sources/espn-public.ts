/**
 * ESPN Public API Adapter — GSE Resilience Fallback.
 *
 * ESPN exposes unofficial public endpoints (no API key required) for
 * scores, rosters, teams, and standings. Used as a resilience fallback
 * when The Odds API is unavailable or rate-limited.
 *
 * DATA QUALITY: "fallback" — ESPN data is unofficial, may lag, and
 * should never override confirmed odds/line data. It is a supplementary
 * signal source, not a source of truth.
 *
 * LICENSE: ESPN data accessed via public HTTP. No scraping, no login,
 * no credentials. Standard web-crawling ToS applies. Use conservatively.
 */

export type EspnSport = "football" | "basketball" | "baseball" | "hockey" | "soccer";
export type EspnLeague =
  | "nfl"
  | "nba"
  | "mlb"
  | "nhl"
  | "college-football"
  | "mens-college-basketball";

export type EspnDataQuality = "fallback";

export type EspnGame = {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  readonly shortName: string;
  readonly status: "pre" | "in" | "post";
  readonly home: {
    readonly teamId: string;
    readonly teamName: string;
    readonly abbreviation: string;
    readonly score: string;
    readonly record: string;
  };
  readonly away: {
    readonly teamId: string;
    readonly teamName: string;
    readonly abbreviation: string;
    readonly score: string;
    readonly record: string;
  };
  readonly dataQuality: EspnDataQuality;
  readonly fetchedAt: string;
};

export type EspnScoreboardResult = {
  readonly ok: true;
  readonly sport: EspnSport;
  readonly league: EspnLeague;
  readonly games: readonly EspnGame[];
  readonly fetchedAt: string;
  readonly dataQuality: EspnDataQuality;
  readonly source: "espn-public";
  readonly cacheMaxAgeSeconds: number;
};

export type EspnTeam = {
  readonly id: string;
  readonly abbreviation: string;
  readonly displayName: string;
  readonly shortDisplayName: string;
  readonly location: string;
  readonly color: string;
  readonly dataQuality: EspnDataQuality;
};

export type EspnTeamsResult = {
  readonly ok: true;
  readonly sport: EspnSport;
  readonly league: EspnLeague;
  readonly teams: readonly EspnTeam[];
  readonly fetchedAt: string;
  readonly dataQuality: EspnDataQuality;
  readonly source: "espn-public";
};

export type EspnRosterPlayer = {
  readonly id: string;
  readonly fullName: string;
  readonly position: string;
  readonly jerseyNumber: string;
  readonly status: string;
};

export type EspnRosterResult = {
  readonly ok: true;
  readonly sport: EspnSport;
  readonly league: EspnLeague;
  readonly teamId: string;
  readonly teamName: string;
  readonly players: readonly EspnRosterPlayer[];
  readonly fetchedAt: string;
  readonly dataQuality: EspnDataQuality;
  readonly source: "espn-public";
};

export type EspnFetchError = {
  readonly ok: false;
  readonly status: number | "network-error" | "parse-error";
  readonly message: string;
  readonly sport: EspnSport;
  readonly league: EspnLeague;
  readonly dataQuality: EspnDataQuality;
  readonly source: "espn-public";
};

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

// Cache TTLs: scores refresh fast, rosters/teams can be cached longer.
const SCOREBOARD_CACHE_SECONDS = 60;
const TEAMS_CACHE_SECONDS = 3600;
const ROSTER_CACHE_SECONDS = 1800;

function espnUrl(sport: EspnSport, league: EspnLeague, path: string): string {
  return `${ESPN_BASE}/${sport}/${league}/${path}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGame(event: any, fetchedAt: string): EspnGame | null {
  try {
    const competition = event?.competitions?.[0];
    const home = competition?.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
    const away = competition?.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");
    if (!home || !away) return null;

    const stateType: string = event?.status?.type?.state ?? "pre";
    const status: EspnGame["status"] =
      stateType === "in" ? "in" : stateType === "post" ? "post" : "pre";

    return {
      id: String(event?.id ?? ""),
      date: String(event?.date ?? ""),
      name: String(event?.name ?? ""),
      shortName: String(event?.shortName ?? ""),
      status,
      home: {
        teamId: String(home?.team?.id ?? ""),
        teamName: String(home?.team?.displayName ?? ""),
        abbreviation: String(home?.team?.abbreviation ?? ""),
        score: String(home?.score ?? ""),
        record: String(home?.records?.[0]?.summary ?? ""),
      },
      away: {
        teamId: String(away?.team?.id ?? ""),
        teamName: String(away?.team?.displayName ?? ""),
        abbreviation: String(away?.team?.abbreviation ?? ""),
        score: String(away?.score ?? ""),
        record: String(away?.records?.[0]?.summary ?? ""),
      },
      dataQuality: "fallback",
      fetchedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the scoreboard for a given sport/league.
 * No API key required. Returns fallback-quality data.
 */
export async function fetchEspnScoreboard(
  sport: EspnSport,
  league: EspnLeague,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<EspnScoreboardResult | EspnFetchError> {
  const url = espnUrl(sport, league, "scoreboard");
  const fetchedAt = nowIso();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `ESPN returned HTTP ${response.status}.`, sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to parse ESPN response as JSON.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: unknown[] = (data as any)?.events ?? [];
  const games = events
    .map((e) => parseGame(e, fetchedAt))
    .filter((g): g is EspnGame => g !== null);

  return {
    ok: true,
    sport,
    league,
    games,
    fetchedAt,
    dataQuality: "fallback",
    source: "espn-public",
    cacheMaxAgeSeconds: SCOREBOARD_CACHE_SECONDS,
  };
}

// ─── Teams ────────────────────────────────────────────────────────────────────

/**
 * Fetch the team list for a given sport/league.
 */
export async function fetchEspnTeams(
  sport: EspnSport,
  league: EspnLeague,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<EspnTeamsResult | EspnFetchError> {
  const url = espnUrl(sport, league, "teams");
  const fetchedAt = nowIso();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `ESPN returned HTTP ${response.status}.`, sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to parse ESPN response as JSON.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTeams: unknown[] = (data as any)?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const teams: EspnTeam[] = rawTeams
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any) => {
      const t = entry?.team;
      if (!t) return null;
      return {
        id: String(t.id ?? ""),
        abbreviation: String(t.abbreviation ?? ""),
        displayName: String(t.displayName ?? ""),
        shortDisplayName: String(t.shortDisplayName ?? ""),
        location: String(t.location ?? ""),
        color: String(t.color ?? ""),
        dataQuality: "fallback" as const,
      };
    })
    .filter((t): t is EspnTeam => t !== null);

  return {
    ok: true,
    sport,
    league,
    teams,
    fetchedAt,
    dataQuality: "fallback",
    source: "espn-public",
  };
}

// ─── Roster ───────────────────────────────────────────────────────────────────

/**
 * Fetch the roster for a specific team.
 */
export async function fetchEspnRoster(
  sport: EspnSport,
  league: EspnLeague,
  teamId: string,
  fetcher: Fetcher = fetch as Fetcher,
): Promise<EspnRosterResult | EspnFetchError> {
  const url = espnUrl(sport, league, `teams/${teamId}/roster`);
  const fetchedAt = nowIso();

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url);
  } catch {
    return { ok: false, status: "network-error", message: "Network request failed.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: `ESPN returned HTTP ${response.status}.`, sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: "parse-error", message: "Failed to parse ESPN response as JSON.", sport, league, dataQuality: "fallback", source: "espn-public" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const teamName: string = d?.team?.displayName ?? "Unknown";
  const allPlayers: EspnRosterPlayer[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: unknown[] = d?.athletes ?? [];

  for (const group of groups) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: unknown[] = (group as any)?.items ?? [];
    for (const p of items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = p as any;
      allPlayers.push({
        id: String(player?.id ?? ""),
        fullName: String(player?.fullName ?? ""),
        position: String(player?.position?.abbreviation ?? ""),
        jerseyNumber: String(player?.jersey ?? ""),
        status: String(player?.status?.type ?? "active"),
      });
    }
  }

  return {
    ok: true,
    sport,
    league,
    teamId,
    teamName,
    players: allPlayers,
    fetchedAt,
    dataQuality: "fallback",
    source: "espn-public",
  };
}

// ─── Cache-aware convenience wrapper ─────────────────────────────────────────

export const ESPN_CACHE_TTL = {
  scoreboard: SCOREBOARD_CACHE_SECONDS,
  teams: TEAMS_CACHE_SECONDS,
  roster: ROSTER_CACHE_SECONDS,
} as const;

/** Supported NFL team abbreviations for quick lookup. */
export const NFL_TEAM_IDS = {
  ARI: "22", ATL: "1",  BAL: "33", BUF: "2",  CAR: "29",
  CHI: "3",  CIN: "4",  CLE: "5",  DAL: "6",  DEN: "7",
  DET: "8",  GB: "9",   HOU: "34", IND: "11", JAX: "30",
  KC: "12",  LV: "13",  LAC: "24", LAR: "14", MIA: "15",
  MIN: "16", NE: "17",  NO: "18",  NYG: "19", NYJ: "20",
  PHI: "21", PIT: "23", SF: "25",  SEA: "26", TB: "27",
  TEN: "10", WAS: "28",
} as const;
