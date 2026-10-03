import { NextResponse } from "next/server";
import { loadSleeperMarketSignal } from "@/lib/sleeper/market-signal";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadSleeperMarketSignal();
  return NextResponse.json({ success: true, data });
}
