import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      status: "alive",
      endpoint: "live",
      checkedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
