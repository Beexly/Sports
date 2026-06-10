# DEV_FAKE_ADMIN Production Guard

Date: 2026-06-09

## Result

Status: PASS in code and tests.

## Fix Applied

`DEV_FAKE_ADMIN` now requires both:

- `DEV_FAKE_ADMIN === "true"`
- `NODE_ENV !== "production"`

Touched files:

- `apps/web/lib/auth.ts`
- `apps/web/lib/entitlements.ts`
- `apps/web/middleware.ts`

## Additional Leakage Fix

Removed client-visible admin-dashboard copy that named the dev bypass variable:

- `apps/web/app/admin/dashboard/dashboard-view.tsx`

## Test Evidence

Commands:

- `npm.cmd run test --workspace=apps/web -- __tests__/entitlements-dev-admin.test.ts`
- `npm.cmd test`

Final result:

- `entitlements-dev-admin.test.ts` passed.
- Full test suite passed: 168 files, 2,095 tests.

## Runtime Evidence

Route matrix:

- `/cockpit` returns 307 redirect in the local production build.

## Remaining Risk

Do not set dev-only bypass variables in production env. The code ignores the bypass in production, but production env should still remain clean.
