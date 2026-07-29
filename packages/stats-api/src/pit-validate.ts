/**
 * Stats API PIT validation — mirrors feature-store law for metric values.
 * Kept in-package so @sports/stats-api stays free of circular deps.
 */

export type PitCode =
  | "ok"
  | "asof_missing"
  | "asof_invalid"
  | "asof_future"
  | "future_leak"
  | "entity_missing"
  | "metric_missing";

export type PitResult =
  | { ok: true; code: "ok"; asOfMs: number; asOfIso: string }
  | { ok: false; code: Exclude<PitCode, "ok">; error: string; asOfMs?: number };

export const DEFAULT_FUTURE_SKEW_MS = 120_000;

export interface PitClock {
  nowMs(): number;
}

export const systemClock: PitClock = { nowMs: () => Date.now() };

export function parseAsOfMs(asOf: string | null | undefined): PitResult {
  if (asOf == null || !String(asOf).trim()) {
    return { ok: false, code: "asof_missing", error: "asOf required (ISO-8601)" };
  }
  const raw = String(asOf).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      ok: false,
      code: "asof_invalid",
      error: "asOf must include time (date-only is ambiguous for PIT decisions)",
    };
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    return { ok: false, code: "asof_invalid", error: `asOf not parseable: ${raw}` };
  }
  return { ok: true, code: "ok", asOfMs: ms, asOfIso: new Date(ms).toISOString() };
}

export function validateValueAsOf(
  asOf: string | null | undefined,
  opts?: { clock?: PitClock; futureSkewMs?: number; allowFuture?: boolean },
): PitResult {
  const parsed = parseAsOfMs(asOf);
  if (!parsed.ok) return parsed;
  if (opts?.allowFuture) return parsed;
  const skew = opts?.futureSkewMs ?? DEFAULT_FUTURE_SKEW_MS;
  const now = (opts?.clock ?? systemClock).nowMs();
  if (parsed.asOfMs > now + skew) {
    return {
      ok: false,
      code: "asof_future",
      error: `asOf ${parsed.asOfIso} is in the future (skew ${skew}ms)`,
      asOfMs: parsed.asOfMs,
    };
  }
  return parsed;
}

export function validateValueRequest(req: {
  metricId?: string;
  entityId?: string;
  asOf?: string;
}, opts?: { clock?: PitClock; allowFuture?: boolean }): PitResult {
  if (!req.metricId?.trim()) {
    return { ok: false, code: "metric_missing", error: "metricId required" };
  }
  if (!req.entityId?.trim()) {
    return { ok: false, code: "entity_missing", error: "entityId required" };
  }
  return validateValueAsOf(req.asOf, opts);
}

export function isAsOfOnOrBefore(recordAsOf: string, queryAsOf: string): boolean {
  const r = parseAsOfMs(recordAsOf);
  const q = parseAsOfMs(queryAsOf);
  if (!r.ok || !q.ok) return false;
  return r.asOfMs <= q.asOfMs;
}

export function selectLatestAsOf<T extends { asOf: string }>(
  candidates: readonly T[],
  queryAsOf: string,
): T | null {
  const q = parseAsOfMs(queryAsOf);
  if (!q.ok) return null;
  let best: T | null = null;
  let bestT = -Infinity;
  for (const c of candidates) {
    const r = parseAsOfMs(c.asOf);
    if (!r.ok || r.asOfMs > q.asOfMs) continue;
    if (r.asOfMs >= bestT) {
      bestT = r.asOfMs;
      best = c;
    }
  }
  return best;
}

export function pitCodeToHttp(code: Exclude<PitCode, "ok">): 400 | 422 {
  return code === "asof_future" ? 422 : 400;
}
