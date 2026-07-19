import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";
import { loadSettlementHealth } from "@/lib/performance/settlement-health";

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

  // Settlement health (reuses the canonical evaluator, apps/web/lib/performance/
  // settlement-health.ts -- already live on the /admin/clv dashboard). Deliberately
  // kept OUT of `checks`/`allOk`: a settlement lag is real and actionable, but
  // flipping the whole health check to 503 for it risks cascading into anything
  // that treats this endpoint as a readiness/traffic gate, for a signal that's a
  // data-quality problem, not "the service is down." Surfaced here so monitoring
  // (Nightly Sentinel) can pick it up without changing overall service-health
  // semantics or introducing a second, differently-thresholded implementation.
  let settlementHealth: Awaited<ReturnType<typeof loadSettlementHealth>> | { error: string };
  try {
    settlementHealth = await loadSettlementHealth(db);
  } catch {
    settlementHealth = { error: "failed to query" };
  }

  return NextResponse.json(
    { ok: allOk, status: allOk ? "healthy" : "degraded", checks, dataIntegrity: { settlementHealth } },
    { status: allOk ? 200 : 503 }
  );
}
