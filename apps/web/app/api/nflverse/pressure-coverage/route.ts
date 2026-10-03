import { NextResponse } from "next/server";
import { loadNflversePressureCoverage } from "@/lib/nflverse/pressure-coverage";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/pressure-coverage");
  if (denied) return denied;
  const data = await loadNflversePressureCoverage();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
