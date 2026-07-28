/**
 * Neon / Prisma connection health + lightweight pool monitoring.
 *
 * Works with:
 *  - standard Prisma client (TCP to Neon pooler or direct)
 *  - optional NEON_SERVERLESS_DRIVER path (same PrismaClient surface)
 *
 * What we can observe from the app side (honest limits):
 *  - query round-trip latency (SELECT 1 / clock_timestamp)
 *  - success vs failure counts in-process
 *  - optional snapshot of pg_stat_activity (requires permission)
 *
 * What we cannot see without Neon console/API:
 *  - PgBouncer internal queue depth on Neon’s managed pooler
 *  - cross-region failover events (platform-side)
 *
 * Never throws to callers when used via probeNeonPool().
 */

import type { PrismaClient } from "@prisma/client";

export type NeonPoolProbeStatus = "ok" | "degraded" | "down";

export interface NeonPoolProbeResult {
  status: NeonPoolProbeStatus;
  latencyMs: number | null;
  error: string | null;
  /** True when DATABASE-style client appears to be stub/empty mode */
  stubSuspected: boolean;
  serverTime: string | null;
  activity: {
    totalBackends: number | null;
    active: number | null;
    idle: number | null;
    waiting: number | null;
  };
  observedAt: string;
}

export interface NeonPoolMonitorCounters {
  probes: number;
  successes: number;
  failures: number;
  lastLatencyMs: number | null;
  lastError: string | null;
  lastOkAt: string | null;
}

const counters: NeonPoolMonitorCounters = {
  probes: 0,
  successes: 0,
  failures: 0,
  lastLatencyMs: null,
  lastError: null,
  lastOkAt: null,
};

/** Process-local counters (serverless: per-instance, still useful for logs). */
export function getNeonPoolCounters(): Readonly<NeonPoolMonitorCounters> {
  return { ...counters };
}

export function resetNeonPoolCountersForTests(): void {
  counters.probes = 0;
  counters.successes = 0;
  counters.failures = 0;
  counters.lastLatencyMs = null;
  counters.lastError = null;
  counters.lastOkAt = null;
}

export interface ProbeOptions {
  /** Latency above this → degraded (default 500ms) */
  degradedMs?: number;
  /** Latency above this → down classification if query still returns (default 2000ms) */
  criticalMs?: number;
  /** Attempt pg_stat_activity sample */
  sampleActivity?: boolean;
}

/**
 * Single health probe. Pass the shared Prisma client from @sports/db.
 */
export async function probeNeonPool(
  db: PrismaClient,
  opts: ProbeOptions = {},
): Promise<NeonPoolProbeResult> {
  const degradedMs = opts.degradedMs ?? 500;
  const criticalMs = opts.criticalMs ?? 2000;
  const sampleActivity = opts.sampleActivity ?? true;
  const observedAt = new Date().toISOString();

  counters.probes += 1;

  const started = Date.now();
  let latencyMs: number | null = null;
  let serverTime: string | null = null;
  let error: string | null = null;

  try {
    // $queryRaw is the most portable ping across adapter modes.
    const rows = await db.$queryRaw<Array<{ t: Date | string }>>`
      SELECT clock_timestamp() AS t
    `;
    latencyMs = Date.now() - started;
    const raw = rows?.[0]?.t;
    serverTime =
      raw instanceof Date ? raw.toISOString() : raw != null ? String(raw) : null;

    counters.successes += 1;
    counters.lastLatencyMs = latencyMs;
    counters.lastError = null;
    counters.lastOkAt = observedAt;
  } catch (err) {
    latencyMs = Date.now() - started;
    error = err instanceof Error ? err.message : String(err);
    counters.failures += 1;
    counters.lastLatencyMs = latencyMs;
    counters.lastError = error;

    return {
      status: "down",
      latencyMs,
      error,
      stubSuspected: /stub|not available|empty/i.test(error),
      serverTime: null,
      activity: {
        totalBackends: null,
        active: null,
        idle: null,
        waiting: null,
      },
      observedAt,
    };
  }

  let activity: NeonPoolProbeResult["activity"] = {
    totalBackends: null,
    active: null,
    idle: null,
    waiting: null,
  };

  if (sampleActivity) {
    try {
      const act = await db.$queryRaw<
        Array<{ total: bigint | number; active: bigint | number; idle: bigint | number; waiting: bigint | number }>
      >`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE state = 'active')::int AS active,
          COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
          COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL)::int AS waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      const row = act?.[0];
      if (row) {
        activity = {
          totalBackends: Number(row.total),
          active: Number(row.active),
          idle: Number(row.idle),
          waiting: Number(row.waiting),
        };
      }
    } catch {
      // Permission or pooler restriction — leave nulls; ping still counts.
    }
  }

  let status: NeonPoolProbeStatus = "ok";
  if (latencyMs != null && latencyMs > criticalMs) status = "degraded";
  else if (latencyMs != null && latencyMs > degradedMs) status = "degraded";

  // Many idle backends is informational; extreme waiting may mean pool pressure.
  if (
    activity.waiting != null &&
    activity.waiting > 5 &&
    status === "ok"
  ) {
    status = "degraded";
  }

  return {
    status,
    latencyMs,
    error: null,
    stubSuspected: false,
    serverTime,
    activity,
    observedAt,
  };
}

/** Classify without I/O — for tests / composing with other health checks. */
export function classifyLatency(
  latencyMs: number | null,
  error: string | null,
  opts: { degradedMs?: number; criticalMs?: number } = {},
): NeonPoolProbeStatus {
  if (error) return "down";
  if (latencyMs == null) return "down";
  const degradedMs = opts.degradedMs ?? 500;
  const criticalMs = opts.criticalMs ?? 2000;
  if (latencyMs > criticalMs) return "degraded";
  if (latencyMs > degradedMs) return "degraded";
  return "ok";
}
