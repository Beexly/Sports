import fs from "node:fs";
import path from "node:path";

/**
 * Loader for the SGP projections data file.
 *
 * The data file lives at apps/web/data/sgp-projections.json and is produced
 * by a separate build. This loader reads it with fs at request time, in the
 * same style as lib/statking/product.ts.
 *
 * It never throws. A missing, empty, or unreadable file returns an empty
 * result with a reason, so the page can render an honest empty state
 * instead of an error.
 */

export interface SgpProjectionRow {
  game: string;
  commenceTime: string | null;
  market: string;
  projectionPct: number;
}

export interface SgpGameProjections {
  game: string;
  commenceTime: string | null;
  rows: SgpProjectionRow[];
}

export type SgpProjectionsEmptyReason =
  | "NO_DATA_FILE"
  | "EMPTY"
  | "PARSE_ERROR";

export interface SgpProjectionsResult {
  generatedAt: string | null;
  games: SgpGameProjections[];
  rows: SgpProjectionRow[];
  reason: SgpProjectionsEmptyReason | null;
}

const EMPTY_RESULT: SgpProjectionsResult = {
  generatedAt: null,
  games: [],
  rows: [],
  reason: "EMPTY",
};

function emptyWithReason(
  reason: SgpProjectionsEmptyReason,
): SgpProjectionsResult {
  return { generatedAt: null, games: [], rows: [], reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanTime(value: unknown): string | null {
  return cleanString(value);
}

/**
 * Find the default data file. Locally the working directory is apps/web;
 * on a server the working directory can differ, so candidate roots are
 * checked in the same spirit as the StatKing loader.
 */
export function resolveSgpProjectionsPath(): string {
  const cwd = process.cwd();
  const candidates: string[] = [];
  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    candidates.push(path.join(dir, "data", "sgp-projections.json"));
    candidates.push(
      path.join(dir, "apps", "web", "data", "sgp-projections.json"),
    );
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(cwd, "data", "sgp-projections.json");
}

/**
 * Validate parsed JSON into a result. Invalid games and rows are dropped.
 * If the top level shape is wrong, the result is a PARSE_ERROR empty
 * result. If nothing usable remains, the result is an EMPTY empty result.
 */
export function parseSgpProjections(parsed: unknown): SgpProjectionsResult {
  if (!isRecord(parsed)) return emptyWithReason("PARSE_ERROR");
  if (!Array.isArray(parsed.games)) return emptyWithReason("PARSE_ERROR");

  const generatedAt = cleanTime(parsed.generatedAt);

  const games: SgpGameProjections[] = [];
  const rows: SgpProjectionRow[] = [];

  for (const rawGame of parsed.games) {
    if (!isRecord(rawGame)) continue;
    const game = cleanString(rawGame.game);
    if (!game) continue;
    if (!Array.isArray(rawGame.rows)) continue;
    const commenceTime = cleanTime(rawGame.commenceTime);

    const gameRows: SgpProjectionRow[] = [];
    for (const rawRow of rawGame.rows) {
      if (!isRecord(rawRow)) continue;
      const market = cleanString(rawRow.market);
      if (!market) continue;
      const projectionPct = rawRow.projectionPct;
      if (typeof projectionPct !== "number" || !Number.isFinite(projectionPct)) {
        continue;
      }
      const row: SgpProjectionRow = {
        game,
        commenceTime,
        market,
        projectionPct,
      };
      gameRows.push(row);
      rows.push(row);
    }
    if (gameRows.length > 0) {
      games.push({ game, commenceTime, rows: gameRows });
    }
  }

  if (rows.length === 0) {
    return { generatedAt, games: [], rows: [], reason: "EMPTY" };
  }
  return { generatedAt, games, rows, reason: null };
}

/**
 * Load the SGP projections data file.
 *
 * Pass a file path to read a specific file (used by tests). With no
 * argument, the default apps/web/data/sgp-projections.json location is
 * resolved. Never throws.
 */
export function loadSgpProjections(
  filePath?: string,
): SgpProjectionsResult {
  try {
    const target = filePath ?? resolveSgpProjectionsPath();
    if (!fs.existsSync(target)) return emptyWithReason("NO_DATA_FILE");
    const raw = fs.readFileSync(target, "utf8");
    if (raw.trim().length === 0) return { ...EMPTY_RESULT };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return emptyWithReason("PARSE_ERROR");
    }
    return parseSgpProjections(parsed);
  } catch {
    return emptyWithReason("PARSE_ERROR");
  }
}
