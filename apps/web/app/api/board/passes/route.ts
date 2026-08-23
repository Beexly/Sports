import { NextRequest, NextResponse } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route — same IP-keyed limiter as its sibling
  // /api/board/state (60 req/min per IP). Cost control only; the payload
  // itself stays fail-closed in lib/board/passes.ts.
  const limit = consumeRateLimit("public-board-passes", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  const payload = await loadBoardPasses();
  return NextResponse.json({ success: true, ...payload });
}
