import { NextRequest, NextResponse } from "next/server";
import { handleGetMetricValue } from "@sports/stats-api";
import { demoValueProvider } from "@/lib/gse-stats/value-provider";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/values/:metricId?entityId=&asOf=
 * PIT value fetch — refuse-default without asOf.
 * Uses demo provider until FeatureStore loaders are wired per metric.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ metricId: string }> },
): Promise<NextResponse> {
  const { metricId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const result = await handleGetMetricValue(
    {
      metricId: decodeURIComponent(metricId),
      entityId: sp.get("entityId") ?? "",
      asOf: sp.get("asOf") ?? "",
    },
    demoValueProvider,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(
    {
      ...result.data,
      _note:
        "Demo/seeded provider until FeatureStore loaders land per metric. Not a performance claim.",
    },
    { headers: { "X-GSE-API": "stats.v1" } },
  );
}
