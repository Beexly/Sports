import { NextResponse } from "next/server";
import { handleRealtimeTruthCatalog } from "@sports/stats-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gse/v1/truth — GSE real-time truth topology + law */
export async function GET(): Promise<NextResponse> {
  const result = handleRealtimeTruthCatalog();
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
