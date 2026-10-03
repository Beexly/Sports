import { NextResponse } from "next/server";
import { loadBiomechReadiness } from "@/lib/human-performance/readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = loadBiomechReadiness();
  return NextResponse.json({ success: true, data });
}
