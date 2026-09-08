import { NextRequest, NextResponse } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";
import { jsonNoStore } from "@/lib/api/no-store";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

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
  // NO-STORE, like every other route on the picks/passes surface
  // (.claude/rules/nextjs-caching.md rule 2). `dynamic = "force-dynamic"`
  // governs Next's own render cache and promises nothing about an intermediary,
  // and this body carries a suppression/degradation state that must be able to
  // change the moment a kill switch fires - a cached 200 here is a stale public
  // board, which is the failure rule 5 exists to prevent (C-180).
  //
  // KNOWN GAP, DELIBERATELY NOT CLOSED HERE: this call passes no options, so
  // `includeNoBetDetail` is always false and the paid No-Bet forensic detail is
  // never served through this route. That FAILS CLOSED - it is a dead paid
  // feature, not a leak - and wiring it means adding per-viewer entitlement
  // resolution to a public anonymous endpoint, where getting the gate wrong
  // turns a dead feature into a paywall bypass. That belongs in a reviewed
  // change with its own tests, not a drive-by. Recorded as C-181.
  const payload = await loadBoardPasses();
  return jsonNoStore({ success: true, ...payload });
}
