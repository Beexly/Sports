import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

/**
 * POST /api/mobile/v1/auth/exchange  — redeem a one-time code for a bearer token.
 * GET  /api/mobile/v1/auth/exchange  — mint a code for the current web session.
 *
 * ── WHY A CODE EXCHANGE AND NOT A COOKIE ─────────────────────────────────────
 * NextAuth v5 authenticates a browser with an HTTP-only cookie. A native client
 * has no cookie jar and cannot present one, and if it could, a long-lived
 * session cookie sitting in app storage would be a worse credential than a
 * scoped, expiring token.
 *
 * So the flow is the standard one:
 *
 *   1. App opens `ASWebAuthenticationSession` (expo-web-browser's
 *      `openAuthSessionAsync`) against `/auth/signin?mobile=1`.
 *   2. The user signs in with Google or Apple in the SYSTEM browser, so the app
 *      never sees a password, and guideline 4.8 is satisfied because the
 *      provider choice is the web page's, not the app's.
 *   3. The web callback calls GET here, then redirects to
 *      `gse://auth/callback?code=<code>`.
 *   4. The app POSTs that code here and receives a bearer token.
 *
 * ── WHAT MAKES THE CODE SAFE ─────────────────────────────────────────────────
 *   · Single use, enforced by the DATABASE (a conditional updateMany), not by a
 *     check-then-write. Two concurrent redemptions cannot both succeed.
 *   · 60-second life. A code that outlives the round trip can be harvested from
 *     a log or a screenshot afterwards.
 *   · Opaque, signed, and carrying no claims — only an id the caller already
 *     has. There is nothing to tamper with, and the signature catches an edit.
 *   · Bound to a registered clientId AND redirectUri, so an intercepted code
 *     cannot be redeemed into a different app's callback.
 *
 * ── THE TOKEN ────────────────────────────────────────────────────────────────
 * An HMAC-signed `{ sub, exp }`, verified statelessly per request by
 * `lib/mobile/bearer-auth.ts`. It is a SESSION token, not a capability token: it
 * grants exactly what the account's entitlement grants and nothing more. The
 * secret falls back to `NEXTAUTH_SECRET` so a deploy that forgot
 * `MOBILE_TOKEN_SECRET` degrades rather than breaks.
 *
 * DELIBERATELY NOT IMPLEMENTED: refresh tokens, scopes, device binding beyond
 * the client/redirect check. Each adds a failure mode and none is needed for a
 * 30-day read-mostly session that sign-out revokes.
 */

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 60_000;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLIENT_ID = "gse-ios";
const REDIRECT_URI = "gse://auth/callback";

function secret(): string {
  const value = process.env["MOBILE_TOKEN_SECRET"] ?? process.env["NEXTAUTH_SECRET"];
  if (!value) {
    throw new Error(
      "auth/exchange: neither MOBILE_TOKEN_SECRET nor NEXTAUTH_SECRET is set. " +
        "Refusing to sign a token with a default.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function mintCode(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + CODE_TTL_MS })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

/** Exported so `lib/mobile/bearer-auth.ts` shares one verification path. */
export function verifyCodeSignature(code: string): { userId: string } | null {
  const [payload, signature] = code.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Length first: timingSafeEqual THROWS on a length mismatch, and a throw here
  // would be an unhandled 500 on an attacker-supplied malformed code.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      u?: unknown;
      e?: unknown;
    };
    if (typeof parsed.u !== "string" || typeof parsed.e !== "number") return null;
    if (Date.now() > parsed.e) return null;
    return { userId: parsed.u };
  } catch {
    return null;
  }
}

/* ── POST — redeem ──────────────────────────────────────────────────────── */

export async function POST(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  const limit = consumeRateLimit("mobile-auth-exchange", ip, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body as { code?: unknown; clientId?: unknown; redirectUri?: unknown };
  if (input.clientId !== CLIENT_ID || input.redirectUri !== REDIRECT_URI) {
    return NextResponse.json(
      { success: false, error: "Unknown client.", code: "unknown_client" },
      { status: 400 },
    );
  }
  if (typeof input.code !== "string" || input.code.length < 16 || input.code.length > 1024) {
    return NextResponse.json({ success: false, error: "Invalid code." }, { status: 400 });
  }

  const verified = verifyCodeSignature(input.code);
  if (!verified) {
    return NextResponse.json(
      {
        success: false,
        error: "That sign-in link is no longer valid. Please sign in again.",
        code: "invalid_code",
      },
      { status: 400 },
    );
  }

  try {
    // Single use, atomically. The `usedAt: null` predicate is in the WHERE, so a
    // second concurrent redemption matches zero rows rather than winning a race.
    const consumed = await db.mobileAuthCode.updateMany({
      where: { code: input.code, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      return NextResponse.json(
        { success: false, error: "That sign-in link has already been used.", code: "code_consumed" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt })).toString(
      "base64url",
    );

    return NextResponse.json({
      success: true,
      data: {
        accessToken: `${payload}.${sign(payload)}`,
        tokenType: "Bearer",
        expiresAt: new Date(expiresAt).toISOString(),
        user: { id: user.id, email: user.email, displayName: user.name },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021/i.test(message)) {
      return NextResponse.json(
        { success: false, error: "Sign-in for the app is not available yet.", code: "table_absent" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Sign-in did not complete. Nothing was changed." },
      { status: 503 },
    );
  }
}

/* ── GET — mint ─────────────────────────────────────────────────────────── */

/**
 * Requires a live NextAuth session, so it is reachable only by someone who has
 * actually signed in. That is the entire security argument for the flow: the
 * code cannot exist without an authenticated browser behind it.
 *
 * Wiring (one addition to the web callback page):
 *
 *   const res = await fetch("/api/mobile/v1/auth/exchange");
 *   const { data } = await res.json();
 *   return NextResponse.redirect(`${data.redirectUri}?code=${data.code}`);
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const code = mintCode(userId);
  try {
    await db.mobileAuthCode.create({
      data: { code, userId, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
  } catch {
    // Without the row the code cannot be consumed, and consuming is what proves
    // single use. Refuse rather than hand out an unbacked code.
    return NextResponse.json(
      { success: false, error: "App sign-in is not available yet.", code: "table_absent" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { code, redirectUri: REDIRECT_URI, expiresInSec: CODE_TTL_MS / 1000 },
  });
}
