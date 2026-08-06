/**
 * Shared leaf-capability probes for /api/health and the epistemic-twin
 * consumer guard (`capability-graph.ts`'s `fetchLiveCapabilityGraph`).
 *
 * Extracted verbatim from the health route so both callers share one probe
 * implementation instead of two that could silently drift apart. This module
 * performs only read-only Prisma queries the health route already ran; it
 * adds no new persistence (no Prisma `CapabilityObservation` table).
 */

import { db } from "@sports/db";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";
import {
  loadSettlementHealth,
  type SettlementHealthBand,
} from "@/lib/performance/settlement-health";
import { nflverseTableCacheStats } from "@sports/data-ingestion";
import { fromHealthCheck, fromSettlementBand, unknownCapability, type CapabilityState } from "./capability-state";

export type HealthCheck = {
  status: "ok" | "error";
  detail?: string;
  lastSuccessAt?: string;
  ageMinutes?: number;
};

export interface LiveCapabilityProbeResult {
  readonly checks: Record<string, HealthCheck>;
  readonly capabilities: CapabilityState[];
}

export async function computeLiveCapabilityProbes(): Promise<LiveCapabilityProbeResult> {
  const checks: Record<string, HealthCheck> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks["database"] = { status: "ok" };
  } catch {
    // Do not serialize the raw DB error to this public, unauthenticated response —
    // its message discloses the internal database host/port. Static detail only;
    // the real error stays in server logs.
    checks["database"] = { status: "error", detail: "database unreachable" };
  }

  // Last ingestion run check — must be a SUCCESS run, not any run.
  // A FAILED run that started recently should not report healthy.
  try {
    const lastSuccessRun = await db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    if (!lastSuccessRun || !lastSuccessRun.completedAt) {
      checks["ingestion"] = { status: "error", detail: "No successful runs recorded" };
    } else {
      const ageMs = Date.now() - lastSuccessRun.completedAt.getTime();
      const ageMinutes = Math.round(ageMs / (1000 * 60));
      // Use the shared Refresh SLA instead of a hard-coded 2h. The old 2h
      // magic number caused false 503s (the deployed fallback cron is daily,
      // schedulers jitter) and disagreed with Jarvis. See refresh-sla.ts.
      checks["ingestion"] = {
        status: ageMinutes > REFRESH_STALE_AFTER_MINUTES ? "error" : "ok",
        detail: `Last success: ${lastSuccessRun.completedAt.toISOString()} (${ageMinutes}m ago)`,
        lastSuccessAt: lastSuccessRun.completedAt.toISOString(),
        ageMinutes,
      };
    }
  } catch {
    checks["ingestion"] = { status: "error", detail: "Failed to query" };
  }

  let settlementBand: SettlementHealthBand | null = null;
  try {
    // Same loader as ops/cron/jarvis — one grace + count definition (no drift).
    settlementBand = (await loadSettlementHealth(db, {})).health;
  } catch {
    // No evidence either way — do not guess a band.
    settlementBand = null;
  }

  const nflverseStats = nflverseTableCacheStats();
  let nflverseCapability: CapabilityState;
  if (nflverseStats.entries === 0 && nflverseStats.misses === 0) {
    nflverseCapability = unknownCapability(
      "nflverse-reports",
      "no fetch attempted in this runtime — no evidence either way"
    );
  } else if (nflverseStats.failures > 0 && nflverseStats.entries === 0) {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "unavailable",
      reason: "nflverse table fetches have failed in this runtime with no cached data",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  } else if (nflverseStats.failures > 0 && nflverseStats.entries > 0) {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "degraded",
      reason: "some nflverse table fetches have failed in this runtime alongside cached data",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  } else {
    nflverseCapability = {
      capabilityId: "nflverse-reports",
      status: "healthy",
      reason: "nflverse table fetches have succeeded in this runtime",
      observedAt: new Date().toISOString(),
      evidence: "derived",
    };
  }

  const capabilities: CapabilityState[] = [
    fromHealthCheck(
      "database",
      checks["database"]?.status ?? "error",
      checks["database"]?.status === "ok" ? "database ping succeeded" : "database ping failed"
    ),
    fromHealthCheck(
      "ingestion",
      checks["ingestion"]?.status ?? "error",
      checks["ingestion"]?.status === "ok"
        ? "last successful ingestion run is within the freshness SLA"
        : "last successful ingestion run is missing or stale"
    ),
    settlementBand !== null
      ? fromSettlementBand(settlementBand)
      : unknownCapability("settlement", "settlement health could not be determined"),
    nflverseCapability,
  ];

  return { checks, capabilities };
}
