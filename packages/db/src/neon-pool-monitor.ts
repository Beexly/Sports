/**
 * Neon / Prisma connection health + lightweight pool monitoring.
 * Never throws via probeNeonPool error path classification for callers that catch.
 * Does not enable LIVE_BOARD or widen odds age budget.
 */

import type { PrismaClient } from "@prisma/client";

export type NeonPoolProbeStatus = "ok" | "degraded" | "down";

export interface NeonPoolProbeResult {
  status: NeonPoolProbeStatus;
  latencyMs: number | null;
  error: string | null;
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

/**
 * `SELECT clock_timestamp()` returned zero rows.
 *
 * This is the silent-failure case: the stub Prisma client (`@sports/db` when
 * DATABASE_URL is unset/sentinel) answers EVERY `$queryRaw` with `[]` instead
 * of throwing, so the query "succeeded" in a few milliseconds against a database
 * that does not exist. Recording that as a success gave a total outage
 * `status: "ok"`, `error: null`, a refreshed `lastOkAt`, and a `successes`
 * counter that climbed during the incident — the exact opposite of the truth.
 * An unmeasured probe is a failed probe.
 */
const EMPTY_PROBE_ERROR =
  "clock probe returned no rows: no database answered the query " +
  "(stub Prisma client, or a pooler that silently dropped it)";

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
  degradedMs?: number;
  criticalMs?: number;
  sampleActivity?: boolean;
}

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
    const rows = await db.$queryRaw<Array<{ t: Date | string }>>`
      SELECT clock_timestamp() AS t
    `;
    latencyMs = Date.now() - started;
    const raw = rows?.[0]?.t;
    serverTime =
      raw instanceof Date ? raw.toISOString() : raw != null ? String(raw) : null;

    // A query that resolved is not evidence that a database is there. Require
    // the server clock before claiming the pool is healthy — otherwise the
    // stub client (and any pooler that swallows a query) reports "ok" with no
    // database, and the counters record the outage as a success.
    if (serverTime === null) {
      counters.failures += 1;
      counters.lastLatencyMs = latencyMs;
      counters.lastError = EMPTY_PROBE_ERROR;
      // `lastOkAt` is deliberately left untouched: no successful probe happened.
      return {
        status: "down",
        latencyMs,
        error: EMPTY_PROBE_ERROR,
        stubSuspected: true,
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
        Array<{
          total: bigint | number;
          active: bigint | number;
          idle: bigint | number;
          waiting: bigint | number;
        }>
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
      // leave nulls
    }
  }

  let status: NeonPoolProbeStatus = "ok";
  if (latencyMs != null && latencyMs > criticalMs) status = "degraded";
  else if (latencyMs != null && latencyMs > degradedMs) status = "degraded";
  if (activity.waiting != null && activity.waiting > 5 && status === "ok") {
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
