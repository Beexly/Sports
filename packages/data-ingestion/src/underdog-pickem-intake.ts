/**
 * Underdog Fantasy pick'em intake.
 *
 * No-auth higher/lower board via
 *   GET https://api.underdogfantasy.com/v2/over_under_lines
 *       ?product=fantasy&sport_id=NFL
 * Only product=fantasy is accepted (other product values 400).
 * The legacy /beta/v[4,5,6]/over_under_lines paths now return 426
 * upgrade_required — this v2 form is the live successor.
 *
 * VERIFIED LIVE 2026-09-25 (curl, this VM):
 *   -> HTTP 200, 11,936,504 bytes, 4,290 lines / 539 players,
 *      updated 2026-09-25, games 2026-09-27 (NFL Week 3).
 *
 * COMPOSES WITH: props-layer (prop-line inputs), prop-line-movement.
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 * The full board is one request per sport per refresh (~12 MB NFL) — no need
 * to hammer it; no 429s were observed in recon.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const UNDERDOG_PICKEM_INTAKE_ENABLED_ENV = "UNDERDOG_PICKEM_INTAKE_ENABLED";

export const UNDERDOG_API_BASE = "https://api.underdogfantasy.com";

export function underdogPickemIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, UNDERDOG_PICKEM_INTAKE_ENABLED_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** A normalized higher/lower line from the Underdog pick'em board. */
export interface UnderdogPickemLine {
  readonly lineId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  /** e.g. "Rush Yards" */
  readonly displayStat: string;
  /** e.g. "rushing_yds" */
  readonly statKey: string;
  /** The line offered (e.g. 63.5). */
  readonly lineValue: number;
  readonly higherAmericanPrice: string | null;
  readonly lowerAmericanPrice: string | null;
  readonly higherDecimalPrice: number | null;
  readonly lowerDecimalPrice: number | null;
  readonly status: string;
  readonly updatedAt: string;
  readonly source: string;
}

export const UNDERDOG_PICKEM_SOURCE = "underdog-pickem-api";

interface RawLine {
  readonly id?: unknown;
  readonly stat_value?: unknown;
  readonly status?: unknown;
  readonly updated_at?: unknown;
  readonly over_under?: {
    readonly appearance_stat?: {
      readonly appearance_id?: unknown;
      readonly display_stat?: unknown;
      readonly stat?: unknown;
    };
  };
  readonly options?: readonly {
    readonly choice?: unknown;
    readonly american_price?: unknown;
    readonly decimal_price?: unknown;
  }[];
}

interface RawAppearance {
  readonly id?: unknown;
  readonly player_id?: unknown;
}

interface RawPlayer {
  readonly id?: unknown;
  readonly first_name?: unknown;
  readonly last_name?: unknown;
  readonly position_display_name?: unknown;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function playerName(p: RawPlayer): string {
  const first = asString(p.first_name) ?? "";
  const last = asString(p.last_name) ?? "";
  const full = `${first} ${last}`.trim();
  return full.length > 0 ? full : "unknown";
}

/**
 * Ingest a raw `/v2/over_under_lines` payload into normalized higher/lower
 * lines. Appearance ids are joined to players for names. Lines missing the
 * line value, stat key, or player link are rejected; inactive lines are
 * skipped (not errors).
 */
export function ingestUnderdogPickemLines(
  payload: {
    readonly over_under_lines?: readonly RawLine[];
    readonly appearances?: readonly RawAppearance[];
    readonly players?: readonly RawPlayer[];
  },
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly UnderdogPickemLine[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
  readonly skippedInactive: number;
}> {
  if (!underdogPickemIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `underdog pickem intake disabled — set ${UNDERDOG_PICKEM_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || !Array.isArray(payload.over_under_lines)) {
    return { ok: false, reason: "payload.over_under_lines must be an array" };
  }

  const appearanceToPlayer = new Map<string, string>();
  for (const a of payload.appearances ?? []) {
    const aid = asString(a?.id);
    const pid = asString(a?.player_id);
    if (aid && pid) appearanceToPlayer.set(aid, pid);
  }
  const players = new Map<string, RawPlayer>();
  for (const p of payload.players ?? []) {
    const pid = asString(p?.id);
    if (pid) players.set(pid, p);
  }

  const accepted: UnderdogPickemLine[] = [];
  const rejected: { index: number; reason: string }[] = [];
  let skippedInactive = 0;

  payload.over_under_lines.forEach((line, i) => {
    const status = asString(line?.status) ?? "unknown";
    if (status !== "active") {
      skippedInactive += 1;
      return;
    }
    const lineId = asString(line?.id);
    const lineValue = asFiniteNumber(line?.stat_value);
    const stat = line?.over_under?.appearance_stat;
    const appearanceId = asString(stat?.appearance_id);
    const displayStat = asString(stat?.display_stat);
    const statKey = asString(stat?.stat);
    const updatedAt = asString(line?.updated_at);

    if (!lineId || lineValue === null || !appearanceId || !displayStat || !statKey || !updatedAt) {
      rejected.push({ index: i, reason: "missing line/stat/player-link/timestamp" });
      return;
    }
    if (Date.parse(updatedAt) > t) {
      rejected.push({ index: i, reason: "updated_at after as-of cutoff" });
      return;
    }

    const playerId = appearanceToPlayer.get(appearanceId);
    const player = playerId ? players.get(playerId) : undefined;
    if (!playerId || !player) {
      rejected.push({ index: i, reason: "appearance not linked to a known player" });
      return;
    }

    let higherAmerican: string | null = null;
    let lowerAmerican: string | null = null;
    let higherDecimal: number | null = null;
    let lowerDecimal: number | null = null;
    for (const opt of line?.options ?? []) {
      if (opt?.choice === "higher") {
        higherAmerican = asString(opt.american_price);
        higherDecimal = asFiniteNumber(opt.decimal_price);
      } else if (opt?.choice === "lower") {
        lowerAmerican = asString(opt.american_price);
        lowerDecimal = asFiniteNumber(opt.decimal_price);
      }
    }

    accepted.push({
      lineId,
      playerId,
      playerName: playerName(player),
      position: asString(player.position_display_name) ?? "unknown",
      displayStat,
      statKey,
      lineValue,
      higherAmericanPrice: higherAmerican,
      lowerAmericanPrice: lowerAmerican,
      higherDecimalPrice: higherDecimal,
      lowerDecimalPrice: lowerDecimal,
      status,
      updatedAt,
      source: UNDERDOG_PICKEM_SOURCE,
    });
  });

  return { ok: true, data: { accepted, rejected, skippedInactive } };
}
