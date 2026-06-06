import { NextResponse } from "next/server";
import { loadNflversePressureCoverage } from "@/lib/nflverse/pressure-coverage";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflversePressureCoverage();
  return NextResponse.json({ success: true, data });
}
