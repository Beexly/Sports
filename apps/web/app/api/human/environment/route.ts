import { NextResponse } from "next/server";
import { loadEnvironmentScore } from "@/lib/human-performance/environment";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team") ?? "";
  const sport = searchParams.get("sport") ?? "NFL";
  if (!team) {
    return NextResponse.json({ success: false, error: "team is required" }, { status: 400 });
  }
  const data = loadEnvironmentScore({ team, sport });
  return NextResponse.json({ success: true, data });
}
