import { NextResponse } from "next/server";
import { loadRouteRate } from "@/lib/intelligence/route-rate";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/route-rate");
  if (denied) return denied;
  const data = await loadRouteRate();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
