import { NextResponse } from "next/server";
import { loadLahmanMlbTeams } from "@/lib/lahman/mlb-teams";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadLahmanMlbTeams();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
