/**
 * KeepTradeCut dynasty rankings/values (registry id "keeptradecut-dynasty").
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200, 2,609,656 bytes, 500 players in
 * <script id="ktc-players"> JSON (1QB/SF/TEP values, ranks, tiers, trends).
 *
 * DEFAULT ON (no env gate): public free page, robots.txt Allow: / with no
 * login required, registry verdict "cleared-with-attribution" with genuinely
 * permissive terms. We still call assertIngestible("keeptradecut-dynasty")
 * before any network, and public surfaces must carry the attribution text
 * ("Dynasty values via KeepTradeCut.").
 *
 * HOW: GET /dynasty-rankings, extract the <script id="ktc-players"> JSON
 * payload, defensive-parse into KtcPlayer[]. GET only, 15s timeout,
 * User-Agent "GSE-DataIngestion/1.0". Missing/malformed payload -> empty
 * players, never a throw (an absent embed is a source-shape change, not a
 * pipeline outage).
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const KEEPTRADECUT_SOURCE_ID = "keeptradecut-dynasty";
export const KEEPTRADECUT_BASE = "https://keeptradecut.com";
export const KEEPTRADECUT_ATTRIBUTION = "Dynasty values via KeepTradeCut.";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class KeepTradeCutError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "KeepTradeCutError";
  }
}

/** One value line (1QB or Superflex): value + rank + tier. */
export interface KtcValueEntry {
  readonly value: number;
  readonly rank: number | null;
  readonly tier: number | null;
}

/** TE-premium line: value + rank (no tier on KTC's TEP column). */
export interface KtcTePremiumEntry {
  readonly value: number;
  readonly rank: number | null;
}

export interface KtcPlayer {
  readonly playerName: string;
  readonly playerID: number;
  readonly position: string;
  readonly team: string;
  readonly age: number | null;
  readonly draftYear: number | null;
  readonly byeWeek: number | null;
  readonly injury: string | null;
  readonly oneQB: KtcValueEntry | null;
  readonly superflex: KtcValueEntry | null;
  readonly tePremium: KtcTePremiumEntry | null;
  readonly adp: number | null;
  readonly trend30d: number | null;
}

export interface KtcDynastyRankings {
  readonly players: readonly KtcPlayer[];
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseValueEntry(v: unknown): KtcValueEntry | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const value = numOrNull(r.value);
  if (value === null) return null;
  return { value, rank: intOrNull(r.rank), tier: intOrNull(r.tier) };
}

function parseTePremiumEntry(v: unknown): KtcTePremiumEntry | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const value = numOrNull(r.value);
  if (value === null) return null;
  return { value, rank: intOrNull(r.rank) };
}

function parsePlayer(r: Record<string, unknown>): KtcPlayer | null {
  const playerName = strOrNull(r.playerName);
  const playerID = intOrNull(r.playerID);
  if (!playerName || playerID === null) return null;
  return {
    playerName,
    playerID,
    position: strOrNull(r.position) ?? "",
    team: strOrNull(r.team) ?? "",
    age: intOrNull(r.age),
    draftYear: intOrNull(r.draftYear),
    byeWeek: intOrNull(r.byeWeek),
    injury: strOrNull(r.injury),
    oneQB: parseValueEntry(r.oneQB),
    superflex: parseValueEntry(r.superflex),
    tePremium: parseTePremiumEntry(r.tePremium),
    adp: numOrNull(r.adp),
    trend30d: numOrNull(r.trend30d),
  };
}

function asPlayers(payload: unknown): KtcPlayer[] {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { players?: unknown }).players)
      ? ((payload as { players: unknown[] }).players as unknown[])
      : [];
  const out: KtcPlayer[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const p = parsePlayer(row as Record<string, unknown>);
    if (p) out.push(p);
  }
  return out;
}

function extractKtcJson(html: string): unknown {
  const m = /<script[^>]*\bid\s*=\s*["']ktc-players["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  const raw = m?.[1];
  if (raw === undefined || raw.trim() === "") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function getText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    if (!res.ok) throw new KeepTradeCutError(`KeepTradeCut HTTP ${res.status}`, res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export class KeepTradeCutClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /** Dynasty rankings from the KTC players embed. Empty players on a missing/malformed embed. */
  async getDynastyRankings(): Promise<KtcDynastyRankings> {
    assertIngestible(KEEPTRADECUT_SOURCE_ID);
    const html = await getText(`${KEEPTRADECUT_BASE}/dynasty-rankings`, this.fetchImpl);
    return { players: asPlayers(extractKtcJson(html)) };
  }
}
