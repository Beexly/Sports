import { NextResponse } from "next/server";
import { loadGradedPool } from "@/lib/integrations/graded-pool";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";
// The pool composes several multi-MB nflverse/ffverse assets; give the diagnostic
// route headroom beyond the default so it returns 200 instead of timing out.
export const maxDuration = 60;

/**
 * Preview of the real graded player pool that drives every fantasy tool when the
 * founder enables the projections feed. Shown for transparency; activation is a
 * gated go-live decision (PROJECTIONS_PROVIDER).
 */
export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/graded-pool");
  if (denied) return denied;
  const data = await loadGradedPool();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
