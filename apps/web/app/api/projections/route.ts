/**
 * Player projections surface. Premium-gated (forecasts, not free-public), and
 * NOT wired into pick confidence — publishing/pricing stays owner-gated. The
 * response carries the backtest error so the numbers are honest about accuracy.
 * Defaults to projecting NEXT season.
 */
import { NextResponse } from "next/server";
import { requirePremiumApi } from "@/lib/api-entitlement";
import { loadPlayerProjections } from "@/lib/projections/player-projections";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason() + 1;
  if (!Number.isInteger(season) || season < 2000 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const data = await loadPlayerProjections(season);
  return NextResponse.json({ success: data.status === "ok", data });
}
