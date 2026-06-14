import { NextResponse } from "next/server";
import { loadNflverseCombine } from "@/lib/nflverse/combine";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadNflverseCombine();
  return NextResponse.json({ success: true, data });
}
