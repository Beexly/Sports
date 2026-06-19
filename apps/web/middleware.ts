import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for route protection.
 *
 * NOTE: Session checking requires a DB query which is expensive in middleware.
 * Instead, we use a lighter pattern: protect routes via redirect at the page level
 * (checking auth() in Server Components), and use middleware only for basic routing.
 *
 * Admin routes are protected at both middleware level (basic check) and page level
 * (full auth + role check).
 */

// Routes that require authentication (redirect to signin if no cookie).
// /today is Mission Control — a personalized dashboard, not a discovery
// surface — so it lives behind auth (Phase-0 consolidation).
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/cockpit", "/today"];

// Auth cookie name (NextAuth.js v5)
const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

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
    // even runs.
    //
    // HARD PRODUCTION GUARD: this escape hatch is ignored entirely in
    // production. A stray DEV_FAKE_ADMIN=true in a prod environment can never
    // open the auth gate — the flag only takes effect outside production. This
    // defends in depth alongside the NODE_ENV check in getUserEntitlements.
    if (
      process.env["NODE_ENV"] !== "production" &&
      process.env["DEV_FAKE_ADMIN"] === "true"
    ) {
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
