/**
 * Telemetry summary — reads `_logs/claude-usage.log` (file path) or the
 * `claude_usage_logs` Prisma table (DB path) and produces a cockpit-renderable
 * summary of per-call-site cache hit rate, token usage, latency, and error rate.
 *
 * When a real database is present (non-stub mode), `readTelemetryFromDb` is the
 * authoritative source — it works on Vercel where the filesystem is ephemeral.
 * The file path is used for local dev and GitHub Actions.
 *
 * Pure-logic; the cockpit page handles file IO + admin gating.
 */

import { db } from "@sports/db";

export type TelemetryStatus = "ok" | "error";

export interface TelemetryRow {
  readonly ts: string;
  readonly callSite: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly status: TelemetryStatus;
  readonly errorClass?: string;
}

export interface CallSiteSummary {
  readonly callSite: string;
  readonly calls: number;
  readonly errors: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly inputTokensTotal: number;
  readonly outputTokensTotal: number;
  readonly cacheReadTotal: number;
  readonly cacheCreationTotal: number;
  /**
   * cache_read / (cache_read + non-cache-input). 0 when no cache reads
   * recorded; 1 when every read hit the cache. Capped at [0,1].
   */
  readonly cacheHitRate: number;
}

export interface TelemetrySummary {
  readonly windowStart: string | null;
  readonly windowEnd: string | null;
  readonly totalCalls: number;
  readonly totalErrors: number;
  readonly bySite: readonly CallSiteSummary[];
  readonly modelsSeen: readonly string[];
  readonly errorClasses: ReadonlyArray<{
    readonly errorClass: string;
    readonly count: number;
  }>;
}

/**
 * Parse the append-only `_logs/claude-usage.log` (one JSON object per line).
 * Lines that don't parse are silently dropped — the file is best-effort and
 * a partial line shouldn't break the dashboard.
 */
export function parseTelemetryLog(text: string): TelemetryRow[] {
  const out: TelemetryRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Partial<TelemetryRow>;
      if (typeof obj.callSite !== "string" || typeof obj.model !== "string") continue;
      out.push({
        ts: typeof obj.ts === "string" ? obj.ts : new Date().toISOString(),
        callSite: obj.callSite,
        model: obj.model,
        inputTokens: numericOr(obj.inputTokens),
        cacheCreationInputTokens: numericOr(obj.cacheCreationInputTokens),
        cacheReadInputTokens: numericOr(obj.cacheReadInputTokens),
        outputTokens: numericOr(obj.outputTokens),
        latencyMs: numericOr(obj.latencyMs),
        status: obj.status === "error" ? "error" : "ok",
        ...(typeof obj.errorClass === "string"
          ? { errorClass: obj.errorClass }
          : {}),
      });
    } catch {
      // ignore malformed lines
    }
  }
  return out;
}

/**
 * Read telemetry rows from the Postgres `claude_usage_logs` table.
 * Returns an empty array when the DB is unavailable or the table is empty.
 * The caller must decide whether to fall back to the file path.
 */
export async function readTelemetryFromDb(sinceMs?: number): Promise<TelemetryRow[]> {
  const cutoff = sinceMs ? new Date(Date.now() - sinceMs) : undefined;
  try {
    const rows = await db.claudeUsageLog.findMany({
      where: cutoff ? { ts: { gte: cutoff } } : undefined,
      orderBy: { ts: "asc" },
      take: 50_000,
    });
    return rows.map((r) => ({
      ts: r.ts.toISOString(),
      callSite: r.callSite,
      model: r.model,
      inputTokens: r.inputTokens,
      cacheCreationInputTokens: r.cacheCreationInputTokens,
      cacheReadInputTokens: r.cacheReadInputTokens,
      outputTokens: r.outputTokens,
      latencyMs: r.latencyMs,
      status: r.status === "error" ? ("error" as const) : ("ok" as const),
      ...(r.errorClass ? { errorClass: r.errorClass } : {}),
    }));
  } catch {
    return [];
  }
}

function numericOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function percentile(sortedAsc: readonly number[], pct: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((pct / 100) * sortedAsc.length) - 1;
  const i = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[i] ?? 0;
}

/**
 * Summarize the rows by callSite. Optional `sinceMs` clips to the most
 * recent N milliseconds of activity. Returns a stable structure ready
 * for the cockpit renderer.
 */
export function summarizeTelemetry(
  rows: readonly TelemetryRow[],
  opts: { sinceMs?: number; now?: Date } = {}
): TelemetrySummary {
  const now = opts.now ?? new Date();
  const cutoff = opts.sinceMs ? now.getTime() - opts.sinceMs : 0;
  const filtered = rows.filter((r) => {
    if (!cutoff) return true;
    const t = Date.parse(r.ts);
    return Number.isFinite(t) ? t >= cutoff : true;
  });

  if (filtered.length === 0) {
    return {
      windowStart: null,
      windowEnd: null,
      totalCalls: 0,
      totalErrors: 0,
      bySite: [],
      modelsSeen: [],
      errorClasses: [],
    };
  }

  const bySiteMap = new Map<string, TelemetryRow[]>();
  for (const r of filtered) {
    const bucket = bySiteMap.get(r.callSite) ?? [];
    bucket.push(r);
    bySiteMap.set(r.callSite, bucket);
  }

  const bySite: CallSiteSummary[] = [];
  for (const [callSite, siteRows] of bySiteMap) {
    const latencies = siteRows
      .map((r) => r.latencyMs)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const sumLatency = latencies.reduce((a, b) => a + b, 0);
    const inputTokensTotal = siteRows.reduce((a, r) => a + r.inputTokens, 0);
    const outputTokensTotal = siteRows.reduce((a, r) => a + r.outputTokens, 0);
    const cacheReadTotal = siteRows.reduce(
      (a, r) => a + r.cacheReadInputTokens,
      0
    );
    const cacheCreationTotal = siteRows.reduce(
      (a, r) => a + r.cacheCreationInputTokens,
      0
    );
    const denom = cacheReadTotal + inputTokensTotal;
    const cacheHitRate =
      denom > 0 ? Math.min(1, Math.max(0, cacheReadTotal / denom)) : 0;
    bySite.push({
      callSite,
      calls: siteRows.length,
      errors: siteRows.filter((r) => r.status === "error").length,
      avgLatencyMs:
        latencies.length > 0 ? Math.round(sumLatency / latencies.length) : 0,
      p95LatencyMs: percentile(latencies, 95),
      inputTokensTotal,
      outputTokensTotal,
      cacheReadTotal,
      cacheCreationTotal,
      cacheHitRate,
    });
  }

  // Stable order: most-called first.
  bySite.sort((a, b) => b.calls - a.calls);

  const modelsSeen = Array.from(new Set(filtered.map((r) => r.model))).sort();

  const errorClassCounts = new Map<string, number>();
  for (const r of filtered) {
    if (r.status === "error" && r.errorClass) {
      errorClassCounts.set(
        r.errorClass,
        (errorClassCounts.get(r.errorClass) ?? 0) + 1
      );
    }
  }
  const errorClasses = Array.from(errorClassCounts.entries())
    .map(([errorClass, count]) => ({ errorClass, count }))
    .sort((a, b) => b.count - a.count);

  const tsValues = filtered
    .map((r) => Date.parse(r.ts))
    .filter((n) => Number.isFinite(n));
  const windowStart =
    tsValues.length > 0
      ? new Date(Math.min(...tsValues)).toISOString()
      : null;
  const windowEnd =
    tsValues.length > 0
      ? new Date(Math.max(...tsValues)).toISOString()
      : null;

  return {
    windowStart,
    windowEnd,
    totalCalls: filtered.length,
    totalErrors: filtered.filter((r) => r.status === "error").length,
    bySite,
    modelsSeen,
    errorClasses,
  };
}
