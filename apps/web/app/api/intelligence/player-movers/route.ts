/**
 * Player movers (heating up / cooling down) — momentum input to buy-low/sell-high.
 * Premium analytics, Pro-gated. Defaults to the current season; ?recentN sets the
 * recent-form window (2–8, default 4). Honest empty state until the backfill runs.
 */
import { NextResponse } from "next/server";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadPlayerMovers } from "@/lib/intelligence/player-movers";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/player-movers");
  if (denied) return denied;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }
  const recentN = Math.min(8, Math.max(2, Number(url.searchParams.get("recentN") ?? 4) || 4));

  const data = await loadPlayerMovers(season, recentN);
  return NextResponse.json({ success: data.status === "ok", data });
}
