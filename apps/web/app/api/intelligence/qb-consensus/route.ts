import { NextResponse } from "next/server";
import { loadQbConsensus } from "@/lib/intelligence/qb-consensus";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadQbConsensus();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
