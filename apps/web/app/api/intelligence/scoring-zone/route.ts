import { NextResponse } from "next/server";
import { loadScoringZone } from "@/lib/intelligence/scoring-zone";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadScoringZone();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
