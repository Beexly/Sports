import { NextResponse } from "next/server";
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/player-model");
  if (denied) return denied;
  const data = await loadPlayerModel();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
