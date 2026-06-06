import { NextResponse } from "next/server";
import { loadBirthdayUsageTrendReport } from "@/lib/nflverse/birthday-usage-trend";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadBirthdayUsageTrendReport();
  return NextResponse.json({ success: true, data });
}
