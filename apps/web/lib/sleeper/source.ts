/**
 * Sleeper data-access core — the SINGLE place that fetches Sleeper's public
 * add/drop trending lists and the multi-MB NFL player map, behind ONE shared
 * in-process player-map cache.
 *
 * Two product readers consume this, each keeping its own join + output shape:
 *  - lib/sleeper/market-signal.ts  → loadSleeperMarketSignal() (Fantasy Market
 *    Signal: rich rows w/ injury + experience, no position filter).
 *  - lib/integrations/sleeper.ts   → loadSleeperTrending() (Waiver Trends:
 *    position-filtered ownership momentum).
 * Before this module existed they each fetched the ~14MB player map separately,
 * so a page (or back-to-back render) that used both double-fetched it. They now
 * share `fetchSleeperPlayers`, so the heavy map is fetched (and cached) once.
 *
 * CLIENT-BUNDLE SAFE — this module imports NOTHING from @sports/data-ingestion
 * (not even the pure registry path). lib/integrations/sleeper.ts is transitively
 * pulled into the SleeperConnect client component (via SLEEPER_READONLY_NOTE),
 * so anything it imports must stay free of node:zlib (which the data-ingestion
 * barrel drags in via nflverse-source). The legal gate — assertIngestible("sleeper")
 * — stays in each reader, visible and auditable; this layer is fetch + cache only.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Raw Sleeper player record — superset of the fields either reader resolves. */
export interface SleeperPlayerRaw {
  readonly player_id?: string;
  readonly full_name?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly position?: string;
  readonly team?: string | null;
  readonly injury_status?: string | null;
  readonly years_exp?: number | null;
}
export type SleeperPlayersMap = Record<string, SleeperPlayerRaw>;

/** A single { player_id, count } row from a trending endpoint. */
export interface SleeperTrendingEntry {
  readonly player_id: string;
  readonly count: number;
}

const BASE = "https://api.sleeper.app";
export const SLEEPER_PLAYERS_URL = `${BASE}/v1/players/nfl`;

export function sleeperTrendingUrl(kind: "add" | "drop", lookbackHours: number, limit: number): string {
  return `${BASE}/v1/players/nfl/trending/${kind}?lookback_hours=${lookbackHours}&limit=${limit}`;
}

async function fetchJson<T>(url: string, fetcher: FetchLike, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // no-store: these payloads (esp. the multi-MB player map) must not enter
    // Next's data cache (>2MB items error); we manage our own in-process cache.
    const response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Sleeper fetch failed (${response.status}) for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// The multi-MB player map rarely changes; Sleeper asks callers not to pull it
// more than ~once a day. Cache it far longer than the trending lists and share
// the ONE cache across both readers so a request needing both fetches it once.
// Only the live `fetch` path caches — injected fetchers (tests) always re-fetch.
let playersCache: { readonly expiresAt: number; readonly value: SleeperPlayersMap } | null = null;

export function resetSleeperPlayersCacheForTests(): void {
  playersCache = null;
}

/** Fetch (and, on the live path, cache) Sleeper's NFL player map. */
export async function fetchSleeperPlayers({
  fetcher = fetch,
  timeoutMs = 15000,
  ttlMs = 6 * 60 * 60 * 1000,
}: {
  fetcher?: FetchLike;
  timeoutMs?: number;
  ttlMs?: number;
} = {}): Promise<SleeperPlayersMap> {
  const now = Date.now();
  const live = fetcher === fetch;
  if (ttlMs > 0 && live && playersCache && playersCache.expiresAt > now) {
    return playersCache.value;
  }
  const players = await fetchJson<SleeperPlayersMap>(SLEEPER_PLAYERS_URL, fetcher, timeoutMs);
  if (ttlMs > 0 && live) playersCache = { expiresAt: now + ttlMs, value: players };
  return players;
}

/** Fetch one trending list ({ player_id, count } rows, descending by count). */
export async function fetchSleeperTrendingEntries(
  kind: "add" | "drop",
  {
    fetcher = fetch,
    lookbackHours,
    limit,
    timeoutMs = 15000,
  }: { fetcher?: FetchLike; lookbackHours: number; limit: number; timeoutMs?: number },
): Promise<SleeperTrendingEntry[]> {
  return fetchJson<SleeperTrendingEntry[]>(sleeperTrendingUrl(kind, lookbackHours, limit), fetcher, timeoutMs);
}
