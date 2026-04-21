/**
 * TheSportsDB client — historical scores for settlement beyond The Odds API's 2-day window.
 *
 * Free key: "3" (public tier, ~30 req/min)
 * Override via THESPORTSDB_API_KEY or THE_SPORTS_DB_KEY environment variables.
 *
 * Sport key → League ID mapping mirrors SUPPORTED_SPORTS from config.ts.
 */

const THESPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json";

export const THESPORTSDB_LEAGUE_IDS: Record<string, number> = {
  basketball_nba:         4387,
  americanfootball_nfl:   4391,
  baseball_mlb:           4424,
  icehockey_nhl:          4380,
  soccer_usa_mls:         4346,
  americanfootball_ncaaf: 4440,
  basketball_ncaab:       4479,
};

// Common team name aliases — maps Odds API names → TheSportsDB names
// Only needed where they diverge in practice
const TEAM_NAME_ALIASES: Record<string, string[]> = {
  "Los Angeles Lakers":    ["LA Lakers", "Lakers"],
  "Los Angeles Clippers":  ["LA Clippers", "Clippers"],
  "Los Angeles Rams":      ["LA Rams"],
  "Los Angeles Chargers":  ["LA Chargers"],
  "Los Angeles Dodgers":   ["LA Dodgers"],
  "Los Angeles Angels":    ["LA Angels", "Angels"],
  "Golden State Warriors": ["Golden State", "Warriors"],
  "Oklahoma City Thunder": ["OKC Thunder", "Oklahoma City"],
  "Portland Trail Blazers":["Portland"],
  "San Antonio Spurs":     ["San Antonio"],
  "New Orleans Saints":    ["New Orleans"],
  "New York Knicks":       ["NY Knicks", "Knicks"],
  "New York Giants":       ["NY Giants", "Giants"],
  "New York Jets":         ["NY Jets", "Jets"],
  "New York Yankees":      ["NY Yankees", "Yankees"],
  "New York Mets":         ["NY Mets", "Mets"],
};

interface TheSportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;        // "YYYY-MM-DD"
  strTime: string | null;   // "HH:MM:SS" or null
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null; // "Match Finished", "FT", "Not Started", "Final", etc.
  strRound?: string | null;
  idLeague: string;
  strLeague: string;
}

interface TheSportsDbEventsResponse {
  events: TheSportsDbEvent[] | null;
}

export interface SportsDbEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  homeScore: number | null;
  awayScore: number | null;
  isCompleted: boolean;
  round: string | null;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function getApiKey(): string {
  return (
    process.env["THESPORTSDB_API_KEY"] ??
    process.env["THE_SPORTS_DB_KEY"] ??
    "3"
  );
}

async function fetchEvents(path: string, params: Record<string, string>): Promise<TheSportsDbEvent[]> {
  const apiKey = getApiKey();
  const url = new URL(`${THESPORTSDB_BASE}/${apiKey}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await globalThis.fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`TheSportsDB ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as TheSportsDbEventsResponse;
  return data.events ?? [];
}

function parseScore(val: string | null): number | null {
  if (val === null || val === "" || val === "-") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function normalizeEvent(e: TheSportsDbEvent): SportsDbEvent {
  const timeStr = e.strTime ?? "00:00:00";
  const dateStr = `${e.dateEvent}T${timeStr}Z`;

  const homeScore = parseScore(e.intHomeScore);
  const awayScore = parseScore(e.intAwayScore);

  const status = (e.strStatus ?? "").toLowerCase().trim();
  const isCompleted =
    status === "match finished" ||
    status === "ft" ||
    status === "aet" ||
    status === "pen" ||
    status === "final" ||
    status === "finished" ||
    status === "complete" ||
    status === "completed" ||
    // Score present and game clearly started (not just "Not Started" or blank)
    (homeScore !== null && awayScore !== null &&
      status !== "not started" &&
      status !== "ns" &&
      status !== "" &&
      status !== "postponed" &&
      status !== "canceled" &&
      status !== "cancelled");

  return {
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    date: new Date(dateStr),
    homeScore,
    awayScore,
    isCompleted,
    round: e.strRound ?? null,
  };
}

/**
 * Normalizes a team name to a canonical form for matching.
 * Strips city prefixes, common suffixes, and handles known aliases.
 */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns all candidate names for a given team (including aliases).
 */
function getCandidateNames(name: string): string[] {
  const canonical = normalizeTeamName(name);
  const candidates = [canonical];

  // Add known aliases
  for (const [primary, aliases] of Object.entries(TEAM_NAME_ALIASES)) {
    if (normalizeTeamName(primary) === canonical) {
      candidates.push(...aliases.map(normalizeTeamName));
    }
    for (const alias of aliases) {
      if (normalizeTeamName(alias) === canonical) {
        candidates.push(normalizeTeamName(primary));
        candidates.push(...aliases.filter(a => a !== alias).map(normalizeTeamName));
      }
    }
  }

  // Also add the last word (city teams often go by last word: "Lakers", "Bulls")
  const parts = canonical.split(" ");
  if (parts.length > 1 && parts[parts.length - 1]) {
    candidates.push(parts[parts.length - 1]!);
  }

  return [...new Set(candidates)];
}

/**
 * Returns true if dbTeam (from Odds API) matches sdbTeam (from TheSportsDB).
 * Uses substring matching with alias expansion.
 */
export function teamsMatch(dbTeam: string, sdbTeam: string): boolean {
  const dbCandidates = getCandidateNames(dbTeam);
  const sdbNorm = normalizeTeamName(sdbTeam);
  const sdbParts = sdbNorm.split(" ");

  for (const candidate of dbCandidates) {
    if (
      sdbNorm.includes(candidate) ||
      candidate.includes(sdbNorm) ||
      // Match by last word (team nickname)
      (sdbParts.length > 0 && candidate.includes(sdbParts[sdbParts.length - 1]!)) ||
      (sdbParts.length > 0 && sdbParts[sdbParts.length - 1] !== undefined &&
        sdbNorm.includes(candidate.split(" ").pop()!))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Fetches all events for a sport on a given calendar date.
 * Returns empty array when sport not supported or API fails (non-fatal).
 */
export async function getEventsByDate(
  sportKey: string,
  date: Date
): Promise<SportsDbEvent[]> {
  const leagueId = THESPORTSDB_LEAGUE_IDS[sportKey];
  if (!leagueId) return [];

  try {
    const events = await fetchEvents("eventsday.php", {
      d: formatDate(date),
      l: leagueId.toString(),
    });
    const normalized = events.map(normalizeEvent);
    if (normalized.length > 0) {
      console.log(
        `[thesportsdb] ${sportKey} on ${formatDate(date)}: ` +
        `${normalized.length} events, ${normalized.filter(e => e.isCompleted).length} completed`
      );
    }
    return normalized;
  } catch (err) {
    console.warn(
      `[thesportsdb] getEventsByDate failed for ${sportKey} on ${formatDate(date)}: ` +
      `${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}

/**
 * Fetches events for a sport over a date range (inclusive).
 * Throttles to one request per 600ms to respect free-tier rate limits.
 */
export async function getEventsByDateRange(
  sportKey: string,
  startDate: Date,
  endDate: Date
): Promise<SportsDbEvent[]> {
  const results: SportsDbEvent[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayEvents = await getEventsByDate(sportKey, current);
    results.push(...dayEvents);
    current.setDate(current.getDate() + 1);
    if (current <= end) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return results;
}
