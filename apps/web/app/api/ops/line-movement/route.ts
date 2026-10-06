/**
 * GET /api/ops/line-movement — READ-ONLY line-movement / steam-candidate report.
 *
 * WHY. `OddsLineSnapshot` rows (OPEN/INTERIM/CLOSE) are written by the odds
 * pipeline, but nothing computed a forward line-movement signal from them:
 * the archive-freshness module assesses coverage, and settlement grades
 * backward-looking CLV. This route is the sharp-signal observation layer in
 * shadow — it reports open → latest movement and steam candidates per
 * game+market without touching scoring, the LINE_ARCHIVE flags (founder-gated
 * flips), or any published number.
 *
 * QUERY PARAMS (all optional):
 * - `gameId=<id>` — one game.
 * - `market=SPREAD` — SPREAD | TOTAL (MONEYLINE rows carry no points line).
 * - `days=7` — lookback window for snapshots (default 7, max 30).
 * - `minAbsMove=1` — only report |movement| ≥ this (default 0.5).
 *
 * LAWS OBSERVED:
 * - READS ONLY. Bounded (5,000 snapshots). CRON_SECRET Bearer <redacted>.
 * - Steam candidacy is a conventional large-move flag (≥ 2 pts), not a model
 *   verdict. The sharp-signal layer stays default-off until calibrated.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { computeLineMovements, STEAM_MOVE_POINTS } from "@/lib/ops/line-movement";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SNAPSHOT_TAKE = 5_000;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const gameId = url.searchParams.get("gameId");
    const market = url.searchParams.get("market")?.toUpperCase();
    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 7, 1), 30);
    const minAbsMove = Math.max(Number(url.searchParams.get("minAbsMove")) || 0.5, 0);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const snapshots = await db.oddsLineSnapshot.findMany({
      where: {
        capturedAt: { gte: since },
        ...(gameId ? { gameId } : {}),
        ...(market === "SPREAD" || market === "TOTAL" ? { market } : {}),
        line: { not: null },
      },
      select: {
        gameId: true,
        capturedAt: true,
        phase: true,
        book: true,
        market: true,
        line: true,
      },
      orderBy: { capturedAt: "asc" },
      take: SNAPSHOT_TAKE,
    });

    const movements = computeLineMovements(snapshots).filter(
      (m) => Math.abs(m.movement) >= minAbsMove,
    );
    const steam = movements.filter((m) => m.steamCandidate);

    return NextResponse.json({
      success: true,
      data: {
        windowDays: days,
        snapshotsRead: snapshots.length,
        gamesWithMovement: movements.length,
        steamCandidates: steam.length,
        steamThresholdPoints: STEAM_MOVE_POINTS,
        movements: movements.map((m) => ({
          ...m,
          latestCapturedAt: m.latestCapturedAt.toISOString(),
        })),
      },
      note:
        "READ-ONLY shadow observation. Movement = latest − open consensus " +
        "(book-median) in points; steam candidacy is a conventional ≥2pt " +
        "large-move flag, not a model verdict. Nothing here touches scoring " +
        "or the LINE_ARCHIVE flags — the sharp-signal layer stays default-off " +
        "until calibrated.",
    });
  } catch (error) {
    captureError(error, { route: "ops/line-movement" });
    return NextResponse.json(
      { success: false, error: "line-movement failed" },
      { status: 500 },
    );
  }
}
