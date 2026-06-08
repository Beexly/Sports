import { NextResponse } from "next/server";
import { loadPlayDesign } from "@/lib/intelligence/play-design";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // FTN charting + pbp identity join needs headroom beyond the default

export async function GET(): Promise<NextResponse> {
  const data = await loadPlayDesign();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
