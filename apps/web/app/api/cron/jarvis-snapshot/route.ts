/**
 * Vercel cron — Jarvis observatory snapshot.
 *
 * Loads a live Jarvis assessment and pushes it into the process-local
 * ring buffer so /cockpit/jarvis/trend has data without an operator visit.
 * Multi-instance deploys still process-local — durable history is a later
 * Neon-backed upgrade; this removes the pure no-op.
 *
 * Auth: Bearer CRON_SECRET. Schedule: vercel.json (hourly).
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const { assessment } = await loadJarvisAssessment();
    const snap = sharedJarvisHistory().push(assessment);
    return NextResponse.json({
      ok: true,
      path: "jarvis-snapshot",
      oddsApiRequired: false as const,
      bufferSize: sharedJarvisHistory().size(),
      snapshot: {
        assessedAt: snap.assessedAt,
        launchStatus: snap.launchStatus,
        publicSurfaceStatus: snap.publicSurfaceStatus,
        ingestionStatus: snap.ingestionStatus,
        settlementStatus: snap.settlementStatus,
        safetyWarningCount: snap.safetyWarningCount,
        recommendedActionCount: snap.recommendedActionCount,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        path: "jarvis-snapshot",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
