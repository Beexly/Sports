import { NextResponse } from "next/server";
import { loadClvBacktest } from "@/lib/intelligence/clv-calibration";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadClvBacktest();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
