import { NextResponse } from "next/server";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseUsagePulse();
  return NextResponse.json({ success: true, data });
}
