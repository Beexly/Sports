import { NextResponse } from "next/server";
import { loadTeamEnvironment } from "@/lib/intelligence/team-environment";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadTeamEnvironment();
  return NextResponse.json({ success: data.status !== "source-error", data });
}
