/**
 * C-416 — Vercel cron: refresh the reporter wire into stored Signal rows.
 *
 * Schedule (apps/web/vercel.json + root mirror): every 10 minutes. The route
 * itself is the in-season gate — outside September–early February it returns
 * `skipped: "out-of-season"` without fetching, which is how "every 10 minutes
 * in season" is expressed without a second scheduler.
 *
 * Authentication: Bearer CRON_SECRET only (write path — never dual/x-vercel-cron).
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  isInNflWireSeason,
  refreshWireFromRoster,
  wireSeasonLabel,
} from "@/lib/news/wire-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
// Vercel Pro cron ceiling; the roster is ~100 public RSS/Atom feeds.
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const now = new Date();
    if (!isInNflWireSeason(now)) {
      return NextResponse.json({
        ok: true,
        skipped: "out-of-season",
        season: wireSeasonLabel(now),
      });
    }
    const result = await refreshWireFromRoster({ now });
    return NextResponse.json({
      ok: true,
      season: wireSeasonLabel(now),
      ...result,
    });
  } catch (err) {
    console.error(
      `[cron:refresh-wire] failed: ${err instanceof Error ? err.message : err}`,
    );
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
