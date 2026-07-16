import { NextResponse } from "next/server";
import { loadNflverseInjuryReport } from "@/lib/nflverse/injury-report";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/injuries");
  if (denied) return denied;
  const data = await loadNflverseInjuryReport();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
