/**
 * Player usage archetypes. Premium analytics, Pro-gated. Defaults to the current
 * season; honest empty state until the player-data backfill runs.
 */
import { NextResponse } from "next/server";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadPlayerArchetypes } from "@/lib/intelligence/player-archetypes";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/player-archetypes");
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const data = await loadPlayerArchetypes(season);
  return NextResponse.json({ success: data.status === "ok", data });
}
