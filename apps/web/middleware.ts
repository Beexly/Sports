import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for route protection.
 *
 * NOTE: Session checking requires a DB query which is expensive in middleware.
 * Instead, we use a lighter pattern: protect routes via redirect at the page level
 * (checking auth() in Server Components), and use middleware only for basic routing.
 *
 * Admin/operator routes are protected at both middleware level (cheap cookie check)
 * and page/layout level (full auth + role check). The middleware layer saves an
 * unnecessary RSC render for unauthenticated visitors; the page-level role check
 * is the authoritative gate and must not be removed.
 */

// Routes that require authentication (redirect to signin if no cookie).
// Keep this in sync with every operator/admin surface — the layout-level role
// check is still required for all of these.
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

  // Check if route requires auth
  const requiresAuth = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (requiresAuth) {
    // Dev-mode bypass: when DEV_FAKE_ADMIN=true, the auth() helper returns
    // a synthetic admin session, so we must NOT redirect here. Without this
    // bypass, the middleware would 307 to /auth/signin before the page
    // even runs.
    if (process.env["DEV_FAKE_ADMIN"] === "true") {
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
