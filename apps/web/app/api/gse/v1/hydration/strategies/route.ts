import { NextResponse } from "next/server";
import { handleHydrationStrategies } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** GET /api/gse/v1/hydration/strategies — real-time hydration strategy catalog */
export async function GET(): Promise<NextResponse> {
  const result = handleHydrationStrategies();
  return NextResponse.json(result.data, { headers: { "X-GSE-API": "stats.v1" } });
}
