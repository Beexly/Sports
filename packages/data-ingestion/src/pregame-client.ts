/**
 * Pregame.com gamecenter client — betting consensus + odds history.
 *
 * VERIFIED LIVE 2026-09-18:
 *   consensushistory?e=… → { Start, End, Count, TotalCount: 4138, Items: [...] }
 *   oddshistory?e=…     → { TotalCount: 793, Items: [...] }
 *   consensus?e=…       → { PickTypes: {...}, ConsensusTypes: {...}, Rotation1/2, Team1/2 }
 *   odds?e=…            → { Sportsbooks: [{ Id, Name, Url }] }
 *   socket.pregame.com/api/gamecenter/bootstrap → 8,412,344 bytes, { EventCount: 227, Events: [...] }
 *
 * LEGAL: Pregame.com Terms ban automated access WITHOUT express written permission.
 * Default OFF (`PREGAME_INGEST`). Do NOT flip it on in production until the founder
 * has written permission. Registry verdicts are use-with-caution on all 5 ids:
 *   pregame-consensus-history, pregame-odds-history, pregame-consensus-meta,
 *   pregame-odds-meta, pregame-event-listing.
 *
 * SAFETY
 *   - GET only, no credential. 15s timeout (30s for bootstrap — it is ~8.4 MB).
 *   - assertIngestible(...) before any network.
 *   - Defensive parsing: everything nullable, index access guarded.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const PREGAME_BASE = "https://pregame.com/api/gamecenter";
export const PREGAME_SOCKET_BASE = "https://socket.pregame.com/api/gamecenter";
export const PREGAME_ATTRIBUTION = "Betting consensus data via Pregame.com.";

const TIMEOUT_MS = 15_000;
const BOOTSTRAP_TIMEOUT_MS = 30_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isPregameIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "PREGAME_INGEST");
}

export class PregameError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PregameError";
  }
}

export interface ConsensusTick {
  readonly id: number | null;
  readonly dateTime: string | null;
  readonly odds: string | null;
  readonly cashAction: number | null;
  readonly cashPercentage: number | null;
  readonly ticketAction: number | null;
  readonly ticketPercentage: number | null;
  readonly pickAction: number | null;
  readonly pickPercentage: number | null;
}

export interface ConsensusHistory {
  readonly start: string | null;
  readonly end: string | null;
  readonly count: number;
  readonly totalCount: number;
  readonly items: ConsensusTick[];
}

export interface OddsTick {
  readonly dateTime: string | null;
  readonly sportsBookId: number | null;
  readonly spread1: string | null;
  readonly spread2: string | null;
  readonly over: string | null;
  readonly under: string | null;
  readonly moneyline1: string | null;
  readonly moneyline2: string | null;
}

export interface OddsHistory {
  readonly totalCount: number;
  readonly items: OddsTick[];
}

export interface Sportsbook {
  readonly id: number;
  readonly name: string;
  readonly url: string | null;
}

export interface PregameConsensusMeta {
  readonly pickTypes: Record<string, string>;
  readonly consensusTypes: Record<string, string>;
  readonly rotation1: string | null;
  readonly rotation2: string | null;
  readonly team1: string | null;
  readonly team2: string | null;
}

export interface PregameOddsMeta {
  readonly sportsbooks: Sportsbook[];
}

export interface PregameEvent {
  readonly id: number;
  readonly leagueId: number | null;
  readonly scheduledDateAndTime: string | null;
  readonly rotation1: string | null;
  readonly rotation2: string | null;
  readonly team1: string | null;
  readonly team2: string | null;
}

export interface EventListing {
  readonly eventCount: number;
  readonly events: PregameEvent[];
}

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  return null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(asRecord(v))) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

function asConsensusTick(raw: unknown): ConsensusTick | null {
  const r = asRecord(raw);
  if (Object.keys(r).length === 0) return null;
  return {
    id: intOrNull(r.Id),
    dateTime: strOrNull(r.DateTime),
    odds: strOrNull(r.Odds),
    cashAction: finiteOrNull(r.CashAction),
    cashPercentage: finiteOrNull(r.CashPercentage),
    ticketAction: finiteOrNull(r.TicketAction),
    ticketPercentage: finiteOrNull(r.TicketPercentage),
    pickAction: finiteOrNull(r.PickAction),
    pickPercentage: finiteOrNull(r.PickPercentage),
  };
}

function asOddsTick(raw: unknown): OddsTick | null {
  const r = asRecord(raw);
  if (Object.keys(r).length === 0) return null;
  return {
    dateTime: strOrNull(r.DateTime),
    sportsBookId: intOrNull(r.SportsBookId),
    spread1: strOrNull(r.Spread1),
    spread2: strOrNull(r.Spread2),
    over: strOrNull(r.Over),
    under: strOrNull(r.Under),
    moneyline1: strOrNull(r.Moneyline1),
    moneyline2: strOrNull(r.Moneyline2),
  };
}

function asSportsbook(raw: unknown): Sportsbook | null {
  const r = asRecord(raw);
  const id = intOrNull(r.Id);
  if (id === null) return null;
  const name = strOrNull(r.Name);
  if (name === null) return null;
  return { id, name, url: strOrNull(r.Url) };
}

function asPregameEvent(raw: unknown): PregameEvent | null {
  const r = asRecord(raw);
  const id = intOrNull(r.Id);
  if (id === null) return null;
  return {
    id,
    leagueId: intOrNull(r.LeagueId),
    scheduledDateAndTime: strOrNull(r.ScheduledDateAndTime),
    rotation1: strOrNull(r.Rotation1),
    rotation2: strOrNull(r.Rotation2),
    team1: strOrNull(r.Team1),
    team2: strOrNull(r.Team2),
  };
}

export class PregameClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async getJson(path: string, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await this.fetchImpl(path, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      if (!res.ok) throw new PregameError(`Pregame HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  async getConsensusHistory(eventId: number, s: 1 | 2 | 3 = 1, r = 1): Promise<ConsensusHistory | null> {
    if (!isPregameIngestEnabled(this.env)) return null;
    assertIngestible("pregame-consensus-history");
    const params = new URLSearchParams({ e: String(eventId), s: String(s), r: String(r) });
    const body = asRecord(await this.getJson(`${PREGAME_BASE}/consensushistory?${params.toString()}`, TIMEOUT_MS));
    const items: ConsensusTick[] = [];
    for (const raw of asArray(body.Items)) {
      const tick = asConsensusTick(raw);
      if (tick !== null) items.push(tick);
    }
    return {
      start: strOrNull(body.Start),
      end: strOrNull(body.End),
      count: intOrNull(body.Count) ?? 0,
      totalCount: intOrNull(body.TotalCount) ?? 0,
      items,
    };
  }

  async getOddsHistory(eventId: number, p = 1, s = 1, r = 1): Promise<OddsHistory | null> {
    if (!isPregameIngestEnabled(this.env)) return null;
    assertIngestible("pregame-odds-history");
    const params = new URLSearchParams({ e: String(eventId), p: String(p), s: String(s), r: String(r) });
    const body = asRecord(await this.getJson(`${PREGAME_BASE}/oddshistory?${params.toString()}`, TIMEOUT_MS));
    const items: OddsTick[] = [];
    for (const raw of asArray(body.Items)) {
      const tick = asOddsTick(raw);
      if (tick !== null) items.push(tick);
    }
    return {
      totalCount: intOrNull(body.TotalCount) ?? 0,
      items,
    };
  }

  async getConsensusMeta(eventId: number, r = 1): Promise<PregameConsensusMeta | null> {
    if (!isPregameIngestEnabled(this.env)) return null;
    assertIngestible("pregame-consensus-meta");
    const params = new URLSearchParams({ e: String(eventId), r: String(r) });
    const body = asRecord(await this.getJson(`${PREGAME_BASE}/consensus?${params.toString()}`, TIMEOUT_MS));
    return {
      pickTypes: asStringMap(body.PickTypes),
      consensusTypes: asStringMap(body.ConsensusTypes),
      rotation1: strOrNull(body.Rotation1),
      rotation2: strOrNull(body.Rotation2),
      team1: strOrNull(body.Team1),
      team2: strOrNull(body.Team2),
    };
  }

  async getOddsMeta(eventId: number, r = 1): Promise<PregameOddsMeta | null> {
    if (!isPregameIngestEnabled(this.env)) return null;
    assertIngestible("pregame-odds-meta");
    const params = new URLSearchParams({ e: String(eventId), r: String(r) });
    const body = asRecord(await this.getJson(`${PREGAME_BASE}/odds?${params.toString()}`, TIMEOUT_MS));
    const sportsbooks: Sportsbook[] = [];
    for (const raw of asArray(body.Sportsbooks)) {
      const book = asSportsbook(raw);
      if (book !== null) sportsbooks.push(book);
    }
    return { sportsbooks };
  }

  async getEventListing(): Promise<EventListing | null> {
    if (!isPregameIngestEnabled(this.env)) return null;
    assertIngestible("pregame-event-listing");
    const body = asRecord(await this.getJson(`${PREGAME_SOCKET_BASE}/bootstrap`, BOOTSTRAP_TIMEOUT_MS));
    const events: PregameEvent[] = [];
    for (const raw of asArray(body.Events)) {
      const event = asPregameEvent(raw);
      if (event !== null) events.push(event);
    }
    return {
      eventCount: intOrNull(body.EventCount) ?? 0,
      events,
    };
  }
}
