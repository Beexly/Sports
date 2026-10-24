# Mock / Demo / Stale Data Leakage Scan

As of: 2026-06-09

## Verified Against Real App

- scripts/check-deploy-readiness.mjs includes production guards for DEV_FAKE_ADMIN and DEMO_PICKS_ENABLED.
- packages/db/src/sample-picks.ts exists and is intended for demo/stub mode.
- Test logs show stub Prisma behavior when DATABASE_URL is absent.
- Runtime did not fall back to demo data under invalid DB credentials; it threw Prisma auth errors.

## Risk

The current launch risk is not visible fake sample data. The current launch risk is that critical routes 500/503 instead of rendering safe empty/degraded states when DB auth fails.

## Required Action

Keep demo/stub data allowed only for local tests. Production readiness must fail if DEV_FAKE_ADMIN or DEMO_PICKS_ENABLED is true. Public runtime should fail closed with safe copy, not internal errors.
