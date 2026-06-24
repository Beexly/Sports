import { NextResponse } from "next/server";
import { buildReplayableProvenanceFeed } from "@/lib/calibration/replayable-provenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const enabled = process.env.REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED === "true";
  const data = buildReplayableProvenanceFeed([], new Date(), { enabled });
  return NextResponse.json({ success: data.enabled && data.chain.valid, data });
}
