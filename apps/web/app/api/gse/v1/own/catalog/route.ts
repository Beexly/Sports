/**
 * GET /api/gse/v1/own/catalog — first-party own metric contracts.
 */
import { NextRequest, NextResponse } from "next/server";
import { handleOwnCatalog } from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const plane = sp.get("plane") ?? undefined;
  const publicOnly = sp.get("publicOnly") !== "false";
  const result = handleOwnCatalog({ plane, publicOnly });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1.own", "X-GSE-ODDS-API": "not-required" },
  });
}
