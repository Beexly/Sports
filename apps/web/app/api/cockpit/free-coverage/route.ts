import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  freeCoverageMatrix,
  planIngestion,
  ALL_SPORTS,
  type StatNeed,
} from "@/lib/data-sources/source-router";

export const dynamic = "force-dynamic";

/**
 * Internal free-first coverage feed. Admin-only. Reports, per need×sport, whether a
 * free cleared source covers it and which gated free sources to clear to remove any
 * paid spend. Read-only — pure policy, no external calls.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  const matrix = freeCoverageMatrix();
  const spendNeeds = Array.from(new Set(matrix.filter((r) => r.mustSpend).map((r) => r.need))) as StatNeed[];
  const unlock = spendNeeds.map((need) => {
    // Collect by id (stable key) but include name for human readability
    const byId = new Map<string, string>();
    for (const sport of ALL_SPORTS) {
      for (const s of planIngestion(need, sport).unlockToGoFree) byId.set(s.id, s.name);
    }
    return { need, clearToGoFree: Array.from(byId, ([id, name]) => ({ id, name })) };
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: matrix.length,
        freeCovered: matrix.filter((r) => r.freeCovers).length,
        requireSpend: matrix.filter((r) => r.mustSpend).length,
      },
      matrix,
      unlock,
    },
  });
}
