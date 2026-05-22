import { NextResponse } from "next/server";
import { db } from "@sports/db";

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, { status: "ok" | "error"; detail?: string }> =
    {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks["database"] = { status: "ok" };
  } catch (err) {
    checks["database"] = {
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown",
    };
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
      const ageHours = ageMs / (1000 * 60 * 60);
      checks["ingestion"] = {
        status: ageHours > 2 ? "error" : "ok",
        detail: `Last success: ${lastSuccessRun.completedAt.toISOString()} (${Math.round(ageHours * 60)}m ago)`,
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
