/**
 * Vercel cron — Jarvis observatory snapshot.
 *
 * Placeholder. The Jarvis ring buffer is currently populated by the
 * cockpit on each operator visit (`sharedJarvisHistory()` + the trend
 * page). A scheduled snapshot writer is a nice-to-have for filling
 * the buffer without operator visits but requires its own helper —
 * see `apps/web/lib/cockpit/jarvis-history.ts` for the API surface.
 *
 * This cron returns a no-op acknowledgement so the Vercel scheduler
 * doesn't fail. Implement the actual snapshot capture once the
 * settlement cron above is fully ported and the operator has visible
 * usage signals on the trend buffer.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    note: "Jarvis snapshot cron is a stub. The ring buffer is filled by " +
      "operator visits today; scheduled snapshots are a follow-up.",
  });
}
