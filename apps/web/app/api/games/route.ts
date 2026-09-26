import { NextResponse, type NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { clientIp } from "@/lib/api/rate-limit";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { db } from "@sports/db";
import { resolveSlateWindow } from "@/lib/picks/slate-window";

/**
 * GET /api/games — a date-scoped scoreboard for consumer clients.
 *
 * The native iOS app (ios/, branch feat/ios-swiftui) needs a scoreboard and
 * the picks route does not carry one: a pick is one row on one game, and a
 * slate is only the games that have picks. A reader opening the Scores tab
 * wants every tracked game, including the ones with no selection on them.
 *
 * What is returned is the Game table as the engine already maintains it —
 * status, scores, the denormalized team names, the public Edge Index, and the
 * scheduling context columns (rest days, back-to-back flags). Those columns
 * exist precisely because rest is the most actionable non-score fact on a
 * board, and no public surface was exposing them.
 *
 * ANONYMOUS, like /api/picks. A scoreboard is public information and gating it
 * behind an account would gate the product's credibility surface.
 *
 * Not a new invention: every field is already stored, already computed by
 * ingestion, and already read by the settlement worker.
 */

export const dynamic = "force-dynamic";

/** One row is a few hundred bytes; 200 covers a heavy multi-league day. */
const MAX_ROWS = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Same durable limiter as /api/picks. This route is public and DB-heavy
  // (a findMany with a sport join), and an in-memory per-process bucket
  // multiplies the real quota by the number of warm serverless instances.
  const limit = await consumePublicFormRateLimit("public-games", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return jsonNoStore(
      limit.status === 429
        ? { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" }
        : { success: false, error: "Rate limit service unavailable. Please retry shortly.", code: "rate_limit_store_unavailable" },
      { status: limit.status, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  // `?date=YYYY-MM-DD` names an Eastern calendar day, matching /api/picks and
  // the iOS client's own day-key formatter. Anything unparseable resolves to
  // the day containing now, so a malformed value never reaches Prisma.
  const slate = resolveSlateWindow(searchParams.get("date"), now);
  const sportFilter = searchParams.get("sport");

  const rows = await db.game
    .findMany({
      where: {
        commenceTime: { gte: slate.start, lte: slate.end },
        // A merged-away game row is a tombstone; serving it would show the
        // same contest twice. Same filter the picks route uses.
        mergedIntoGameId: null,
        ...(sportFilter
          ? { sport: { key: { contains: sportFilter, mode: "insensitive" } } }
          : {}),
      },
      select: {
        id: true,
        sport: { select: { name: true, key: true } },
        league: { select: { name: true } },
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        status: true,
        commenceTime: true,
        openingTotal: true,
        currentEdgeIndex: true,
        restDaysHome: true,
        restDaysAway: true,
        isBackToBackHome: true,
        isBackToBackAway: true,
      },
      // Live games first, then by kickoff. A board sorted purely by time
      // buries whatever is happening right now under everything later today.
      orderBy: [{ status: "desc" }, { commenceTime: "asc" }],
      take: MAX_ROWS,
    })
    .catch(() => null);

  if (rows === null) {
    // Fail CLOSED and honestly: an empty board reads as "no games today" and
    // a 500 reads as "we broke". A 503 says "try again".
    return jsonNoStore(
      { success: false, error: "Scoreboard is temporarily unavailable.", code: "games_unavailable" },
      { status: 503 },
    );
  }

  return jsonNoStore({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      sport: row.sport?.name ?? "NFL",
      sportKey: row.sport?.key ?? null,
      league: row.league?.name ?? row.sport?.name ?? "NFL",
      homeTeam: row.homeTeamName,
      awayTeam: row.awayTeamName,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      status: row.status,
      commenceTime: row.commenceTime.toISOString(),
      // The Game table stores the spread on the Odds rows, not on the game.
      // Rather than join-and-aggregate a spread here — expensive, and the iOS
      // client only uses it as a secondary readout — the total is sent and the
      // spread is left absent. The client renders "-" rather than inventing it.
      total: row.openingTotal,
      edgeIndex: row.currentEdgeIndex,
      restDaysHome: row.restDaysHome,
      restDaysAway: row.restDaysAway,
      isBackToBackHome: row.isBackToBackHome,
      isBackToBackAway: row.isBackToBackAway,
    })),
    meta: {
      date: slate.dayKey,
      total: rows.length,
      truncated: rows.length >= MAX_ROWS,
    },
  });
}
