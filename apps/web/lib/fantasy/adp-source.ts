/**
 * FantasyFootballCalculator ADP source — the cleared, real market column.
 *
 * FFC's ADP REST API is free for personal AND commercial use (help article 42),
 * with attribution requested as a link/mention — recorded in the Source Rights
 * Registry as `ffc-adp` (approved_api). The data updates ONCE PER DAY and the
 * docs ask integrators not to call frequently, so this adapter caches every
 * live result for 24h (module-level TTL cache) and NEGATIVE-caches failures for
 * a short TTL (FFC_ERROR_CACHE_TTL_MS) so an outage doesn't re-hit the endpoint
 * on every load — the once/day term is honored in code, not just in a comment.
 *
 * Rights posture, enforced in order:
 *   1. checkClearance() BEFORE any fetch — a block stops the job (no fetch).
 *   2. wrapExtractedRecord() wraps the parsed rows with the RightsSnapshot
 *      captured at extraction time.
 *   3. Attribution text from the registry rides on the result for every
 *      surface that displays the data.
 *
 * The parser is PURE and separated from IO so it is fixture-testable. Response
 * shape live-verified 2026-07-16 against
 * GET https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026:
 *   { status: "Success",
 *     meta: { type, teams, rounds, total_drafts, start_date, end_date },
 *     players: [{ player_id, name, position, team, adp, adp_formatted,
 *                 times_drafted, high, low, stdev, bye }, ...] }
 */

import {
  checkClearance,
  wrapExtractedRecord,
  type ClearanceResult,
  type ExtractedRecord,
} from "../scraping/clearance-engine";
import { normName } from "../intelligence/qb-consensus";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Scoring formats the FFC ADP endpoint serves (URL path segments). */
export type AdpFormat = "ppr" | "half-ppr" | "standard" | "2qb";

export interface FfcAdpRow {
  readonly player: string;
  readonly pos: string;
  readonly team: string;
  readonly adp: number;
  readonly high: number;
  readonly low: number;
  readonly stdev: number;
  readonly timesDrafted: number;
  readonly bye: number;
}

export interface FfcAdpMeta {
  readonly teams: number;
  readonly rounds: number;
  readonly totalDrafts: number;
  readonly startDate: string;
  readonly endDate: string;
}

export interface FfcAdp {
  readonly status: "live" | "source-error";
  readonly format: AdpFormat;
  readonly season: number;
  readonly fetchedAt: string;
  readonly meta: FfcAdpMeta | null;
  readonly rows: readonly FfcAdpRow[];
  /** The full rights envelope (RightsSnapshot inside) for the extraction. */
  readonly record: ExtractedRecord | null;
  readonly attribution: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

export const FFC_ATTRIBUTION = "ADP data via FantasyFootballCalculator.com";

const FFC_BASE = "https://fantasyfootballcalculator.com/api/v1/adp";
/** Once/day per the FFC API terms — do not lower. */
export const FFC_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * Short NEGATIVE cache for source-error results. Under an FFC outage every
 * pool load would otherwise re-hit the endpoint (the docs ask integrators not
 * to call frequently), so a failure is held for 30 minutes — bounded and
 * retryable, deliberately far shorter than the 24h live TTL so recovery is
 * quick. NOTE: like the live cache this is per-instance (module-level) memory;
 * a serverless fleet still makes up to one call per cold instance per TTL —
 * recorded as a limitation on the `ffc-adp` rights-registry entry.
 */
export const FFC_ERROR_CACHE_TTL_MS = 30 * 60 * 1000;

export function ffcAdpUrl(format: AdpFormat, season: number, teams = 12): string {
  return `${FFC_BASE}/${format}?teams=${teams}&year=${season}`;
}

// ─── Pure parser ──────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Parse the FFC ADP payload into typed rows. Pure + defensive: a row without a
 * name or a positive ADP is dropped, never invented. Returns null when the
 * payload is not the documented "Success" shape.
 */
export function parseFfcAdp(payload: unknown): { rows: FfcAdpRow[]; meta: FfcAdpMeta | null } | null {
  if (!isRecord(payload) || payload["status"] !== "Success" || !Array.isArray(payload["players"])) {
    return null;
  }
  const rawMeta = payload["meta"];
  const meta: FfcAdpMeta | null = isRecord(rawMeta)
    ? {
        teams: num(rawMeta["teams"]),
        rounds: num(rawMeta["rounds"]),
        totalDrafts: num(rawMeta["total_drafts"]),
        startDate: str(rawMeta["start_date"]),
        endDate: str(rawMeta["end_date"]),
      }
    : null;

  const rows: FfcAdpRow[] = [];
  for (const raw of payload["players"] as unknown[]) {
    if (!isRecord(raw)) continue;
    const player = str(raw["name"]);
    const adp = num(raw["adp"]);
    if (!player || !(adp > 0)) continue; // no name / no draft signal -> drop, never invent
    rows.push({
      player,
      pos: str(raw["position"]).toUpperCase(),
      team: str(raw["team"]).toUpperCase(),
      adp,
      high: num(raw["high"]),
      low: num(raw["low"]),
      stdev: num(raw["stdev"]),
      timesDrafted: num(raw["times_drafted"]),
      bye: num(raw["bye"]),
    });
  }
  rows.sort((a, b) => a.adp - b.adp);
  return { rows, meta };
}

/**
 * Join key for an FFC row: the pool's shared `normName` convention PLUS the
 * position. Name alone is not identity — two players can share a normalized
 * name at different positions, and an ADP row must never attach to the
 * same-named player at another position.
 */
export function adpJoinKey(name: string, pos: string): string {
  return `${normName(name)}|${pos.toUpperCase()}`;
}

/**
 * Join helper: key FFC rows by `adpJoinKey` (normName + position) so the ADP
 * column joins the graded pool (and any other keyed surface) position-safely.
 * First (best-ADP) row wins on a same-name+position collision. Consumers should
 * additionally verify team when both sides carry one (see graded-pool.ts).
 */
export function adpByNormName(rows: readonly FfcAdpRow[]): Map<string, FfcAdpRow> {
  const out = new Map<string, FfcAdpRow>();
  for (const r of rows) {
    if (!normName(r.player)) continue;
    const key = adpJoinKey(r.player, r.pos);
    if (!out.has(key)) out.set(key, r);
  }
  return out;
}

// ─── IO (clearance-gated, daily-cached) ───────────────────────────────────────

// Module-level cache — the once/day API term. LIVE results are held for 24h;
// source-error results are held for a SHORT negative TTL (an outage must not
// turn every pool load into a fresh hit, but errors must stay retryable).
const cache = new Map<string, { readonly expiresAt: number; readonly value: FfcAdp }>();

export function resetFfcAdpCacheForTests(): void {
  cache.clear();
}

function sourceError(format: AdpFormat, season: number, sourceUrl: string, error: string): FfcAdp {
  return {
    status: "source-error",
    format,
    season,
    fetchedAt: new Date().toISOString(),
    meta: null,
    rows: [],
    record: null,
    attribution: FFC_ATTRIBUTION,
    sourceUrl,
    error,
  };
}

/**
 * Load FFC ADP for a format/season. Clearance-checked BEFORE the fetch, wrapped
 * in the ExtractedRecord envelope after, cached for 24h per the once/day term.
 * Honest discriminated result — a failure returns source-error, never fabricated
 * draft positions.
 */
export async function loadFfcAdp({
  format = "ppr",
  season = new Date().getUTCFullYear(),
  teams = 12,
  timeoutMs = 15000,
  fetcher = fetch,
  now = () => Date.now(),
}: {
  format?: AdpFormat;
  season?: number;
  teams?: number;
  timeoutMs?: number;
  fetcher?: FetchLike;
  now?: () => number;
} = {}): Promise<FfcAdp> {
  const url = ffcAdpUrl(format, season, teams);
  const key = `${format}:${teams}:${season}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.value;

  // 1. Rights gate — BEFORE any network call. A block stops the job.
  const clearance: ClearanceResult = checkClearance({
    source_id: "ffc-adp",
    mode: "licensed_api_ingest",
    tool_id: "fetch-native",
    intents: ["commercial_display", "storage", "derived_analytics"],
  });
  if (!clearance.allowed) {
    return sourceError(
      format,
      season,
      url,
      `clearance blocked: ${clearance.blocks.map((b) => b.code).join(", ")}`,
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      // no-store: we run our own (stricter) daily cache; keep it out of Next's data cache.
      response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(`FFC ADP fetch failed (${response.status})`);
    const parsed = parseFfcAdp((await response.json()) as unknown);
    if (!parsed) throw new Error("FFC ADP payload was not the documented Success shape");
    if (parsed.rows.length === 0) throw new Error("FFC ADP payload contained no usable rows");

    // 2. Envelope — every extracted record carries the RightsSnapshot.
    // The ADP snapshot is factual data (player rankings/order); wrap it through
    // the DATA_RULES gate so a future caller can never wrap a blocked category
    // (expression, personal_data, etc.) by accident — GSE-SEC-055.
    const record = wrapExtractedRecord(clearance, url, {
      format,
      season,
      teams,
      meta: parsed.meta,
      players: parsed.rows,
    }, "fact");

    const value: FfcAdp = {
      status: "live",
      format,
      season,
      fetchedAt: new Date().toISOString(),
      meta: parsed.meta,
      rows: parsed.rows,
      record,
      attribution: FFC_ATTRIBUTION,
      sourceUrl: url,
      error: null,
    };
    cache.set(key, { expiresAt: now() + FFC_CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    // Negative-cache the failure for a short, bounded TTL so an FFC outage
    // doesn't re-hit the once/day endpoint on every pool load; expires and
    // retries automatically.
    const value = sourceError(format, season, url, error instanceof Error ? error.message : "UNKNOWN");
    cache.set(key, { expiresAt: now() + FFC_ERROR_CACHE_TTL_MS, value });
    return value;
  }
}
