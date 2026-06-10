import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Validates a cron Bearer token using a constant-time HMAC comparison.
 *
 * Plain string equality (`header !== \`Bearer ${secret}\``) leaks timing
 * information that could be used to brute-force the CRON_SECRET via
 * many repeated requests. HMAC-then-timingSafeEqual ensures the comparison
 * always runs in constant time regardless of where the strings differ.
 */
export function verifyCronAuth(authHeader: string, expected: string): boolean {
  const key = Buffer.from("cron-bearer-verify");
  const actual = createHmac("sha256", key).update(authHeader).digest();
  const target = createHmac("sha256", key).update(`Bearer ${expected}`).digest();
  return timingSafeEqual(actual, target);
}

/**
 * Returns a 401/500 NextResponse when cron auth fails, or null when auth passes.
 * Drop-in guard for cron route handlers.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!verifyCronAuth(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
