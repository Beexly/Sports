import { NextResponse } from "next/server";
import { db } from "@sports/db";

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, { status: "ok" | "warn" | "error"; detail?: string }> = {};

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

  // API key configuration check
  const hasApiKey = !!(process.env["THE_ODDS_API_KEY"]);
  checks["api_key"] = hasApiKey
    ? { status: "ok", detail: "THE_ODDS_API_KEY configured" }
    : { status: "error", detail: "THE_ODDS_API_KEY not set" };

  // Last ingestion run check — must be a SUCCESS run, not any run.
  // A FAILED run that started recently should not report healthy.
  try {
    const lastSuccessRun = await db.ingestionRun.findFirst({
      where: { status: "SUCCESS", sport: { not: "demo_all" } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, sport: true },
    });

    const lastFailedRun = await db.ingestionRun.findFirst({
      where: { status: "FAILED" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, errorMessage: true },
    });

    if (!lastSuccessRun || !lastSuccessRun.completedAt) {
      const failDetail = lastFailedRun?.errorMessage
        ? `Last error: ${lastFailedRun.errorMessage.slice(0, 80)}`
        : "No successful runs recorded";
      checks["ingestion"] = { status: "error", detail: failDetail };
    } else {
      const ageMs = Date.now() - lastSuccessRun.completedAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      checks["ingestion"] = {
        status: ageHours > 2 ? "warn" : "ok",
        detail: `Last success: ${lastSuccessRun.sport} ${lastSuccessRun.completedAt.toISOString()} (${Math.round(ageHours * 60)}m ago)`,
      };
    }
  } catch {
    checks["ingestion"] = { status: "error", detail: "Failed to query ingestion runs" };
  }

  // Pick availability check
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickCount = await db.pick.count({
      where: {
        isPublished: true,
        isBootstrap: false,
        generatedAt: { gte: today },
      },
    });
    checks["picks"] = {
      status: pickCount > 0 ? "ok" : "warn",
      detail: `${pickCount} published picks today`,
    };
  } catch {
    checks["picks"] = { status: "error", detail: "Failed to count picks" };
  }

  const hasError = Object.values(checks).some((c) => c.status === "error");
  const hasWarn = Object.values(checks).some((c) => c.status === "warn");
  const overallStatus = hasError ? "degraded" : hasWarn ? "degraded" : "healthy";

  return NextResponse.json(
    { status: overallStatus, checks, timestamp: new Date().toISOString() },
    { status: hasError ? 503 : 200 }
  );
}
