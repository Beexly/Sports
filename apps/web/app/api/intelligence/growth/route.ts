import { NextResponse } from "next/server";
import { buildIntelligenceGrowthSnapshot } from "@/lib/intelligence/growth-observatory";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const snapshot = buildIntelligenceGrowthSnapshot();
  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "Content-Type": "application/json",
    },
  });
}
