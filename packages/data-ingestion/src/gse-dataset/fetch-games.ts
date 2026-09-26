/**
 * Stage A / step 1 -- download the nflverse `schedules` game master.
 *
 * The game master is the spine every later stage joins against: it is the only
 * source here that carries an authoritative `game_id` plus both teams, the
 * kickoff date, the season, and the round. Source asset:
 *
 *   https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv
 *
 * nflverse republishes this file on every schedule change and has historically
 * RENAMED or RESHAPED release assets, where a renamed asset 404s or a reshaped
 * one loses columns SILENTLY (see `scripts/check-nflverse-currency.ts`, which
 * exists for exactly that failure class). This module therefore records the
 * response status, byte count, and sha256 of the exact bytes it stored, so a
 * later reader can prove which revision of the asset a downstream artifact was
 * built from instead of trusting a filename.
 *
 * Bytes land in a cache dir and are never synthesized: if the fetch fails this
 * module throws, and no partial or synthetic dataset is produced downstream.
 *
 * The fetch goes through `noStoreFetch` because CLAUDE.md rule #5 forbids
 * reading live upstream data through a cache that can serve stale bytes
 * labeled as current.
 *
 * CLI: `npx tsx packages/data-ingestion/src/gse-dataset/fetch-games.ts [--refresh]`
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { noStoreFetch } from "../no-store-fetch.js";

/** Canonical nflverse `schedules` release asset. */
export const GSE_GAMES_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";

/**
 * Columns the normalizer reads. Projected at parse time so an upstream schema
 * change that ADDS columns costs nothing, and a change that REMOVES one is
 * visible as a hard failure in `normalize.ts` rather than as silent nulls.
 */
export const GSE_GAMES_COLUMNS = [
  "game_id",
  "season",
  "game_type",
  "week",
  "gameday",
  "gametime",
  "away_team",
  "away_score",
  "home_team",
  "home_score",
  "location",
  "total",
  "overtime",
  "away_rest",
  "home_rest",
  "away_moneyline",
  "home_moneyline",
  "spread_line",
  "total_line",
  "div_game",
  "roof",
  "surface",
  "referee",
] as const;

/**
 * `__dirname` (CommonJS) rather than `import.meta.url` -- this package's
 * tsconfig targets `module: CommonJS`, where `import.meta` is not allowed.
 */
export const GSE_MODULE_DIR = __dirname;
export const GSE_REPO_ROOT = resolve(GSE_MODULE_DIR, "..", "..", "..", "..");
export const GSE_DATA_DIR = join(GSE_REPO_ROOT, "data", "gse-dataset");
/** `.cache/` is gitignored repo-wide, so raw upstream bytes never land in a commit. */
export const GSE_CACHE_DIR = join(GSE_DATA_DIR, ".cache");
export const GSE_GAMES_CACHE_PATH = join(GSE_CACHE_DIR, "games.csv");
const GSE_GAMES_META_PATH = join(GSE_CACHE_DIR, "games.meta.json");

/** Outcome of {@link fetchGamesCsv}, including the provenance of the stored bytes. */
export type GamesFetch = {
  readonly url: string;
  readonly csvPath: string;
  /** Byte length of the stored CSV exactly as downloaded. */
  readonly bytes: number;
  /** sha256 of the stored CSV, lowercase hex. */
  readonly sha256: string;
  /**
   * ISO instant the stored bytes were downloaded from the network. On a cache
   * hit this is the ORIGINAL download time (from the sidecar), never "now" --
   * a cache hit must not silently restamp the data as fresh.
   */
  readonly fetchedAt: string;
  /** True when the bytes were served from the local cache, not the network. */
  readonly fromCache: boolean;
  /** HTTP status of the network call, or null on a pure cache hit. */
  readonly httpStatus: number | null;
};

export type FetchGamesOptions = {
  readonly cacheDir?: string;
  /** Re-download even when a cache entry exists. */
  readonly refresh?: boolean;
  /** Injectable for tests; defaults to the no-store global fetch. */
  readonly fetchImpl?: typeof globalThis.fetch;
  /** Injectable clock, so provenance is testable. */
  readonly now?: () => Date;
};

/** Lowercase hex sha256 of a buffer or string. */
export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

type CacheSidecar = {
  readonly url: string;
  readonly fetchedAt: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly httpStatus: number;
};

async function readCache(cacheDir: string): Promise<GamesFetch | null> {
  const csvPath = join(cacheDir, "games.csv");
  const metaPath = join(cacheDir, "games.meta.json");
  let bytes: Buffer;
  try {
    bytes = await readFile(csvPath);
  } catch {
    return null;
  }
  // The sidecar carries the original download time; without it we cannot
  // honestly report provenance for these bytes, so treat it as a miss.
  let meta: CacheSidecar;
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8")) as CacheSidecar;
  } catch {
    return null;
  }
  const digest = sha256Hex(bytes);
  // An upstream edit invalidates the cached sidecar's hash: re-fetch rather
  // than report a sha256 that does not describe the bytes on disk.
  if (meta.sha256 !== digest) return null;
  return {
    url: meta.url,
    csvPath,
    bytes: bytes.byteLength,
    sha256: digest,
    fetchedAt: meta.fetchedAt,
    fromCache: true,
    httpStatus: null,
  };
}

/**
 * Download the game master into `cacheDir` (default `data/gse-dataset/.cache`)
 * and return its provenance. Serves a verified cache hit unless `refresh` is
 * set. Throws on any non-OK status -- callers get an error, never a partial or
 * invented dataset.
 */
export async function fetchGamesCsv(options: FetchGamesOptions = {}): Promise<GamesFetch> {
  const cacheDir = options.cacheDir ?? GSE_CACHE_DIR;
  const now = options.now ?? ((): Date => new Date());
  const doFetch = options.fetchImpl ?? noStoreFetch;

  if (options.refresh !== true) {
    const cached = await readCache(cacheDir);
    if (cached !== null) return cached;
  }

  await mkdir(cacheDir, { recursive: true });
  const res = await doFetch(GSE_GAMES_URL);
  if (!res.ok) {
    throw new Error(
      `GSE Stage A fetch failed: HTTP ${res.status} ${res.statusText} for ${GSE_GAMES_URL}`,
    );
  }
  const body = Buffer.from(await res.arrayBuffer());
  if (body.byteLength === 0) {
    throw new Error(`GSE Stage A fetch failed: empty body from ${GSE_GAMES_URL}`);
  }

  const csvPath = join(cacheDir, "games.csv");
  await writeFile(csvPath, body);

  const meta: CacheSidecar = {
    url: GSE_GAMES_URL,
    fetchedAt: now().toISOString(),
    bytes: body.byteLength,
    sha256: sha256Hex(body),
    httpStatus: res.status,
  };
  await writeFile(join(cacheDir, "games.meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  return {
    url: GSE_GAMES_URL,
    csvPath,
    bytes: body.byteLength,
    sha256: meta.sha256,
    fetchedAt: meta.fetchedAt,
    fromCache: false,
    httpStatus: res.status,
  };
}

/** Human-readable run log lines for a completed fetch. */
export function describeFetch(fetch: GamesFetch): readonly string[] {
  return [
    `source        ${fetch.url}`,
    `cache path    ${fetch.csvPath}`,
    `http status   ${fetch.httpStatus === null ? "n/a (cache hit)" : String(fetch.httpStatus)}`,
    `bytes         ${fetch.bytes}`,
    `sha256        ${fetch.sha256}`,
    `fetched at    ${fetch.fetchedAt}`,
    `from cache    ${fetch.fromCache}`,
  ];
}

async function main(): Promise<void> {
  const refresh = process.argv.slice(2).includes("--refresh");
  const fetch = await fetchGamesCsv({ refresh });
  for (const line of describeFetch(fetch)) console.log(line);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
