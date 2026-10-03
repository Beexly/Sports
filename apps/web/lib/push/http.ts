/**
 * Push subscriptions — shared HTTP response shaping for the two API routes
 * (subscribe / unsubscribe). Mirrors apps/web/lib/watchlist/http.ts's
 * shape and rationale — kept per-domain (not shared across watchlist/push)
 * so each stays framework-free at its core module and this thin layer
 * doesn't become a cross-domain dependency.
 */

import { NextResponse } from "next/server";
import type { PushSubscriptionDbResult } from "./subscription-db";

/**
 * Maps a failed `PushSubscriptionDbResult` to an honest 503 — never a 500.
 * `table_missing` is the expected pre-activation state (the founder hasn't
 * applied the migration yet); `unreachable`/`error` are transient DB
 * failures. All three degrade the same way from the caller's point of
 * view: temporarily unavailable, not broken.
 */
export function pushDbErrorResponse(
  result: Extract<PushSubscriptionDbResult<unknown>, { ok: false }>,
): NextResponse {
  const body =
    result.reason === "table_missing"
      ? {
          success: false,
          error: "Push alerts are not activated yet.",
          reason: "table_missing",
        }
      : {
          success: false,
          error: "Push alerts are temporarily unavailable.",
          reason: result.reason,
        };
  return NextResponse.json(body, { status: 503 });
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
}

export function badRequestResponse(errors: readonly string[]): NextResponse {
  return NextResponse.json(
    { success: false, error: "Invalid request.", details: errors },
    { status: 400 },
  );
}
