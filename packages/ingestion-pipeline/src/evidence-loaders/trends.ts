/**
 * Strict reader for the team trends artefact.
 *
 * The slate pipeline asked this file for `sack_rate_allowed`, `epa_per_play`,
 * `def_pressure_rate` and `def_epa_allowed`. None of those keys exist. The real
 * keys are `sack_rate_allowed_pct`, `off_epa_per_play`, `def_sack_rate_pct` and
 * `def_epa_per_play`. Because the reads were `?? default`, every team got the
 * same fallback and the trench advantage came out identical across the slate.
 *
 * This reader throws on an absent key and names the team and the key. A missing
 * measurement is a fact about the data; a default is a lie about it.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface TrendsFile {
  readonly generatedAt: string;
  readonly weeksCovered: readonly number[];
  readonly teams: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/**
 * The freshly rebuilt artefact (Weeks 1–8 from nflverse play-by-play, built by
 * scripts/ops/build_team_form_w1_w9.ts). The older w1_w7 file is kept for
 * comparison but is stale by more than the freshness rule allows.
 */
export const DEFAULT_TRENDS_PATH = "data/engine/nfl_2026_w1_w9_trends_and_usage.json";

export class TrendsKeyError extends Error {
  readonly team: string;
  readonly key: string;
  constructor(team: string, key: string, available: readonly string[]) {
    super(
      `trends: team ${team} has no key "${key}". ` +
        `Available keys include: ${available.slice(0, 12).join(", ")}…`,
    );
    this.name = "TrendsKeyError";
    this.team = team;
    this.key = key;
  }
}

export function loadTrendsFile(path: string = DEFAULT_TRENDS_PATH): TrendsFile {
  const abs = resolve(process.cwd(), path);
  const raw = JSON.parse(readFileSync(abs, "utf8")) as {
    generated_at?: unknown;
    weeks_covered?: unknown;
    teams?: unknown;
  };
  if (typeof raw.generated_at !== "string") {
    throw new Error(`trends: ${abs} has no generated_at`);
  }
  if (!Array.isArray(raw.weeks_covered) || raw.weeks_covered.some((w) => typeof w !== "number")) {
    throw new Error(`trends: ${abs} has no numeric weeks_covered`);
  }
  if (raw.teams === null || typeof raw.teams !== "object") {
    throw new Error(`trends: ${abs} has no teams object`);
  }
  return {
    generatedAt: raw.generated_at,
    weeksCovered: raw.weeks_covered as number[],
    teams: raw.teams as Record<string, Record<string, unknown>>,
  };
}

/** Read a numeric field or throw. Never returns a default. */
export function requireNumber(
  team: string,
  row: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const v = row[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new TrendsKeyError(team, key, Object.keys(row));
  }
  return v;
}

/** Read an optional numeric field. Returns null when absent — never a default. */
export function optionalNumber(
  row: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Read an optional string field. */
export function optionalString(
  row: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const v = row[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}
