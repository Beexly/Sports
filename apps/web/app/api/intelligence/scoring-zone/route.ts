import { NextResponse } from "next/server";
import { loadScoringZone } from "@/lib/intelligence/scoring-zone";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadScoringZone();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
