import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { upsertPushSubscription } from "@/lib/push/subscription-db";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { parsePushSubscriptionInput } from "@/lib/push/validation";
import { badRequestResponse, pushDbErrorResponse, unauthorizedResponse } from "@/lib/push/http";

/**
 * POST /api/push/subscribe — register (or refresh) a browser's Web Push
 * subscription for the signed-in user.
 *
 * Auth required (server-side; CLAUDE.md rule #3, no frontend-only gating).
 * Body is the browser's standard `PushSubscription.toJSON()` shape:
 * `{ endpoint, keys: { p256dh, auth } }`. Idempotent by construction — the
 * `endpoint` is globally unique, so re-subscribing the same device upserts
 * in place rather than creating a duplicate row. Table-absent (founder
 * hasn't applied the migration yet) degrades to an honest 503, never a 500.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  // Per-user throttle on this DB-write endpoint: stop one account from looping
  // subscription upserts (defense-in-depth; same bucket pattern as checkout /
  // explain). Limit copied from subscriptions/checkout (10/min is ample).
  const limit = consumeRateLimit("push-subscribe", userId, 10, 60_000);
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

  const parsed = parsePushSubscriptionInput(body);
  if (!parsed.success) return badRequestResponse(parsed.errors);
  const { endpoint, keys } = parsed.data;

  const result = await upsertPushSubscription(db, userId, endpoint, keys.p256dh, keys.auth);
  if (!result.ok) return pushDbErrorResponse(result);

  return NextResponse.json({
    success: true,
    data: {
      id: result.data.id,
      endpoint: result.data.endpoint,
      createdAt: result.data.createdAt.toISOString(),
    },
  });
}
