import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardPasses } from "@/lib/board/passes";
import { jsonNoStore } from "@/lib/api/no-store";
import { logEntitlementFailClosed } from "@/lib/entitlement-observability";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Resolve the caller's No-Bet-detail entitlement SERVER-SIDE (C-181).
 *
 * This endpoint is public and anonymous by default, so the gate is written to
 * fail closed at every exit: no session, no subscription, a throwing session
 * store, or a throwing entitlement lookup all resolve to `false`. Only a
 * positively-resolved `canSeeNoBetDetail` (PRO/ELITE — packages/types
 * getEntitlements) returns `true`.
 *
 * Mirrors `app/board/page.tsx`, which resolves the same flag before the query
 * so an unentitled viewer's payload never CONTAINS the refusal trail rather
 * than merely not rendering it (CLAUDE.md rule 3: server-side only).
 * `loadBoardPasses` deliberately does not read the session itself, so the
 * decision lives here at the route boundary.
 */
async function viewerCanSeeNoBetDetail(): Promise<boolean> {
  let userId: string | undefined;
  try {
    userId = (await auth())?.user?.id;
  } catch (error) {
    // `auth()` answers null on a throwing session store rather than throwing,
    // so this is a backstop for a module-scope fault. Withhold the detail and
    // still serve the public list — a 500 here would take the anonymous board
    // down over a paid-only field.
    logEntitlementFailClosed("board-passes:auth", undefined, error);
    return false;
  }
  if (!userId) return false;

  try {
    return (await getUserEntitlements(userId)).canSeeNoBetDetail;
  } catch (error) {
    logEntitlementFailClosed("board-passes:gate", userId, error);
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route — same IP-keyed limiter as its sibling
  // /api/board/state (60 req/min per IP). Cost control only; the payload
  // itself stays fail-closed in lib/board/passes.ts.
  const limit = consumeRateLimit("public-board-passes", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    // The 429 is no-store too: a cached rate-limit response keeps refusing a
    // caller whose window has already reset.
    return jsonNoStore(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const includeNoBetDetail = await viewerCanSeeNoBetDetail();
  const payload = await loadBoardPasses(new Date(), { includeNoBetDetail });

  // NO-STORE, like every other route on the picks/passes surface
  // (.claude/rules/nextjs-caching.md rule 2). Two independent reasons, and each
  // alone is sufficient: (1) the body carries a suppression/degradation state
  // that must be able to change the moment a kill switch fires — a cached 200
  // here is a stale public board, the failure CLAUDE.md rule 5 exists to
  // prevent (C-180); (2) since C-181 the body VARIES BY VIEWER — a PRO caller's
  // response carries `detail` on each pass row — so a shared cache entry
  // populated by a subscriber and replayed to an anonymous visitor would be a
  // paywall bypass at the edge. `dynamic = "force-dynamic"` governs Next's own
  // render cache and promises nothing about an intermediary.
  return jsonNoStore({ success: true, ...payload });
}
