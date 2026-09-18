#!/usr/bin/env -S npx tsx
/**
 * Refusal-census runner. NEVER opens a database from this process unless
 * READONLY_DATABASE_URL is set AND psql is on PATH. CI uses --rows.
 *
 *   npx tsx src/edge-lab/run-refusal-census.ts --print-sql
 *   npx tsx src/edge-lab/run-refusal-census.ts --needs
 *   npx tsx src/edge-lab/run-refusal-census.ts --rows fixture.json
 *   READONLY_DATABASE_URL=postgres://...@replica/neondb npx tsx src/edge-lab/run-refusal-census.ts
 *
 * Exit 0: census printed. Exit 2: missing input, named. Exit 1: failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  REFUSAL_CENSUS_PRODUCTION_NEEDS,
  REFUSAL_CENSUS_REQUIRED_COLUMNS,
  REFUSAL_CENSUS_SQL,
  censusRefusals,
  type ProductionPickRow,
} from "./refusal-census.js";

function usage(): string {
  return `refusal-census — count fail-closed paths. Does not invent a 0% rate.

Required production columns: ${REFUSAL_CENSUS_REQUIRED_COLUMNS.join(", ")}.
Replica families: ${REFUSAL_CENSUS_PRODUCTION_NEEDS.coversFromReplica.join(", ")}.
Not persisted today: ${REFUSAL_CENSUS_PRODUCTION_NEEDS.notPersistedToday.join(", ")}.
${REFUSAL_CENSUS_PRODUCTION_NEEDS.missingInput}

  --print-sql     print REFUSAL_CENSUS_SQL and exit 0
  --needs         print REFUSAL_CENSUS_PRODUCTION_NEEDS JSON and exit 0
  --rows FILE     JSON array of ProductionPickRow
  stdin           JSON array
  READONLY_DATABASE_URL + psql   run the named SQL against a replica
`;
}

function parseRows(text: string, source: string): ProductionPickRow[] {
  const trimmed = text.trim();
  if (!trimmed) {
    process.stderr.write(
      `missing input: ${source} was empty. Need --rows FILE, stdin JSON, or READONLY_DATABASE_URL.\n`,
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
    process.stderr.write(`${source} must be a JSON array of ProductionPickRow\n`);
    process.exit(1);
  }
  return parsed as ProductionPickRow[];
}

function fromDsn(url: string): ProductionPickRow[] {
  const psql = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", REFUSAL_CENSUS_SQL], {
    encoding: "utf8",
  });
  if (psql.error && (psql.error as NodeJS.ErrnoException).code === "ENOENT") {
    process.stderr.write(
      "missing input: psql not on PATH. Install client tools or pipe JSON from a replica (`--rows`). SQL is --print-sql.\n",
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
      "replica returned no rows. That is not a 0% refusal rate; it is an empty extract.\n",
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
    process.stdout.write(REFUSAL_CENSUS_SQL + "\n");
    process.exit(0);
  }
  if (argv.includes("--needs")) {
    process.stdout.write(`${JSON.stringify(REFUSAL_CENSUS_PRODUCTION_NEEDS, null, 2)}\n`);
    process.exit(0);
  }
  const rowsFlag = argv.indexOf("--rows");
  let rows: ProductionPickRow[];
  if (rowsFlag >= 0) {
    const file = argv[rowsFlag + 1];
    if (!file || !existsSync(file)) {
      process.stderr.write(`missing input: --rows file not found (${file ?? "no path"})\n`);
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
  const table = censusRefusals(rows);
  process.stdout.write(`${JSON.stringify(table, null, 2)}\n`);
}

const launched = process.argv[1]?.includes("run-refusal-census");
if (launched) main(process.argv.slice(2));
