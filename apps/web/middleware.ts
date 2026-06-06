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

const PUBLIC_FANTASY_GATED_ROUTES = [
  "/fantasy/academy",
  "/fantasy/autopilot",
  "/fantasy/contests",
  "/fantasy/dfs",
  "/fantasy/draft",
  "/fantasy/gm-ledger",
  "/fantasy/league-twin",
  "/fantasy/lineup",
  "/fantasy/props",
  "/fantasy/scheme",
  "/fantasy/studio",
  "/fantasy/trade",
  "/fantasy/waivers",
] as const;

// Auth cookie name (NextAuth.js v5)
const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (
    process.env["FANTASY_PUBLIC_TOOLS_ENABLED"] !== "true" &&
    PUBLIC_FANTASY_GATED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    const fantasyUrl = new URL("/fantasy", req.url);
    fantasyUrl.searchParams.set("tool", pathname.replace("/fantasy/", ""));
    return NextResponse.redirect(fantasyUrl);
  }

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
