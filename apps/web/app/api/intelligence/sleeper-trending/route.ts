import { NextResponse } from "next/server";
import { loadSleeperTrending } from "@/lib/integrations/sleeper";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadSleeperTrending();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
