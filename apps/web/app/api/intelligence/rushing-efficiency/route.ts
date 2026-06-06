import { NextResponse } from "next/server";
import { loadRushingEfficiency } from "@/lib/intelligence/rushing-efficiency";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadRushingEfficiency();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
