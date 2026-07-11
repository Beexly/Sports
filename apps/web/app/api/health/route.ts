import { NextResponse } from "next/server";
import { db, isStubMode } from "@sports/db";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";

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

  // Database check. The stub client answers $queryRaw with [] — a vacuous
  // pass that reported "database: ok" with NO database at all (adversarial
  // finding O-1.7), misdirecting any outage diagnosis. Stub mode is a
  // configuration failure, never health.
  if (isStubMode()) {
    checks["database"] = {
      status: "error",
      detail: "no database configured (stub client active) — reads empty, writes dropped",
    };
  } else {
    try {
      await db.$queryRaw`SELECT 1`;
      checks["database"] = { status: "ok" };
    } catch {
      // Do not serialize the raw DB error to this public, unauthenticated response —
      // its message discloses the internal database host/port. Static detail only;
      // the real error stays in server logs.
      checks["database"] = { status: "error", detail: "database unreachable" };
    }
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

  return NextResponse.json(
    { ok: allOk, status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
