/**
 * Frozen holdout definitions (LAST_PLAN §4.2).
 *
 * Two splits, exported as constants and never edited without a new ID:
 *
 *   PICKS-H1 = every settled published non-founder pick with
 *              generatedAt >= 2026-08-01, plus everything forward
 *              (n=394 on 2026-09-15, 148 football).
 *
 *   NFL-H2   = seasons 2020–2025 for nflverse hypotheses (discover ≤2019),
 *              with 2026 as the live weekly holdout.
 *
 * Input is a JSON export `verifier/picks-h1.json` written by the
 * calibration-metrics cron beside holdout-ranking-report.json. Agents never
 * touch the DB (law 7). When the export is missing the harness runs on
 * committed fixtures; `npm run verify:holdout` on a committed real export is
 * the DoD gate and can be NOT RUN until that export exists.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { HoldoutPickRow, HoldoutId, PicksH1Export } from "./types";

/** Frozen boundary for PICKS-H1. Changing this requires a new holdout ID. */
export const PICKS_H1_CUTOFF = "2026-08-01T00:00:00.000Z";

/** Frozen NFL-H2 season window. */
export const NFL_H2_SEASONS = [2020, 2021, 2022, 2023, 2024, 2025] as const;
export const NFL_H2_DISCOVER_MAX_SEASON = 2019;
export const NFL_H2_LIVE_SEASON = 2026;

export const HOLDOUT_DEFS = {
  "PICKS-H1": {
    id: "PICKS-H1" as HoldoutId,
    cutoff: PICKS_H1_CUTOFF,
    description:
      "Settled published non-founder picks with generatedAt >= 2026-08-01, plus everything forward.",
  },
  "NFL-H2": {
    id: "NFL-H2" as HoldoutId,
    seasons: NFL_H2_SEASONS,
    discoverMaxSeason: NFL_H2_DISCOVER_MAX_SEASON,
    liveSeason: NFL_H2_LIVE_SEASON,
    description:
      "NFL seasons 2020–2025 for nflverse hypotheses (discover ≤2019); 2026 is the live weekly holdout.",
  },
} as const;

/** Model versions the holdout harness re-grades (plan §4.2 verify:holdout). */
export const RE_GRADED_MODEL_VERSIONS = [
  "v5.0.0",
  "v5.0.0-seed",
  "v5.1.0",
  "v5.2.0",
  "v5.2.1",
  "v5.2.2",
  "v5.2.3",
  "v5.2.4",
  "v5.2.5",
  "v5.2.6",
  "v5.2.7",
] as const;

/** Candidate search order for the export file (real first, fixture last). */
export function exportSearchPaths(repoRoot: string): readonly string[] {
  return [
    process.env["PICKS_H1_EXPORT"]?.trim() ||
      path.join(repoRoot, "verifier", "picks-h1.json"),
    path.join(repoRoot, ".gse-local", "calibration", "picks-h1.json"),
    path.join(repoRoot, "packages", "verifier", "fixtures", "picks-h1.json"),
  ].filter((p, i, arr) => arr.indexOf(p) === i);
}

export type LoadHoldoutResult = {
  readonly export: PicksH1Export;
  readonly path: string;
  readonly fromFixture: boolean;
};

/**
 * Load the picks-h1 export. Falls back to the committed fixture when no real
 * export exists. Throws a named error when nothing is readable.
 */
export function loadPicksH1(repoRoot: string): LoadHoldoutResult {
  const candidates = exportSearchPaths(repoRoot);
  const fixturePath = path.join(repoRoot, "packages", "verifier", "fixtures", "picks-h1.json");
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = JSON.parse(readFileSync(p, "utf8")) as unknown;
    const doc = parsePicksH1Export(raw);
    return {
      export: doc,
      path: p,
      fromFixture: path.resolve(p) === path.resolve(fixturePath),
    };
  }
  throw new Error(
    `picks-h1 export not found. Looked in:\n  ${candidates.join("\n  ")}\n` +
      `Write verifier/picks-h1.json (calibration-metrics cron) or commit a fixture.`,
  );
}

/** Structural parse + validate of the export document. */
export function parsePicksH1Export(raw: unknown): PicksH1Export {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("picks-h1 export must be a JSON object");
  }
  const doc = raw as Record<string, unknown>;
  const rowsRaw = doc["rows"];
  if (!Array.isArray(rowsRaw)) {
    throw new Error("picks-h1 export missing rows[]");
  }
  const rows: HoldoutPickRow[] = rowsRaw.map((r, i) => parseRow(r, i));
  const holdoutId = (doc["holdoutId"] as HoldoutId) ?? "PICKS-H1";
  if (holdoutId !== "PICKS-H1" && holdoutId !== "NFL-H2") {
    throw new Error(`unknown holdoutId: ${String(holdoutId)}`);
  }
  return {
    holdoutId,
    generatedAt: String(doc["generatedAt"] ?? new Date(0).toISOString()),
    schemaVersion: 1,
    rows,
    source: doc["source"] === undefined ? undefined : String(doc["source"]),
  };
}

function parseRow(raw: unknown, i: number): HoldoutPickRow {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`rows[${i}] must be an object`);
  }
  const r = raw as Record<string, unknown>;
  const outcome = r["outcome"];
  if (outcome !== 0 && outcome !== 1) {
    throw new Error(`rows[${i}].outcome must be 0 or 1`);
  }
  const mfp = r["marketFairProb"];
  if (typeof mfp !== "number" || !(mfp > 0 && mfp < 1)) {
    throw new Error(`rows[${i}].marketFairProb must be in (0,1)`);
  }
  const mp = r["modelProb"];
  if (mp !== null && (typeof mp !== "number" || !(mp > 0 && mp < 1))) {
    throw new Error(`rows[${i}].modelProb must be null or in (0,1)`);
  }
  return {
    id: String(r["id"] ?? `row-${i}`),
    sport: String(r["sport"] ?? "UNKNOWN"),
    market: String(r["market"] ?? "UNKNOWN"),
    outcome,
    marketFairProb: mfp,
    modelProb: mp === undefined ? null : (mp as number | null),
    confidence: r["confidence"] === null || r["confidence"] === undefined
      ? null
      : Number(r["confidence"]),
    modelVersion: String(r["modelVersion"] ?? "unknown"),
    generatedAt: String(r["generatedAt"] ?? ""),
    isFounder: Boolean(r["isFounder"] ?? false),
    isPublished: Boolean(r["isPublished"] ?? true),
    isSettled: Boolean(r["isSettled"] ?? true),
    season: r["season"] === undefined || r["season"] === null ? null : Number(r["season"]),
  };
}

/**
 * PICKS-H1 membership: settled, published, non-founder, generatedAt >= cutoff.
 * Everything forward (generatedAt after the frozen date) is in by definition.
 */
export function isPicksH1(row: HoldoutPickRow, cutoff: string = PICKS_H1_CUTOFF): boolean {
  if (row.isFounder) return false;
  if (!row.isSettled) return false;
  if (!row.isPublished) return false;
  if (row.outcome !== 0 && row.outcome !== 1) return false;
  if (!(row.marketFairProb > 0 && row.marketFairProb < 1)) return false;
  return row.generatedAt >= cutoff;
}

/** NFL-H2 membership: NFL, season in the frozen 2020–2025 window. */
export function isNflH2(row: HoldoutPickRow): boolean {
  if (row.sport.toUpperCase() !== "NFL") return false;
  const s = row.season;
  if (s == null) return false;
  return (NFL_H2_SEASONS as readonly number[]).includes(s);
}

/** Filter an export down to PICKS-H1. */
export function selectPicksH1(
  rows: readonly HoldoutPickRow[],
  cutoff: string = PICKS_H1_CUTOFF,
): HoldoutPickRow[] {
  return rows.filter((r) => isPicksH1(r, cutoff));
}

/** Filter an export down to NFL-H2. */
export function selectNflH2(rows: readonly HoldoutPickRow[]): HoldoutPickRow[] {
  return rows.filter((r) => isNflH2(r));
}

/** Football stratum helper (NFL + NCAAF). */
export function isFootballSport(sport: string): boolean {
  const s = sport.toUpperCase();
  return s === "NFL" || s === "NCAAF" || s === "NCAA_FOOTBALL" || s === "COLLEGE_FOOTBALL";
}

/** Split rows by a season cutoff for discover/validate eras (NFL-H2). */
export function splitEras(
  rows: readonly HoldoutPickRow[],
  discoverMaxSeason: number = NFL_H2_DISCOVER_MAX_SEASON,
): { discover: HoldoutPickRow[]; validate: HoldoutPickRow[] } {
  const discover: HoldoutPickRow[] = [];
  const validate: HoldoutPickRow[] = [];
  for (const r of rows) {
    const s = r.season ?? 0;
    if (s <= discoverMaxSeason) discover.push(r);
    else validate.push(r);
  }
  return { discover, validate };
}
