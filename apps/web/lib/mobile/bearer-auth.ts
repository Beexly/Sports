import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@sports/db";

/**
 * Bearer-token authentication for the native clients.
 *
 * `auth()` from NextAuth reads a cookie. This reads an `Authorization: Bearer`
 * header. The two are intentionally separate functions rather than one function
 * with two branches: a merged resolver is how a cookie-only caller ends up
 * accepted on a route that meant to require a token.
 *
 * USAGE in an API route:
 *
 *   const viewer = await resolveMobileViewer(request);
 *   if (!viewer) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
 *   const entitlements = await getUserEntitlements(viewer.userId);
 *
 * The token is a signed `{ sub, exp }` payload. It is verified WITHOUT a
 * database read — that is the point of signing it — and then the user row is
 * read only when the caller needs identity beyond an id. On a route that
 * already hits the database (all of them), the extra read is free.
 *
 * WHY IT IS NOT A JWT LIBRARY: the payload has two fields and no registered
 * claims to get wrong. `jose` would be a dependency, a config surface, and an
 * algorithm-confusion risk, to replace eight lines of HMAC.
 *
 * REVOCATION: there is none, and that is a deliberate trade. A 30-day session
 * token that cannot be revoked early is acceptable for a read-mostly research
 * product; the alternative (a session table read on every request) buys
 * revocation at the cost of a database round trip per call. If a revocation
 * requirement appears, the change is to add a `tokenEpoch` column to `User` and
 * include it in the payload — not to start trusting an unsigned field.
 */

export interface MobileViewer {
  userId: string;
  /** Epoch ms from the payload, already checked. */
  expiresAt: number;
  /** True when the token authenticates but the account row is gone. */
  accountMissing: boolean;
}

function secret(): string | null {
  return (
    process.env["MOBILE_TOKEN_SECRET"] ??
    process.env["NEXTAUTH_SECRET"] ??
    null
  );
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Verify a token without touching the database. */
export function verifyMobileToken(token: string): { userId: string; expiresAt: number } | null {
  const key = secret();
  if (!key) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Length check precedes timingSafeEqual, which throws on a length mismatch —
  // an attacker-supplied short signature must be a clean rejection, not a 500.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) return null;
    return { userId: parsed.sub, expiresAt: parsed.exp };
  } catch {
    return null;
  }
}

/**
 * Resolve the caller of a mobile request.
 *
 * Returns null for: no header, a malformed header, a bad signature, an expired
 * token, or a token whose account no longer exists. All of those are the same
 * answer to the caller ("sign in"), and distinguishing them in the response
 * would tell an attacker which part of their guess was right.
 *
 * The `accountMissing` field exists so a route can clean up (e.g. delete a
 * device token) without a second query, while STILL refusing the request.
 */
export async function resolveMobileViewer(request: Request): Promise<MobileViewer | null> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match || !match[1]) return null;

  const verified = verifyMobileToken(match[1].trim());
  if (!verified) return null;

  // The signature proves the token was issued by us; it does not prove the
  // account still exists. A deleted-account token must stop working, and this
  // is the only place that can be checked.
  const user = await db.user
    .findUnique({ where: { id: verified.userId }, select: { id: true } })
    .catch(() => null);

  return {
    userId: verified.userId,
    expiresAt: verified.expiresAt,
    accountMissing: user === null,
  };
}

/**
 * The combined resolver for routes that accept EITHER a browser session or a
 * mobile token.
 *
 * Not used by the `/api/mobile/v1/*` routes — those require a token. It exists
 * for the public routes the app also calls (`/api/picks`, `/api/watchlist`),
 * where a signed-in web user and a signed-in app user must resolve to the same
 * entitlements. Keeping it separate makes the intent explicit at each call site.
 */
export async function resolveEitherViewer(
  request: Request,
  cookieUserId: string | undefined,
): Promise<{ userId: string; channel: "cookie" | "bearer" } | null> {
  if (cookieUserId) return { userId: cookieUserId, channel: "cookie" };
  const mobile = await resolveMobileViewer(request);
  if (!mobile || mobile.accountMissing) return null;
  return { userId: mobile.userId, channel: "bearer" };
}
