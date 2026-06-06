import { NextResponse } from "next/server";
import { readAirwaveControlPlane } from "@/lib/airwave";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const control = readAirwaveControlPlane(process.env as Record<string, string | undefined>);

  return NextResponse.json({
    success: true,
    data: control,
  });
}
