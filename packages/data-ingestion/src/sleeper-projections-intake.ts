/**
 * Sleeper projections + weekly stats intake.
 *
 * The Sleeper public API (https://docs.sleeper.com, no auth) ships weekly
 * player projections (ADP + projected stat lines) and weekly box-score
 * stats. This fills the gap beside sleeper-intake.ts (depth charts /
 * injuries) and sleeper-feeds-client.ts (state / players / trending).
 *
 * VERIFIED LIVE 2026-09-25 (curl, this VM):
 *   GET https://api.sleeper.app/v1/projections/nfl/regular/2026/4
 *     -> HTTP 200, 628,382 bytes, 9,422 players keyed by player_id.
 *     Sample: {"11533":{"adp_dd_ppr":999.0,"fga":2.35,"fgm":2.04,...}}
 *   GET https://api.sleeper.app/v1/stats/nfl/regular/2026/3
 *     -> HTTP 200, 36,310 bytes.
 *     Sample: {"12586":{"gms_active":1,"pos_rank_half_ppr":12,...}}
 *
 * Documented limit: stay under 1,000 calls/min or the IP gets blocked.
 * Cache /v1/players/nfl daily (~14.7 MB); projections/stats are per-week.
 *
 * COMPOSES WITH: sleeper-feeds-client (transport), projection inputs.
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const SLEEPER_PROJECTIONS_INTAKE_ENABLED_ENV = "SLEEPER_PROJECTIONS_INTAKE_ENABLED";

export function sleeperProjectionsIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, SLEEPER_PROJECTIONS_INTAKE_ENABLED_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** One player's normalized weekly projection row. */
export interface SleeperPlayerProjection {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly adp: number | null;
  readonly posAdp: number | null;
  readonly ptsPpr: number | null;
  readonly ptsHalfPpr: number | null;
  readonly ptsStd: number | null;
  readonly gamesProjected: number | null;
  /** All remaining numeric keys are projected stat values. */
  readonly statProjections: Record<string, number>;
  readonly asOf: string;
  readonly source: string;
}

/** One player's normalized weekly stat row. */
export interface SleeperPlayerWeekStats {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly gamesActive: number;
  readonly posRankPpr: number | null;
  readonly posRankHalfPpr: number | null;
  readonly posRankStd: number | null;
  /** All remaining numeric keys are actual stat values. */
  readonly stats: Record<string, number>;
  readonly asOf: string;
  readonly source: string;
}

export const SLEEPER_PROJECTIONS_SOURCE = "sleeper-projections-api";

const PROJECTION_KNOWN_KEYS = new Set([
  "adp_dd_ppr",
  "pos_adp_dd_ppr",
  "pts_ppr",
  "pts_half_ppr",
  "pts_std",
  "gp",
]);

const STATS_KNOWN_KEYS = new Set([
  "gms_active",
  "pos_rank_ppr",
  "pos_rank_half_ppr",
  "pos_rank_std",
]);

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function splitNumericRecord(
  record: Record<string, unknown>,
  known: Set<string>,
): { readonly known: Record<string, number | null>; readonly rest: Record<string, number> } {
  const knownOut: Record<string, number | null> = {};
  const rest: Record<string, number> = {};
  for (const [k, v] of Object.entries(record)) {
    const n = asFiniteNumber(v);
    if (n === null) continue;
    if (known.has(k)) knownOut[k] = n;
    else rest[k] = n;
  }
  return { known: knownOut, rest };
}

/**
 * Ingest a raw `/v1/projections/nfl/regular/{season}/{week}` payload
 * (player_id -> projection record) into normalized rows.
 */
export function ingestSleeperProjections(
  season: number,
  week: number,
  payload: Record<string, Record<string, unknown>>,
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly SleeperPlayerProjection[] }> {
  if (!sleeperProjectionsIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `sleeper projections intake disabled — set ${SLEEPER_PROJECTIONS_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  if (!Number.isInteger(season) || season < 2000 || !Number.isInteger(week) || week < 1) {
    return { ok: false, reason: "invalid season/week" };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "payload must be an object" };
  }

  const accepted: SleeperPlayerProjection[] = [];
  for (const [playerId, record] of Object.entries(payload)) {
    if (!record || typeof record !== "object") continue;
    const { known, rest } = splitNumericRecord(record, PROJECTION_KNOWN_KEYS);
    accepted.push({
      playerId,
      season,
      week,
      adp: known["adp_dd_ppr"] ?? null,
      posAdp: known["pos_adp_dd_ppr"] ?? null,
      ptsPpr: known["pts_ppr"] ?? null,
      ptsHalfPpr: known["pts_half_ppr"] ?? null,
      ptsStd: known["pts_std"] ?? null,
      gamesProjected: known["gp"] ?? null,
      statProjections: rest,
      asOf: asOfTime,
      source: SLEEPER_PROJECTIONS_SOURCE,
    });
  }

  return { ok: true, data: { accepted } };
}

/**
 * Ingest a raw `/v1/stats/nfl/regular/{season}/{week}` payload
 * (player_id -> stat record) into normalized rows.
 */
export function ingestSleeperWeekStats(
  season: number,
  week: number,
  payload: Record<string, Record<string, unknown>>,
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly SleeperPlayerWeekStats[] }> {
  if (!sleeperProjectionsIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `sleeper projections intake disabled — set ${SLEEPER_PROJECTIONS_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  if (!Number.isInteger(season) || season < 2000 || !Number.isInteger(week) || week < 1) {
    return { ok: false, reason: "invalid season/week" };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "payload must be an object" };
  }

  const accepted: SleeperPlayerWeekStats[] = [];
  for (const [playerId, record] of Object.entries(payload)) {
    if (!record || typeof record !== "object") continue;
    const { known, rest } = splitNumericRecord(record, STATS_KNOWN_KEYS);
    accepted.push({
      playerId,
      season,
      week,
      gamesActive: Math.trunc(known["gms_active"] ?? 0),
      posRankPpr: known["pos_rank_ppr"] ?? null,
      posRankHalfPpr: known["pos_rank_half_ppr"] ?? null,
      posRankStd: known["pos_rank_std"] ?? null,
      stats: rest,
      asOf: asOfTime,
      source: SLEEPER_PROJECTIONS_SOURCE,
    });
  }

  return { ok: true, data: { accepted } };
}
