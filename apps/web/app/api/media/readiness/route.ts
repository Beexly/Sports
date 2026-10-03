import { NextResponse } from "next/server";
import { readMediaControlPlane } from "@/lib/media/control-plane";
import { auth } from "@/lib/auth";
import { isAdminSession, ADMIN_ONLY_MESSAGE } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: ADMIN_ONLY_MESSAGE }, { status: 403 });
  }

  const control = readMediaControlPlane(process.env as Record<string, string | undefined>);

  return NextResponse.json({
    success: true,
    data: control,
  });
}
