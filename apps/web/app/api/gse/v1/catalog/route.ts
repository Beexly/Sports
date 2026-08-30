import { NextResponse } from "next/server";
import { handleCatalogSummary } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gse/v1/catalog — GSE Stats API catalog summary.
 * Public, refuse-default law strip, density stats. No performance fabrications.
 */
export async function GET(): Promise<NextResponse> {
  const result = handleCatalogSummary();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "X-GSE-API": "stats.v1",
    },
  });
}
