import { NextResponse } from "next/server";
import { loadPredictiveness } from "@/lib/intelligence/predictiveness";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadPredictiveness();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
