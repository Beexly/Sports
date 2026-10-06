/**
 * Stage A / step 3 -- write normalized games to JSONL, and run the whole
 * Stage A pipeline end to end.
 *
 * JSONL, one JSON object per line, trailing newline. The repo has no
 * `pyarrow`/`fastparquet` and no license to add one, so Parquet is not an
 * option here and is not faked in any form.
 *
 * The run log printed at the end is the provenance record: source URL, byte
 * count, sha256, fetch timestamp, and REAL row counts read back off disk. The
 * row count is measured after the write, not assumed from the in-memory
 * length, so a truncated or partial write cannot be reported as success.
 *
 * CLI: `npx tsx packages/data-ingestion/src/gse-dataset/write-jsonl.ts [--refresh]`
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { fetchGamesCsv, describeFetch, sha256Hex, GSE_DATA_DIR, type GamesFetch } from "./fetch-games.js";
import { normalizeGames } from "./normalize.js";

/** Where the normalized game master lands. */
export const GSE_GAMES_JSONL_PATH = join(GSE_DATA_DIR, "games.jsonl");

/** What was actually written, measured from the file on disk. */
export type JsonlWriteResult = {
  readonly path: string;
  /** Lines counted in the written file. */
  readonly rows: number;
  /** Byte size of the written file. */
  readonly bytes: number;
  /** sha256 of the written file, lowercase hex. */
  readonly sha256: string;
};

/**
 * Serialize `rows` to `path` as JSONL and verify the result by reading the
 * file back. Throws if the line count on disk disagrees with the input length.
 */
export async function writeJsonl(
  path: string,
  rows: readonly unknown[],
): Promise<JsonlWriteResult> {
  if (rows.length === 0) {
    // An empty artifact is indistinguishable downstream from a failed fetch.
    throw new Error(`refusing to write an empty JSONL file to ${path}: 0 rows`);
  }
  const body = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf8");

  const written = await readFile(path, "utf8");
  const lineCount = written.endsWith("\n") ? written.slice(0, -1).split("\n").length : written.split("\n").length;
  if (lineCount !== rows.length) {
    throw new Error(
      `JSONL write verification failed for ${path}: wrote ${rows.length} rows but read back ${lineCount}`,
    );
  }

  return { path, rows: lineCount, bytes: (await stat(path)).size, sha256: sha256Hex(body) };
}

/** Full Stage A: fetch -> normalize -> write, with a real run log. */
export async function runStageA(options: { refresh?: boolean } = {}): Promise<{
  readonly fetched: GamesFetch;
  readonly games: ReturnType<typeof normalizeGames>;
  readonly write: JsonlWriteResult;
}> {
  const fetched = await fetchGamesCsv({ refresh: options.refresh === true });
  const csvText = await readFile(fetched.csvPath, "utf8");
  const normalized = normalizeGames(csvText);
  const write = await writeJsonl(GSE_GAMES_JSONL_PATH, normalized.games);
  return { fetched, games: normalized, write };
}

/** Format the run log. Every number here is measured, never assumed. */
export function describeStageARun(
  fetched: GamesFetch,
  dataset: ReturnType<typeof normalizeGames>,
  write: JsonlWriteResult,
): readonly string[] {
  const lines: string[] = [...describeFetch(fetched), "", "normalize"];
  lines.push(`columns         ${dataset.games[0] === undefined ? 0 : Object.keys(dataset.games[0]).length}`);
  lines.push(`input rows      ${dataset.stats.inputRows}`);
  lines.push(`kept rows       ${dataset.stats.keptRows}`);
  lines.push(`settled rows    ${dataset.stats.settledRows}`);
  lines.push(`unsettled rows  ${dataset.stats.unsettledRows}`);
  const rejected = [...dataset.stats.rejected.entries()];
  lines.push(`rejected rows   ${rejected.reduce((sum, [, n]) => sum + n, 0)}`);
  for (const [reason, n] of rejected) lines.push(`  - ${n}x ${reason}`);
  const seasons = [...dataset.stats.rowsPerSeason.entries()].sort((a, b) => a[0] - b[0]);
  if (seasons.length > 0) {
    const first = seasons[0]!;
    const last = seasons[seasons.length - 1]!;
    lines.push(`seasons         ${first[0]}..${last[0]} (${seasons.length} seasons)`);
    lines.push(`  last season   ${last[0]}: ${last[1]} rows`);
  }
  const types = [...dataset.stats.rowsPerGameType.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  lines.push(`game types      ${types.map(([k, v]) => `${k}=${v}`).join(" ")}`);

  lines.push("", "write");
  lines.push(`output          ${write.path}`);
  lines.push(`rows written    ${write.rows}`);
  lines.push(`bytes written   ${write.bytes}`);
  lines.push(`sha256          ${write.sha256}`);
  return lines;
}

async function main(): Promise<void> {
  const refresh = process.argv.slice(2).includes("--refresh");
  const { fetched, games, write } = await runStageA({ refresh });
  for (const line of describeStageARun(fetched, games, write)) {
    console.log(line);
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
