/**
 * Vercel cron — watch Space warm ping (every 3 min, see vercel.json).
 *
 * During active game windows the CV Space must not cold-start mid-drive, so
 * this tick warm-pings /health whenever any window is active or arming
 * within 15 min. Between games it does nothing (no Space cost, no work).
 *
 * Read-only w.r.t. game state; writes only the scheduler_runs heartbeat.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  fetchUpcomingWindows,
  getActiveWindows,
  nextWindow,
} from "@sports/prediction-engine";
import { pingWatchSpace } from "@/lib/ops/watch-space";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  let windows;
  try {
    windows = await fetchUpcomingWindows();
  } catch {
    return NextResponse.json({ ok: false, warmed: false, reason: "scoreboard fetch failed" });
  }

  const nowMs = Date.now();
  const active = getActiveWindows(windows, nowMs);
  const upcoming = nextWindow(windows, nowMs);
  const shouldWarm =
    active.length > 0 || (upcoming != null && upcoming.windowStart - nowMs <= 15 * 60 * 1000);

  let warmed = false;
  if (shouldWarm) warmed = await pingWatchSpace();

  await (db as never as { $executeRawUnsafe: (q: string, ...p: unknown[]) => Promise<number> })
    .$executeRawUnsafe(
      `INSERT INTO watch.scheduler_runs (active_games, next_game_id, next_kickoff, space_warmed)
       VALUES ($1, $2, $3, $4)`,
      active.map((w) => w.gameId),
      upcoming?.gameId ?? null,
      upcoming ? new Date(upcoming.kickoffTs) : null,
      warmed,
    );

  return NextResponse.json({ ok: true, warmed, active: active.length });
}
