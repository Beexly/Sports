/**
 * Cycle 8. Pull the five nflverse grains for 2024 and 2025.
 * Join keys that are blank are refused. Counts are measured from the rows
 * that were actually written.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { once } from "node:events";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";

import {
  isOk,
  loadContracts,
  loadParticipation,
  loadRosters,
  loadRostersWeekly,
  loadSnapCounts,
} from "@nflverse/nflreadts";

import { noStoreFetch } from "../no-store-fetch.js";
import {
  projectContract,
  projectParticipation,
  projectRoster,
  projectSnap,
  INGEST_SEASONS,
  type Decision,
} from "./rows.js";
import { loadPlayerCrosswalk } from "./player-crosswalk.js";

/**
 * One source of truth for the season list, imported from rows.ts. Keeping a
 * second copy here is how a season ends up loaded and then refused by the
 * projection, or worse, silently dropped.
 *
 * Every season-keyed grain is processed ONE SEASON AT A TIME and written to its
 * own file. The previous revision accumulated every season into a single array
 * and then built a second full copy in `collect()`, which is what OOMs the V8
 * heap once participation crosses a few seasons: each row carries a
 * `players_on_field` array of 22 ids. Peak memory is now one season, not eight.
 *
 * Per-season files also keep every artifact under the 90 MB ceiling, so a
 * multi-season grain stays committable instead of becoming a single file GitHub
 * will refuse.
 */
const SEASONS = INGEST_SEASONS;
const ROOT = resolve(__dirname, "..", "..", "..", "..");
const DATA_DIR = join(ROOT, "data", "gse-dataset");
const CACHE_DIR = join(DATA_DIR, ".cache", "nflverse-cycle8");

export interface DatasetManifest {
  readonly name: string;
  readonly loader: string;
  readonly path: string;
  readonly read: number;
  readonly kept: number;
  /** Lines counted in the file that was hashed. Must equal `kept`. */
  readonly rows: number;
  readonly sha256: string;
  readonly bytes: number;
  readonly refused: Readonly<Record<string, number>>;
  /** True when every counted refusal bucket is zero. That is a finding, not a pass. */
  readonly zero_refusals: boolean;
  readonly note: string;
}

interface FileSeal {
  readonly sha256: string;
  readonly bytes: number;
  readonly rows: number;
}

interface FourthExtract {
  readonly read: number;
  readonly kept: number;
  readonly refused: Record<string, number>;
  /** Seasons the nfl4th release does not publish. Recorded, never invented. */
  readonly missingSeasons: number[];
}

interface PbpProbe {
  readonly url: string;
  readonly present: { readonly go_wp: boolean; readonly punt_wp: boolean; readonly fg_wp: boolean };
  readonly error?: string;
}

function unwrap<T>(label: string, result: { ok: true; value: T } | { ok: false; error: Error }): T {
  if (isOk(result)) return result.value;
  throw new Error(`${label}: ${result.error.message}`);
}

function requireRows(label: string, rows: readonly unknown[]): void {
  if (rows.length === 0) throw new Error(`${label} returned 0 rows`);
}

/** Windows rename does not replace an existing file. Unlink, then rename. */
async function replaceFile(tmp: string, path: string): Promise<void> {
  try {
    await rename(tmp, path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "EPERM") throw error;
    await rm(path, { force: true });
    await rename(tmp, path);
  }
}

async function writeJsonl(path: string, rows: readonly object[]): Promise<void> {
  if (rows.length === 0) throw new Error(`refusing to write 0 rows to ${path}`);
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  const stream = createWriteStream(tmp, { encoding: "utf8" });
  try {
    for (const row of rows) {
      if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, "drain");
    }
    stream.end();
    await once(stream, "finish");
    await replaceFile(tmp, path);
  } catch (error) {
    stream.destroy();
    await rm(tmp, { force: true });
    throw error;
  }
}

/** Hash and count the file that is already on disk. Newlines are counted as bytes. */
async function sealFile(path: string): Promise<FileSeal> {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  let bytes = 0;
  let rows = 0;
  let lastByte = -1;
  for await (const chunk of stream) {
    const buf = chunk as Buffer;
    bytes += buf.length;
    hash.update(buf);
    for (let i = 0; i < buf.length; i += 1) {
      if (buf[i] === 10) rows += 1;
    }
    if (buf.length > 0) lastByte = buf[buf.length - 1] ?? lastByte;
  }
  if (bytes > 0 && lastByte !== 10) rows += 1;
  return { sha256: hash.digest("hex"), bytes, rows };
}

function refusalTotal(refused: Readonly<Record<string, number>>): number {
  return Object.values(refused).reduce((sum, count) => sum + count, 0);
}

function reportRefusals(name: string, refused: Readonly<Record<string, number>>): boolean {
  const zero = refusalTotal(refused) === 0;
  if (zero) process.stderr.write(`${name}: zero refusals — investigate\n`);
  return zero;
}

async function finishDataset(
  entry: Omit<DatasetManifest, "sha256" | "bytes" | "rows" | "zero_refusals">,
  path: string,
): Promise<DatasetManifest> {
  const seal = await sealFile(path);
  if (seal.rows !== entry.kept) {
    throw new Error(`${entry.name}: disk rows ${seal.rows} != kept ${entry.kept}`);
  }
  return {
    ...entry,
    rows: seal.rows,
    sha256: seal.sha256,
    bytes: seal.bytes,
    zero_refusals: reportRefusals(entry.name, entry.refused),
  };
}

function collect<T>(raws: readonly Record<string, unknown>[], project: (raw: Record<string, unknown>) => Decision<T>): {
  kept: T[];
  refused: Record<string, number>;
} {
  const kept: T[] = [];
  const refused: Record<string, number> = {};
  for (const raw of raws) {
    const decision = project(raw);
    if (decision.ok) kept.push(decision.row);
    else refused[decision.reason] = (refused[decision.reason] ?? 0) + 1;
  }
  return { kept, refused };
}

const ABSENT_PBP: PbpProbe["present"] = { go_wp: false, punt_wp: false, fg_wp: false };

/**
 * Diagnostic only. noStoreFetch is global fetch with cache no-store, so
 * response.body is a web ReadableStream. A failed probe returns absent
 * columns and an error string. It does not reject the ingest.
 */
async function pbpFourthColumns(season: number): Promise<PbpProbe> {
  const url = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`;
  try {
    const response = await noStoreFetch(url);
    if (!response.ok || response.body === null) {
      return { url, present: ABSENT_PBP, error: `pbp header ${season} status ${response.status}` };
    }
    const gunzip = createGunzip();
    const source = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
    source.pipe(gunzip);
    let header = "";
    for await (const chunk of gunzip) {
      header += chunk.toString("utf8");
      const newline = header.indexOf("\n");
      if (newline !== -1) {
        header = header.slice(0, newline);
        break;
      }
    }
    source.destroy();
    gunzip.destroy();
    const columns = new Set(header.split(","));
    return {
      url,
      present: {
        go_wp: columns.has("go_wp"),
        punt_wp: columns.has("punt_wp"),
        fg_wp: columns.has("fg_wp"),
      },
    };
  } catch (error) {
    return {
      url,
      present: ABSENT_PBP,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseFourthExtract(stdout: string): FourthExtract {
  let parsed: { read?: unknown; kept?: unknown; refused?: unknown; missing_seasons?: unknown };
  try {
    parsed = JSON.parse(stdout.trim()) as { read?: unknown; kept?: unknown; refused?: unknown; missing_seasons?: unknown };
  } catch {
    throw new Error(`fourth-down extract stdout was not JSON: ${stdout.slice(0, 400)}`);
  }
  if (typeof parsed.read !== "number" || typeof parsed.kept !== "number" || parsed.refused === null || typeof parsed.refused !== "object") {
    throw new Error(`fourth-down extract stdout was not {read, kept, refused}: ${stdout.slice(0, 400)}`);
  }
  const refused: Record<string, number> = {};
  for (const [reason, count] of Object.entries(parsed.refused as Record<string, unknown>)) {
    if (typeof count !== "number" || !Number.isFinite(count)) {
      throw new Error(`fourth-down refused.${reason} is not a finite number`);
    }
    refused[reason] = count;
  }
  if (parsed.read !== parsed.kept + refusalTotal(refused)) {
    throw new Error(`fourth-down read ${parsed.read} != kept ${parsed.kept} + refused ${refusalTotal(refused)}`);
  }
  const missingSeasons = Array.isArray(parsed.missing_seasons)
    ? parsed.missing_seasons.filter((s): s is number => typeof s === "number" && Number.isFinite(s))
    : [];
  return { read: parsed.read, kept: parsed.kept, refused, missingSeasons };
}

async function extractFourthDown(path: string, seasons: readonly number[]): Promise<FourthExtract> {
  const script = join(__dirname, "extract_fourth_down.py");
  await mkdir(CACHE_DIR, { recursive: true });
  const stdout = await new Promise<string>((resolvePromise, reject) => {
    const child = spawn("python", [script, path, CACHE_DIR, ...seasons.map(String)], { stdio: ["ignore", "pipe", "inherit"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(Buffer.concat(chunks).toString("utf8"));
      else reject(new Error(`extract_fourth_down.py exited ${code}`));
    });
  });
  const extracted = parseFourthExtract(stdout);
  if (extracted.kept === 0) throw new Error("extract_fourth_down.py kept 0 rows");
  return extracted;
}

export async function ingestNflverseCycle8(): Promise<{ manifestPath: string; datasets: DatasetManifest[] }> {
  await mkdir(DATA_DIR, { recursive: true });
  const datasets: DatasetManifest[] = [];

  // One nflverse table carries every id system, which is what makes the
  // 2018-2022 participation ids and the blank roster pfr_ids resolvable. It is
  // loaded once and threaded through the projections below.
  const crosswalk = await loadPlayerCrosswalk(CACHE_DIR);
  const resolveGsis = (id: string): string | null => crosswalk.nflToGsis.get(id) ?? null;
  const resolvePfr = (gsis: string): string | null => crosswalk.gsisToPfr.get(gsis) ?? null;
  process.stderr.write(
    `player crosswalk: ${crosswalk.stats.rows} players, ` +
      `${crosswalk.nflToGsis.size} nfl_id->gsis_id, ${crosswalk.gsisToPfr.size} gsis_id->pfr_id, ` +
      `ambiguous dropped nfl=${crosswalk.stats.ambiguous_nfl_dropped} pfr=${crosswalk.stats.ambiguous_pfr_dropped}\n`,
  );

  const contracts = unwrap("contracts", await loadContracts({ format: "parquet" }));
  requireRows("loadContracts", contracts);
  const contractOut = collect(contracts as unknown as Record<string, unknown>[], projectContract);
  const contractPath = join(DATA_DIR, "contracts.jsonl");
  await writeJsonl(contractPath, contractOut.kept);
  datasets.push(await finishDataset({
    name: "contracts",
    loader: "loadContracts",
    path: "data/gse-dataset/contracts.jsonl",
    read: contracts.length,
    kept: contractOut.kept.length,
    refused: contractOut.refused,
    note: "OverTheCap historical contracts via nflverse. Kept when gsis_id is present and the signed term covers 2024 or 2025. years null is not given a guessed length.",
  }, contractPath));

  // Rosters, one season at a time. Season rows and weekly rows share the file;
  // roster_level tells them apart.
  for (const season of SEASONS) {
    const seasonRosters = unwrap(`rosters ${season}`, await loadRosters([season], { format: "parquet" }));
    requireRows(`loadRosters ${season}`, seasonRosters);
    const weeklyRosters = unwrap(`rosters-weekly ${season}`, await loadRostersWeekly([season], { format: "parquet" }));
    requireRows(`loadRostersWeekly ${season}`, weeklyRosters);
    const seasonOut = collect(seasonRosters as unknown as Record<string, unknown>[], (raw) => projectRoster(raw, "season", resolvePfr));
    const weeklyOut = collect(weeklyRosters as unknown as Record<string, unknown>[], (raw) => projectRoster(raw, "weekly", resolvePfr));
    const rosterPath = join(DATA_DIR, `rosters-${season}.jsonl`);
    await writeJsonl(rosterPath, [...seasonOut.kept, ...weeklyOut.kept]);
    const rosterRefused: Record<string, number> = {};
    for (const source of [seasonOut.refused, weeklyOut.refused]) {
      for (const [reason, count] of Object.entries(source)) rosterRefused[reason] = (rosterRefused[reason] ?? 0) + count;
    }
    datasets.push(await finishDataset({
      name: `rosters-${season}`,
      loader: "loadRosters + loadRostersWeekly",
      path: `data/gse-dataset/rosters-${season}.jsonl`,
      read: seasonRosters.length + weeklyRosters.length,
      kept: seasonOut.kept.length + weeklyOut.kept.length,
      refused: rosterRefused,
      note: "Season rows and weekly rows share the file. roster_level tells them apart. A blank gsis_id is refused.",
    }, rosterPath));
  }

  for (const season of SEASONS) {
    const snaps = unwrap(`snap-counts ${season}`, await loadSnapCounts([season], { format: "parquet" }));
    requireRows(`loadSnapCounts ${season}`, snaps);
    const snapOut = collect(snaps as unknown as Record<string, unknown>[], projectSnap);
    const snapPath = join(DATA_DIR, `snap-counts-${season}.jsonl`);
    await writeJsonl(snapPath, snapOut.kept);
    datasets.push(await finishDataset({
      name: `snap-counts-${season}`,
      loader: "loadSnapCounts",
      path: `data/gse-dataset/snap-counts-${season}.jsonl`,
      read: snaps.length,
      kept: snapOut.kept.length,
      refused: snapOut.refused,
      note: "This release has game_id and pfr_player_id. It has no gsis_id column, so none was added.",
    }, snapPath));
  }

  // Participation, one season at a time. This is the grain that OOMs: every row
  // carries players_on_field, an array of 22 GSIS ids.
  //
  // A season the release has not published is recorded and the run continues. 2026
  // participation does not exist mid-season; that is a fact about the release, not a
  // reason to abandon the nine seasons that do exist.
  const participationUnavailable: string[] = [];
  for (const season of SEASONS) {
    let part: readonly unknown[];
    try {
      part = unwrap(`participation ${season}`, await loadParticipation(season, { format: "parquet" })) as readonly unknown[];
    } catch (error) {
      participationUnavailable.push(`${season}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    requireRows(`loadParticipation ${season}`, part);
    const participationOut = collect(part as unknown as Record<string, unknown>[], (raw) => projectParticipation(raw, resolveGsis));
    const sampleKeys = part[0] ? Object.keys(part[0] as Record<string, unknown>).sort().join(",") : "";
    const blankPersonnel = participationOut.kept.reduce((count, row) => count + (row.players_on_field === null ? 1 : 0), 0);
    if (participationOut.kept.length > 0 && blankPersonnel === participationOut.kept.length) {
      throw new Error(`participation ${season} kept ${participationOut.kept.length} rows and every players_on_field is null. keys: ${sampleKeys}`);
    }
    const participationPath = join(DATA_DIR, `participation-${season}.jsonl`);
    await writeJsonl(participationPath, participationOut.kept);
    datasets.push(await finishDataset({
      name: `participation-${season}`,
      loader: "loadParticipation",
      path: `data/gse-dataset/participation-${season}.jsonl`,
      read: part.length,
      kept: participationOut.kept.length,
      refused: participationOut.refused,
      note: `2023 and later is FTN Data via nflverse, CC-BY-SA 4.0. players_on_field is players_on_play split on commas, else offense_players plus defense_players. Blank cells stay null (${blankPersonnel} kept rows). Internal storage. Not a commercial display. keys: ${sampleKeys}`,
    }, participationPath));
  }

  if (participationUnavailable.length > 0) {
    console.log(
      `participation not published for ${participationUnavailable.length} season(s): ${participationUnavailable.join(" | ")}`,
    );
  }

  // Probe the most recent season actually in the list, not a hardcoded year, so
  // the probe cannot drift away from what was ingested.
  const probeSeason = Math.max(...SEASONS);
  const pbpProbe = await pbpFourthColumns(probeSeason);
  const fourthPath = join(DATA_DIR, "fourth-down.jsonl");
  const fourth = await extractFourthDown(fourthPath, SEASONS);
  const seasonList = SEASONS.join(", ");
  const missingList = fourth.missingSeasons.length > 0
    ? ` nfl4th does not publish: ${fourth.missingSeasons.join(", ")}. Recorded as a refusal; no year was invented.`
    : " Every requested season was published.";
  const fourthNote = (pbpProbe.error
    ? `pbp header probe failed (${pbpProbe.error}). The model was not ported. Rows are the published pre_computed_go_boost RDS for ${seasonList}.`
    : `play_by_play columns go_wp=${String(pbpProbe.present.go_wp)} punt_wp=${String(pbpProbe.present.punt_wp)} fg_wp=${String(pbpProbe.present.fg_wp)}. The model was not ported. Rows are the published pre_computed_go_boost RDS for ${seasonList}.`) + missingList;
  datasets.push(await finishDataset({
    name: "fourth-down",
    loader: "nfl4th pre_computed_go_boost RDS",
    path: "data/gse-dataset/fourth-down.jsonl",
    read: fourth.read,
    kept: fourth.kept,
    refused: fourth.refused,
    note: fourthNote,
  }, fourthPath));

  const manifest = {
    generated_at: new Date().toISOString(),
    package: "@nflverse/nflreadts",
    seasons: SEASONS,
    publishes_pick: false,
    pbp_probe: pbpProbe,
    datasets,
  };
  const manifestPath = join(DATA_DIR, "nflverse-ingest-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifestPath, datasets };
}

const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(__filename);
if (isDirect) {
  ingestNflverseCycle8()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result.datasets, null, 2)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    });
}
