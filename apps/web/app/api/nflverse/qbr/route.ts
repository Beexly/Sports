import { NextResponse } from "next/server";
import { loadNflverseQbr } from "@/lib/nflverse/qbr";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/qbr");
  if (denied) return denied;
  const data = await loadNflverseQbr();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
