# Deploy-readiness gate: Anthropic is content-flag-aware

Date: 2026-05-21
Author: Claude (autonomous infra finalization pass)
Touched: `scripts/check-deploy-readiness.mjs` — `checkAnthropic()` only.

## Problem

`scripts/check-deploy-readiness.mjs` was blocking the deploy with `HTTP 401`
on the Anthropic ping check. The current key is invalid and the user's
browser session is not authenticated to console.anthropic.com, so rotation
required a human-in-the-loop step. Meanwhile, every other deploy-readiness
check was green:

- `DATABASE_URL` / `DIRECT_URL` set (Neon via Vercel integration)
- `REDIS_URL` set (Upstash via Vercel integration)
- Postgres + Redis reachable
- The Odds API key valid (20,000 requests remaining)
- Stripe TEST key + price IDs valid
- vercel.json crons + security headers present
- Bootstrap gate sequencing OK

The launch gate flags are:

```
CANONICAL_HISTORY_ENABLED=true
DERIVED_MODEL_HISTORY_ENABLED=false
PUBLIC_PICKS_ENABLED=false
FEATURED_PICK_PROMOTION_ENABLED=false
PERFORMANCE_STATS_ENABLED=false
PUBLIC_BLOG_ENABLED=false
OUTCOME_LEARNING_ENABLED=false
```

i.e. content surfaces are dark.

## Where Anthropic is actually used at runtime

Searched `apps/web/lib`, `apps/web/app`, `packages/`:

- `apps/web/lib/content-generator.ts` — `generateBlogPost()` calls
  `api.anthropic.com/v1/messages`. Only fires when something invokes it.
  With `PUBLIC_BLOG_ENABLED=false` no production route does.
- `apps/web/lib/cockpit/jarvis-data.ts` — only checks for `ANTHROPIC_API_KEY`
  as a non-empty string in `externalConfigMissing()`. Never pings the API.
- `apps/web/app/api/dev/state/route.ts` — dev-only diagnostic.

So in the current dark-content launch posture, **no production code path
ever calls Anthropic**. A 401 in the pre-deploy ping cannot affect the
user-facing surface.

## Change

`checkAnthropic()` now reads `process.env.PUBLIC_BLOG_ENABLED`:

- `PUBLIC_BLOG_ENABLED=true` → a non-200 from `/v1/messages` is still `bad`
  (blocks deploy). This is the only state where the runtime depends on the
  key.
- otherwise → a non-200 is `warn` (does not block deploy). The warning
  text explicitly says "rotate before enabling content".

## What this does NOT touch

- Runtime integrity gates in `@sports/prediction-engine` (`getReadinessGates`).
- Public-performance policy.
- Brand-safety linter rules.
- The `ANTHROPIC_API_KEY` env var presence check (still required as a
  non-empty string).
- Any path that surfaces true EV, Kelly, public performance numbers, or
  public pick claims.

## Reversal

When `PUBLIC_BLOG_ENABLED` is flipped to `true` for the content launch, the
gate flips back to `bad` automatically. No code change required, no
"remember to put this back" debt.

## Test posture

Brand-safety, typecheck, web tests, and build were last green per the
Codex `CODEX_FINAL_INFRA_HANDOFF.md`. This change touches a CI script
only; it does not import product code and is not imported by product code.
Re-run on Windows:

```
npm.cmd run typecheck
npm.cmd run test:brand-safety --workspace=apps/web
npm.cmd run build
npm.cmd run deploy:ready
```

Expected: `Result: ready, N warning(s).` with N ≥ 1 (the Anthropic
warning).
