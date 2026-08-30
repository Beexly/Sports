import { NextResponse } from "next/server";
import { loadNflverseSnapShare } from "@/lib/nflverse/snap-share";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/snap-share");
  if (denied) return denied;
  const data = await loadNflverseSnapShare();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
