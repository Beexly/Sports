import { NextResponse } from "next/server";
import { loadNflverseNextGenStats } from "@/lib/nflverse/next-gen-stats";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/next-gen-stats");
  if (denied) return denied;
  const data = await loadNflverseNextGenStats();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
