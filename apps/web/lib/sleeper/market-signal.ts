import { assertIngestible, getSource } from "@sports/data-ingestion";
import {
  SLEEPER_PLAYERS_URL,
  fetchSleeperPlayers,
  fetchSleeperTrendingEntries,
  resetSleeperPlayersCacheForTests,
  sleeperTrendingUrl,
  type FetchLike,
  type SleeperPlayerRaw,
  type SleeperPlayersMap,
  type SleeperTrendingEntry,
} from "./source";

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
 *
 * The endpoint fetches + the shared player-map cache live in ./source, so the
 * Waiver Trends reader (lib/integrations/sleeper.ts) and this one fetch the
 * multi-MB player map once between them. This module keeps its own rich row
 * shape and its full-signal cache; the join below is intentionally unfiltered
 * (every position) and carries injury + experience the momentum board omits.
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

// Full-signal in-process cache (the player map is cached separately + shared by
// ./source). Only the live `fetch` path writes it; injected fetchers re-compute.
let cache: { readonly expiresAt: number; readonly value: SleeperMarketSignal } | null = null;

function playerName(player: SleeperPlayerRaw): string {
  return player.full_name || `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() || "UNKNOWN";
}

function buildRows(
  entries: readonly SleeperTrendingEntry[],
  players: SleeperPlayersMap,
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
  resetSleeperPlayersCacheForTests();
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

  const addUrl = sleeperTrendingUrl("add", lookbackHours, limit);
  const dropUrl = sleeperTrendingUrl("drop", lookbackHours, limit);

  try {
    const [addEntries, dropEntries] = await Promise.all([
      fetchSleeperTrendingEntries("add", { fetcher, lookbackHours, limit, timeoutMs }),
      fetchSleeperTrendingEntries("drop", { fetcher, lookbackHours, limit, timeoutMs }),
    ]);

    // Shared, cached player-map fetch (one map across both Sleeper readers).
    const players = await fetchSleeperPlayers({ fetcher, timeoutMs, ttlMs: playersTtlMs });

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
      sourceUrls: { trendingAdd: addUrl, trendingDrop: dropUrl, players: SLEEPER_PLAYERS_URL },
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
      sourceUrls: { trendingAdd: addUrl, trendingDrop: dropUrl, players: SLEEPER_PLAYERS_URL },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
