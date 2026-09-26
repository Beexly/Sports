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
import { db } from "@sports/db";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  isInNflWireSeason,
  refreshWireFromRoster,
  wireSeasonLabel,
} from "@/lib/news/wire-store";
import { dispatchWireReportAlerts } from "@/lib/watchlist/wire-alert-hook";

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
    // C-417: fan out watchlist alerts for reports that were NOT already on
    // each Signal slot. Fail-isolated — a broken alert path never fails the
    // ingest the operator actually cares about.
    let wireAlerts: Awaited<ReturnType<typeof dispatchWireReportAlerts>> | null = null;
    try {
      wireAlerts = await dispatchWireReportAlerts(db, result.newReports, now);
    } catch (alertErr) {
      console.warn(
        `[cron:refresh-wire] wire alerts failed: ${
          alertErr instanceof Error ? alertErr.message : alertErr
        }`,
      );
    }
    return NextResponse.json({
      ok: true,
      season: wireSeasonLabel(now),
      configured: result.configured,
      reached: result.reached,
      classified: result.classified,
      upserted: result.upserted,
      skipped: result.skipped,
      newReports: result.newReports.length,
      wireAlerts: wireAlerts
        ? {
            matchedReports: wireAlerts.matchedReports,
            followersMatched: wireAlerts.followersMatched,
            dispatches: wireAlerts.dispatches.length,
          }
        : null,
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
