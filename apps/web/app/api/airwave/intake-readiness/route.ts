import { NextResponse } from "next/server";
import { readAirwaveIntakeReadiness } from "@/lib/airwave";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const intake = await readAirwaveIntakeReadiness(process.env as Record<string, string | undefined>);

  return NextResponse.json({
    success: true,
    data: intake,
  });
}
