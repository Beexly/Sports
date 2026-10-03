import { NextResponse } from "next/server";
import { loadQbAgeRbTrendReport } from "@/lib/nflverse/qb-age-rb-trend";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/qb-age-rb-trend");
  if (denied) return denied;
  const data = await loadQbAgeRbTrendReport();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
