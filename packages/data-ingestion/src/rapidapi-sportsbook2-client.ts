/**
 * RapidAPI Sportsbook API v2 client — cross-source advantages (arb scanner feed).
 *
 * VERIFIED LIVE 2026-09-20 (founder key, 2 GETs):
 *   GET /v0/advantages/?type=ARBITRAGE → HTTP 200
 *     { advantages: [{ key, type: "ARBITRAGE", lastFoundAt, createdAt,
 *        market: { key, type: "POINT_TOTAL", segment: "FULL_MATCH",
 *                  event: { key, name, startTime, homeParticipantKey,
 *                           participants: [{ key, slug, name, shortName, sport }],
 *                           competitionInstance: {...} } },
 *        outcomes: [{ key, type: "OVER", modifier: 8.5, payout: 2.05,
 *                     live: false, readAt, source: "PROPHET_X", marketKey }] }] }
 *   GET /v0/sports → HTTP 404 (not an endpoint; do not call it).
 *
 * LEGAL: RapidAPI marketplace subscription; underlying book-price redistribution
 * rights ride the provider's plan terms (registry verdict use-with-caution).
 * Default OFF (`RAPIDAPI_SPORTSBOOK2_INGEST`). Founder flips the flag; the key
 * itself is read from `RAPIDAPI_KEY` at call time and is never committed.
 *
 * SAFETY
 *   - GET only. 15s timeout, AbortController.
 *   - assertIngestible("rapidapi-sportsbook2") before any network.
 *   - Defensive parsing: everything nullable, index access guarded.
 *   - Missing key → returns null (never throws, never fetches keyless).
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const RAPIDAPI_SPORTSBOOK2_BASE =
  "https://sportsbook-api2.p.rapidapi.com";
export const RAPIDAPI_SPORTSBOOK2_HOST = "sportsbook-api2.p.rapidapi.com";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export type RapidapiAdvantageType = "ARBITRAGE" | (string & {});

export function isRapidapiSportsbook2Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, "RAPIDAPI_SPORTSBOOK2_INGEST");
}

export class RapidapiSportsbook2Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RapidapiSportsbook2Error";
  }
}

export interface RapidapiParticipant {
  readonly key: string | null;
  readonly slug: string | null;
  readonly name: string | null;
  readonly shortName: string | null;
  readonly sport: string | null;
}

export interface RapidapiAdvantageEvent {
  readonly key: string | null;
  readonly name: string | null;
  readonly startTime: string | null;
  readonly homeParticipantKey: string | null;
  readonly participants: readonly RapidapiParticipant[];
}

export interface RapidapiAdvantageMarket {
  readonly key: string | null;
  readonly type: string | null;
  readonly segment: string | null;
  readonly event: RapidapiAdvantageEvent | null;
}

export interface RapidapiAdvantageOutcome {
  readonly key: string | null;
  readonly type: string | null;
  /** The points line the outcome sits on (e.g. 8.5 for a total). */
  readonly modifier: number | null;
  /** Decimal payout of the priced leg (e.g. 2.05). */
  readonly payout: number | null;
  readonly live: boolean | null;
  readonly readAt: string | null;
  /** The upstream source this leg was priced at (e.g. PROPHET_X). */
  readonly source: string | null;
  readonly marketKey: string | null;
  readonly participantKey: string | null;
}

export interface RapidapiAdvantage {
  readonly key: string | null;
  readonly type: string | null;
  readonly lastFoundAt: string | null;
  readonly createdAt: string | null;
  readonly market: RapidapiAdvantageMarket | null;
  readonly outcomes: readonly RapidapiAdvantageOutcome[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null
    ? (v as Record<string, unknown>)
    : {};
}

function asArray(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function boolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function asParticipant(raw: unknown): RapidapiParticipant | null {
  const r = asRecord(raw);
  const key = strOrNull(r.key);
  if (key === null) return null;
  return {
    key,
    slug: strOrNull(r.slug),
    name: strOrNull(r.name),
    shortName: strOrNull(r.shortName),
    sport: strOrNull(r.sport),
  };
}

function asEvent(raw: unknown): RapidapiAdvantageEvent | null {
  const r = asRecord(raw);
  const key = strOrNull(r.key);
  if (key === null) return null;
  const participants: RapidapiParticipant[] = [];
  for (const rawP of asArray(r.participants)) {
    const p = asParticipant(rawP);
    if (p !== null) participants.push(p);
  }
  return {
    key,
    name: strOrNull(r.name),
    startTime: strOrNull(r.startTime),
    homeParticipantKey: strOrNull(r.homeParticipantKey),
    participants,
  };
}

function asMarket(raw: unknown): RapidapiAdvantageMarket | null {
  const r = asRecord(raw);
  const key = strOrNull(r.key);
  if (key === null) return null;
  return {
    key,
    type: strOrNull(r.type),
    segment: strOrNull(r.segment),
    event: asEvent(r.event),
  };
}

function asOutcome(raw: unknown): RapidapiAdvantageOutcome | null {
  const r = asRecord(raw);
  const key = strOrNull(r.key);
  if (key === null) return null;
  return {
    key,
    type: strOrNull(r.type),
    modifier: finiteOrNull(r.modifier),
    payout: finiteOrNull(r.payout),
    live: boolOrNull(r.live),
    readAt: strOrNull(r.readAt),
    source: strOrNull(r.source),
    marketKey: strOrNull(r.marketKey),
    participantKey: strOrNull(r.participantKey),
  };
}

function asAdvantage(raw: unknown): RapidapiAdvantage | null {
  const r = asRecord(raw);
  const key = strOrNull(r.key);
  if (key === null) return null;
  const outcomes: RapidapiAdvantageOutcome[] = [];
  for (const rawO of asArray(r.outcomes)) {
    const o = asOutcome(rawO);
    if (o !== null) outcomes.push(o);
  }
  return {
    key,
    type: strOrNull(r.type),
    lastFoundAt: strOrNull(r.lastFoundAt),
    createdAt: strOrNull(r.createdAt),
    market: asMarket(r.market),
    outcomes,
  };
}

export class RapidapiSportsbook2Client {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private key(): string | null {
    const key = this.env["RAPIDAPI_KEY"]?.trim();
    return key ? key : null;
  }

  private host(): string {
    return this.env["RAPIDAPI_SPORTSBOOK2_HOST"]?.trim() || RAPIDAPI_SPORTSBOOK2_HOST;
  }

  private async getJson(path: string): Promise<unknown> {
    const key = this.key();
    if (!key) throw new RapidapiSportsbook2Error("RAPIDAPI_KEY is not set");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`https://${this.host()}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          "x-rapidapi-key": key,
          "x-rapidapi-host": this.host(),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new RapidapiSportsbook2Error(
          `RapidAPI sportsbook2 HTTP ${res.status}`,
          res.status,
        );
      }
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Cross-source advantages of one type. Observed type today: "ARBITRAGE".
   * Other type literals are NOT verified; pass only what the API documents.
   */
  async getAdvantages(
    type: RapidapiAdvantageType,
  ): Promise<readonly RapidapiAdvantage[] | null> {
    if (!isRapidapiSportsbook2Enabled(this.env)) return null;
    assertIngestible("rapidapi-sportsbook2");
    if (this.key() === null) return null;
    const params = new URLSearchParams({ type });
    const body = asRecord(
      await this.getJson(`/v0/advantages/?${params.toString()}`),
    );
    const advantages: RapidapiAdvantage[] = [];
    for (const raw of asArray(body.advantages)) {
      const a = asAdvantage(raw);
      if (a !== null) advantages.push(a);
    }
    return advantages;
  }
}
