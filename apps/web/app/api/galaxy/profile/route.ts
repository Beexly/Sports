import { NextResponse } from "next/server";
import { getCurrentProfileView, getSessionUser } from "@/lib/galaxy/session";

export const dynamic = "force-dynamic";

/** Current player's Galaxy Profile view. */
export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: true, authenticated: false, view: null });
  }
  const view = await getCurrentProfileView();
  return NextResponse.json({ ok: true, authenticated: true, view });
}
