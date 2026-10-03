/**
 * Sleeper feeds client — NFL state, player master + ID crosswalk, trending adds/drops.
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200 on GET /v1/state/nfl
 * ({season: "2026", week: 2, season_type: "regular"}), GET /v1/players/nfl
 * (14,656,940 bytes, 12,228 players with full cross-platform ID map;
 * player "6462" carries espn_id 3926590, yahoo_id 32262,
 * gsis_id "00-0035057"), and GET /v1/players/nfl/trending/add
 * (top add: 515,538 adds/24h on player_id "6130").
 *
 * REGISTRY IDS: "sleeper-state", "sleeper-players", "sleeper-trending".
 * All verdict "use-with-caution".
 *
 * LEGAL NOTE: Sleeper API Terms — free for non-commercial use; commercial use
 * requires a licensing agreement, which GSE does not have. Default OFF behind
 * SLEEPER_FEEDS_INGEST; every call asserts registry ingestibility first.
 * GET only; 15s timeout, 30s for the 14.6 MB players file. The players dict is
 * parsed with a single JSON.parse — no transformation tricks.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const SLEEPER_STATE_SOURCE_ID = "sleeper-state";
export const SLEEPER_PLAYERS_SOURCE_ID = "sleeper-players";
export const SLEEPER_TRENDING_SOURCE_ID = "sleeper-trending";
export const SLEEPER_BASE = "https://api.sleeper.app";
/** Exact registry attributionText for "sleeper-state". */
export const SLEEPER_STATE_ATTRIBUTION = "NFL state via the Sleeper API.";
/** Exact registry attributionText for "sleeper-players". */
export const SLEEPER_PLAYERS_ATTRIBUTION = "Player data via the Sleeper API.";
/** Exact registry attributionText for "sleeper-trending". */
export const SLEEPER_TRENDING_ATTRIBUTION = "Waiver sentiment via the Sleeper API.";
const USER_AGENT = "GSE-DataIngestion/1.0";
const TIMEOUT_MS = 15_000;
/** The players file is ~14.6 MB; allow it extra time. */
const PLAYERS_TIMEOUT_MS = 30_000;

export function isSleeperFeedsIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "SLEEPER_FEEDS_INGEST");
}

export class SleeperError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SleeperError";
  }
}

export interface SleeperNflState {
  readonly week: number | null;
  readonly seasonType: string | null;
  readonly season: string | null;
  readonly leg: number | null;
  readonly displayWeek: number | null;
  readonly seasonStartDate: string | null;
}

/** Cross-platform identity map for one Sleeper player. */
export interface SleeperPlayerIds {
  readonly espn: string | null;
  readonly yahoo: string | null;
  readonly rotowire: string | null;
  readonly gsis: string | null;
  readonly sportradar: string | null;
  readonly fantasyData: string | null;
  readonly kalshi: string | null;
}

export interface SleeperPlayer {
  readonly playerId: string;
  readonly fullName: string | null;
  readonly position: string | null;
  readonly team: string | null;
  readonly age: number | null;
  readonly injuryStatus: string | null;
  readonly injuryBodyPart: string | null;
  readonly injuryNotes: string | null;
  readonly depthChartOrder: number | null;
  readonly ids: SleeperPlayerIds;
}

export interface SleeperPlayersResult {
  readonly playerCount: number;
  readonly players: Record<string, SleeperPlayer>;
}

export interface SleeperTrendingEntry {
  readonly playerId: string;
  readonly count: number;
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

/**
 * String-or-coerced ID. Sleeper mixes types: espn_id / yahoo_id / fantasy_data_id
 * arrive as NUMBERS while gsis_id arrives as a string. Coerce finite numbers so
 * the crosswalk keeps them instead of nulling them.
 */
function idVal(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numVal(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNflState(body: unknown): SleeperNflState {
  const empty: SleeperNflState = {
    week: null,
    seasonType: null,
    season: null,
    leg: null,
    displayWeek: null,
    seasonStartDate: null,
  };
  if (!body || typeof body !== "object" || Array.isArray(body)) return empty;
  const r = body as Record<string, unknown>;
  return {
    week: numVal(pickFirst(r, "week")),
    seasonType: strVal(pickFirst(r, "season_type", "seasonType")),
    season: strVal(pickFirst(r, "season")),
    leg: numVal(pickFirst(r, "leg")),
    displayWeek: numVal(pickFirst(r, "display_week", "displayWeek")),
    seasonStartDate: strVal(pickFirst(r, "season_start_date", "seasonStartDate")),
  };
}

function asSleeperPlayer(key: string, raw: unknown): SleeperPlayer | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    playerId: strVal(pickFirst(r, "player_id", "playerId")) ?? key,
    fullName: strVal(pickFirst(r, "full_name", "fullName")),
    position: strVal(pickFirst(r, "position")),
    team: strVal(pickFirst(r, "team")),
    age: numVal(pickFirst(r, "age")),
    injuryStatus: strVal(pickFirst(r, "injury_status", "injuryStatus")),
    injuryBodyPart: strVal(pickFirst(r, "injury_body_part", "injuryBodyPart")),
    injuryNotes: strVal(pickFirst(r, "injury_notes", "injuryNotes")),
    depthChartOrder: numVal(pickFirst(r, "depth_chart_order", "depthChartOrder")),
    ids: {
      espn: idVal(pickFirst(r, "espn_id")),
      yahoo: idVal(pickFirst(r, "yahoo_id")),
      rotowire: idVal(pickFirst(r, "rotowire_id")),
      gsis: idVal(pickFirst(r, "gsis_id")),
      sportradar: idVal(pickFirst(r, "sportradar_id")),
      fantasyData: idVal(pickFirst(r, "fantasy_data_id")),
      kalshi: idVal(pickFirst(r, "kalshi_id")),
    },
  };
}

function asPlayers(body: unknown): SleeperPlayersResult {
  const players: Record<string, SleeperPlayer> = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { playerCount: 0, players };
  }
  for (const [key, raw] of Object.entries(body)) {
    const player = asSleeperPlayer(key, raw);
    if (player) players[key] = player;
  }
  return { playerCount: Object.keys(players).length, players };
}

function asTrending(body: unknown): SleeperTrendingEntry[] {
  if (!Array.isArray(body)) return [];
  const out: SleeperTrendingEntry[] = [];
  for (const row of body) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const playerId = strVal(pickFirst(r, "player_id", "playerId"));
    const count = numVal(pickFirst(r, "count"));
    if (!playerId || count === null) continue;
    out.push({ playerId, count });
  }
  return out;
}

export class SleeperFeedsClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async getJson(path: string, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await this.fetchImpl(`${SLEEPER_BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new SleeperError(`Sleeper HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  /** NFL state (current week / season / season type). Null when the flag is off. */
  async getState(): Promise<SleeperNflState | null> {
    if (!isSleeperFeedsIngestEnabled(this.env)) return null;
    assertIngestible(SLEEPER_STATE_SOURCE_ID);
    return asNflState(await this.getJson("/v1/state/nfl", TIMEOUT_MS));
  }

  /**
   * Full player master keyed by player_id (~14.6 MB). Docs ask for at most one
   * call per day — cache 24h downstream. Null when the flag is off.
   */
  async getPlayers(): Promise<SleeperPlayersResult | null> {
    if (!isSleeperFeedsIngestEnabled(this.env)) return null;
    assertIngestible(SLEEPER_PLAYERS_SOURCE_ID);
    return asPlayers(await this.getJson("/v1/players/nfl", PLAYERS_TIMEOUT_MS));
  }

  /**
   * Trending adds or drops over a lookback window. Null when the flag is off.
   */
  async getTrending(
    kind: "add" | "drop",
    lookbackHours = 24,
    limit = 25,
  ): Promise<SleeperTrendingEntry[] | null> {
    if (!isSleeperFeedsIngestEnabled(this.env)) return null;
    assertIngestible(SLEEPER_TRENDING_SOURCE_ID);
    const params = new URLSearchParams();
    params.set("lookback_hours", String(Math.max(1, Math.floor(lookbackHours))));
    params.set("limit", String(Math.min(1000, Math.max(1, Math.floor(limit)))));
    const path = `/v1/players/nfl/trending/${kind}?${params.toString()}`;
    return asTrending(await this.getJson(path, TIMEOUT_MS));
  }
}
