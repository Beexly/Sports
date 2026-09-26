import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { deleteApnsDevice, upsertApnsDevice } from "@/lib/push/apns-db";
import { parseApnsDeviceInput } from "@/lib/push/apns-validation";
import { badRequestResponse, pushDbErrorResponse, unauthorizedResponse } from "@/lib/push/http";
import { consumeRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/push/apns — register (or refresh) a native APNs device token.
 * DELETE /api/push/apns — remove it.
 *
 * Unsubscribe lives HERE rather than on the web `/api/push/unsubscribe` for
 * the same reason subscribe lives here: that route enforces a browser-origin
 * CSRF check, which is correct for a Web Push endpoint and would reject every
 * native caller. A native client cannot be steered cross-site, so the check
 * protects nothing here.
 *
 * WHY THIS IS NOT /api/push/subscribe. That route registers a *Web Push*
 * subscription and enforces a browser-origin CSRF check, which is correct:
 * the Web Push API only exists in a browser, so a request with no Origin is
 * never a legitimate caller. A native app has no Origin header at all, so
 * reusing that route would reject every real iOS client. Splitting the native
 * path out keeps the web check where it belongs instead of weakening it.
 *
 * WHY THE CSRF CHECK IS ABSENT HERE. A cross-origin browser request cannot
 * produce a request that authenticates as this user, because the session is a
 * SameSite cookie the browser will not attach to a cross-site POST. A native
 * client is not a browser at all and cannot be steered by another site. The
 * threat the web check addresses does not exist on this path.
 *
 * Body: `{ token, platform }` where token is the 64-char hex APNs device token
 * and platform is "ios". Idempotent — the token is globally unique, so
 * re-registering a device upserts in place instead of creating a duplicate.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  // Per-user throttle on a DB write. 10/min is ample for a human; this is
  // defence-in-depth against a looping client.
  const limit = consumeRateLimit("apns-subscribe", userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse(["Invalid JSON body"]);
  }

  const parsed = parseApnsDeviceInput(body);
  if (!parsed.success) return badRequestResponse(parsed.errors);

  const result = await upsertApnsDevice(db, userId, parsed.data);
  if (!result.ok) return pushDbErrorResponse(result);

  return NextResponse.json({
    success: true,
    data: { id: result.data.id, platform: "ios" },
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorizedResponse();

  const limit = consumeRateLimit("apns-unsubscribe", userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // A body is optional. Omitting it removes EVERY device for this user, which
  // is what sign-out and account deletion want: a sold device must stop
  // receiving another person's graded picks, and the server has no other way
  // to learn it is gone.
  let token: string | undefined;
  try {
    const body: unknown = await request.json();
    const parsed = parseApnsDeviceInput(body ?? {});
    if (parsed.success) {
      token = parsed.data.token;
    }
  } catch {
    // No body is a valid request meaning "all devices".
    token = undefined;
  }

  const result = await deleteApnsDevice(db, userId, token);
  if (!result.ok) return pushDbErrorResponse(result);

  return NextResponse.json({ success: true, deleted: result.data.deleted > 0 });
}
