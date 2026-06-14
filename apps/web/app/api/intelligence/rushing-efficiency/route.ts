import { NextResponse } from "next/server";
import { loadRushingEfficiency } from "@/lib/intelligence/rushing-efficiency";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadRushingEfficiency();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
