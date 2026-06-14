import { NextResponse } from "next/server";
import { loadExpectedPoints } from "@/lib/intelligence/expected-points";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadExpectedPoints();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
