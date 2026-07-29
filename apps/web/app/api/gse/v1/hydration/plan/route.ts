import { NextRequest, NextResponse } from "next/server";
import { handleHydrationPlan } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/gse/v1/hydration/plan
 * Body: { metricIds: string[], entityIds?: string[], asOf?: string }
 * Returns pure plan — does not execute network hydration (runners are server jobs).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { metricIds?: string[]; entityIds?: string[]; asOf?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleHydrationPlan({
    metricIds: body.metricIds,
    entityIds: body.entityIds ?? [],
    asOf: body.asOf,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
