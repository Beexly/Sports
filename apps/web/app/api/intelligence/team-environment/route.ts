import { NextResponse } from "next/server";
import { loadTeamEnvironment } from "@/lib/intelligence/team-environment";
import { requirePremiumApi } from "@/lib/api-entitlement";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  const data = await loadTeamEnvironment();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
