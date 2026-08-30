import { NextResponse } from "next/server";
import { loadNflverseTrendReadiness } from "@/lib/trends/nflverse-readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseTrendReadiness();
  return NextResponse.json({ success: true, data });
}
