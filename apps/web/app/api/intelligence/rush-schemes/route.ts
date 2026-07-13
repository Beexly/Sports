/**
 * Rush-scheme leans (gap/power vs outside/zone). Premium analytics, Pro-gated.
 * Defaults to the current season; empty until the rush-tendency backfill runs.
 */
import { NextResponse } from "next/server";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadRushSchemes } from "@/lib/intelligence/rush-schemes";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/rush-schemes");
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const data = await loadRushSchemes(season);
  return NextResponse.json({ success: data.status === "ok", data });
}
