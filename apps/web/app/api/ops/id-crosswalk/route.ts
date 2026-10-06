/**
 * GET /api/ops/id-crosswalk — READ-ONLY player-identity crosswalk.
 *
 * WHY. The scale table records that four NGS keys carry weight 0 because "the
 * crosswalk does not exist in this repo": NGS rows are keyed by gsisId while
 * settled outcomes use the internal playerId, and 0 of 380 distinct NGS
 * gsisIds matched a playerId on 2026-09-30. The schema already declares the
 * canonical key (`Player.gsisId`); this route is the lookup plus the honest
 * health report of where the join breaks.
 *
 * MODES (query params):
 * - `?gsisId=00-0031234` → the internal identity for that gsisId, or null.
 * - `?playerId=<cuid>` → the gsisId for that internal id, or null.
 * - no params → the join-health report: player rows, distinct NGS gsisIds,
 *   how many join, and a small sample of unjoined gsisIds so the gap is
 *   inspectable rather than a bare count.
 *
 * LAWS OBSERVED:
 * - READS ONLY. A miss returns null — never a guessed id. A wrong playerId
 *   joins one real player's signals to another real player's outcomes, which
 *   is worse than no join.
 * - CRON_SECRET Bearer <redacted>, same as the other ops routes.
 * - Bounded: the health scan reads distinct gsisIds with a take cap, not the
 *   whole NGS table into memory.
 * - No gate, no env flag, no schema change.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { resolvePlayerByGsis, resolveGsisByPlayer } from "@/lib/ops/player-crosswalk";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cap on distinct gsisIds scanned for the health report. */
const HEALTH_SCAN_TAKE = 5_000;
/** How many unjoined gsisIds to sample for inspection. */
const MISS_SAMPLE = 25;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const gsisId = url.searchParams.get("gsisId");
    const playerId = url.searchParams.get("playerId");

    if (gsisId) {
      const hit = await resolvePlayerByGsis(db, gsisId);
      return NextResponse.json({
        success: true,
        data: { gsisId: gsisId.trim(), identity: hit },
        note: hit
          ? "READ-ONLY crosswalk hit."
          : "READ-ONLY crosswalk miss: the `players` table has no row for this gsisId. Null is the honest answer — never a guessed id.",
      });
    }

    if (playerId) {
      const hit = await resolveGsisByPlayer(db, playerId);
      return NextResponse.json({
        success: true,
        data: { playerId: playerId.trim(), identity: hit },
        note: hit
          ? "READ-ONLY crosswalk hit."
          : "READ-ONLY crosswalk miss: no player row for this id. Null is the honest answer.",
      });
    }

    // Health report: where does the gsisId → playerId join break?
    const [playerCount, ngsRows] = await Promise.all([
      db.player.count(),
      db.nextGenStat.findMany({
        select: { gsisId: true },
        distinct: ["gsisId"],
        take: HEALTH_SCAN_TAKE,
      }),
    ]);
    const distinctGsis = [...new Set(ngsRows.map((r) => r.gsisId).filter(Boolean))];

    const players = await db.player.findMany({
      where: { gsisId: { in: distinctGsis } },
      select: { gsisId: true },
    });
    const joined = new Set(players.map((p) => p.gsisId));
    const misses = distinctGsis.filter((g) => !joined.has(g));

    return NextResponse.json({
      success: true,
      data: {
        playerRows: playerCount,
        ngsDistinctGsisScanned: distinctGsis.length,
        scanTake: HEALTH_SCAN_TAKE,
        joined: joined.size,
        unjoined: misses.length,
        joinRate: distinctGsis.length > 0 ? Number((joined.size / distinctGsis.length).toFixed(4)) : null,
        unjoinedSample: misses.slice(0, MISS_SAMPLE),
      },
      note:
        "READ-ONLY join-health report. `joined` counts NGS gsisIds with a `players` " +
        "row; `unjoined` is the gap the scale table's weight-0 verdicts rest on. " +
        "A sparse `players` table shows up here as a measured gap, not a silent zero.",
    });
  } catch (error) {
    captureError(error, { route: "ops/id-crosswalk" });
    return NextResponse.json(
      { success: false, error: "id-crosswalk failed" },
      { status: 500 },
    );
  }
}
