/**
 * GET /api/gse/v1/own/provenance?metricId= — metric contract provenance.
 */
import { NextRequest, NextResponse } from "next/server";
import { handleOwnProvenance } from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const metricId = req.nextUrl.searchParams.get("metricId") ?? "";
  if (!metricId.trim()) {
    return NextResponse.json(
      { error: "metricId required", code: "missing_id" },
      { status: 400 },
    );
  }
  const result = handleOwnProvenance(metricId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1.own" },
  });
}
