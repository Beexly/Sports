import { NextResponse } from "next/server";
import { loadNflverseNextGenStats } from "@/lib/nflverse/next-gen-stats";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadNflverseNextGenStats();
  return NextResponse.json({ success: true, data });
}
