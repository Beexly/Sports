/**
 * TheSportsDB client — historical scores for settlement beyond The Odds API's 2-day window.
 *
 * Free key: "3" (public tier, ~30 req/min)
 * Override via THESPORTSDB_API_KEY environment variable.
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

interface TheSportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;        // "YYYY-MM-DD"
  strTime: string | null;   // "HH:MM:SS" or null
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null; // "Match Finished", "FT", "Not Started", etc.
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
  return process.env["THESPORTSDB_API_KEY"] ?? "3";
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

function normalizeEvent(e: TheSportsDbEvent): SportsDbEvent {
  const timeStr = e.strTime ?? "00:00:00";
  const dateStr = `${e.dateEvent}T${timeStr}Z`;

  const homeScore =
    e.intHomeScore !== null && e.intHomeScore !== ""
      ? parseInt(e.intHomeScore, 10)
      : null;
  const awayScore =
    e.intAwayScore !== null && e.intAwayScore !== ""
      ? parseInt(e.intAwayScore, 10)
      : null;

  const status = (e.strStatus ?? "").toLowerCase();
  const isCompleted =
    status === "match finished" ||
    status === "ft" ||
    status === "aet" ||
    status === "pen" ||
    status === "final" ||
    (homeScore !== null && awayScore !== null && status !== "not started" && status !== "");

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
    return events.map(normalizeEvent);
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
