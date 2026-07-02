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
 *
 * This file ALSO carries the league-wide TRENDING reader (waiver momentum) at
 * the bottom — see loadSleeperTrending / buildTrending. Same provider, same
 * read-only public API, same legal gate.
 */

// Deep import from the registry module (not the package barrel) on purpose:
// this file is transitively pulled into the SleeperConnect client bundle via the
// SLEEPER_READONLY_NOTE constant, and the barrel re-exports nflverse-source.ts
// which imports node:zlib (unresolvable in a client bundle). source-registry.ts
// is pure with no imports, so this keeps the legal gate without dragging zlib in.
import { assertIngestible, attributionFor } from "@sports/data-ingestion/src/source-registry";
// Trending endpoint fetches + the SHARED player-map cache live in ../sleeper/source.
// That module is deliberately barrel-free (imports nothing from @sports/data-ingestion),
// so pulling it in keeps this file zlib-free for the client bundle. The Fantasy Market
// Signal reader (lib/sleeper/market-signal.ts) shares the same cache, so the multi-MB
// player map is fetched once across both readers instead of once per reader.
import {
  fetchSleeperPlayers,
  fetchSleeperTrendingEntries,
  sleeperTrendingUrl,
  type FetchLike,
} from "../sleeper/source";

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

// ─────────────────────────────────────────────────────────────────────────────
// Sleeper TRENDING — league-wide waiver MOMENTUM (ownership velocity).
//
// Beyond syncing one user's league, Sleeper's public API exposes which NFL
// players are being ADDED and DROPPED across all of its fantasy leagues over a
// lookback window. That add/drop velocity is a real ownership-momentum signal:
// it tells you what the broad fantasy market is DOING right now — descriptive
// market data, NOT advice. Read-only, injectable fetcher, assertIngestible
// before any fetch, honest discriminated source-error on failure.
//
// The trending endpoints return only { player_id, count }; we join against the
// player map to resolve names. An id missing from the map is SKIPPED, never
// invented. We filter to fantasy positions (QB/RB/WR/TE/K/DEF).
// ─────────────────────────────────────────────────────────────────────────────

/** Fantasy-relevant positions we keep; anything else (OL, etc.) is dropped. */
const FANTASY_POSITIONS: ReadonlySet<string> = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_LIMIT = 25;

export interface SleeperTrendingRaw {
  readonly player_id: string;
  readonly count: number;
}

export interface TrendingRow {
  readonly playerId: string;
  readonly name: string;
  readonly position: string;
  readonly team: string;
  readonly count: number;
}

export interface SleeperTrending {
  readonly status: "live" | "source-error";
  readonly generatedAt: string;
  readonly lookbackHours: number;
  readonly adds: readonly TrendingRow[];
  readonly drops: readonly TrendingRow[];
  readonly sourceUrl: string;
  readonly attribution: string | null;
  readonly note: string;
  readonly error: string | null;
}

function trendingName(p: SleeperPlayer): string | null {
  if (p.full_name && p.full_name.trim()) return p.full_name.trim();
  const joined = [p.first_name, p.last_name].filter((x) => x && x.trim()).join(" ").trim();
  return joined || null;
}

/**
 * Join raw trending ids+counts against the player map. Pure.
 * - Skips ids absent from the map (never fabricates a name).
 * - Skips entries with no resolvable name (defensive — never shows a bare id).
 * - Filters to fantasy positions (QB/RB/WR/TE/K/DEF).
 * Preserves the source ordering (Sleeper returns these descending by count).
 */
export function buildTrending(
  addsRaw: readonly SleeperTrendingRaw[],
  dropsRaw: readonly SleeperTrendingRaw[],
  playersMap: SleeperPlayersMap,
): { adds: TrendingRow[]; drops: TrendingRow[] } {
  const join = (raw: readonly SleeperTrendingRaw[]): TrendingRow[] => {
    const out: TrendingRow[] = [];
    for (const r of raw) {
      if (!r || typeof r.player_id !== "string") continue;
      const p = playersMap[r.player_id];
      if (!p) continue; // unknown id — skip, do not invent
      const position = (p.position ?? "").toUpperCase();
      if (!FANTASY_POSITIONS.has(position)) continue;
      const name = trendingName(p);
      if (!name) continue;
      const count = Number(r.count);
      out.push({
        playerId: r.player_id,
        name,
        position,
        team: (p.team ?? "").toUpperCase() || "FA",
        count: Number.isFinite(count) ? count : 0,
      });
    }
    return out;
  };
  return { adds: join(addsRaw), drops: join(dropsRaw) };
}

/**
 * Load league-wide waiver momentum from Sleeper. Discriminated result:
 * status "live" with rows, or "source-error" with an honest empty state.
 */
export async function loadSleeperTrending({
  fetcher = fetch,
  timeoutMs = 15000,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
  limit = DEFAULT_LIMIT,
}: {
  fetcher?: FetchLike;
  timeoutMs?: number;
  lookbackHours?: number;
  limit?: number;
} = {}): Promise<SleeperTrending> {
  assertIngestible("sleeper");
  const attribution = attributionFor("sleeper");
  const sourceUrl = sleeperTrendingUrl("add", lookbackHours, limit);

  try {
    // Trending lists + the SHARED (cached) player map, fetched concurrently.
    // fetchSleeperPlayers reuses the one in-process map cache the Market Signal
    // reader also uses, so the multi-MB payload isn't fetched twice.
    const [addsRaw, dropsRaw, playersMap] = await Promise.all([
      fetchSleeperTrendingEntries("add", { fetcher, lookbackHours, limit, timeoutMs }),
      fetchSleeperTrendingEntries("drop", { fetcher, lookbackHours, limit, timeoutMs }),
      fetchSleeperPlayers({ fetcher, timeoutMs }),
    ]);
    if (!Array.isArray(addsRaw) || !Array.isArray(dropsRaw)) {
      throw new Error("Sleeper trending response was not an array");
    }
    if (!playersMap || typeof playersMap !== "object") {
      throw new Error("Sleeper player map was not an object");
    }
    const { adds, drops } = buildTrending(addsRaw, dropsRaw, playersMap);
    return {
      status: "live",
      generatedAt: new Date().toISOString(),
      lookbackHours,
      adds,
      drops,
      sourceUrl,
      attribution,
      note: "League-wide waiver MOMENTUM from the Sleeper API: the add/drop velocity across fantasy leagues over the lookback window. This is what the market is DOING (ownership velocity), not advice. Names resolved from Sleeper's player map; unknown ids are skipped, never invented.",
      error: null,
    };
  } catch (error) {
    return {
      status: "source-error",
      generatedAt: new Date().toISOString(),
      lookbackHours,
      adds: [],
      drops: [],
      sourceUrl,
      attribution,
      note: "Sleeper trending could not load. The board shows an empty state instead of fabricated movement.",
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
