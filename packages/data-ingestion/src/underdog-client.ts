/**
 * Underdog Fantasy stats API client — sports, scoring types, NFL slates, slate projections.
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200 on GET /v2/sports, GET /v1/scoring_types,
 * GET /v1/sports/NFL/slates (7 live NFL slates; e.g. "Sun Main Slate"
 * dcd3a8d7-53e3-485f-a8be-bf5e0e413676, 13 games, start 2026-09-20T17:00:00Z)
 * and GET /v1/slates/{slate_id}/scoring_types/{scoring_id}/appearances
 * (1,690 appearances carrying points/adp/salary/position_rank; sample
 * appearance: projectedPoints 22.5, adp 1.1, salary 97, positionRank "RB1").
 * Appearances are keyed by player_id only — names must join from another source.
 *
 * REGISTRY IDS: "underdog-stats" (sports / scoring types / slates),
 * "underdog-projections" (slate appearances). Both verdict "use-with-caution".
 *
 * LEGAL NOTE: undocumented internal endpoints (documented only by third
 * parties; no login). The provider may change or gate them without notice and
 * grants no commercial rights. Default OFF behind UNDERDOG_INGEST; every call
 * asserts registry ingestibility first. GET only, 15s timeout.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const UNDERDOG_STATS_SOURCE_ID = "underdog-stats";
export const UNDERDOG_PROJECTIONS_SOURCE_ID = "underdog-projections";
export const UNDERDOG_BASE = "https://stats.underdogfantasy.com";
export const UNDERDOG_ATTRIBUTION = "Slate data via Underdog Fantasy.";
/** Registry attribution for the projections feed (underdog-projections). */
export const UNDERDOG_PROJECTIONS_ATTRIBUTION = "Projections via Underdog Fantasy.";
const USER_AGENT = "GSE-DataIngestion/1.0";
const TIMEOUT_MS = 15_000;

export function isUnderdogIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "UNDERDOG_INGEST");
}

export class UnderdogError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UnderdogError";
  }
}

export interface UnderdogSport {
  readonly id: string;
  readonly name: string;
  readonly gameType: string | null;
  readonly draftStatus: string | null;
}

export interface UnderdogScoringType {
  readonly id: string;
  readonly sportId: string;
  readonly title: string;
}

export interface UnderdogSlate {
  readonly id: string;
  readonly title: string;
  readonly sportId: string;
  readonly gameCount: number | null;
  readonly startAt: string | null;
  readonly cutoffAt: string | null;
  readonly showSalaries: boolean | null;
}

export interface UnderdogAppearance {
  readonly playerId: string;
  readonly positionId: string | null;
  readonly teamId: string | null;
  readonly matchId: string | null;
  readonly projectedPoints: number | null;
  readonly adp: number | null;
  readonly salary: number | null;
  readonly positionRank: string | null;
  readonly avgWeeklyPoints: number | null;
  readonly lineupStatusId: string | null;
}

/** First non-undefined value under any of the candidate keys (snake/camel). */
function pickFirst(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function strVal(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numVal(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boolVal(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Array at the top level or under the first matching field name. */
function asArrayField(body: unknown, ...fields: string[]): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    for (const field of fields) {
      const value = obj[field];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function asSports(body: unknown): UnderdogSport[] {
  const out: UnderdogSport[] = [];
  for (const row of asArrayField(body, "sports")) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = strVal(pickFirst(r, "id"));
    if (!id) continue;
    out.push({
      id,
      name: strVal(pickFirst(r, "name")) ?? "",
      gameType: strVal(pickFirst(r, "game_type", "gameType")),
      draftStatus: strVal(pickFirst(r, "draft_status", "draftStatus")),
    });
  }
  return out;
}

function asScoringTypes(body: unknown): UnderdogScoringType[] {
  const out: UnderdogScoringType[] = [];
  for (const row of asArrayField(body, "scoring_types", "scoringTypes")) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = strVal(pickFirst(r, "id"));
    if (!id) continue;
    out.push({
      id,
      sportId: strVal(pickFirst(r, "sport_id", "sportId")) ?? "",
      title: strVal(pickFirst(r, "title")) ?? "",
    });
  }
  return out;
}

function asSlates(body: unknown): UnderdogSlate[] {
  const out: UnderdogSlate[] = [];
  for (const row of asArrayField(body, "slates")) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = strVal(pickFirst(r, "id"));
    if (!id) continue;
    out.push({
      id,
      title: strVal(pickFirst(r, "title")) ?? "",
      sportId: strVal(pickFirst(r, "sport_id", "sportId")) ?? "",
      gameCount: numVal(pickFirst(r, "game_count", "gameCount")),
      startAt: strVal(pickFirst(r, "start_at", "startAt")),
      cutoffAt: strVal(pickFirst(r, "cutoff_at", "cutoffAt")),
      showSalaries: boolVal(pickFirst(r, "show_salaries", "showSalaries")),
    });
  }
  return out;
}

function asAppearances(body: unknown): UnderdogAppearance[] {
  const out: UnderdogAppearance[] = [];
  for (const row of asArrayField(body, "appearances")) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const playerId = strVal(pickFirst(r, "player_id", "playerId"));
    if (!playerId) continue;
    out.push({
      playerId,
      positionId: strVal(pickFirst(r, "position_id", "positionId")),
      teamId: strVal(pickFirst(r, "team_id", "teamId")),
      matchId: strVal(pickFirst(r, "match_id", "matchId")),
      projectedPoints: numVal(pickFirst(r, "projected_points", "projectedPoints")),
      adp: numVal(pickFirst(r, "adp")),
      salary: numVal(pickFirst(r, "salary")),
      positionRank: strVal(pickFirst(r, "position_rank", "positionRank")),
      avgWeeklyPoints: numVal(pickFirst(r, "avg_weekly_points", "avgWeeklyPoints")),
      lineupStatusId: strVal(pickFirst(r, "lineup_status_id", "lineupStatusId")),
    });
  }
  return out;
}

export class UnderdogClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async getJson(path: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${UNDERDOG_BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new UnderdogError(`Underdog HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sports catalog. Returns null when the ingest flag is off. */
  async listSports(): Promise<UnderdogSport[] | null> {
    if (!isUnderdogIngestEnabled(this.env)) return null;
    assertIngestible(UNDERDOG_STATS_SOURCE_ID);
    return asSports(await this.getJson("/v2/sports"));
  }

  /** Scoring types (projection formats). Returns null when the ingest flag is off. */
  async listScoringTypes(): Promise<UnderdogScoringType[] | null> {
    if (!isUnderdogIngestEnabled(this.env)) return null;
    assertIngestible(UNDERDOG_STATS_SOURCE_ID);
    return asScoringTypes(await this.getJson("/v1/scoring_types"));
  }

  /** NFL slates. Returns null when the ingest flag is off. */
  async listNflSlates(): Promise<UnderdogSlate[] | null> {
    if (!isUnderdogIngestEnabled(this.env)) return null;
    assertIngestible(UNDERDOG_STATS_SOURCE_ID);
    return asSlates(await this.getJson("/v1/sports/NFL/slates"));
  }

  /** Per-player projections for one slate + scoring type. Returns null when the flag is off. */
  async getSlateProjections(
    slateId: string,
    scoringId: string,
  ): Promise<UnderdogAppearance[] | null> {
    if (!isUnderdogIngestEnabled(this.env)) return null;
    assertIngestible(UNDERDOG_PROJECTIONS_SOURCE_ID);
    const path = `/v1/slates/${encodeURIComponent(slateId)}/scoring_types/${encodeURIComponent(scoringId)}/appearances`;
    return asAppearances(await this.getJson(path));
  }
}
