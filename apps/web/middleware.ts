import { NextRequest, NextResponse } from "next/server";
import { checkWaitlistGate } from "@/lib/waitlist/access-gate";

/**
 * Middleware for route protection.
 *
 * NOTE: Session checking requires a DB query which is expensive in middleware.
 * Instead, we use a lighter pattern: protect routes via redirect at the page level
 * (checking auth() in Server Components), and use middleware only for basic routing.
 *
 * Admin routes are protected at both middleware level (basic check) and page level
 * (full auth + role check).
 *
 * Waitlist gate: /waitlist and /waitlist/* are optionally protected by Basic Auth
 * when GSE_WAITLIST_GATE_ENABLED=true.  Credentials live in server-side env vars
 * only and are never exposed to the client.
 */

// Routes that require authentication (redirect to signin if no cookie)
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/cockpit"];

// Auth cookie name (NextAuth.js v5)
const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── Free embed widgets: allow cross-origin iframe distribution ───────────
  // Global next.config sets X-Frame-Options: DENY. Embeds must be iframeable
  // (DEC-017 free Edge Index). Middleware overrides response headers for /embed/*.
  if (pathname === "/embed" || pathname.startsWith("/embed/")) {
    const res = NextResponse.next();
    res.headers.delete("X-Frame-Options");
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
    res.headers.set("X-Content-Type-Options", "nosniff");
    return res;
  }

  // ── Waitlist Basic Auth gate ──────────────────────────────────────────────
  // Protects /waitlist and /waitlist/* only.
  // Active only when GSE_WAITLIST_GATE_ENABLED=true.
  // Returns 401 + WWW-Authenticate + Cache-Control: no-store on denial.
  const isWaitlistPath =
    pathname === "/waitlist" || pathname.startsWith("/waitlist/");

  if (isWaitlistPath) {
    const authHeader = req.headers.get("authorization");
    const result = checkWaitlistGate(authHeader);

    if (!result.allowed) {
      return new NextResponse("Access restricted", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="GSE Waitlist", charset="UTF-8"',
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // NOTE: the old FANTASY_PUBLIC_TOOLS_ENABLED middleware gate is gone.
  // It bounced every /fantasy/* tool back to the hub ("tabs not connected"),
  // and looped against the hub's legacy ?tool= redirect. Each tool page now
  // carries its own honest live/illustrative status; tier gates protect the
  // premium surfaces server-side.

  // Check if route requires auth
  const requiresAuth = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (requiresAuth) {
    // Dev-mode bypass: when DEV_FAKE_ADMIN=true, the auth() helper returns
    // a synthetic admin session, so we must NOT redirect here. Without this
    // bypass, the middleware would 307 to /auth/signin before the page
    // even runs. Hard-gated to non-production so a stray prod flag cannot
    // drop the cookie redirect (defense-in-depth; mirrors auth.ts).
    if (process.env["NODE_ENV"] !== "production" && process.env["DEV_FAKE_ADMIN"] === "true") {
      return NextResponse.next();
    }

    // Check for session cookie (lightweight — actual auth validation happens in pages)
    const hasSession = AUTH_COOKIE_NAMES.some(
      (name) => req.cookies.has(name)
    );

    if (!hasSession) {
      const signinUrl = new URL("/auth/signin", req.url);
      signinUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
