#!/usr/bin/env -S npx tsx
/**
 * Market-calibration 5pp runner. NEVER opens a database unless
 * READONLY_DATABASE_URL is set AND psql is on PATH. CI uses --rows.
 *
 *   npx tsx src/edge-lab/run-market-calibration-violation.ts --print-sql
 *   npx tsx src/edge-lab/run-market-calibration-violation.ts --needs
 *   npx tsx src/edge-lab/run-market-calibration-violation.ts --rows fixture.json
 *
 * Exit 0: report printed. Exit 2: missing input, named. Exit 1: failure.
 * A missing replica is NOT_RUN, never a 0% violation rate.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  MARKET_CALIBRATION_PRODUCTION_NEEDS,
  MARKET_CALIBRATION_SQL,
  measureMarketCalibrationViolation,
  type MarketCalibRow,
} from "./market-calibration-violation.js";

function usage(): string {
  return `market-calibration-violation — 5pp threshold mill. Does not invent a 5% market error.

ESTIMAND: ${MARKET_CALIBRATION_PRODUCTION_NEEDS.estimand}
MATTERS WHEN: ${MARKET_CALIBRATION_PRODUCTION_NEEDS.mattersWhen}
PRODUCTION NUMBER: ${MARKET_CALIBRATION_PRODUCTION_NEEDS.productionNumber}
MISSING INPUT: ${MARKET_CALIBRATION_PRODUCTION_NEEDS.missingInput}

  --print-sql     print MARKET_CALIBRATION_SQL and exit 0
  --needs         print MARKET_CALIBRATION_PRODUCTION_NEEDS JSON and exit 0
  --rows FILE     JSON array of {sport, marketP, y}
  stdin           JSON array
  READONLY_DATABASE_URL + psql   run the named SQL against a replica
`;
}

function parseRows(text: string, source: string): MarketCalibRow[] {
  const trimmed = text.trim();
  if (!trimmed) {
    process.stderr.write(
      `missing input: ${source} was empty. Need --rows FILE, stdin JSON, or READONLY_DATABASE_URL. Production number is NOT_RUN.\n`,
    );
    process.exit(2);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    process.stderr.write(`invalid JSON from ${source}: ${(err as Error).message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write(`${source} must be a JSON array of {sport, marketP, y}\n`);
    process.exit(1);
  }
  return parsed as MarketCalibRow[];
}

function fromDsn(url: string): MarketCalibRow[] {
  const psql = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", MARKET_CALIBRATION_SQL], {
    encoding: "utf8",
  });
  if (psql.error && (psql.error as NodeJS.ErrnoException).code === "ENOENT") {
    process.stderr.write(
      "missing input: psql not on PATH. Production number is NOT_RUN. SQL is --print-sql.\n",
    );
    process.exit(2);
  }
  if (psql.status !== 0) {
    process.stderr.write(`psql failed: ${psql.stderr || psql.stdout || "unknown"}\n`);
    process.exit(1);
  }
  const raw = (psql.stdout || "").trim();
  if (!raw || raw === "null") {
    process.stderr.write(
      "replica returned no rows. That is NOT_RUN, not a 0% violation rate.\n",
    );
    process.exit(2);
  }
  return parseRows(raw, "READONLY_DATABASE_URL");
}

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function main(argv: readonly string[]): void {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (argv.includes("--print-sql")) {
    process.stdout.write(MARKET_CALIBRATION_SQL + "\n");
    process.exit(0);
  }
  if (argv.includes("--needs")) {
    process.stdout.write(`${JSON.stringify(MARKET_CALIBRATION_PRODUCTION_NEEDS, null, 2)}\n`);
    process.exit(0);
  }
  const rowsFlag = argv.indexOf("--rows");
  let rows: MarketCalibRow[];
  if (rowsFlag >= 0) {
    const file = argv[rowsFlag + 1];
    if (!file || !existsSync(file)) {
      process.stderr.write(
        `missing input: --rows file not found (${file ?? "no path"}). Production number is NOT_RUN.\n`,
      );
      process.exit(2);
    }
    rows = parseRows(readFileSync(file, "utf8"), file);
  } else if (process.env.READONLY_DATABASE_URL) {
    rows = fromDsn(process.env.READONLY_DATABASE_URL);
  } else {
    if (process.stdin.isTTY) {
      process.stderr.write(usage());
      process.exit(2);
    }
    rows = parseRows(readStdin(), "stdin");
  }
  const report = measureMarketCalibrationViolation(rows);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const launched = process.argv[1]?.includes("run-market-calibration-violation");
if (launched) main(process.argv.slice(2));
