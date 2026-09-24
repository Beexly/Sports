/**
 * Thin, IMPURE loader: the only file in this directory allowed to touch a
 * filesystem. The pure core (harness.ts, grading.ts, validate.ts) never
 * reads a file, a database, an environment variable, or a clock.
 *
 * Swap loadHistoricalRowsFromJsonFile for a CSV reader, a different file
 * shape, or a database query without touching backtest logic anywhere else
 * in this directory — parseHistoricalRowsJson (the actual parsing logic) is
 * pure and exported separately so it stays testable without a real file on
 * disk.
 *
 * Expected input: a JSON array of objects shaped like HistoricalGameRow
 * (camelCase keys — see types.ts and README.md). Refuses anything else with
 * a descriptive error rather than coercing or inventing rows.
 */

import { readFileSync } from "node:fs";
import type { HistoricalGameRow } from "./types.js";
import { validateCorpus } from "./validate.js";

const REQUIRED_KEYS = [
  "season",
  "week",
  "kickoffUtc",
  "homeTeam",
  "awayTeam",
  "homeScore",
  "awayScore",
  "closingSpreadHome",
  "closingTotal",
  "closingMlHome",
  "closingMlAway",
  "sourceUrl",
] as const;

/** Reads and parses a local JSON corpus file. The only fs-touching function in this directory. */
export function loadHistoricalRowsFromJsonFile(filePath: string): HistoricalGameRow[] {
  const raw = readFileSync(filePath, "utf8");
  return parseHistoricalRowsJson(raw);
}

/**
 * Pure: parses a JSON string into validated HistoricalGameRow objects.
 * Exported separately from loadHistoricalRowsFromJsonFile so it is
 * testable with an in-memory string, never a real file.
 */
export function parseHistoricalRowsJson(raw: string): HistoricalGameRow[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`parseHistoricalRowsJson: invalid JSON (${(err as Error).message})`);
  }

  if (!Array.isArray(data)) {
    throw new Error("parseHistoricalRowsJson: refuses input that is not a JSON array of rows");
  }
  if (data.length === 0) {
    throw new Error("parseHistoricalRowsJson: refuses an empty corpus. This loader never invents rows.");
  }

  const rows = data.map((entry, index) => coerceRow(entry, index));

  const issues = validateCorpus(rows);
  if (issues.length > 0) {
    const shown = issues.slice(0, 10);
    const suffix = issues.length > shown.length ? `\n...and ${issues.length - shown.length} more` : "";
    throw new Error(
      `parseHistoricalRowsJson: refuses a malformed corpus (${issues.length} issue(s) found):\n${shown.join("\n")}${suffix}`
    );
  }

  return rows;
}

function coerceRow(entry: unknown, index: number): HistoricalGameRow {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`parseHistoricalRowsJson: row ${index} is not an object`);
  }
  const record = entry as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) {
      throw new Error(`parseHistoricalRowsJson: row ${index} is missing required field "${key}"`);
    }
  }
  return {
    season: record["season"] as number,
    week: record["week"] as number,
    kickoffUtc: record["kickoffUtc"] as string,
    homeTeam: record["homeTeam"] as string,
    awayTeam: record["awayTeam"] as string,
    homeScore: record["homeScore"] as number,
    awayScore: record["awayScore"] as number,
    closingSpreadHome: record["closingSpreadHome"] as number,
    closingTotal: record["closingTotal"] as number,
    closingMlHome: record["closingMlHome"] as number,
    closingMlAway: record["closingMlAway"] as number,
    sourceUrl: record["sourceUrl"] as string,
  };
}
