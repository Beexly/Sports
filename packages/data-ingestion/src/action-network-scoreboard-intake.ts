/**
 * Action Network scoreboard intake (per-book odds).
 *
 * The existing action-network-client.ts covers /nfl/public-betting.
 * This module covers the no-auth scoreboard API, which returns per-book
 * odds (DraftKings book_id=15, FanDuel book_id=30, Caesars=68, BetMGM=69,
 * ...) for every game on a date — the clean alternative to FanDuel's
 * fragile sbapi _ak token.
 *
 * VERIFIED LIVE 2026-09-25 (curl, this VM):
 *   GET https://api.actionnetwork.com/web/v1/scoreboard/nfl
 *       ?date=20260927&bookIds=15,30
 *   -> HTTP 200, 908,305 bytes, 16 NFL games (Week 3, 2026-09-27),
 *      each with per-book moneyline/spread/total rows.
 *
 * COMPOSES WITH: action-network-client (transport-adjacent), odds inputs.
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED_ENV =
  "ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED";

export const ACTION_NETWORK_SCOREBOARD_BASE = "https://api.actionnetwork.com";

/** Book ids observed in the scoreboard API (DK=15, FD=30 per worker recon). */
export const ACTION_NETWORK_BOOK_IDS: Record<string, number> = {
  DRAFTKINGS: 15,
  FANDUEL: 30,
  CAESARS: 68,
  BETMGM: 69,
};

export function actionNetworkScoreboardIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** One book's moneyline/spread/total row for one game. */
export interface ActionNetworkBookOdds {
  readonly gameId: number;
  readonly league: string;
  readonly season: string;
  readonly week: number | null;
  readonly awayAbbr: string;
  readonly homeAbbr: string;
  readonly startTime: string;
  readonly status: string;
  readonly bookId: number;
  readonly moneylineAway: number | null;
  readonly moneylineHome: number | null;
  readonly spreadAway: number | null;
  readonly spreadHome: number | null;
  readonly spreadAwayLine: number | null;
  readonly spreadHomeLine: number | null;
  readonly total: number | null;
  readonly totalOver: number | null;
  readonly totalUnder: number | null;
  readonly lineStatus: string | null;
  readonly asOf: string;
  readonly source: string;
}

export const ACTION_NETWORK_SCOREBOARD_SOURCE = "action-network-scoreboard-api";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface ScoreboardGame {
  readonly id?: unknown;
  readonly status?: unknown;
  readonly start_time?: unknown;
  readonly season?: unknown;
  readonly week?: unknown;
  readonly league_name?: unknown;
  readonly teams?: readonly { readonly abbr?: unknown }[];
  readonly odds?: readonly {
    readonly book_id?: unknown;
    readonly ml_away?: unknown;
    readonly ml_home?: unknown;
    readonly spread_away?: unknown;
    readonly spread_home?: unknown;
    readonly spread_away_line?: unknown;
    readonly spread_home_line?: unknown;
    readonly total?: unknown;
    readonly over?: unknown;
    readonly under?: unknown;
    readonly line_status?: unknown;
  }[];
}

/**
 * Ingest a raw `/web/v1/scoreboard/{league}` payload into normalized
 * per-book odds rows. Only games whose start_time is at/after the as-of
 * cutoff are accepted (no stale-board rows leak in). Rows missing the
 * game id, teams, or start time are rejected.
 */
export function ingestActionNetworkScoreboard(
  payload: { readonly games?: readonly ScoreboardGame[] },
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly ActionNetworkBookOdds[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
}> {
  if (!actionNetworkScoreboardIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `action network scoreboard intake disabled — set ${ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || !Array.isArray(payload.games)) {
    return { ok: false, reason: "payload.games must be an array" };
  }

  const accepted: ActionNetworkBookOdds[] = [];
  const rejected: { index: number; reason: string }[] = [];

  payload.games.forEach((game, gi) => {
    const gameId = asFiniteNumber(game?.id);
    const startTime = asString(game?.start_time);
    const teams = game?.teams ?? [];
    const awayAbbr = asString(teams[0]?.abbr);
    const homeAbbr = asString(teams[1]?.abbr);

    if (gameId === null || !startTime || !awayAbbr || !homeAbbr) {
      rejected.push({ index: gi, reason: "missing game id/teams/start_time" });
      return;
    }
    if (Date.parse(startTime) < t) {
      rejected.push({ index: gi, reason: "start_time before as-of cutoff (stale board)" });
      return;
    }

    for (const odd of game?.odds ?? []) {
      const bookId = asFiniteNumber(odd?.book_id);
      if (bookId === null) continue;
      accepted.push({
        gameId: Math.trunc(gameId),
        league: asString(game?.league_name) ?? "unknown",
        season: asString(game?.season) ?? "unknown",
        week: asFiniteNumber(game?.week) !== null ? Math.trunc(asFiniteNumber(game?.week)!) : null,
        awayAbbr,
        homeAbbr,
        startTime,
        status: asString(game?.status) ?? "unknown",
        bookId: Math.trunc(bookId),
        moneylineAway: asFiniteNumber(odd?.ml_away),
        moneylineHome: asFiniteNumber(odd?.ml_home),
        spreadAway: asFiniteNumber(odd?.spread_away),
        spreadHome: asFiniteNumber(odd?.spread_home),
        spreadAwayLine: asFiniteNumber(odd?.spread_away_line),
        spreadHomeLine: asFiniteNumber(odd?.spread_home_line),
        total: asFiniteNumber(odd?.total),
        totalOver: asFiniteNumber(odd?.over),
        totalUnder: asFiniteNumber(odd?.under),
        lineStatus: asString(odd?.line_status),
        asOf: asOfTime,
        source: ACTION_NETWORK_SCOREBOARD_SOURCE,
      });
    }
  });

  return { ok: true, data: { accepted, rejected } };
}
