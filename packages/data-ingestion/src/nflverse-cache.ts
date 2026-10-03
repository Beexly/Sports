/**
 * nflverse shared single-flight artifact cache.
 *
 * PRODUCTION INCIDENT (OP-002, confirmed live): `/nflverse` intermittently
 * 500s with "instance was killed because it ran out of available memory".
 * Root cause: `nflverseUrl("player_stats_week", season)` ignores `season`
 * (the combined `player_stats.csv.gz` asset is not seasonal), so the three
 * `/nflverse` loaders (`usage-pulse`, `qb-age-rb-trend`, `birthday-usage-trend`)
 * each independently downloaded, gunzipped, and fully parsed the SAME
 * full-history nflverse asset concurrently inside one `Promise.all` on a cold
 * serverless instance — three retained copies of the same multi-decade table
 * at once.
 *
 * This module is the single canonical owner of "fetch one nflverse dataset
 * asset, parsed, for a given (key, season, variant)". It is:
 *
 *  - Single-flight: concurrent requests for the same asset join ONE fetch.
 *  - TTL-cached: a successful fetch is reused for its dataset's TTL.
 *  - Column-projected: `NFLVERSE_PROJECTIONS` is owned HERE, not passed by
 *    callers — this is what makes coalescing structurally unconditional (no
 *    risk of two callers requesting the same dataset with different column
 *    lists and silently forking the cache).
 *  - Size-bounded: raw body and post-gunzip text are both capped, failing
 *    loudly (never partially caching) instead of letting a runaway asset OOM
 *    the instance.
 *  - Failover-aware: every fetch (including per-season `player_stats_week`
 *    backfill-merge fetches) goes through `fetchWithFailover` + `no-store`,
 *    fixing the previously-missing `no-store` on the pulse loader (the same
 *    defect class as the frozen-feed incident documented in
 *    `no-store-fetch.ts`) and extending mirror failover to merge fetches that
 *    never had it.
 *
 * `fetchNflverse` / `fetchNflverseText` in `nflverse-source.ts` remain the
 * uncached primitives used by `apps/web/lib/ingestion/*` jobs — unchanged,
 * untouched call sites, byte-identical behavior. This module is additive.
 */

import { fetchWithFailover, withMirrors, type FetchLike } from "./fetch-failover.js";
import {
  decodeDatasetText,
  mergePlayerStatsWeekCurrency,
  nflverseUrl,
  parseCsv,
  type CsvTable,
  type NflverseDatasetKey,
  type ParseCsvOptions,
} from "./nflverse-source.js";

export interface NflverseTableRequest {
  readonly key: NflverseDatasetKey;
  /** 0 for non-seasonal masters; the target season for seasonal assets and for
   *  the player_stats_week backfill merge. */
  readonly season: number;
  readonly variant?: string;
  /** Injectable for tests. Omit (or pass globalThis.fetch) in production. */
  readonly fetcher?: FetchLike;
  /** Per-attempt timeout passed to fetchWithFailover. Default 15000. */
  readonly timeoutMs?: number;
}

export interface NflverseTableResult {
  /** Parsed records, projected per NFLVERSE_PROJECTIONS when the key is registered. */
  readonly table: CsvTable;
  /** Canonical primary URL (nflverseUrl) — what callers publish as sourceUrls. */
  readonly url: string;
  /** The host that actually served (primary or mirror) — failover-aware, for canaries. */
  readonly servedFrom: string;
  /** ISO timestamp of the underlying fetch completion (not of cache read). */
  readonly fetchedAt: string;
  readonly fromCache: boolean;
}

/** Per-dataset column projection allowlists — THE single place to add a column. */
export const NFLVERSE_PROJECTIONS: Partial<Record<NflverseDatasetKey, readonly string[]>> = {
  player_stats_week: [
    "player_id",
    "player_name",
    "player_display_name",
    "position",
    "recent_team",
    "opponent_team",
    "season",
    "week",
    "season_type",
    "attempts",
    "carries",
    "targets",
    "receptions",
    "rushing_yards",
    "receiving_yards",
    "receiving_air_yards",
    "target_share",
    "air_yards_share",
    "wopr",
    "fantasy_points_ppr",
    "headshot_url",
  ],
  players: ["gsis_id", "birth_date"],
  schedules: [
    "game_type",
    "season",
    "week",
    "gameday",
    "away_team",
    "home_team",
    "away_qb_id",
    "home_qb_id",
    "away_qb_name",
    "home_qb_name",
  ],
  rosters: ["gsis_id", "full_name", "birth_date", "headshot_url"],
};

/** Per-dataset TTLs (ms). */
export const NFLVERSE_TABLE_TTLS: Partial<Record<NflverseDatasetKey, number>> = {
  player_stats_week: 30 * 60_000,
  rosters: 30 * 60_000,
  players: 6 * 3_600_000,
  schedules: 6 * 3_600_000,
};
const DEFAULT_TABLE_TTL_MS = 30 * 60_000;

export const NFLVERSE_MAX_RAW_BYTES = 150 * 1024 * 1024; // downloaded body cap
export const NFLVERSE_MAX_TEXT_BYTES = 400 * 1024 * 1024; // post-gunzip text cap

export class NflverseArtifactTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NflverseArtifactTooLargeError";
  }
}

interface StoredEntry {
  readonly table: CsvTable;
  readonly url: string;
  readonly servedFrom: string;
  readonly fetchedAt: string;
  readonly expiresAt: number;
}

const store = new Map<string, StoredEntry>();
const inFlight = new Map<string, Promise<StoredEntry>>();

let hits = 0;
let coalesced = 0;
let misses = 0;
let failures = 0;

/**
 * Read the response body with a raw-byte cap check BEFORE decoding: rejects
 * on a declared `Content-Length` over the cap without reading the body at
 * all, and again on the actual buffered length (a source that lies about, or
 * omits, Content-Length).
 */
async function readCappedBuffer(response: Response, sourceUrl: string): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > NFLVERSE_MAX_RAW_BYTES) {
    throw new NflverseArtifactTooLargeError(
      `nflverse artifact too large: ${sourceUrl} declared Content-Length ${declaredLength} bytes (raw cap ${NFLVERSE_MAX_RAW_BYTES})`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > NFLVERSE_MAX_RAW_BYTES) {
    throw new NflverseArtifactTooLargeError(
      `nflverse artifact too large: ${sourceUrl} observed ${buffer.length} raw bytes (raw cap ${NFLVERSE_MAX_RAW_BYTES})`,
    );
  }
  return buffer;
}

/**
 * Fetch one URL (with mirror failover, no-store, per-attempt timeout), cap
 * the raw body, decode (transparent gunzip via the shared `decodeDatasetText`
 * magic-byte detector), and cap the decoded text. Shared by both the combined
 * asset fetch and every per-season `player_stats_week` backfill-merge fetch.
 */
async function fetchAndDecodeCapped(
  url: string,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<{ readonly text: string; readonly sourceUrl: string }> {
  const { response, sourceUrl } = await fetchWithFailover(withMirrors(url), fetcher, {
    timeoutMs,
    init: { cache: "no-store" },
  });
  const buffer = await readCappedBuffer(response, sourceUrl);
  // Rebuild a Response from the already-buffered bytes so decoding reuses the
  // single canonical gzip-detection implementation instead of duplicating it.
  const text = await decodeDatasetText(new Response(new Uint8Array(buffer)));
  const textBytes = Buffer.byteLength(text, "utf8");
  if (textBytes > NFLVERSE_MAX_TEXT_BYTES) {
    throw new NflverseArtifactTooLargeError(
      `nflverse artifact too large after decode: ${sourceUrl} produced ${textBytes} text bytes (text cap ${NFLVERSE_MAX_TEXT_BYTES})`,
    );
  }
  return { text, sourceUrl };
}

async function fetchPipeline(req: NflverseTableRequest): Promise<StoredEntry> {
  const { key, season, variant, timeoutMs = 15000 } = req;
  const fetcher: FetchLike = req.fetcher ?? fetch;
  const url = nflverseUrl(key, season, variant);
  const projection = NFLVERSE_PROJECTIONS[key];
  const parseOptions: ParseCsvOptions = projection ? { columns: projection } : {};

  const { text, sourceUrl } = await fetchAndDecodeCapped(url, fetcher, timeoutMs);
  let table = parseCsv(text, parseOptions);

  if (key === "player_stats_week" && Number.isFinite(season)) {
    table = await mergePlayerStatsWeekCurrency(
      table,
      season,
      async (perSeasonUrl) => (await fetchAndDecodeCapped(perSeasonUrl, fetcher, timeoutMs)).text,
      parseOptions,
    );
  }

  return {
    table,
    url,
    servedFrom: sourceUrl,
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + (NFLVERSE_TABLE_TTLS[key] ?? DEFAULT_TABLE_TTL_MS),
  };
}

function cacheKey(req: NflverseTableRequest): string {
  const url = nflverseUrl(req.key, req.season, req.variant);
  return `${url}|${req.key === "player_stats_week" ? String(req.season) : ""}`;
}

/**
 * The module-level maps are used iff the caller did not inject a custom
 * fetcher (or explicitly passed the current `globalThis.fetch`). Explicitly
 * injected fetchers bypass the caches entirely — this keeps fixture tests
 * hermetic while `vi.stubGlobal("fetch", …)` still engages coalescing.
 */
function isCacheEligible(req: NflverseTableRequest): boolean {
  return req.fetcher === undefined || req.fetcher === globalThis.fetch;
}

function toResult(entry: StoredEntry, fromCache: boolean): NflverseTableResult {
  return {
    table: entry.table,
    url: entry.url,
    servedFrom: entry.servedFrom,
    fetchedAt: entry.fetchedAt,
    fromCache,
  };
}

export async function fetchNflverseTableCached(req: NflverseTableRequest): Promise<NflverseTableResult> {
  if (!isCacheEligible(req)) {
    const entry = await fetchPipeline(req);
    return toResult(entry, false);
  }

  const key = cacheKey(req);
  const now = Date.now();

  const stored = store.get(key);
  if (stored && stored.expiresAt > now) {
    hits += 1;
    return toResult(stored, true);
  }

  const existing = inFlight.get(key);
  if (existing) {
    coalesced += 1;
    const entry = await existing;
    return toResult(entry, false);
  }

  misses += 1;
  const promise = fetchPipeline(req)
    .then((entry) => {
      store.set(key, entry);
      inFlight.delete(key);
      return entry;
    })
    .catch((error: unknown) => {
      inFlight.delete(key);
      failures += 1;
      throw error;
    });
  inFlight.set(key, promise);

  const entry = await promise;
  return toResult(entry, false);
}

export function resetNflverseTableCacheForTests(): void {
  store.clear();
  inFlight.clear();
  hits = 0;
  coalesced = 0;
  misses = 0;
  failures = 0;
}

/** Instrumentation for tests and (later) Sentinel canaries. Counters are per-runtime. */
export function nflverseTableCacheStats(): {
  readonly entries: number;
  readonly inFlight: number;
  readonly hits: number;
  readonly coalesced: number;
  readonly misses: number;
  readonly failures: number;
} {
  return {
    entries: store.size,
    inFlight: inFlight.size,
    hits,
    coalesced,
    misses,
    failures,
  };
}
