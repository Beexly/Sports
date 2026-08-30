import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState, redactBoardConfidence } from "@/lib/board/state";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route (board state load). IP-keyed rate limit
  // copied from the established pattern in apps/web/app/api/nflverse/injuries/route.ts
  // (consumeRateLimit + clientIp).
  const limit = consumeRateLimit("public-board-state", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;

  // loadBoardState applies the tier gate server-side (no frontend-only paywall).
  // Without canSeePremiumPicks, premium picks are tier-filtered out of the
  // DB query and the `market` field on every row is redacted to ALL_MARKETS.
  const payload = await loadBoardState(new Date(), viewerEntitlements);

  // Confidence is a PRO+ metric. The board itself is public, but the
  // numeric confidence must never reach a viewer without the
  // canSeeConfidence entitlement (server-side paywall rule #3).
  const canSeeConfidence = viewerEntitlements?.canSeeConfidence ?? false;

  const safePayload = canSeeConfidence ? payload : redactBoardConfidence(payload);
  return NextResponse.json({ success: true, ...safePayload });
}
