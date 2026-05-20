/**
 * /api/cockpit/jarvis — JSON readout of the current Jarvis Launch Assessment.
 *
 * Admin-only. Read-only. No state changes. Useful for:
 *   - External monitoring (uptime check that scrapes launchStatus)
 *   - A scheduled task that calls this and pipes the result to a logs
 *     pipeline using `serializeJarvisAudit`
 *   - A future "Jarvis history" buffer that polls this endpoint
 *
 * Returns the full assessment plus the public-performance policy. Never
 * exposes a 503 — even when DB is unreachable, the loader falls through
 * to zero counts and the synthesizer correctly reports UNKNOWN/NOT_READY.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { JARVIS_VERSION } from "@/lib/cockpit/jarvis";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { assessment, performancePolicy } = await loadJarvisAssessment();
    return NextResponse.json(
      {
        version: JARVIS_VERSION,
        assessment,
        performancePolicy,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jarvis synthesis failed.";
    // Return 200 with an error envelope. The Jarvis layer is supposed to
    // be the *answer* to "is the system OK?"; failing to compute is
    // itself a signal, not a transport-layer error.
    return NextResponse.json(
      {
        version: JARVIS_VERSION,
        assessment: null,
        performancePolicy: null,
        error: message,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
