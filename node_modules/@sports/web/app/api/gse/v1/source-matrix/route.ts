import { NextResponse } from "next/server";
import { handleCoverageMatrix } from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** GET /api/gse/v1/source-matrix — source coverage matrix (path avoids /coverage gitignore) */
export async function GET(): Promise<NextResponse> {
  const result = handleCoverageMatrix();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json(result.data, {
    headers: { "X-GSE-API": "stats.v1" },
  });
}
