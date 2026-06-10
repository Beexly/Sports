import { NextResponse } from "next/server";
import { loadBoardState } from "@/lib/board/state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const payload = await loadBoardState();
    return NextResponse.json({ success: true, ...payload });
  } catch (err) {
    console.warn(
      "[api/board/state] board state failed closed.",
      err instanceof Error ? err.message : "unknown error"
    );
    return NextResponse.json({
      success: true,
      data: {
        sportsWatched: 0,
        booksPolled: 0,
        openPicks: 0,
        gatedToday: 0,
        lastRefresh: new Date().toISOString(),
        modelVersion: "unavailable",
        bootstrap: true,
        scoringNow: [],
        publishedToday: [],
        gatedTodayRows: [],
      },
      meta: {
        isSampleData: false,
        dataStatus: "degraded",
        degradedReason: "board_state_unavailable",
      },
    });
  }
}
