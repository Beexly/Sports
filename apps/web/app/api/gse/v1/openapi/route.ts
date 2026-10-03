import { NextResponse } from "next/server";
import { buildStatsOpenApi } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** GET /api/gse/v1/openapi — OpenAPI 3.1 for GSE Stats API */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(buildStatsOpenApi(), {
    headers: {
      "Content-Type": "application/json",
      "X-GSE-API": "stats.v1",
    },
  });
}
