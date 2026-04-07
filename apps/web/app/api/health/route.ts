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

  // Last ingestion run check
  try {
    const lastRun = await db.ingestionRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { status: true, startedAt: true },
    });

    if (!lastRun) {
      checks["ingestion"] = { status: "ok", detail: "No runs yet" };
    } else {
      const ageMs = Date.now() - lastRun.startedAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      checks["ingestion"] = {
        status: ageHours > 2 ? "error" : "ok",
        detail: `Last run: ${lastRun.startedAt.toISOString()} (${lastRun.status})`,
      };
    }
  } catch {
    checks["ingestion"] = { status: "error", detail: "Failed to query" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
