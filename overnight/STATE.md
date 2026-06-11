# Overnight Operator State

## Run 1 — 2026-06-11T07:10Z

**Mode**: WRITE (GitHub MCP available, branch: claude/magical-volta-3wohz9)
**Status**: completed

### Streams Completed
- security-sweep (primary)
- paywall-audit (secondary)
- type-coverage + gate-invariants (secondary)
- test-coverage (growth)
- synthesis (mandatory)

### Actions Taken

#### REPAIR
- `apps/web/lib/auth.ts` — eliminated all 3 `any` casts
  - Line 23: `(user as any).role` → `(user as { role?: UserRole }).role`
  - Line 54: `NextAuth(config) as any` → `as unknown as NextAuthInstance`
  - Line 82: `as any as Session` → typed object with `expires` + `as unknown as Session`
  - Added `interface NextAuthInstance` for type-safe destructuring

#### IMPROVE
- `apps/web/lib/auth.ts` line 72: Added `&& process.env["NODE_ENV"] !== "production"` guard to DEV_FAKE_ADMIN check
- `apps/web/lib/auth.ts` line 115: Same guard on exported DEV_FAKE_ADMIN constant
- `apps/web/middleware.ts` line 63: Same guard on middleware bypass
- `apps/web/lib/entitlements.ts` line 27: Same guard on entitlements shortcut
- Added `interface User { role?: UserRole }` module augmentation so Prisma adapter role is typed

#### GROW
- `apps/web/lib/stripe/subscription-utils.ts` (NEW) — extracted `getTierFromPriceId` and `mapStripeStatus` from webhook route into testable module
- `apps/web/app/api/webhooks/stripe/route.ts` — updated to import from subscription-utils
- `apps/web/__tests__/stripe-subscription-utils.test.ts` (NEW) — 16 unit tests covering all price ID mappings and all Stripe status transitions
- `apps/web/__tests__/db-stub-url-and-client.test.ts` (NEW) — tests for 9 sentinel URL patterns, FORCE_REAL_PRISMA bypass, $transaction/callback, $transaction/array, $queryRaw, $executeRaw, $connect, $disconnect, $on, and 4 write-stub model behaviors

### Calibration Invariants — INTACT
- PUBLIC_PICKS_ENABLED: false (default, never hardcoded true)
- PUBLIC_BLOG_ENABLED: false (default, never hardcoded true)
- PERFORMANCE_STATS_ENABLED: false (default, never hardcoded true)
- CANONICAL_HISTORY_ENABLED: false (default, never hardcoded true)

### Next Run Priority
- top_priorities_next_run: ["stripe-webhook-idempotency-integration-test", "auth-unit-tests-isolated", "ingestion-pipeline-settle-sport-contract-tests"]
