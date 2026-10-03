import { NextResponse } from "next/server";
import { loadOpportunityTransfer } from "@/lib/intelligence/opportunity-transfer";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/opportunity-transfer");
  if (denied) return denied;
  const data = await loadOpportunityTransfer();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
