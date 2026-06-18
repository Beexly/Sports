import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Shared cron Bearer-secret authorization.
 *
 * Every cron route (`/api/cron/*`) gated by `CRON_SECRET` previously inlined the
 * same `authHeader !== \`Bearer ${expected}\`` check. That is (a) duplicated
 * across 7 routes and (b) a non-constant-time compare — `!==` short-circuits on
 * the first differing byte, so response time leaks how many leading bytes of the
 * secret matched. This helper centralizes the check and compares in constant
 * time via `timingSafeEqual`.
 *
 * Returns `null` when the request is authorized; otherwise the exact error
 * response the route should return:
 *   - 500 `CRON_SECRET not configured` when the secret env is missing
 *   - 401 `Unauthorized` when the Authorization header is missing or wrong
 *
 * Usage:
 *   const denied = cronAuthError(request);
 *   if (denied) return denied;
 */
export function cronAuthError(request: Request): NextResponse | null {
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expectedHeader = Buffer.from(`Bearer ${expected}`);

  // timingSafeEqual requires equal-length buffers; the length of the expected
  // header is not itself secret, so a length mismatch is a fast reject.
  const authorized =
    provided.length === expectedHeader.length && timingSafeEqual(provided, expectedHeader);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
