import { NextResponse } from "next/server";
import { loadReceivingOpportunity } from "@/lib/intelligence/receiving-opportunity";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadReceivingOpportunity();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
