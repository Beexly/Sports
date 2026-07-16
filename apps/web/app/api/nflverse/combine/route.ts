import { NextResponse } from "next/server";
import { loadNflverseCombine } from "@/lib/nflverse/combine";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/combine");
  if (denied) return denied;
  const data = await loadNflverseCombine();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
