import { NextResponse } from "next/server";
import { loadPlayerModel } from "@/lib/intelligence/player-model";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadPlayerModel();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
