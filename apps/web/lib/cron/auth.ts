import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Validates the Authorization: Bearer <CRON_SECRET> header against
 * the configured CRON_SECRET environment variable using a constant-time
 * comparison to prevent timing-oracle attacks.
 *
 * Returns a NextResponse on failure (call `return result` immediately),
 * or null when the request is authorized.
 */
export function verifyCronAuth(
  request: Request
): NextResponse | null {
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expectedHeader = `Bearer ${expected}`;

  // Constant-time comparison guards against character-by-character brute-force.
  // Length difference short-circuits here but not inside the byte loop.
  if (authHeader.length !== expectedHeader.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedHeader))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
