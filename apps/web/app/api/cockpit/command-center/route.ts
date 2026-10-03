/**
 * /api/cockpit/command-center — JSON readout of the ranked owner-attention feed.
 *
 * Admin-only. Read-only. No state changes. The Command Center composes the
 * existing live synthesis (Jarvis + Owner Summary) into one ranked decision
 * queue; this endpoint exposes the same feed the page renders, for monitoring
 * or a future history buffer.
 *
 * Never returns a transport 503 for a synthesis failure — `loadCommandCenterFeed`
 * resolves to a labeled error feed (success=false) so callers get a structured
 * signal, not a dead endpoint.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadCommandCenterFeed } from "@/lib/command-center/feed";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const feed = await loadCommandCenterFeed();
  return NextResponse.json(feed, {
    status: 200,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}
