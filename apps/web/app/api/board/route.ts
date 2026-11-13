import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadDoctrineBoard } from "@/lib/board/doctrine-loader";
import { STALENESS_LAW } from "@/lib/board/staleness-law";
import { jsonNoStore } from "@/lib/api/no-store";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * /api/board - the two-doctrines board as JSON (WP-5).
 *
 * Every game is either a Zone 1 PLAY (integer confidence XX/100) or a Zone 2
 * PASS with a plain-language reason. STALENESS_LAW: there is no error state.
 * A failed load composes the PASS doctrine with a resting board, HTTP 200.
 * The legacy lanes remain at /api/board/state and /api/board/passes.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const limit = consumeRateLimit("public-board-doctrine", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return jsonNoStore(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let viewerEntitlements: Awaited<ReturnType<typeof getUserEntitlements>> | undefined;
  try {
    const session = await auth();
    if (session?.user?.id) {
      viewerEntitlements = await getUserEntitlements(session.user.id);
    }
  } catch {
    viewerEntitlements = undefined;
  }

  const doctrine = await loadDoctrineBoard(viewerEntitlements);
  return jsonNoStore({ success: true, doctrine, law: STALENESS_LAW });
}