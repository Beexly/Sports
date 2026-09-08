import { NextResponse } from "next/server";
import { loadGradedPool } from "@/lib/integrations/graded-pool";
import { jsonNoStore } from "@/lib/api/no-store";
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
  // NO-STORE, not just force-dynamic. `dynamic` governs Next's own render
  // cache and promises nothing about an intermediary, and this body is
  // entitlement-gated (PRO/ELITE only) AND carries a basis verdict that must be
  // able to change the moment the underlying season data does
  // (.claude/rules/nextjs-caching.md rules 2 and 3). A cached 200 here serves a
  // paid pool at the edge and pins a stale basis label to it.
  return jsonNoStore({ success: data.status !== "source-error", data });
}
