/**
 * /api/cockpit/jarvis/trend — recent JarvisHistorySnapshots.
 *
 * Admin-only. Merges process-local buffer with durable Neon snapshots
 * (JarvisMemoryEvent) so multi-instance deploys still show history.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import {
  sharedJarvisHistory,
  type JarvisHistorySnapshot,
} from "@/lib/cockpit/jarvis-history";
import { loadDurableJarvisHistory } from "@/lib/cockpit/jarvis-history-durable";
import { JARVIS_VERSION } from "@/lib/cockpit/jarvis";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 96;

function mergeSnapshots(
  local: readonly JarvisHistorySnapshot[],
  durable: readonly JarvisHistorySnapshot[],
  limit: number,
): JarvisHistorySnapshot[] {
  const byAt = new Map<string, JarvisHistorySnapshot>();
  for (const s of [...local, ...durable]) {
    if (!byAt.has(s.assessedAt)) byAt.set(s.assessedAt, s);
  }
  return [...byAt.values()]
    .sort((a, b) => (a.assessedAt < b.assessedAt ? 1 : -1))
    .slice(0, limit);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "12", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : 12;

  const buf = sharedJarvisHistory();

  try {
    const { assessment } = await loadJarvisAssessment();
    buf.push(assessment);
  } catch {
    /* non-fatal */
  }

  const durable = await loadDurableJarvisHistory(limit);
  const snapshots = mergeSnapshots(buf.recent(limit), durable, limit);

  return NextResponse.json(
    {
      version: JARVIS_VERSION,
      snapshots,
      sources: { localBuffer: buf.size(), durableCount: durable.length },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    },
  );
}
