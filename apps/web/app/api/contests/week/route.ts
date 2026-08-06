import { NextResponse } from "next/server";
import {
  leaderboard,
  loadCurrentContestWeek,
  resolveContestStorageMode,
} from "@/lib/contests/store";
import { isContestsPublic } from "@/lib/launch/public-surface-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isContestsPublic()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const week = await loadCurrentContestWeek();
  const board = await leaderboard(week.weekId);
  return NextResponse.json(
    {
      ok: true,
      storageMode: resolveContestStorageMode(),
      week: {
        weekId: week.weekId,
        title: week.title,
        status: week.status,
        locksAt: week.locksAt,
        slateKind: week.slateKind,
        games: week.games.map((g) => ({
          gameId: g.gameId,
          label: g.label,
          away: g.away,
          home: g.home,
          kickoff: g.kickoff,
          result: g.result,
        })),
        rules: week.rules,
      },
      leaderboard: board,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
