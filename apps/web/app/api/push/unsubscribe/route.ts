import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { deletePushSubscription } from "@/lib/push/subscription-db";
import { parsePushUnsubscribeInput } from "@/lib/push/validation";
import { badRequestResponse, pushDbErrorResponse, unauthorizedResponse } from "@/lib/push/http";
import { csrfOriginCheck } from "@/lib/auth/csrf-origin-guard";

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
  // CSRF: reject cross-origin state-changing requests. Push subscriptions
  // are browser-only, so a missing or mismatched Origin is never legitimate.
  const csrf = csrfOriginCheck(
    request.headers.get("origin"),
    request.headers.get("referer"),
  );
  if (!csrf.ok) {
    return NextResponse.json(
      { success: false, error: csrf.reason },
      { status: 403 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  // Per-user throttle on this DB-write endpoint: stop one account from looping
  // unsubscribe writes (defense-in-depth; same bucket pattern as checkout /
  // explain). Limit copied from subscriptions/checkout (10/min is ample).
  const limit = consumeRateLimit("push-unsubscribe", userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

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
