import { assertIngestible, getSource } from "@sports/data-ingestion";

/**
 * Sleeper market signal — live fantasy add/drop activity over a rolling window.
 * This is the first non-nflverse, non-CSV ingestion, proving the legal source
 * registry generalizes across providers: it ingests through
 * assertIngestible("sleeper") and carries Sleeper's required attribution.
 *
 * What it is: real crowd behavior (how many Sleeper leagues added/dropped a
 * player in the last N hours). It is market sentiment, NOT our projection or
 * betting pick — canPublishPicks stays false. Per Sleeper's guidance the large
 * player map is cached hard and we never poll aggressively.
 */

export interface SleeperTrendingPlayer {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly injuryStatus: string | null;
  readonly yearsExp: number | null;
  readonly count: number;
}

export interface SleeperMarketSignal {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly lookbackHours: number;
  readonly playerPool: number;
  readonly adds: readonly SleeperTrendingPlayer[];
  readonly drops: readonly SleeperTrendingPlayer[];
  readonly canPublishPicks: false;
  readonly note: string;
  readonly attribution: string | null;
  readonly sourceUrls: Record<"trendingAdd" | "trendingDrop" | "players", string>;
  readonly error: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface TrendingEntry {
  readonly player_id: string;
  readonly count: number;
}

interface SleeperPlayer {
  readonly first_name?: string;
  readonly last_name?: string;
  readonly full_name?: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly injury_status?: string | null;
  readonly years_exp?: number | null;
}

const BASE = "https://api.sleeper.app";
const PLAYERS_URL = `${BASE}/v1/players/nfl`;

function trendingUrl(kind: "add" | "drop", lookbackHours: number, limit: number): string {
  return `${BASE}/v1/players/nfl/trending/${kind}?lookback_hours=${lookbackHours}&limit=${limit}`;
}

let cache: { readonly expiresAt: number; readonly value: SleeperMarketSignal } | null = null;
// The 14MB player map rarely changes; cache it far longer than the trending lists.
let playersCache: { readonly expiresAt: number; readonly value: Record<string, SleeperPlayer> } | null = null;

async function fetchJson<T>(url: string, fetcher: FetchLike, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // no-store: these payloads (esp. the 14MB player map) must not enter Next's
    // data cache; we manage our own in-process cache below.
    const response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Sleeper fetch failed (${response.status}) for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function playerName(player: SleeperPlayer): string {
  return player.full_name || `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() || "UNKNOWN";
}

function buildRows(
  entries: readonly TrendingEntry[],
  players: Record<string, SleeperPlayer>,
): SleeperTrendingPlayer[] {
  return entries
    .map((entry): SleeperTrendingPlayer | null => {
      const player = players[entry.player_id];
      if (!player) return null;
      const yearsExp = typeof player.years_exp === "number" ? player.years_exp : null;
      return {
        playerId: entry.player_id,
        name: playerName(player),
        team: player.team ?? "FA",
        position: player.position ?? "",
        injuryStatus: player.injury_status ?? null,
        yearsExp,
        count: entry.count,
      };
    })
    .filter((row): row is SleeperTrendingPlayer => row !== null)
    .sort((a, b) => b.count - a.count);
}

export function resetSleeperMarketSignalCacheForTests(): void {
  cache = null;
  playersCache = null;
}

export async function loadSleeperMarketSignal({
  lookbackHours = 24,
  limit = 25,
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  playersTtlMs = 6 * 60 * 60 * 1000,
  fetcher = fetch,
}: {
  lookbackHours?: number;
  limit?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  playersTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<SleeperMarketSignal> {
  // Governance: Sleeper must be cleared in the legal registry before any fetch.
  assertIngestible("sleeper");
  const attribution = getSource("sleeper")?.attributionText ?? null;

  const now = Date.now();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const addUrl = trendingUrl("add", lookbackHours, limit);
  const dropUrl = trendingUrl("drop", lookbackHours, limit);

  try {
    const [addEntries, dropEntries] = await Promise.all([
      fetchJson<TrendingEntry[]>(addUrl, fetcher, timeoutMs),
      fetchJson<TrendingEntry[]>(dropUrl, fetcher, timeoutMs),
    ]);

    let players: Record<string, SleeperPlayer>;
    if (playersTtlMs > 0 && live && playersCache && playersCache.expiresAt > now) {
      players = playersCache.value;
    } else {
      players = await fetchJson<Record<string, SleeperPlayer>>(PLAYERS_URL, fetcher, timeoutMs);
      if (playersTtlMs > 0 && live) playersCache = { expiresAt: now + playersTtlMs, value: players };
    }

    const value: SleeperMarketSignal = {
      generatedAt: new Date().toISOString(),
      status: "live",
      lookbackHours,
      playerPool: Object.keys(players).length,
      adds: buildRows(addEntries, players).slice(0, limit),
      drops: buildRows(dropEntries, players).slice(0, limit),
      canPublishPicks: false,
      note: `Live fantasy add/drop activity across Sleeper leagues over the last ${lookbackHours} hours. This is crowd market sentiment, not our projection or a betting pick.`,
      attribution,
      sourceUrls: { trendingAdd: addUrl, trendingDrop: dropUrl, players: PLAYERS_URL },
      error: null,
    };
    if (cacheTtlMs > 0 && live) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      lookbackHours,
      playerPool: 0,
      adds: [],
      drops: [],
      canPublishPicks: false,
      note: "The Sleeper market signal could not load. The product shows an empty state instead of fabricated activity.",
      attribution,
      sourceUrls: { trendingAdd: addUrl, trendingDrop: dropUrl, players: PLAYERS_URL },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
