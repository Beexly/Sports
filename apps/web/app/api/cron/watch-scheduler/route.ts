/**
 * Vercel cron — watch-loop game-window scheduler (every 10 min, see vercel.json).
 *
 * Each tick:
 *   1. Fetch today + tomorrow's NFL windows from ESPN.
 *   2. Upsert watch.games rows (window state survives restarts).
 *   3. Record a watch.scheduler_runs heartbeat.
 *   4. If any window is active now (or arms within 15 min), warm-ping the
 *      HF Space so ZeroGPU doesn't cold-start mid-drive.
 *
 * The loop runs during every NFL game, not just when Garrett watches — the
 * Windows watcher auto-tunes per window with no human in the loop.
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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "scoreboard fetch failed" },
      { status: 502 },
    );
  }

  const nowMs = Date.now();
  const active = getActiveWindows(windows, nowMs);
  const upcoming = nextWindow(windows, nowMs);

  // Upsert window state.
  for (const w of windows) {
    await (db as never as { $executeRawUnsafe: (q: string, ...p: unknown[]) => Promise<number> })
      .$executeRawUnsafe(
        `INSERT INTO watch.games (game_id, season, week, away, home, kickoff_ts, window_start, window_end, status)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0), to_timestamp($8 / 1000.0), $9)
         ON CONFLICT (game_id) DO UPDATE SET
           window_start = EXCLUDED.window_start,
           window_end = EXCLUDED.window_end,
           status = EXCLUDED.status,
           updated_at = now()`,
        w.gameId, w.season, w.week, w.away, w.home,
        w.kickoffTs, w.windowStart, w.windowEnd, w.status,
      );
  }

  // Warm the Space when a window is active or arming within 15 min.
  const armingSoon = upcoming != null && upcoming.windowStart - nowMs <= 15 * 60 * 1000;
  let spaceWarmed = false;
  if (active.length > 0 || armingSoon) {
    spaceWarmed = await pingWatchSpace();
  }

  await (db as never as { $executeRawUnsafe: (q: string, ...p: unknown[]) => Promise<number> })
    .$executeRawUnsafe(
      `INSERT INTO watch.scheduler_runs (active_games, next_game_id, next_kickoff, space_warmed)
       VALUES ($1, $2, $3, $4)`,
      active.map((w) => w.gameId),
      upcoming?.gameId ?? null,
      upcoming ? new Date(upcoming.kickoffTs) : null,
      spaceWarmed,
    );

  return NextResponse.json({
    ok: true,
    windows: windows.length,
    active: active.map((w) => `${w.away}@${w.home}`),
    next: upcoming ? `${upcoming.away}@${upcoming.home} @ ${new Date(upcoming.kickoffTs).toISOString()}` : null,
    spaceWarmed,
  });
}
