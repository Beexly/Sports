import { NextResponse } from "next/server";
import { loadNflverseQbr } from "@/lib/nflverse/qbr";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadNflverseQbr();
  return NextResponse.json({ success: true, data });
}
