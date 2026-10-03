import { NextResponse } from "next/server";
import { loadSleeperLeague } from "@/lib/integrations/sleeper-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") ?? "";
  const userId = searchParams.get("userId");
  const cleanLeagueId = leagueId.replace(/\D/g, "").slice(0, 32);
  const cleanUserId = userId ? userId.replace(/\D/g, "").slice(0, 32) : null;
  if (!cleanLeagueId) {
    return NextResponse.json({ success: false, error: "leagueId is required" }, { status: 400 });
  }
  const data = await loadSleeperLeague({ leagueId: cleanLeagueId, userId: cleanUserId });
  return NextResponse.json({ success: data.status !== "source-error", data });
}
