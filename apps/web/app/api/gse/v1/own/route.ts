/**
 * GET /api/gse/v1/own — own-feed dominance snapshot.
 * oddsApiRequired=false. First-party intelligence surface.
 */
import { NextResponse } from "next/server";
import { handleOwnSnapshot } from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const result = handleOwnSnapshot();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: {
      "X-GSE-API": "stats.v1.own",
      "X-GSE-ODDS-API": "not-required",
      "X-GSE-LIVE-BOARD": "off",
    },
  });
}
