/**
 * Drafters pick'em props intake (KEY verdict).
 *
 * Drafters exposes NO public/no-auth API. Every data endpoint requires the
 * user's own session Bearer token. The legitimate, documented method (per
 * the public scraper repo aidanhall21/drafters-scraper, observed 2026-09-25)
 * is the account owner copying their OWN Bearer token from their own
 * logged-in browser devtools (Authorization: Bearer ... on Drafters' own
 * requests). Nothing here bypasses authentication or uses anyone else's
 * session — the token comes only from DRAFTERS_BEARER_TOKEN, which the
 * account owner supplies.
 *
 * Endpoints (reverse-engineered from Drafters' own shipped Angular bundle
 * https://drafters.com/drafts/main.js, fetched 2026-09-25 — public
 * read-only bundle analysis, no creds used):
 *   GET https://node.drafters.com/props-game/get-props-games/{league_id}?stats=
 *     -> HTTP 403 {"status":false,"message":"A token is required for authentication"}
 *        without a token (verified live 2026-09-25). League ids: NFL=2,
 *        CFB=10, NHL=1, CBB=7, NBA=4, MLB=3.
 *
 * Gating: DRAFTERS_INTAKE_ENABLED=true AND DRAFTERS_BEARER_TOKEN set.
 * Fail-closed when either is missing. Never log or commit the token.
 *
 * COMPOSES WITH: props-layer (prop-line inputs).
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled, envSecret } from "./fail-closed-env.js";

export const DRAFTERS_INTAKE_ENABLED_ENV = "DRAFTERS_INTAKE_ENABLED";
/**
 * The user's OWN Drafters session Bearer token, copied from their own
 * logged-in browser devtools. Required by Drafters' servers on every call.
 */
export const DRAFTERS_BEARER_TOKEN_ENV = "DRAFTERS_BEARER_TOKEN";

export const DRAFTERS_NODE_BASE = "https://node.drafters.com";
export const DRAFTERS_PHP_BASE = "https://api.drafters.com";

/** League ids for the props-game board (from public reverse-engineering). */
export const DRAFTERS_LEAGUE_IDS: Record<string, number> = {
  NFL: 2,
  CFB: 10,
  NHL: 1,
  CBB: 7,
  NBA: 4,
  MLB: 3,
};

export function draftersIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, DRAFTERS_INTAKE_ENABLED_ENV);
}

/** The user-supplied Bearer token, or null when not configured. */
export function draftersBearerToken(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return envSecret(env, DRAFTERS_BEARER_TOKEN_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** A normalized Drafters props-game line. */
export interface DraftersPropLine {
  readonly propId: string;
  readonly playerName: string;
  readonly position: string;
  readonly question: string;
  readonly bidStatsName: string;
  /** The offered line value. */
  readonly bidStatsValue: number;
  readonly gameId: string;
  readonly lockTime: string | null;
  /** e.g. ["over","under"] */
  readonly options: readonly string[];
  readonly homeTeam: string | null;
  readonly awayTeam: string | null;
  readonly asOf: string;
  readonly source: string;
}

export const DRAFTERS_SOURCE = "drafters-props-api";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

interface DraftersPropsPayload {
  readonly entities?: readonly {
    readonly players?: readonly {
      readonly prop_id?: unknown;
      readonly player_name?: unknown;
      readonly position?: unknown;
      readonly question?: unknown;
      readonly bid_stats_name?: unknown;
      readonly bid_stats_value?: unknown;
      readonly game_id?: unknown;
      readonly lock_time?: unknown;
      readonly options?: unknown;
      readonly event?: {
        readonly home?: unknown;
        readonly away?: unknown;
      };
    }[];
  }[];
}

/**
 * Ingest a raw `GET /props-game/get-props-games/{league_id}` payload into
 * normalized prop lines. Requires BOTH the enable flag and a user-supplied
 * Bearer token (fail-closed without either). Lines whose lock_time has passed
 * relative to the as-of cutoff are rejected.
 */
export function ingestDraftersPropsGame(
  league: string,
  payload: DraftersPropsPayload,
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly DraftersPropLine[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
}> {
  if (!draftersIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `drafters intake disabled — set ${DRAFTERS_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const token = draftersBearerToken(env);
  if (!token) {
    return {
      ok: false,
      reason:
        `drafters intake requires ${DRAFTERS_BEARER_TOKEN_ENV} — copy your own ` +
        `Bearer token from your logged-in Drafters browser session; never commit it`,
    };
  }
  if (!(league.toUpperCase() in DRAFTERS_LEAGUE_IDS)) {
    return { ok: false, reason: `unknown league: ${league}` };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || !Array.isArray(payload.entities)) {
    return { ok: false, reason: "payload.entities must be an array" };
  }

  const accepted: DraftersPropLine[] = [];
  const rejected: { index: number; reason: string }[] = [];
  let idx = 0;

  for (const entity of payload.entities) {
    for (const p of entity?.players ?? []) {
      const propId = asString(p?.prop_id);
      const playerName = asString(p?.player_name);
      const bidStatsName = asString(p?.bid_stats_name);
      const bidStatsValue = asFiniteNumber(p?.bid_stats_value);
      const gameId = asString(p?.game_id);
      const lockTime = asString(p?.lock_time);

      if (!propId || !playerName || !bidStatsName || bidStatsValue === null || !gameId) {
        rejected.push({ index: idx, reason: "missing prop/player/stat/game fields" });
        idx += 1;
        continue;
      }
      if (lockTime && Date.parse(lockTime) <= t) {
        rejected.push({ index: idx, reason: "lock_time passed — entry window closed" });
        idx += 1;
        continue;
      }

      const options = Array.isArray(p?.options)
        ? (p!.options as unknown[]).filter((o): o is string => typeof o === "string")
        : [];

      accepted.push({
        propId,
        playerName,
        position: asString(p?.position) ?? "unknown",
        question: asString(p?.question) ?? "",
        bidStatsName,
        bidStatsValue,
        gameId,
        lockTime,
        options,
        homeTeam: asString(p?.event?.home),
        awayTeam: asString(p?.event?.away),
        asOf: asOfTime,
        source: DRAFTERS_SOURCE,
      });
      idx += 1;
    }
  }

  return { ok: true, data: { accepted, rejected } };
}
