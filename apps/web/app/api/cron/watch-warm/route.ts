/**
 * Vercel cron — watch Space warm ping (every 10 min, see vercel.json).
 *
 * During active game windows the CV Space must not cold-start mid-drive, so
 * this tick warm-pings /health whenever any window is active or arming
 * within 15 min. Between games it does nothing (no Space cost, no work).
 *
 * Read-only w.r.t. game state; writes only the scheduler_runs heartbeat.
 *
 * 2026-11-13 (Neon autosuspend leak): cadence was every 3 minutes — faster
 * than Neon's 300s autosuspend, so the heartbeat INSERT kept gse-postgres
 * awake 24/7. Now every 10 minutes, and the heartbeat is skipped entirely in
 * the 02:30–06:30 CT quiet window when no game is live.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { isNeonQuietWindow } from "@/lib/cron/neon-quiet-window";
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

  // Neon quiet window: no live games at 02:30–06:30 CT => no heartbeat write,
  // no Space ping. The ESPN fetch above is free and never touches Neon.
  if (active.length === 0 && isNeonQuietWindow(new Date(nowMs))) {
    return NextResponse.json({ ok: true, warmed: false, skipped: "neon-quiet-window", active: 0 });
  }

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
