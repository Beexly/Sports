import { NextResponse } from "next/server";
import { loadAvailabilityModifier } from "@/lib/human-performance/availability";

export const dynamic = "force-dynamic";

function num(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player") ?? "";
  if (!player.trim()) {
    return NextResponse.json({ success: false, error: "player is required" }, { status: 400 });
  }
  const data = await loadAvailabilityModifier({
    player,
    team: searchParams.get("team"),
    gameId: searchParams.get("gameId"),
    daysRest: num(searchParams.get("daysRest")),
    roleVolatility: num(searchParams.get("roleVolatility")) ?? 0,
    marketMovedOnNews: searchParams.get("marketMovedOnNews") === "true",
    conflictingSources: searchParams.get("conflictingSources") === "true",
  });
  return NextResponse.json({ success: data.status !== "source-error", data });
}
