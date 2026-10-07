import { NextResponse } from "next/server";
import { loadNflverseTrendReadiness } from "@/lib/trends/nflverse-readiness";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Conformance, not a new paywall: this route is the JSON behind the Pro-gated
  // /trends surface, exactly like the /api/nflverse/* routes the SAME page links
  // (qb-age-rb-trend, birthday-usage-trend) — every one of those 30+ siblings
  // calls requirePremiumApiRateLimited. Left open, it was an unauthenticated
  // network + CPU amplifier: each request fans out to FIVE full nflverse release
  // assets, buffers every body via response.arrayBuffer() and gunzips it
  // in-process to count rows. A trivial `while true; do curl ... & done` burns
  // Vercel GB-s and egress, can OOM/timeout the function, and — the real damage —
  // gets the deployment's egress IP throttled or banned by the nflverse/GitHub
  // host, which breaks the ingestion pipeline the paid product runs on.
  const denied = await requirePremiumApiRateLimited("trends/nflverse-readiness");
  if (denied) return denied;
  const data = await loadNflverseTrendReadiness();
  return NextResponse.json({ success: true, data });
}
