# Auth / Entitlement / Founder Gate Scan

As of: 2026-06-09

## Verified Against Real App

- /cockpit returned 307, indicating a redirect/gate.
- apps/web/middleware.ts explicitly protects /dashboard and /admin.
- apps/web/lib/auth.ts uses NextAuth with Google provider, Prisma adapter, and JWT session behavior.
- apps/web/lib/auth.ts contains a DEV_FAKE_ADMIN development bypass with source comments warning not to enable in production.
- apps/web/lib/entitlements.ts grants ELITE under DEV_FAKE_ADMIN and otherwise reads subscription state.

## Risk

Cockpit protection appears route/page-level rather than middleware-level. That may be acceptable, but sensitive route protection should be explicitly tested and documented.

## Launch Status

YELLOW. Gate behavior exists, but founder/admin route protection needs a source-level and route-level test before launch.
