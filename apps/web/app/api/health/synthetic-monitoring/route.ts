import { NextResponse } from "next/server";
import { loadSyntheticMonitoringDashboardFromDisk } from "@/lib/synthetic-monitoring/dashboard";
import { auth } from "@/lib/auth";
import { isAdminSession, ADMIN_ONLY_MESSAGE } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: ADMIN_ONLY_MESSAGE }, { status: 403 });
  }

  const dashboard = await loadSyntheticMonitoringDashboardFromDisk();
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
