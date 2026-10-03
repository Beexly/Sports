import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import {
  countWatchlistEntries,
  createWatchlistEntry,
  findWatchlistEntry,
} from "@/lib/watchlist/db";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { isOverFollowLimit, followLimitForTier, WATCHLIST_UPGRADE_TIER } from "@/lib/watchlist/eligibility";
import { parseWatchlistTarget } from "@/lib/watchlist/validation";
import { badRequestResponse, unauthorizedResponse, watchlistDbErrorResponse } from "@/lib/watchlist/http";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";

/**
 * POST /api/watchlist/follow — follow a team or player.
 *
 * Auth required. Idempotent: re-following an already-followed entity
 * returns the existing row (created: false, 200) rather than an error, and
 * never counts against the follow cap. Every tier can follow (see
 * lib/watchlist/eligibility.ts's rationale) — the only tier gate is the
 * per-tier follow CAP, which returns 403 + an upsell payload when a
 * FREE/FANTASY/PRO caller who is not already following this entity is at
 * their limit.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  // Per-user throttle on this DB-write endpoint: stop one account from looping
  // follow writes (defense-in-depth; same bucket pattern as checkout / explain).
  // Limit copied from subscriptions/checkout (10/min is ample for a human).
  const limit = consumeRateLimit("watchlist-follow", userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse(["Invalid JSON body"]);
  }

  const parsed = parseWatchlistTarget(body);
  if (!parsed.success) return badRequestResponse(parsed.errors);
  const { entityType, entityId } = parsed.data;

  const entitlements = await getUserEntitlements(userId).catch(() => null);
  if (!entitlements) {
    return NextResponse.json(
      { success: false, error: "Could not resolve your account. Try again." },
      { status: 503 },
    );
  }

  // Idempotency + cap-exemption check: if already following, short-circuit
  // BEFORE the cap check so re-following never counts against the limit.
  const existing = await findWatchlistEntry(db, userId, entityType, entityId);
  if (!existing.ok) return watchlistDbErrorResponse(existing);
  if (existing.data) {
    return NextResponse.json({
      success: true,
      created: false,
      data: {
        id: existing.data.id,
        entityType: existing.data.entityType,
        entityId: existing.data.entityId,
        createdAt: existing.data.createdAt.toISOString(),
      },
    });
  }

  const countResult = await countWatchlistEntries(db, userId);
  if (!countResult.ok) return watchlistDbErrorResponse(countResult);

  if (isOverFollowLimit(entitlements.tier, countResult.data)) {
    const phase = getCurrentPricingPhase();
    return NextResponse.json(
      {
        success: false,
        error: "Follow limit reached for your plan.",
        upsell: {
          currentTier: entitlements.tier,
          followLimit: followLimitForTier(entitlements.tier),
          upgradeTier: WATCHLIST_UPGRADE_TIER,
          upgradePriceMonthly: phase.pro.monthly,
        },
      },
      { status: 403 },
    );
  }

  const created = await createWatchlistEntry(db, userId, entityType, entityId);
  if (!created.ok) return watchlistDbErrorResponse(created);

  return NextResponse.json(
    {
      success: true,
      created: created.data.created,
      data: {
        id: created.data.entry.id,
        entityType: created.data.entry.entityType,
        entityId: created.data.entry.entityId,
        createdAt: created.data.entry.createdAt.toISOString(),
      },
    },
    { status: created.data.created ? 201 : 200 },
  );
}
