/**
 * Sleeper sync — SERVER-SIDE, governed, read-only league import.
 *
 * This is the ingestion layer behind /fantasy/connect. It runs server-side so
 * that (a) ingestion passes through the legal source registry
 * (`assertIngestible("sleeper")`), (b) the heavy ~5MB player map is fetched and
 * cached once per server (24h) instead of per browser session, and (c) failures
 * degrade to an honest source-error state instead of a blank screen.
 *
 * The pure transforms live in ./sleeper (unit-tested against fixtures); this
 * module adds the injectable-fetcher orchestration, the player cache, and league
 * STANDINGS (your whole league ranked), then returns normalized objects the API
 * routes serialize as-is. GET-only — we never write to a league. Live
 * recommendations on these real players still require a licensed projections
 * feed (founder-gated); canPublishPicks stays false.
 */

import { assertIngestible, getSource } from "@sports/data-ingestion";
import {
  SLEEPER_URLS,
  SLEEPER_READONLY_NOTE,
  normalizeUser,
  normalizeLeague,
  normalizeRoster,
  rosterForUser,
  type League,
  type Team,
  type SleeperLeague,
  type SleeperRoster,
  type SleeperPlayersMap,
  type SleeperUser,
} from "./sleeper";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type SleeperLeagueUser = {
  readonly user_id: string;
  readonly display_name?: string;
  readonly metadata?: { readonly team_name?: string } | null;
};

export interface SleeperLeaguesResult {
  readonly generatedAt: string;
  readonly status: "ok" | "not-found" | "source-error";
  readonly user: { readonly id: string; readonly username: string } | null;
  readonly season: string;
  readonly leagues: readonly League[];
  readonly attribution: string | null;
  readonly readOnlyNote: string;
  readonly error: string | null;
}

export interface StandingRow {
  readonly rosterId: number;
  readonly ownerId: string | null;
  readonly teamName: string;
  readonly record: string;
  readonly points: number;
  readonly rank: number;
  readonly isYou: boolean;
}

export interface SleeperLeagueResult {
  readonly generatedAt: string;
  readonly status: "ok" | "source-error";
  readonly league: League | null;
  readonly standings: readonly StandingRow[];
  readonly you: Team | null;
  readonly playerPool: number;
  readonly canPublishPicks: false;
  readonly note: string;
  readonly attribution: string | null;
  readonly readOnlyNote: string;
  readonly error: string | null;
}

const GATED_NOTE =
  "Roster imported read-only. Live lineup, waiver, and trade recommendations on these real players activate when the licensed projections source is wired behind the founder gate, never faked.";

// The ~5MB player map rarely changes; Sleeper asks callers not to pull it more
// than once a day. Cache it server-side and share it across all users/requests.
let playersCache: { readonly expiresAt: number; readonly value: SleeperPlayersMap } | null = null;

export function resetSleeperSyncCacheForTests(): void {
  playersCache = null;
}

async function fetchJson<T>(url: string, fetcher: FetchLike, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Sleeper fetch failed (${response.status}) for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function loadPlayers(
  fetcher: FetchLike,
  timeoutMs: number,
  playersTtlMs: number,
): Promise<SleeperPlayersMap> {
  const now = Date.now();
  const live = fetcher === fetch;
  if (playersTtlMs > 0 && live && playersCache && playersCache.expiresAt > now) {
    return playersCache.value;
  }
  const players = await fetchJson<SleeperPlayersMap>(SLEEPER_URLS.players(), fetcher, timeoutMs);
  if (playersTtlMs > 0 && live) playersCache = { expiresAt: now + playersTtlMs, value: players };
  return players;
}

function teamNameFor(ownerId: string | null, users: readonly SleeperLeagueUser[]): string {
  if (!ownerId) return "Ghost roster";
  const u = users.find((x) => x.user_id === ownerId);
  return u?.metadata?.team_name?.trim() || u?.display_name?.trim() || "Unnamed team";
}

/** Build a ranked standings table from raw rosters + league users. Pure. */
export function buildStandings(
  rosters: readonly SleeperRoster[],
  users: readonly SleeperLeagueUser[],
  players: SleeperPlayersMap,
  youUserId: string | null,
): StandingRow[] {
  const rows = rosters.map((raw) => {
    const t = normalizeRoster(raw, players);
    const wins = raw.settings?.wins ?? 0;
    return {
      rosterId: t.rosterId,
      ownerId: t.ownerId,
      teamName: teamNameFor(t.ownerId, users),
      record: t.record,
      points: t.points,
      _wins: wins,
      isYou: youUserId != null && t.ownerId === youUserId,
    };
  });
  rows.sort((a, b) => (b._wins - a._wins) || (b.points - a.points));
  return rows.map((r, i) => ({
    rosterId: r.rosterId,
    ownerId: r.ownerId,
    teamName: r.teamName,
    record: r.record,
    points: r.points,
    rank: i + 1,
    isYou: r.isYou,
  }));
}

/**
 * Step 1 — resolve a Sleeper username to its leagues for a season.
 * `user === null` from Sleeper (HTTP 200) means the handle doesn't exist.
 */
export async function loadSleeperLeagues({
  username,
  season,
  timeoutMs = 15000,
  fetcher = fetch,
}: {
  username: string;
  season: string;
  timeoutMs?: number;
  fetcher?: FetchLike;
}): Promise<SleeperLeaguesResult> {
  assertIngestible("sleeper");
  const attribution = getSource("sleeper")?.attributionText ?? null;
  const base = {
    generatedAt: new Date().toISOString(),
    season,
    attribution,
    readOnlyNote: SLEEPER_READONLY_NOTE,
  } as const;

  const handle = username.trim();
  if (!handle) {
    return { ...base, status: "not-found", user: null, leagues: [], error: "Enter a Sleeper username." };
  }

  try {
    const rawUser = await fetchJson<SleeperUser | null>(SLEEPER_URLS.user(handle), fetcher, timeoutMs);
    if (!rawUser || !rawUser.user_id) {
      return { ...base, status: "not-found", user: null, leagues: [], error: `No Sleeper user "${handle}".` };
    }
    const user = normalizeUser(rawUser);
    const rawLeagues = await fetchJson<SleeperLeague[]>(
      SLEEPER_URLS.leagues(user.id, season),
      fetcher,
      timeoutMs,
    );
    const leagues = (rawLeagues ?? []).map(normalizeLeague);
    return { ...base, status: "ok", user, leagues, error: null };
  } catch (error) {
    return {
      ...base,
      status: "source-error",
      user: null,
      leagues: [],
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}

/**
 * Step 2 — load one league: full standings plus (optionally) the requesting
 * user's resolved roster.
 */
export async function loadSleeperLeague({
  leagueId,
  userId = null,
  timeoutMs = 15000,
  playersTtlMs = 24 * 60 * 60 * 1000,
  fetcher = fetch,
}: {
  leagueId: string;
  userId?: string | null;
  timeoutMs?: number;
  playersTtlMs?: number;
  fetcher?: FetchLike;
}): Promise<SleeperLeagueResult> {
  assertIngestible("sleeper");
  const attribution = getSource("sleeper")?.attributionText ?? null;
  const base = {
    generatedAt: new Date().toISOString(),
    canPublishPicks: false as const,
    note: GATED_NOTE,
    attribution,
    readOnlyNote: SLEEPER_READONLY_NOTE,
  };

  try {
    const [rawLeague, rosters, users, players] = await Promise.all([
      fetchJson<SleeperLeague>(SLEEPER_URLS.league(leagueId), fetcher, timeoutMs),
      fetchJson<SleeperRoster[]>(SLEEPER_URLS.rosters(leagueId), fetcher, timeoutMs),
      fetchJson<SleeperLeagueUser[]>(SLEEPER_URLS.leagueUsers(leagueId), fetcher, timeoutMs),
      loadPlayers(fetcher, timeoutMs, playersTtlMs),
    ]);

    const league = normalizeLeague(rawLeague);
    const standings = buildStandings(rosters, users ?? [], players, userId);
    const rawYou = userId ? rosterForUser(rosters, userId) : null;
    const you: Team | null = rawYou ? normalizeRoster(rawYou, players) : null;

    return {
      ...base,
      status: "ok",
      league,
      standings,
      you,
      playerPool: Object.keys(players).length,
      error: null,
    };
  } catch (error) {
    return {
      ...base,
      status: "source-error",
      league: null,
      standings: [],
      you: null,
      playerPool: 0,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
