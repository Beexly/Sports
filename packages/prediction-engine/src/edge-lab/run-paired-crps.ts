#!/usr/bin/env -S npx tsx
/**
 * Paired discrete vs widened-Gaussian CRPS runner.
 *
 *   npx tsx src/edge-lab/run-paired-crps.ts --print-sql
 *   npx tsx src/edge-lab/run-paired-crps.ts --needs
 *   npx tsx src/edge-lab/run-paired-crps.ts --rows margins.json
 *
 * margins.json is a JSON array of integer home−away margins.
 * --print-sql prints TEAM_GAME_LOG_MARGINS_SQL for a Neon replica.
 * This process never opens a database unless READONLY_DATABASE_URL + psql.
 *
 * Data via nflverse (nflverse/nfldata), licensed CC BY 4.0, when the caller
 * scored that corpus and tagged sampleKind nflverse-schedules.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  DISCRETE_VS_GAUSSIAN_ESTIMAND,
  DISCRETE_VS_GAUSSIAN_MISSING_INPUT,
  FLASH_NFLVERSE_CRPS_PAIRED,
  TEAM_GAME_LOG_MARGINS_SQL,
  pairedDiscreteVsWidenedGaussian,
  type CrpsSampleKind,
} from "./kernel/crps-compare.js";

function usage(): string {
  return `paired-crps — discrete vs widened Gaussian, paired mean + SE.

ESTIMAND: ${DISCRETE_VS_GAUSSIAN_ESTIMAND}
MISSING: ${DISCRETE_VS_GAUSSIAN_MISSING_INPUT}
FLASH nflverse REG (2026-09-18): n=${FLASH_NFLVERSE_CRPS_PAIRED.n} meanD=${FLASH_NFLVERSE_CRPS_PAIRED.meanD} seD=${FLASH_NFLVERSE_CRPS_PAIRED.seD} verdict=${FLASH_NFLVERSE_CRPS_PAIRED.verdict}
${FLASH_NFLVERSE_CRPS_PAIRED.attribution}

  --print-sql     print TEAM_GAME_LOG_MARGINS_SQL and exit 0
  --needs         print missing-input + flash measurement JSON
  --rows FILE     JSON array of integer margins
  --kind KIND     synthetic-nfl-shaped | caller-supplied | nflverse-schedules (default caller-supplied)
  READONLY_DATABASE_URL + psql   run TEAM_GAME_LOG_MARGINS_SQL
`;
}

function parseMargins(text: string, source: string): number[] {
  const trimmed = text.trim();
  if (!trimmed) {
    process.stderr.write(`missing input: ${source} was empty.\n`);
    process.exit(2);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    process.stderr.write(`invalid JSON from ${source}: ${(err as Error).message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "number")) {
    process.stderr.write(`${source} must be a JSON array of numbers\n`);
    process.exit(1);
  }
  return parsed as number[];
}

function fromDsn(url: string): number[] {
  const psql = spawnSync(
    "psql",
    [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", TEAM_GAME_LOG_MARGINS_SQL],
    { encoding: "utf8" },
  );
  if (psql.error && (psql.error as NodeJS.ErrnoException).code === "ENOENT") {
    process.stderr.write("missing input: psql not on PATH. SQL is --print-sql.\n");
    process.exit(2);
  }
  if (psql.status !== 0) {
    process.stderr.write(`psql failed: ${psql.stderr || psql.stdout || "unknown"}\n`);
    process.exit(1);
  }
  const raw = (psql.stdout || "").trim();
  if (!raw || raw === "null") {
    process.stderr.write("replica returned no margins. That is not a 0 delta.\n");
    process.exit(2);
  }
  return parseMargins(raw, "READONLY_DATABASE_URL");
}

export function main(argv: readonly string[]): void {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (argv.includes("--print-sql")) {
    process.stdout.write(TEAM_GAME_LOG_MARGINS_SQL + "\n");
    process.exit(0);
  }
  if (argv.includes("--needs")) {
    process.stdout.write(
      `${JSON.stringify({ missingInput: DISCRETE_VS_GAUSSIAN_MISSING_INPUT, flash: FLASH_NFLVERSE_CRPS_PAIRED }, null, 2)}\n`,
    );
    process.exit(0);
  }
  const kindFlag = argv.indexOf("--kind");
  const sampleKind: CrpsSampleKind =
    kindFlag >= 0 ? (argv[kindFlag + 1] as CrpsSampleKind) : "caller-supplied";
  if (
    sampleKind !== "synthetic-nfl-shaped" &&
    sampleKind !== "caller-supplied" &&
    sampleKind !== "nflverse-schedules"
  ) {
    process.stderr.write(`unknown --kind ${sampleKind}\n`);
    process.exit(2);
  }
  const rowsFlag = argv.indexOf("--rows");
  let y: number[];
  if (rowsFlag >= 0) {
    const file = argv[rowsFlag + 1];
    if (!file || !existsSync(file)) {
      process.stderr.write(`missing input: --rows file not found (${file ?? "no path"})\n`);
      process.exit(2);
    }
    y = parseMargins(readFileSync(file, "utf8"), file);
  } else if (process.env.READONLY_DATABASE_URL) {
    y = fromDsn(process.env.READONLY_DATABASE_URL);
  } else {
    process.stderr.write(usage());
    process.exit(2);
  }
  const report = pairedDiscreteVsWidenedGaussian({ y, sampleKind });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const launched = process.argv[1]?.includes("run-paired-crps");
if (launched) main(process.argv.slice(2));
