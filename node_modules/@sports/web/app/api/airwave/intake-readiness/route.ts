import { NextResponse } from "next/server";
import { readAirwaveIntakeReadiness } from "@/lib/airwave";
import { auth } from "@/lib/auth";
import { isAdminSession, ADMIN_ONLY_MESSAGE } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: ADMIN_ONLY_MESSAGE }, { status: 403 });
  }

  const intake = await readAirwaveIntakeReadiness(process.env as Record<string, string | undefined>);

  return NextResponse.json({
    success: true,
    data: intake,
  });
}
