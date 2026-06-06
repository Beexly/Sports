import { NextResponse } from "next/server";
import { loadNflverseInjuryReport } from "@/lib/nflverse/injury-report";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseInjuryReport();
  return NextResponse.json({ success: true, data });
}
