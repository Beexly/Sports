import { NextResponse } from "next/server";
import { loadSleeperLeague } from "@/lib/integrations/sleeper-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") ?? "";
  const userId = searchParams.get("userId");
  if (!leagueId) {
    return NextResponse.json({ success: false, error: "leagueId is required" }, { status: 400 });
  }
  const data = await loadSleeperLeague({ leagueId, userId: userId || null });
  return NextResponse.json({ success: data.status !== "source-error", data });
}
