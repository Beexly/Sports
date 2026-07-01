import { NextResponse } from "next/server";
import { loadBirthdayUsageTrendReport } from "@/lib/nflverse/birthday-usage-trend";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadBirthdayUsageTrendReport();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
