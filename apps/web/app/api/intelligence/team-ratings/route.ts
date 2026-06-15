/**
 * Opponent-adjusted team ratings (our reproduced DVOA-family metric). Premium
 * analytics, so Pro-gated like the other intelligence routes. Defaults to the
 * current season; honest empty state until the team-efficiency backfill runs.
 */
import { NextResponse } from "next/server";
import { requirePremiumApi } from "@/lib/api-entitlement";
import { loadTeamRatings } from "@/lib/intelligence/team-ratings";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const data = await loadTeamRatings(season);
  return NextResponse.json({ success: data.status === "ok", data });
}
