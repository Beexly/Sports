import { NextResponse } from "next/server";
import { loadNflversePlayerLab } from "@/lib/nflverse/player-lab";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("nflverse/player-lab");
  if (denied) return denied;
  const data = await loadNflversePlayerLab();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
