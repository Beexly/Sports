import { NextResponse } from "next/server";
import { loadNflverseExpectedMetrics } from "@/lib/nflverse/expected-metrics";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

/**
 * GSE Expected Metrics — our own CPOE/RYOE/xYAC from public play-by-play, each
 * carrying its ground-truth validation report vs Next Gen Stats. Premium-gated
 * like the other nflverse intelligence routes; measurement only.
 */
export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/expected-metrics");
  if (denied) return denied;
  const data = await loadNflverseExpectedMetrics();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
