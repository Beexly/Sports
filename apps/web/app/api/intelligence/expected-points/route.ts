import { NextResponse } from "next/server";
import { loadExpectedPointsForDisplay } from "@/lib/intelligence/expected-points-display";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

/**
 * Pro/Elite expected-points API — a CUSTOMER-DISPLAY surface, so it loads
 * through the display boundary: a real clearance check with the TRUE
 * `commercial_display` intent. The `ffverse-ffopportunity` registry entry
 * blocks that intent by design (CC-BY-SA-4.0 share-alike, question open), so
 * this route currently returns the honest rights-gated source-error JSON shape
 * (success:false, empty rows, the reason on `error`/`note`) — never a 500 and
 * never ungated data. Unlock: legal SA-scope review, ffverse permission, or the
 * gse-ep-v1 replacement basis (#115) — see expected-points-display.ts.
 */
export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/expected-points");
  if (denied) return denied;
  const data = await loadExpectedPointsForDisplay();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
