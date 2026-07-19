import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";
import { evaluateSettlementHealth, type SettlementHealthBand } from "@/lib/performance/settlement-health";
import { nflverseTableCacheStats } from "@sports/data-ingestion";
import {
  fromHealthCheck,
  fromSettlementBand,
  unknownCapability,
  deploymentSha,
  type CapabilityState,
} from "@/lib/health/capability-state";

// A no-arg GET handler is statically cached by Next 14 unless it opts out —
// which served hours-old "healthy" snapshots from the Vercel edge (observed
// x-vercel-cache: HIT, age ~3h). A health check must reflect live state.
export const dynamic = "force-dynamic";

type HealthCheck = {
  status: "ok" | "error";
  detail?: string;
  lastSuccessAt?: string;
  ageMinutes?: number;
};

export async function GET(): Promise<NextResponse> {
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

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  // ── Capability-level truth (OP-003) ──────────────────────────────────────
  // Purely additive/observability. Never influences `ok`/`allOk`/HTTP status —
  // a capability being non-healthy must not flip this route's readiness
  // semantics, which other consumers (the Nightly Sentinel) depend on as-is.

  let settlementBand: SettlementHealthBand | null = null;
  try {
    const now = new Date();
    const graceHours = 6;
    const overdueCutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    const baseWhere = {
      isPublished: true,
      NOT: { modelVersion: { contains: "seed" } },
    } as const;
    const [commencedTotal, overduePending] = await Promise.all([
      db.pick.count({ where: { ...baseWhere, game: { commenceTime: { lt: now } } } }),
      db.pick.count({
        where: { ...baseWhere, result: "PENDING", game: { commenceTime: { lt: overdueCutoff } } },
      }),
    ]);
    settlementBand = evaluateSettlementHealth({ commencedTotal, overduePending, graceHours }).health;
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

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? "healthy" : "degraded",
      checks,
      capabilities,
      deployment: { sha: deploymentSha(), observedAt: new Date().toISOString() },
    },
    { status: allOk ? 200 : 503 }
  );
}
