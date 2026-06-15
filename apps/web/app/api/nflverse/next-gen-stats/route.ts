import { NextResponse } from "next/server";
import { loadNflverseNextGenStats } from "@/lib/nflverse/next-gen-stats";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadNflverseNextGenStats();
  return NextResponse.json({ success: true, data });
}
