import { NextResponse } from "next/server";
import { loadSyntheticMonitoringDashboard } from "@/lib/synthetic-monitoring/dashboard";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const dashboard = loadSyntheticMonitoringDashboard();
  const ok = dashboard.runnerStatus !== "degraded";

  return NextResponse.json(
    {
      ok,
      status: dashboard.runnerStatus,
      cadenceMinutes: dashboard.config.cadenceMinutes,
      lastRunIso: dashboard.lastRunIso,
      generatedAtIso: dashboard.generatedAtIso,
    },
    { status: ok ? 200 : 503 }
  );
}
