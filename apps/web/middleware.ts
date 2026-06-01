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

// Routes that require authentication (redirect to signin if no cookie)
const PROTECTED_ROUTES = ["/dashboard", "/admin"];

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
    // Dev-mode bypass: when DEV_FAKE_ADMIN=true (and NODE_ENV !== production),
    // the auth() helper returns a synthetic admin session, so we must NOT
    // redirect here. The NODE_ENV guard is defense-in-depth: even if the var
    // is accidentally set on a production host, the bypass stays off.
    if (
      process.env["DEV_FAKE_ADMIN"] === "true" &&
      process.env["NODE_ENV"] !== "production"
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
