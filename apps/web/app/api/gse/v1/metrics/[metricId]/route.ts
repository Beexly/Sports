import { NextRequest, NextResponse } from "next/server";
import { handleGetMetric } from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ metricId: string }> },
): Promise<NextResponse> {
  const { metricId } = await ctx.params;
  const tier = req.nextUrl.searchParams.get("tier") ?? "FREE";
  const result = handleGetMetric(decodeURIComponent(metricId), tier);
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
