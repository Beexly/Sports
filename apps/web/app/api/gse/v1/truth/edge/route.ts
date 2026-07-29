import { NextRequest, NextResponse } from "next/server";
import { handleDualAsOfEdge } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/gse/v1/truth/edge
 * Body: { p, q, featureAsOf, quoteAsOf, decisionAsOf, commenceTime? }
 * Returns dual-asOf edge or 422 refuse with code.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleDualAsOfEdge({
    p: Number(body.p),
    q: Number(body.q),
    featureAsOf: String(body.featureAsOf ?? ""),
    quoteAsOf: String(body.quoteAsOf ?? ""),
    decisionAsOf: String(body.decisionAsOf ?? ""),
    commenceTime: body.commenceTime != null ? String(body.commenceTime) : undefined,
    consistencyBudgetMs:
      body.consistencyBudgetMs != null ? Number(body.consistencyBudgetMs) : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
