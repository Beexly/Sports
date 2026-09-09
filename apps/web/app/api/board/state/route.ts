import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState, redactBoardConfidence } from "@/lib/board/state";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";
import { jsonNoStore } from "@/lib/api/no-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route (board state load). IP-keyed rate limit
  // copied from the established pattern in apps/web/app/api/nflverse/injuries/route.ts
  // (consumeRateLimit + clientIp).
  const limit = consumeRateLimit("public-board-state", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return jsonNoStore(
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
  // NO-STORE, not just force-dynamic (C-240). This body VARIES BY VIEWER from a
  // single URL - premium rows are filtered out and `market` redacted without
  // canSeePremiumPicks, and confidence is stripped without canSeeConfidence -
  // yet it carried no Cache-Control and no Vary. `dynamic` governs Next's own
  // render cache and, as .claude/rules/nextjs-caching.md states, promises
  // nothing about an intermediary. A URL-keyed shared cache holding one PRO
  // viewer's response would serve their confidence values to an anonymous
  // visitor: a paywall bypass at the edge (CLAUDE.md rule 3), not merely stale
  // data. The 429 above is no-store for the same reason the rule gives - a
  // cached rate-limit denial keeps refusing a caller whose window has reset.
  return jsonNoStore({ success: true, ...safePayload });
}
