/**
 * On-demand backfill of historical games (nflverse schedules, all seasons since
 * 1999). Heavy — it replaces the whole historical_games table — so run it
 * occasionally, NOT on a frequent schedule. Auth: Bearer <CRON_SECRET>.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ingestHistoricalGames } from "@/lib/ingestion/historical-games";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const result = await ingestHistoricalGames();
  return NextResponse.json({ success: result.status === "ok", ...result }, {
    status: result.status === "ok" ? 200 : 502,
  });
}
