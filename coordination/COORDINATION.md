# COORDINATION.md — overnight-claude stream registry

## Active Claims (TTL 90 min from timestamp)

| Stream | Files Locked | Start | Status |
|--------|-------------|-------|--------|
| security-sweep | app/api/cron/*, lib/cron-auth.ts, lib/auth.ts, lib/entitlements.ts, middleware.ts | 2026-06-10T07:05Z | COMPLETE |
| repair-prisma | lib/correlation/load-settled-picks.ts, packages/db/* | 2026-06-10T07:07Z | COMPLETE |
| repair-tsconfig | apps/web/tsconfig.json | 2026-06-10T07:09Z | COMPLETE |

## Blocked Questions (requires human decision)

1. **Next.js upgrade to 15+**: 13 HIGH/CRITICAL CVEs in Next.js 14.2.35. Upgrade requires breaking change regression testing. Safe to proceed?
2. **Admin email exposure**: Cockpit API responses expose admin user emails in `decidedBy`/`reviewer`/`generatedBy` fields. Replace with hashed/opaque identifiers?

## Completed This Run

- Fixed Prisma.validator → satisfies migration (1 failing test → 0)
- Regenerated Prisma client (146 TS errors → 0)
- Fixed tsconfig baseUrl deprecation warning
- Hardened cron auth with constant-time HMAC comparison (3 routes)
- Added NODE_ENV production guard to DEV_FAKE_ADMIN bypass (3 files)
- Added tests: cron-auth (9 tests), prod-guard entitlements (1 test)
