/**
 * Cockpit pulse — at-a-glance read of the cross-cutting cockpit
 * signals (telemetry totals, daily cost, source-health alert count).
 *
 * Pure file IO + pure math — no Claude calls, no DB reads, no admin
 * gating (that's the page's job). Used by the cockpit landing page
 * to render a one-line summary above the existing Jarvis content.
 *
 * Designed to never throw. Missing log → zeroed pulse, never an error.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  parseTelemetryLog,
  summarizeTelemetry,
} from "./telemetry-summary.js";
import { aggregateDailyCost } from "./ai-cost.js";

// Resolved per-call (not at module load) so test fixtures that chdir into
// temp dirs see their own log.
function logPath(): string {
  return resolve(process.cwd(), "_logs", "claude-usage.log");
}

const MAX_LOG_BYTES = 5 * 1024 * 1024;
const TODAY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface CockpitPulse {
  /** ISO timestamp the pulse was computed. */
  readonly computedAt: string;
  /** Whether the telemetry log exists at all. */
  readonly telemetryLogPresent: boolean;
  /** Bytes on disk. */
  readonly telemetryLogBytes: number;
  /** Calls in the last 24h. */
  readonly callsLast24h: number;
  /** Errors in the last 24h. */
  readonly errorsLast24h: number;
  /** USD spend for today (UTC). */
  readonly todayUsd: number;
  /** USD spend yesterday (UTC). */
  readonly yesterdayUsd: number;
  /** Cache hit rate across the last 24h. 0 when no input tokens recorded. */
  readonly cacheHitRate24h: number;
  /** Distinct call sites active in the last 24h. */
  readonly activeCallSites: readonly string[];
}

function emptyPulse(now: Date): CockpitPulse {
  return {
    computedAt: now.toISOString(),
    telemetryLogPresent: false,
    telemetryLogBytes: 0,
    callsLast24h: 0,
    errorsLast24h: 0,
    todayUsd: 0,
    yesterdayUsd: 0,
    cacheHitRate24h: 0,
    activeCallSites: [],
  };
}

async function readLogTail(): Promise<{ text: string; bytes: number } | null> {
  const path = logPath();
  let s;
  try {
    s = await stat(path);
  } catch {
    return null;
  }
  if (s.size > MAX_LOG_BYTES) {
    const { open } = await import("node:fs/promises");
    const fh = await open(path, "r");
    try {
      const buf = Buffer.alloc(MAX_LOG_BYTES);
      await fh.read(buf, 0, MAX_LOG_BYTES, s.size - MAX_LOG_BYTES);
      return { text: buf.toString("utf8"), bytes: s.size };
    } finally {
      await fh.close();
    }
  }
  return { text: await readFile(path, "utf8"), bytes: s.size };
}

/**
 * Compose the pulse from disk. Never throws — telemetry IO failures
 * collapse to an empty pulse so the cockpit landing page always renders.
 */
export async function loadCockpitPulse(now: Date = new Date()): Promise<CockpitPulse> {
  let payload;
  try {
    payload = await readLogTail();
  } catch {
    return emptyPulse(now);
  }
  if (!payload) return emptyPulse(now);

  let rows;
  try {
    rows = parseTelemetryLog(payload.text);
  } catch {
    return { ...emptyPulse(now), telemetryLogPresent: true, telemetryLogBytes: payload.bytes };
  }

  const summary = summarizeTelemetry(rows, { sinceMs: TODAY_WINDOW_MS, now });
  const daily = aggregateDailyCost(rows);

  const todayKey = now.toISOString().slice(0, 10);
  const yesterdayKey = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const todayUsd = daily.find((d) => d.date === todayKey)?.totalUsd ?? 0;
  const yesterdayUsd = daily.find((d) => d.date === yesterdayKey)?.totalUsd ?? 0;

  const totalInputs = summary.bySite.reduce(
    (a, s) => a + s.inputTokensTotal + s.cacheReadTotal,
    0
  );
  const totalCacheReads = summary.bySite.reduce(
    (a, s) => a + s.cacheReadTotal,
    0
  );
  const cacheHitRate24h =
    totalInputs > 0 ? Math.min(1, Math.max(0, totalCacheReads / totalInputs)) : 0;

  return {
    computedAt: now.toISOString(),
    telemetryLogPresent: true,
    telemetryLogBytes: payload.bytes,
    callsLast24h: summary.totalCalls,
    errorsLast24h: summary.totalErrors,
    todayUsd,
    yesterdayUsd,
    cacheHitRate24h,
    activeCallSites: summary.bySite.map((s) => s.callSite),
  };
}
