import { NextResponse } from "next/server";
import { loadQbAgeRbTrendReport } from "@/lib/nflverse/qb-age-rb-trend";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadQbAgeRbTrendReport();
  return NextResponse.json({ success: true, data });
}
