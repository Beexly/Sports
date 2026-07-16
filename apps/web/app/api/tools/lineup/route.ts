/**
 * Lineup tool (start/sit + trade value) over the central Galaxy Index. Pro-gated.
 *   GET /api/tools/lineup?season=2025&players=id1,id2,id3
 */
import { NextResponse } from "next/server";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { compareLineup } from "@/lib/tools/lineup-tools";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("tools/lineup");
  if (denied) return denied;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const players = (url.searchParams.get("players") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (players.length === 0) {
    return NextResponse.json({ error: "players required (comma-separated ids)" }, { status: 400 });
  }

  const data = await compareLineup(season, players);
  return NextResponse.json({ success: data.status === "ok", data });
}
