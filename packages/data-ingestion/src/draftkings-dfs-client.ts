/**
 * DraftKings DFS website endpoints — fail-closed until the registry clears them.
 *
 * WHAT IT FETCHES
 *   GET {BASE}/lobby/getcontests?sport=NFL — the live DFS lobby: contests with
 *     id, draftGroupId (dg), name, prize pool (po), entries, max entries,
 *     start, gameType.
 *   GET {BASE}/lineup/getavailableplayers?draftGroupId={dg} — the player pool
 *     for one draft group: pid, first/last name, position, salary, ppg, team,
 *     matchup abbreviations, jersey, draftable flags.
 *
 * VERIFIED LIVE 2026-09-18 (unauthenticated probe):
 *   getcontests: HTTP 200, 6,608,907 bytes, 8,661 live NFL contests.
 *     Sample: "NFL $3M Fantasy Football Millionaire [$1M to 1st]",
 *     id 195648008, dg 153428, po 3000000.
 *   getavailableplayers (dg 153428): HTTP 200, 363,988 bytes, 670 players.
 *     Sample: Bijan Robinson RB ATL vs CAR, salary 8200, ppg 31.3.
 *
 * Registry IDs: "draftkings-getcontests" and "draftkings-getavailableplayers",
 * both verdict use-with-caution.
 *
 * SAFETY / LEGAL
 *   - Default OFF (`DRAFTKINGS_DFS_INGEST`). No fetch happens before
 *     assertIngestible() clears the registry verdict.
 *   - GET only. No credentials, no API keys, no secrets.
 *   - LEGAL NOTE: these are DraftKings WEBSITE endpoints, not a documented
 *     public API — they may change or gate without notice, and use is subject
 *     to the DraftKings Terms of Use. draftGroupId is ephemeral per pull:
 *     resolve it from getContests() first, never hardcode it.
 *   - Attribution: "DFS contest data via DraftKings website endpoints." /
 *     "DFS player pool data via DraftKings website endpoints."
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const DRAFTKINGS_DFS_CONTESTS_SOURCE_ID = "draftkings-getcontests";
export const DRAFTKINGS_DFS_PLAYERS_SOURCE_ID = "draftkings-getavailableplayers";
export const DRAFTKINGS_DFS_BASE = "https://www.draftkings.com";
export const DRAFTKINGS_DFS_ATTRIBUTION =
  "DFS contest and player data via DraftKings website endpoints.";

const TIMEOUT_MS = 20_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isDraftKingsDfsIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "DRAFTKINGS_DFS_INGEST");
}

export class DraftKingsDfsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DraftKingsDfsError";
  }
}

/** One DFS contest from the lobby. */
export interface DkContest {
  readonly id: number;
  readonly draftGroupId: number;
  readonly name: string;
  readonly prizePool: number | null;
  readonly entries: number | null;
  readonly maxEntries: number | null;
  readonly start: string;
  readonly gameType: string;
}

/** One draftable player in a draft group. */
export interface DkAvailablePlayer {
  readonly playerId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly position: string;
  readonly salary: number | null;
  readonly ppg: number | null;
  readonly teamId: number | null;
  readonly matchup: string;
  readonly jersey: string;
  readonly draftable: boolean;
}

/* ---------- defensive parsing: malformed bodies degrade to empty, never throw ---------- */

type RawRecord = Record<string, unknown>;

function isRecord(v: unknown): v is RawRecord {
  return v !== null && typeof v === "object";
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asInt(v: unknown): number | null {
  const n = finiteOrNull(v);
  return n === null ? null : Math.trunc(n);
}

/** The lobby response may wrap the array ({Contests:[...]}) or be a bare array. */
function asContestArray(body: unknown): RawRecord[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (isRecord(body)) {
    for (const key of ["Contests", "contests", "ContestsList"]) {
      const v = body[key];
      if (Array.isArray(v)) return v.filter(isRecord);
    }
  }
  return [];
}

function asContest(raw: RawRecord): DkContest | null {
  const id = asInt(raw.id);
  if (id === null) return null;
  return {
    id,
    draftGroupId: asInt(raw.dg ?? raw.draftGroupId) ?? 0,
    name: asString(raw.name),
    prizePool: finiteOrNull(raw.po ?? raw.prizePool),
    entries: asInt(raw.entries),
    maxEntries: asInt(raw.maxEntries ?? raw.mec),
    start: asString(raw.start),
    gameType: asString(raw.gameType),
  };
}

/** The players response may wrap the array ({playerList:[...]}) or be a bare array. */
function asPlayerArray(body: unknown): RawRecord[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (isRecord(body)) {
    for (const key of ["playerList", "players", "PlayerList"]) {
      const v = body[key];
      if (Array.isArray(v)) return v.filter(isRecord);
    }
  }
  return [];
}

function asPlayer(raw: RawRecord): DkAvailablePlayer | null {
  const playerId = asInt(raw.pid ?? raw.playerId);
  if (playerId === null) return null;
  return {
    playerId,
    firstName: asString(raw.fn ?? raw.firstName),
    lastName: asString(raw.ln ?? raw.lastName),
    position: asString(raw.pn ?? raw.position),
    salary: finiteOrNull(raw.s ?? raw.salary),
    ppg: finiteOrNull(raw.ppg),
    teamId: asInt(raw.tid ?? raw.teamId),
    matchup: asString(raw.matchup),
    jersey: asString(raw.jersey),
    draftable: raw.draftable === true || raw.draftable === 1,
  };
}

export class DraftKingsDfsClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async getJson(path: string, sourceId: string): Promise<unknown> {
    assertIngestible(sourceId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${DRAFTKINGS_DFS_BASE}${path}`, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new DraftKingsDfsError(`DraftKings DFS HTTP ${res.status}`, res.status);
      try {
        return (await res.json()) as unknown;
      } catch {
        return null;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Live DFS lobby contests for a sport. Returns null when the ingest flag is
   * off. Malformed bodies degrade to an empty contest list rather than throwing.
   */
  async getContests(sport = "NFL"): Promise<DkContest[] | null> {
    if (!isDraftKingsDfsIngestEnabled(this.env)) return null;
    const body = await this.getJson(
      `/lobby/getcontests?sport=${encodeURIComponent(sport)}`,
      DRAFTKINGS_DFS_CONTESTS_SOURCE_ID,
    );
    const contests: DkContest[] = [];
    for (const raw of asContestArray(body)) {
      const c = asContest(raw);
      if (c) contests.push(c);
    }
    return contests;
  }

  /**
   * Draftable player pool for one draft group. Resolve the draftGroupId from
   * getContests() — it is ephemeral per pull. Returns null when the ingest
   * flag is off. Malformed bodies degrade to an empty player list.
   */
  async getAvailablePlayers(draftGroupId: number): Promise<DkAvailablePlayer[] | null> {
    if (!isDraftKingsDfsIngestEnabled(this.env)) return null;
    if (!Number.isInteger(draftGroupId) || draftGroupId <= 0) {
      throw new DraftKingsDfsError(`Invalid draftGroupId: ${String(draftGroupId)}`);
    }
    const body = await this.getJson(
      `/lineup/getavailableplayers?draftGroupId=${encodeURIComponent(String(draftGroupId))}`,
      DRAFTKINGS_DFS_PLAYERS_SOURCE_ID,
    );
    const players: DkAvailablePlayer[] = [];
    for (const raw of asPlayerArray(body)) {
      const p = asPlayer(raw);
      if (p) players.push(p);
    }
    return players;
  }
}
