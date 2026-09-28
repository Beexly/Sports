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
    // A SNAPSHOT THAT DID NOT PERSIST IS NOT A SNAPSHOT. MEASURED 2026-09-28 by
    // reading apps/web/lib/cockpit/jarvis-history-durable.ts:20-47, which
    // returns `"ok" | "stub" | "error"` and NEVER THROWS — it swallows the
    // failure in its own catch and returns "error". So the route's outer catch
    // could never see a persist failure, the returned string was passed
    // straight into the body as `durable`, and the response was `ok: true` on a
    // 200 regardless. A durable write that failed was therefore invisible to
    // every status-reading consumer, which defeats the stated purpose of the
    // durable call in this route's own header: "so multi-instance cockpit trend
    // survives isolate recycle". On a failed write the only copy is the
    // process-local ring buffer, and it is gone on the next recycle while the
    // history looks unbroken.
    //
    // "stub" is NOT a failure: `isStubMode()` is the sanctioned no-DB path where
    // the durable layer is honestly a no-op (it says so). Only "error" means
    // the write was attempted and lost.
    const persisted = durable !== "error";
    return NextResponse.json(
      {
        ok: persisted,
        path: "jarvis-snapshot",
        oddsApiRequired: false as const,
        bufferSize: sharedJarvisHistory().size(),
        durable,
        // Say which of the two non-error outcomes this is, so a stub is never
        // read as a real durable history and a real one is never doubted.
        durableMeaning:
          durable === "ok"
            ? "persisted to Neon; trend survives isolate recycle"
            : durable === "stub"
              ? "no database configured: history is process-local only and does NOT survive recycle"
              : "durable write FAILED: history is process-local only and does NOT survive recycle",
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
      },
      persisted ? {} : { status: 503 },
    );
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
