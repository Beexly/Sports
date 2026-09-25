/**
 * PrizePicks projections intake.
 *
 * No-auth pick'em board via the PrizePicks partner API
 * (https://partner-api.prizepicks.com). The classic api.prizepicks.com host
 * is DataDome bot-walled as of 2026-09-25 — the partner host returns the
 * same projections JSON:API payload without a challenge.
 *
 * VERIFIED LIVE 2026-09-25 (curl, this VM):
 *   GET https://partner-api.prizepicks.com/projections?league_id=9
 *   -> HTTP 200, 8,718,369 bytes, 7,554 NFL projections,
 *      updated_at 2026-09-25T13:26-04:00, games 2026-09-27.
 *   GET /leagues -> HTTP 200 (league id -> name map).
 *
 * COMPOSES WITH: props-layer (prop-line inputs), prop-line-movement (line history).
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 * Keep request rates gentle — no documented limit; community guidance is
 * ~2s between requests.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const PRIZEPICKS_INTAKE_ENABLED_ENV = "PRIZEPICKS_INTAKE_ENABLED";

/** Working partner host. The classic api.prizepicks.com is bot-walled. */
export const PRIZEPICKS_PARTNER_BASE = "https://partner-api.prizepicks.com";

/** Known league ids (from GET /leagues, observed 2026-09-25). */
export const PRIZEPICKS_LEAGUE_IDS: Record<string, number> = {
  NFL: 9,
  NBA: 7,
  CFB: 15,
  MLB: 2,
  UFC: 12,
  NHL: 8,
  WNBA: 3,
  PGA: 1,
  TENNIS: 5,
  SOCCER: 82,
  F1: 125,
  BOXING: 42,
  WORLD_CUP: 241,
};

export function prizepicksIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, PRIZEPICKS_INTAKE_ENABLED_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** A single normalized pick'em projection row. */
export interface PrizePicksProjection {
  readonly projectionId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly statType: string;
  readonly statDisplayName: string;
  /** The line offered (e.g. 2.5). */
  readonly lineScore: number;
  readonly startTime: string;
  readonly boardTime: string | null;
  readonly updatedAt: string;
  readonly status: string;
  readonly projectionType: string;
  readonly allowedWagerTypes: string;
  readonly isPromo: boolean;
  readonly source: string;
}

export const PRIZEPICKS_SOURCE = "prizepicks-partner-api";

/** JSON:API "included" entry carrying player names. */
interface IncludedEntry {
  readonly type?: unknown;
  readonly id?: unknown;
  readonly attributes?: Record<string, unknown>;
}

/**
 * Build a player-id -> display-name map from the JSON:API `included` array.
 * Only `new_player` entries are used.
 */
export function buildPrizePicksPlayerNameMap(
  included: readonly IncludedEntry[] | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(included)) return map;
  for (const entry of included) {
    if (!entry || entry.type !== "new_player") continue;
    const id = typeof entry.id === "string" ? entry.id : null;
    if (!id) continue;
    const attrs = entry.attributes ?? {};
    const name =
      typeof attrs["display_name"] === "string" && attrs["display_name"]
        ? (attrs["display_name"] as string)
        : typeof attrs["name"] === "string"
          ? (attrs["name"] as string)
          : null;
    if (name) map.set(id, name);
  }
  return map;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Ingest raw `GET /projections?league_id=<id>` JSON:API payloads into
 * normalized projection rows. Rows are pre-game by nature, so future
 * start times are normal — but any row observed (updated_at) after the
 * as-of cutoff is rejected, as are rows missing a numeric line_score
 * or player link.
 */
export function ingestPrizePicksProjections(
  payload: {
    readonly data?: readonly {
      readonly id?: unknown;
      readonly attributes?: Record<string, unknown>;
      readonly relationships?: {
        readonly new_player?: { readonly data?: { readonly id?: unknown } };
      };
    }[];
    readonly included?: readonly IncludedEntry[];
  },
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly PrizePicksProjection[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
}> {
  if (!prizepicksIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `prizepicks intake disabled — set ${PRIZEPICKS_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || !Array.isArray(payload.data)) {
    return { ok: false, reason: "payload.data must be an array" };
  }

  const nameMap = buildPrizePicksPlayerNameMap(payload.included);
  const accepted: PrizePicksProjection[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < payload.data.length; i++) {
    const row = payload.data[i];
    const attrs = row?.attributes ?? {};
    const projectionId = asString(row?.id);
    const playerId = asString(row?.relationships?.new_player?.data?.id);
    const lineScore = asNumber(attrs["line_score"]);
    const statType = asString(attrs["stat_type"]);
    const startTime = asString(attrs["start_time"]);
    const updatedAt = asString(attrs["updated_at"]);

    if (!projectionId) {
      rejected.push({ index: i, reason: "missing projection id" });
      continue;
    }
    if (!playerId || !statType || lineScore === null) {
      rejected.push({ index: i, reason: "missing player/stat/line" });
      continue;
    }
    if (!startTime || !updatedAt) {
      rejected.push({ index: i, reason: "missing start_time/updated_at" });
      continue;
    }
    const startMs = Date.parse(startTime);
    if (!Number.isFinite(startMs)) {
      rejected.push({ index: i, reason: "invalid start_time" });
      continue;
    }
    if (Date.parse(updatedAt) > t) {
      rejected.push({ index: i, reason: "updated_at after as-of cutoff" });
      continue;
    }

    accepted.push({
      projectionId,
      playerId,
      playerName: nameMap.get(playerId) ?? "unknown",
      statType,
      statDisplayName: asString(attrs["stat_display_name"]) ?? statType,
      lineScore,
      startTime,
      boardTime: asString(attrs["board_time"]),
      updatedAt,
      status: asString(attrs["status"]) ?? "unknown",
      projectionType: asString(attrs["projection_type"]) ?? "unknown",
      allowedWagerTypes: asString(attrs["allowed_wager_types"]) ?? "unknown",
      isPromo: attrs["is_promo"] === true,
      source: PRIZEPICKS_SOURCE,
    });
  }

  return { ok: true, data: { accepted, rejected } };
}
