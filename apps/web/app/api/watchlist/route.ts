import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { listWatchlistEntries } from "@/lib/watchlist/db";
import { followLimitForTier } from "@/lib/watchlist/eligibility";
import { unauthorizedResponse, watchlistDbErrorResponse } from "@/lib/watchlist/http";

/**
 * GET /api/watchlist — the caller's own follow list.
 *
 * Auth required (server-side; CLAUDE.md rule #3, no frontend-only gating).
 * Open to every tier — following is not tier-gated, only the follow CAP is
 * (see lib/watchlist/eligibility.ts). Table-absent (founder hasn't applied
 * the migration yet) degrades to an honest 503, never a 500.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  const entitlements = await getUserEntitlements(userId).catch(() => null);
  if (!entitlements) {
    return NextResponse.json(
      { success: false, error: "Could not resolve your account. Try again." },
      { status: 503 },
    );
  }

  const result = await listWatchlistEntries(db, userId);
  if (!result.ok) return watchlistDbErrorResponse(result);

  const limit = followLimitForTier(entitlements.tier);

  return NextResponse.json({
    success: true,
    data: result.data.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt.toISOString(),
    })),
    meta: {
      tier: entitlements.tier,
      // Real-time alerts are Elite-exclusive (CLAUDE.md tier table); this
      // is informational only here — the graded-only send gate is enforced
      // independently in lib/watchlist/alert-eligibility.ts at dispatch
      // time, never inferred client-side.
      alertsEligible: entitlements.canGetAlerts,
      followCount: result.data.length,
      followLimit: limit,
    },
  });
}
