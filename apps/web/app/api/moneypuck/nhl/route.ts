import { NextResponse } from "next/server";
import { loadMoneyPuckNhl } from "@/lib/moneypuck/nhl";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadMoneyPuckNhl();
  return NextResponse.json({ success: true, data });
}
