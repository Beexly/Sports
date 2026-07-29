import { NextRequest, NextResponse } from "next/server";
import { handleExternalSources } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** GET /api/gse/v1/external — free/HF/open sources outside monorepo */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const result = handleExternalSources({
    kind: sp.get("kind") ?? undefined,
    status: sp.get("status") ?? undefined,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1" },
  });
}
