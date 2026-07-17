import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { deleteWatchlistEntry } from "@/lib/watchlist/db";
import { parseWatchlistTarget } from "@/lib/watchlist/validation";
import { badRequestResponse, unauthorizedResponse, watchlistDbErrorResponse } from "@/lib/watchlist/http";

/**
 * POST /api/watchlist/unfollow — stop following a team or player.
 *
 * Auth required. Idempotent: unfollowing an entity you don't follow is a
 * no-op success (`deleted: false`, 200), not an error. No tier gate —
 * unfollowing is never blocked.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse(["Invalid JSON body"]);
  }

  const parsed = parseWatchlistTarget(body);
  if (!parsed.success) return badRequestResponse(parsed.errors);
  const { entityType, entityId } = parsed.data;

  const result = await deleteWatchlistEntry(db, userId, entityType, entityId);
  if (!result.ok) return watchlistDbErrorResponse(result);

  return NextResponse.json({ success: true, deleted: result.data.deleted });
}
