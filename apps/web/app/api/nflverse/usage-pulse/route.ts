import { NextResponse } from "next/server";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/usage-pulse");
  if (denied) return denied;
  const data = await loadNflverseUsagePulse();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
