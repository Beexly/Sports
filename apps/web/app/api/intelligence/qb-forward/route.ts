import { NextResponse } from "next/server";
import { loadQbForward } from "@/lib/intelligence/qb-forward";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/qb-forward");
  if (denied) return denied;
  const data = await loadQbForward();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
