/**
 * Baseball Savant ingestion — Statcast skill inputs for the glass-box fantasy
 * engine (@sports/fantasy-engine SMASH populations + team Statcast-allowed
 * aggregates for BURR).
 *
 * Source posture (source-rights registry: "baseball-savant"): MLBAM property,
 * public logged-off CSV export, robots.txt universal allow. Raw MLB data is
 * NON-COMMERCIAL/NON-BULK by MLBAM's notice, so this adapter is
 * compute-and-discard: it never persists a raw payload, and every fetch
 * REQUIRES a SourceClearanceProof from the app-side clearance gate
 * (apps/web/lib/ingestion/fantasy-mlb-gate.ts). Derived scores the engine
 * computes from these facts are our own work product (Feist; C.B.C. v. MLBAM,
 * 505 F.3d 818 (8th Cir. 2007) — fantasy use of MLB stats needs no license).
 *
 * Schema verified LIVE 2026-07-11 against the custom leaderboard CSV export:
 *   ﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent",
 *   "bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"
 * - UTF-8 BOM prefix on the first header cell.
 * - xwoba arrives as a QUOTED DECIMAL STRING (".300"); the rate columns are
 *   bare numbers in PERCENT units (k_percent 14.3 = 14.3%).
 * - min="q" restricts to qualified players (the population the reference
 *   engine z-scores against); a numeric min is a PA floor.
 * NO OTHER leaderboard URL shape is used: a guessed `type=pitcher-team`
 * variant was tested live and silently fell back to player rows, so team
 * aggregates are built here by PA-weighting player rows instead.
 */

import type { HitterSkillInput, PitcherSkillInput } from "@sports/fantasy-engine";
import { parseCsv } from "./nflverse-source.js";
import { noStoreFetch } from "./no-store-fetch.js";
import { assertCleared, type SourceClearanceProof } from "./source-clearance.js";

export const SAVANT_SOURCE_ID = "baseball-savant";
export const SAVANT_BASE = "https://baseballsavant.mlb.com";

/** The six SMASH components + PA (the weighting/exposure column). */
export const SAVANT_SMASH_SELECTIONS = [
  "pa",
  "xwoba",
  "k_percent",
  "bb_percent",
  "barrel_batted_rate",
  "hard_hit_percent",
  "whiff_percent",
] as const;

export type SavantLeaderboardType = "batter" | "pitcher";

export class SavantError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SavantError";
  }
}

/**
 * Build the custom-leaderboard CSV export URL, pinned to the exact parameter
 * shape verified live 2026-07-11. `min: "q"` = qualified players.
 */
export function buildSavantCustomUrl(opts: {
  readonly year: number;
  readonly type: SavantLeaderboardType;
  readonly min?: "q" | number;
  readonly selections?: readonly string[];
}): string {
  const selections = (opts.selections ?? SAVANT_SMASH_SELECTIONS).join(",");
  const params = new URLSearchParams({
    year: String(opts.year),
    type: opts.type,
    filter: "",
    min: String(opts.min ?? "q"),
    selections,
    chart: "false",
    x: "xwoba",
    y: "xwoba",
    r: "no",
    chartType: "beeswarm",
    sort: "xwoba",
    sortDir: "desc",
    csv: "true",
  });
  return `${SAVANT_BASE}/leaderboard/custom?${params.toString()}`;
}

/** One parsed leaderboard row. Rates stay in PERCENT units (as served). */
export interface SavantCustomRow {
  readonly playerId: number;
  /** "last_name, first_name" as served — display key only. */
  readonly name: string;
  readonly year: number;
  /** Plate appearances (batters) / batters faced exposure (pitchers). NaN when absent. */
  readonly pa: number;
  readonly xwoba: number;
  readonly kPercent: number;
  readonly bbPercent: number;
  readonly barrelBattedRate: number;
  readonly hardHitPercent: number;
  readonly whiffPercent: number;
}

/** Savant serves ".300"-style decimals; Number() handles them. Empty → NaN. */
function savantNumber(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return Number.NaN;
  return Number(value);
}

/**
 * Parse the custom-leaderboard CSV (BOM-prefixed, quote-aware). Pure.
 * Rows missing a player_id are dropped (footer/blank artifacts), everything
 * else is preserved verbatim — the engine's documented NaN policy (tier=null,
 * never a fabricated rating) handles gaps downstream.
 */
export function parseSavantCustomCsv(text: string): SavantCustomRow[] {
  const { records } = parseCsv(text.replace(/^﻿/, ""));
  const rows: SavantCustomRow[] = [];
  for (const rec of records) {
    // Number("") is 0, so an empty id must be rejected BEFORE coercion.
    const idRaw = rec["player_id"];
    if (idRaw === undefined || idRaw.trim() === "") continue;
    const playerId = Number(idRaw);
    if (!Number.isFinite(playerId)) continue;
    rows.push({
      playerId,
      name: rec["last_name, first_name"] ?? "",
      year: Number(rec["year"]),
      pa: savantNumber(rec["pa"]),
      xwoba: savantNumber(rec["xwoba"]),
      kPercent: savantNumber(rec["k_percent"]),
      bbPercent: savantNumber(rec["bb_percent"]),
      barrelBattedRate: savantNumber(rec["barrel_batted_rate"]),
      hardHitPercent: savantNumber(rec["hard_hit_percent"]),
      whiffPercent: savantNumber(rec["whiff_percent"]),
    });
  }
  return rows;
}

/** A SMASH engine input paired with its display identity, order-aligned. */
export interface SavantSkillRow<T> {
  readonly playerId: number;
  readonly name: string;
  readonly pa: number;
  readonly input: T;
}

/** Map batter rows → HitterSkillInput population (percent units preserved). */
export function toHitterSkillInputs(
  rows: readonly SavantCustomRow[],
): SavantSkillRow<HitterSkillInput>[] {
  return rows.map((r) => ({
    playerId: r.playerId,
    name: r.name,
    pa: r.pa,
    input: {
      xwoba: r.xwoba,
      barrelBattedRate: r.barrelBattedRate,
      hardHitPercent: r.hardHitPercent,
      kPercent: r.kPercent,
      bbPercent: r.bbPercent,
      whiffPercent: r.whiffPercent,
    },
  }));
}

/** Map pitcher rows → PitcherSkillInput population (suppression view). */
export function toPitcherSkillInputs(
  rows: readonly SavantCustomRow[],
): SavantSkillRow<PitcherSkillInput>[] {
  return rows.map((r) => ({
    playerId: r.playerId,
    name: r.name,
    pa: r.pa,
    input: {
      xwoba: r.xwoba,
      barrelBattedRate: r.barrelBattedRate,
      hardHitPercent: r.hardHitPercent,
      kPercent: r.kPercent,
      bbPercent: r.bbPercent,
      whiffPercent: r.whiffPercent,
    },
  }));
}

/** Team-level Statcast-allowed aggregate (the three BURR Statcast columns). */
export interface TeamStatcastAllowed {
  readonly xwobaAllowed: number;
  readonly barrelAllowed: number;
  readonly hardHitAllowed: number;
}

/**
 * PA-weighted team aggregates from PITCHER rows (reference-engine convention:
 * weights clipped to ≥1 so a 0-PA row can't zero the denominator). Rows whose
 * playerId is absent from `pidToTeam` are skipped — the map is built from the
 * statsapi reliever pool, so this simultaneously restricts to relievers.
 */
export function buildTeamStatcastAllowed(
  pitcherRows: readonly SavantCustomRow[],
  pidToTeam: ReadonlyMap<number, string>,
): Map<string, TeamStatcastAllowed> {
  type Acc = { w: number; xwoba: number; barrel: number; hard: number };
  const acc = new Map<string, Acc>();
  for (const row of pitcherRows) {
    const team = pidToTeam.get(row.playerId);
    if (team === undefined) continue;
    const w = Math.max(Number.isFinite(row.pa) ? row.pa : 1, 1);
    const a = acc.get(team) ?? { w: 0, xwoba: 0, barrel: 0, hard: 0 };
    a.w += w;
    a.xwoba += row.xwoba * w;
    a.barrel += row.barrelBattedRate * w;
    a.hard += row.hardHitPercent * w;
    acc.set(team, a);
  }
  const out = new Map<string, TeamStatcastAllowed>();
  for (const [team, a] of acc) {
    out.set(team, {
      xwobaAllowed: a.xwoba / a.w,
      barrelAllowed: a.barrel / a.w,
      hardHitAllowed: a.hard / a.w,
    });
  }
  return out;
}

/**
 * Fetch one qualified-leaderboard snapshot. REQUIRES a granted clearance
 * proof for "baseball-savant" — there is no ungated overload. Non-bulk by
 * construction: one bounded CSV, the same table the public page shows.
 */
export async function fetchSavantSmashLeaderboard(
  opts: { readonly year: number; readonly type: SavantLeaderboardType; readonly min?: "q" | number },
  proof: SourceClearanceProof,
  fetchImpl: typeof globalThis.fetch = noStoreFetch,
): Promise<SavantCustomRow[]> {
  assertCleared(proof, SAVANT_SOURCE_ID);
  const url = buildSavantCustomUrl(opts);
  const res = await fetchImpl(url, {
    headers: { accept: "text/csv", "x-source-id": SAVANT_SOURCE_ID },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new SavantError(`Savant leaderboard fetch failed: HTTP ${res.status}`, res.status);
  }
  return parseSavantCustomCsv(await res.text());
}
