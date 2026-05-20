/**
 * /api/cockpit/jarvis/trend — recent JarvisHistorySnapshots.
 *
 * Admin-only. Best-effort: each call also pushes a fresh assessment into
 * the shared in-memory ring buffer so the trend is always up to date
 * even without an external scheduler.
 *
 * The buffer is process-local — see lib/cockpit/jarvis-history.ts. In a
 * multi-process deploy, swap the shared buffer for a Redis-backed one.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";
import { JARVIS_VERSION } from "@/lib/cockpit/jarvis";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 96;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "12", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : 12;

  const buf = sharedJarvisHistory();

  // Best-effort: refresh the buffer with a current assessment so each
  // page load advances the trend. Failure is non-fatal; we still serve
  // whatever's already in the buffer.
  try {
    const { assessment } = await loadJarvisAssessment();
    buf.push(assessment);
  } catch {
    // ignore — the buffer may still have prior entries.
  }

  return NextResponse.json(
    {
      version: JARVIS_VERSION,
      snapshots: buf.recent(limit),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    }
  );
}
