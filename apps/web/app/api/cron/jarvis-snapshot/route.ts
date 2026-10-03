/**
 * Vercel cron — Jarvis observatory snapshot.
 *
 * Pushes into process-local ring buffer AND durable Neon (JarvisMemoryEvent)
 * so multi-instance cockpit trend survives isolate recycle.
 *
 * Auth: Bearer CRON_SECRET. Schedule: vercel.json (hourly).
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";
import { materializeJarvisDraftTasks } from "@/lib/cockpit/jarvis-draft-tasks";
import { persistJarvisHistorySnapshot } from "@/lib/cockpit/jarvis-history-durable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const { assessment } = await loadJarvisAssessment();
    const snap = sharedJarvisHistory().push(assessment);
    const durable = await persistJarvisHistorySnapshot(snap);
    const draftTasks = materializeJarvisDraftTasks(assessment);
    return NextResponse.json({
      ok: true,
      path: "jarvis-snapshot",
      oddsApiRequired: false as const,
      bufferSize: sharedJarvisHistory().size(),
      durable,
      draftTaskCount: draftTasks.length,
      draftTasks: draftTasks.slice(0, 12),
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
