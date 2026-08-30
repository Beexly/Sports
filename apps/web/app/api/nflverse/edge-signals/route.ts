import { NextResponse } from "next/server";
import { loadNflverseEdgeSignals } from "@/lib/nflverse/edge-signals";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/edge-signals");
  if (denied) return denied;
  const data = await loadNflverseEdgeSignals();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
