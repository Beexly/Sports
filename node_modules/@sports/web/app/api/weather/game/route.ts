import { NextResponse } from "next/server";
import { loadNflGameWeather } from "@/lib/weather/game-weather";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflGameWeather();
  return NextResponse.json({ success: true, data });
}
