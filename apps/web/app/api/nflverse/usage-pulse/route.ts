import { NextResponse } from "next/server";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadNflverseUsagePulse();
  return NextResponse.json({ success: true, data });
}
