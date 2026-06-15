import { NextResponse } from "next/server";
import { loadNflversePressureCoverage } from "@/lib/nflverse/pressure-coverage";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadNflversePressureCoverage();
  return NextResponse.json({ success: true, data });
}
