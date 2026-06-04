/**
 * Sleeper connector — READ-ONLY league sync.
 *
 * Sleeper's API is fully public: no OAuth, no keys, GET-only. This is the clean
 * first step from illustrative data to a real roster — and it never writes to a
 * league. We fetch the user, their leagues, and a chosen league's rosters, then
 * resolve player IDs to names against Sleeper's player map.
 *
 * The transforms here are PURE and unit-tested against fixtures; the fetch
 * wrappers are thin GET calls. Driving live RECOMMENDATIONS off real players
 * still needs a licensed projections source (founder-gated) — this layer proves
 * the sync and displays the roster.
 */

const BASE = "https://api.sleeper.app/v1";

export const SLEEPER_URLS = {
  user: (username: string) => `${BASE}/user/${encodeURIComponent(username)}`,
  leagues: (userId: string, season: string) => `${BASE}/user/${userId}/leagues/nfl/${season}`,
  league: (leagueId: string) => `${BASE}/league/${leagueId}`,
  rosters: (leagueId: string) => `${BASE}/league/${leagueId}/rosters`,
  leagueUsers: (leagueId: string) => `${BASE}/league/${leagueId}/users`,
  players: () => `${BASE}/players/nfl`,
} as const;

export const SLEEPER_READONLY_NOTE =
  "Read-only. Galaxy Sports Edge fetches your league with Sleeper's public API and never writes, posts, or changes anything in your league.";

// ─────────────── raw Sleeper shapes (subset we use) ───────────────

export type SleeperUser = { readonly user_id: string; readonly username?: string; readonly display_name?: string };
export type SleeperLeague = {
  readonly league_id: string;
  readonly name: string;
  readonly season: string;
  readonly total_rosters?: number;
  readonly roster_positions?: readonly string[];
  readonly status?: string;
};
export type SleeperRoster = {
  readonly roster_id: number;
  readonly owner_id: string | null;
  readonly players?: readonly string[] | null;
  readonly starters?: readonly string[] | null;
  readonly settings?: { readonly wins?: number; readonly losses?: number; readonly ties?: number; readonly fpts?: number; readonly fpts_decimal?: number };
};
export type SleeperPlayer = {
  readonly player_id?: string;
  readonly full_name?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly position?: string;
  readonly team?: string | null;
  readonly injury_status?: string | null;
};
export type SleeperPlayersMap = Record<string, SleeperPlayer>;

// ─────────────── normalized domain types ───────────────

export type League = { readonly id: string; readonly name: string; readonly season: string; readonly size: number; readonly rosterPositions: readonly string[]; readonly status: string };
export type ResolvedPlayer = { readonly id: string; readonly name: string; readonly pos: string; readonly team: string; readonly injury: string; readonly starter: boolean };
export type Team = {
  readonly rosterId: number;
  readonly ownerId: string | null;
  readonly record: string;
  readonly points: number;
  readonly starters: readonly ResolvedPlayer[];
  readonly bench: readonly ResolvedPlayer[];
  readonly all: readonly ResolvedPlayer[];
};

// ─────────────── pure normalizers ───────────────

export function normalizeUser(raw: SleeperUser): { id: string; username: string } {
  return { id: raw.user_id, username: raw.display_name ?? raw.username ?? raw.user_id };
}

export function normalizeLeague(raw: SleeperLeague): League {
  return {
    id: raw.league_id,
    name: raw.name,
    season: raw.season,
    size: raw.total_rosters ?? 0,
    rosterPositions: (raw.roster_positions ?? []).filter((p) => p !== "BN"),
    status: raw.status ?? "unknown",
  };
}

/** Resolve a Sleeper player_id to a player. Handles team DSTs (id = team code). */
export function resolvePlayer(id: string, players: SleeperPlayersMap, starter: boolean): ResolvedPlayer {
  const p = players[id];
  if (p) {
    const name = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(" ") ?? id;
    return { id, name: name || id, pos: p.position ?? "?", team: p.team ?? "FA", injury: p.injury_status ?? "", starter };
  }
  // DSTs are keyed by team abbreviation (e.g. "DEN") with no entry in the map
  if (/^[A-Z]{2,4}$/.test(id)) return { id, name: `${id} DST`, pos: "DEF", team: id, injury: "", starter };
  return { id, name: id, pos: "?", team: "FA", injury: "", starter };
}

function record(s: SleeperRoster["settings"]): { record: string; points: number } {
  const w = s?.wins ?? 0;
  const l = s?.losses ?? 0;
  const t = s?.ties ?? 0;
  const pts = (s?.fpts ?? 0) + (s?.fpts_decimal ?? 0) / 100;
  return { record: t ? `${w}-${l}-${t}` : `${w}-${l}`, points: Math.round(pts * 10) / 10 };
}

export function normalizeRoster(raw: SleeperRoster, players: SleeperPlayersMap): Team {
  const starterIds = new Set((raw.starters ?? []).filter((id) => id && id !== "0"));
  const allIds = raw.players ?? [...starterIds];
  const all = allIds.filter((id) => id && id !== "0").map((id) => resolvePlayer(id, players, starterIds.has(id)));
  const { record: rec, points } = record(raw.settings);
  return {
    rosterId: raw.roster_id,
    ownerId: raw.owner_id,
    record: rec,
    points,
    starters: all.filter((p) => p.starter),
    bench: all.filter((p) => !p.starter),
    all,
  };
}

/** Find the roster owned by a given user id. */
export function rosterForUser(rosters: readonly SleeperRoster[], userId: string): SleeperRoster | null {
  return rosters.find((r) => r.owner_id === userId) ?? null;
}

// ─────────────── thin read-only fetch wrappers (GET only) ───────────────

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Sleeper request failed (${res.status})`);
  return (await res.json()) as T;
}

export const sleeper = {
  getUser: (username: string) => getJson<SleeperUser>(SLEEPER_URLS.user(username)),
  getLeagues: (userId: string, season: string) => getJson<SleeperLeague[]>(SLEEPER_URLS.leagues(userId, season)),
  getRosters: (leagueId: string) => getJson<SleeperRoster[]>(SLEEPER_URLS.rosters(leagueId)),
  getPlayers: () => getJson<SleeperPlayersMap>(SLEEPER_URLS.players()),
} as const;
