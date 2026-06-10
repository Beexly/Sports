import { db } from "@sports/db";
import { captureError } from "@/lib/observability";

/**
 * Maximum age (minutes) a successful ingestion run may be before the public
 * readiness gate fails closed. The founder's stated freshness rule is 60
 * minutes — past that, odds/snapshots are no longer treated as live.
 */
export const FRESHNESS_MAX_AGE_MINUTES = 60;

export type HealthCheck = {
  status: "ok" | "error";
  detail?: string;
  lastSuccessAt?: string;
  ageMinutes?: number;
};

export type HealthPayload = {
  ok: boolean;
  status: "healthy" | "degraded";
  checks: Record<string, HealthCheck>;
};

export async function loadHealthChecks(): Promise<HealthPayload> {
  const checks: Record<string, HealthCheck> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks["database"] = { status: "ok" };
  } catch (err) {
    console.warn(
      "[health] database check failed.",
      err instanceof Error ? err.message : "unknown error"
    );
    captureError(err, { surface: "health:database" });
    checks["database"] = {
      status: "error",
      detail: "Database dependency is unavailable.",
    };
  }

  try {
    const lastSuccessRun = await db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    if (!lastSuccessRun || !lastSuccessRun.completedAt) {
      checks["ingestion"] = {
        status: "error",
        detail: "No successful ingestion run is available.",
      };
    } else {
      const ageMs = Date.now() - lastSuccessRun.completedAt.getTime();
      const ageMinutes = Math.round(ageMs / (1000 * 60));
      // Freshness rule: live sports data is only trustworthy for 60 minutes.
      // Past that, readiness must fail closed (/api/ready -> 503) rather than
      // serve stale odds as live. Do not loosen this to make readiness green.
      checks["ingestion"] = {
        status: ageMinutes > FRESHNESS_MAX_AGE_MINUTES ? "error" : "ok",
        detail: `Last successful ingestion completed ${ageMinutes} minutes ago.`,
        lastSuccessAt: lastSuccessRun.completedAt.toISOString(),
        ageMinutes,
      };
    }
  } catch (err) {
    console.warn(
      "[health] ingestion freshness check failed.",
      err instanceof Error ? err.message : "unknown error"
    );
    captureError(err, { surface: "health:ingestion" });
    checks["ingestion"] = {
      status: "error",
      detail: "Ingestion dependency is unavailable.",
    };
  }

  const allOk = Object.values(checks).every((check) => check.status === "ok");
  return { ok: allOk, status: allOk ? "healthy" : "degraded", checks };
}
