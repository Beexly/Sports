import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { deletePushSubscription } from "@/lib/push/subscription-db";
import { parsePushUnsubscribeInput } from "@/lib/push/validation";
import { badRequestResponse, pushDbErrorResponse, unauthorizedResponse } from "@/lib/push/http";

/**
 * POST /api/push/unsubscribe — remove a browser's Web Push subscription
 * for the signed-in user.
 *
 * Auth required. Scoped to (userId, endpoint) — a signed-in caller can
 * only ever delete their OWN subscription rows, never another user's, even
 * if they somehow learned that user's endpoint string. Idempotent:
 * unsubscribing an endpoint that isn't yours (or doesn't exist) returns
 * 200 with `deleted: false`, not an error — matching
 * apps/web/lib/watchlist's unfollow-what-you-don't-follow doctrine.
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

  const parsed = parsePushUnsubscribeInput(body);
  if (!parsed.success) return badRequestResponse(parsed.errors);

  const result = await deletePushSubscription(db, userId, parsed.data.endpoint);
  if (!result.ok) return pushDbErrorResponse(result);

  return NextResponse.json({ success: true, deleted: result.data.deleted });
}
