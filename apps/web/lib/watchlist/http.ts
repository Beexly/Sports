/**
 * Watchlist — shared HTTP response shaping for the three API routes
 * (list / follow / unfollow). Not "pure" (it imports NextResponse) — kept
 * out of the eligibility/db/alert modules so those stay framework-free, but
 * colocated here rather than duplicated three times across the routes.
 */

import { NextResponse } from "next/server";
import type { WatchlistDbResult } from "./db";

/**
 * Maps a failed `WatchlistDbResult` to an honest 503 — never a 500. The
 * `table_missing` case is the expected pre-activation state (the founder
 * has not applied the migration yet); `unreachable`/`error` are transient
 * DB failures. All three degrade the same way from the caller's point of
 * view: the feature is temporarily unavailable, not broken.
 */
export function watchlistDbErrorResponse(
  result: Extract<WatchlistDbResult<unknown>, { ok: false }>,
): NextResponse {
  const body =
    result.reason === "table_missing"
      ? {
          success: false,
          error: "Watchlist is not activated yet.",
          reason: "table_missing",
        }
      : {
          success: false,
          error: "Watchlist is temporarily unavailable.",
          reason: result.reason,
        };
  return NextResponse.json(body, { status: 503 });
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
}

export function badRequestResponse(errors: readonly string[]): NextResponse {
  return NextResponse.json({ success: false, error: "Invalid request.", details: errors }, { status: 400 });
}
