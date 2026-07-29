import { NextResponse } from "next/server";
import { handleGetMetric } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/metrics/:metricId — single metric definition.
 * Dark/blocked metrics → 403 refuse-default.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ metricId: string }> },
): Promise<NextResponse> {
  const { metricId } = await ctx.params;
  const result = handleGetMetric(decodeURIComponent(metricId));
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1" },
  });
}
