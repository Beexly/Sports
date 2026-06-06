import { NextResponse } from "next/server";
import { readMediaControlPlane } from "@/lib/media/control-plane";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const control = readMediaControlPlane(process.env as Record<string, string | undefined>);

  return NextResponse.json({
    success: true,
    data: control,
  });
}
