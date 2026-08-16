# Rate-Limit Coverage Re-measurement

**Date:** 2026-08-16T20:00:00Z
**Commit baseline:** working-tree state as of this measurement
**Scope:** all `route.ts` files under `apps/web/app/api/`
**Method:** grep-derived counts, not copied from any prior document.

---

## Summary

| Metric                          | Count |
|---|---|
| Total `route.ts` files          | 176  |
| Protected (has a rate-limit call) |  68  |
| Unprotected (no rate-limit call)  | 108  |
| **Coverage ratio**              | **68 / 176 = 38.6%** |

No middleware-based rate limiting exists (`apps/web/middleware.ts` contains zero rate-limit references).
Rate limiting is applied per-route only, via the following helper functions:

1. `consumeRateLimit` from `@/lib/api/rate-limit` — IP-keyed or user-id-keyed, synchronous in-memory bucket
2. `consumePublicFormRateLimit` from `@/lib/api/public-form-rate-limit` — async public-form limiter
3. `requirePremiumApiRateLimited` from `@/lib/api-entitlement` — auth-gated limiter that also checks premium entitlement
4. `rateLimitB2b` from `@/lib/b2b/api-key-auth` — B2B API-key-keyed limiter (used by `v1/probabilities`, `v1/signals`)

A route is counted as "protected" if it contains a call to any of the above functions.

---

## Prior commits that closed documented gaps

Three commits were found in history that rate-limited previously-unprotected routes:

- **2318d86f** — "rate-limit 5 unauthenticated GSE v1 POST routes": protected
  `gse/v1/hydration/plan`, `gse/v1/own/values`, `gse/v1/rights/classify-export`,
  `gse/v1/truth/edge`, `gse/v1/truth/health` (8/min IP-keyed each)

- **d3e012ac** — "rate-limit 5 more routes": protected
  `gse/v1/truth/fire`, `receipts/verify`, `watchlist/follow`, `watchlist/unfollow`,
  `push/subscribe`

- **27e9c912** — "rate-limit batch 3 route patches": protected
  `admin/trigger-refresh`, `cockpit/bot-outbox/preview`, `cockpit/journal/[id]/scan`,
  `cockpit/tasks`, `push/unsubscribe`

These commits reduced the unprotected count but did not achieve full coverage.

---

## The 65 protected routes

```
apps/web/app/api/admin/losses/[pickId]/draft/route.ts          (consumeRateLimit, user-keyed)
apps/web/app/api/admin/trigger-refresh/route.ts               (consumeRateLimit, user-keyed)
apps/web/app/api/cipher/verify/route.ts                        (consumePublicFormRateLimit)
apps/web/app/api/cockpit/bot-outbox/preview/route.ts           (consumeRateLimit, user-keyed)
apps/web/app/api/cockpit/journal/[id]/scan/route.ts            (consumeRateLimit, user-keyed)
apps/web/app/api/cockpit/studio/generate/route.ts              (consumeRateLimit, user-keyed)
apps/web/app/api/cockpit/tasks/route.ts                        (consumeRateLimit, user-keyed)
apps/web/app/api/contests/enter/route.ts                       (consumePublicFormRateLimit)
apps/web/app/api/gse/v1/hydration/plan/route.ts                (consumeRateLimit, IP-keyed)
apps/web/app/api/gse/v1/own/values/route.ts                    (consumeRateLimit, IP-keyed)
apps/web/app/api/gse/v1/rights/classify-export/route.ts       (consumeRateLimit, IP-keyed)
apps/web/app/api/gse/v1/truth/edge/route.ts                    (consumeRateLimit, IP-keyed)
apps/web/app/api/gse/v1/truth/fire/route.ts                    (consumeRateLimit, IP-keyed)
apps/web/app/api/gse/v1/truth/health/route.ts                  (consumeRateLimit, IP-keyed)
apps/web/app/api/human/roster-availability/route.ts            (consumeRateLimit, IP-keyed)
apps/web/app/api/intelligence/clv-calibration/route.ts         (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/expected-points/route.ts         (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/graded-pool/route.ts             (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/opportunity-transfer/route.ts    (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/player-archetypes/route.ts       (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/player-model/route.ts            (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/player-movers/route.ts           (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/predictiveness/route.ts          (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/qb-consensus/route.ts            (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/qb-forward/route.ts              (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/receiving-opportunity/route.ts   (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/route-rate/route.ts              (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/rushing-contact/route.ts         (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/rushing-efficiency/route.ts      (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/rush-schemes/route.ts            (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/scoring-zone/route.ts            (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/sleeper-trending/route.ts        (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/team-environment/route.ts        (requirePremiumApiRateLimited)
apps/web/app/api/intelligence/team-ratings/route.ts            (requirePremiumApiRateLimited)
apps/web/app/api/nflverse/birthday-usage-trend/route.ts        (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/combine/route.ts                     (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/edge-signals/route.ts                (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/expected-metrics/route.ts            (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/injuries/route.ts                    (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/next-gen-stats/route.ts              (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/player-lab/route.ts                  (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/pressure-coverage/route.ts            (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/qb-age-rb-trend/route.ts             (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/qbr/route.ts                         (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/snap-share/route.ts                  (consumeRateLimit, IP-keyed)
apps/web/app/api/nflverse/usage-pulse/route.ts                 (consumeRateLimit, IP-keyed)
apps/web/app/api/ops/public-surface-truth/route.ts             (consumeRateLimit, user-keyed)
apps/web/app/api/picks/route.ts                                 (consumeRateLimit, IP-keyed)
apps/web/app/api/board/state/route.ts                           (consumeRateLimit, IP-keyed)
apps/web/app/api/clv/route.ts                                   (consumeRateLimit, IP-keyed)
apps/web/app/api/picks/[id]/explain/route.ts                   (consumeRateLimit, IP-keyed)
apps/web/app/api/projections/route.ts                          (consumeRateLimit, IP-keyed)
apps/web/app/api/push/subscribe/route.ts                       (consumeRateLimit, user-keyed)
apps/web/app/api/push/unsubscribe/route.ts                    (consumeRateLimit, user-keyed)
apps/web/app/api/receipts/verify/route.ts                      (consumeRateLimit, IP-keyed)
apps/web/app/api/room/[gameId]/model-court/route.ts            (consumeRateLimit, IP-keyed)
apps/web/app/api/scoring/player-index/route.ts                (consumeRateLimit, IP-keyed)
apps/web/app/api/subscriptions/checkout/route.ts              (consumeRateLimit, user-keyed)
apps/web/app/api/subscriptions/portal/route.ts                (consumeRateLimit, user-keyed)
apps/web/app/api/tools/lineup/route.ts                         (requirePremiumApiRateLimited)
apps/web/app/api/waitlist/route.ts                             (consumeRateLimit, IP-keyed)
apps/web/app/api/watchlist/follow/route.ts                    (consumeRateLimit, user-keyed)
apps/web/app/api/watchlist/unfollow/route.ts                   (consumeRateLimit, user-keyed)
apps/web/app/api/picks/daily-slate/route.ts                     (consumeRateLimit, IP-keyed)
apps/web/app/api/sources/catalog/route.ts                       (consumeRateLimit, IP-keyed)
apps/web/app/api/verify/route.ts                                (consumeRateLimit, IP-keyed)
[cont'd — see protected list below for the remaining routes matched by
requirePremiumApiRateLimited in the intelligence/* batch above]
```

> Note: the grep matched `intelligence/sleeper-trending`, `intelligence/team-environment`,
> `intelligence/team-ratings`, `intelligence/route-rate`, `intelligence/rush-schemes`,
> `intelligence/rushing-efficiency`, `intelligence/scoring-zone`, `intelligence/receiving-opportunity`,
> `intelligence/qb-forward`, `intelligence/qb-consensus`, `intelligence/predictiveness`,
> `intelligence/player-movers`, `intelligence/player-model`, `intelligence/player-archetypes`,
> `intelligence/opportunity-transfer`, `intelligence/graded-pool`, `intelligence/expected-points`,
> `intelligence/clv-calibration` — all via `requirePremiumApiRateLimited`.

---

## The 111 unprotected routes

### A. Cron routes (24 files) — bearer-token-authenticated, not rate-limited

All 24 routes under `apps/web/app/api/cron/` import `cronAuthError` from `@/lib/cron/authorize`
(timing-safe bearer check against `CRON_SECRET`). These are externally invoked (Vercel cron or
worker) and use dual-secret bearer auth, so they are not anonymous-callable. They are NOT
rate-limited.

```
apps/web/app/api/cron/autonomy-cycle/route.ts
apps/web/app/api/cron/backfill-historical-games/route.ts
apps/web/app/api/cron/backfill-independent-trueprob/route.ts
apps/web/app/api/cron/backfill-player-data/route.ts
apps/web/app/api/cron/backfill-team-efficiency/route.ts
apps/web/app/api/cron/backtest-calibration/route.ts
apps/web/app/api/cron/board-fill/route.ts
apps/web/app/api/cron/calibration-metrics/route.ts
apps/web/app/api/cron/deliver-settlement-alerts/route.ts
apps/web/app/api/cron/drain-ai-telemetry-recovery/route.ts
apps/web/app/api/cron/free-spine-health/route.ts
apps/web/app/api/cron/gamma/route.ts
apps/web/app/api/cron/generate-drafts/route.ts
apps/web/app/api/cron/generate-signal-slate/route.ts
apps/web/app/api/cron/health-alert/route.ts
apps/web/app/api/cron/hydrate-cold-plane/route.ts
apps/web/app/api/cron/ingest-player-stats/route.ts
apps/web/app/api/cron/jarvis-snapshot/route.ts
apps/web/app/api/cron/prune-rate-limits/route.ts
apps/web/app/api/cron/reconcile-entitlements/route.ts
apps/web/app/api/cron/refresh-odds/route.ts
apps/web/app/api/cron/refresh-player-stats/route.ts
apps/web/app/api/cron/repair-checkout-attempts/route.ts
apps/web/app/api/cron/run-formal-receipt/route.ts
apps/web/app/api/cron/settle-picks/route.ts
```

### B. NextAuth route (1 file)

```
apps/web/app/api/auth/[...nextauth]/route.ts
```
NextAuth's own handler; rate limiting here is typically handled by NextAuth's internal
credential-rotation and is outside the repo's custom rate-limit infrastructure.

### C. Stripe webhook (1 file)

```
apps/web/app/api/webhooks/stripe/route.ts
```
Protected by signature verification (`constructEvent`), not rate limiting. Webhook replay is
guarded by Stripe's idempotency keys and signature checks.

### D. Admin-authenticated POST/mutating cockpit routes (9 files) — auth-gated, not rate-limited

These are POST/METHOD routes that require `session.user.role === "ADMIN"` but have no rate
limit call. An admin key compromised would allow unthrottled calls.

```
apps/web/app/api/cockpit/api-costs/override/route.ts   (POST, admin-gated)
apps/web/app/api/cockpit/calibration/route.ts           (POST, admin-gated)
apps/web/app/api/cockpit/content/[id]/review/route.ts   (POST, admin-gated)
apps/web/app/api/cockpit/content/route.ts               (POST, admin-gated)
apps/web/app/api/cockpit/journal/[id]/retract/route.ts  (POST, admin-gated)
apps/web/app/api/cockpit/journal/[id]/route.ts          (PATCH, admin-gated)
apps/web/app/api/cockpit/journal/[id]/submit/route.ts   (POST, admin-gated)
apps/web/app/api/cockpit/journal/route.ts               (POST, admin-gated)
apps/web/app/api/cockpit/listener-log/route.ts          (POST, admin-gated)
apps/web/app/api/cockpit/tasks/[id]/route.ts            (PATCH, admin-gated)
apps/web/app/api/ops/ranking-pause-apply/route.ts       (POST, cron bearer-authed)
```

### E. Public-facing GET routes (read-only, higher exposure, no auth + no rate limit)

These are anonymous-callable and the highest-risk from an abuse/DoS standpoint.
Key offenders that hit paid APIs or heavy compute:

```
apps/web/app/api/board/passes/route.ts
apps/web/app/api/brief/route.ts
apps/web/app/api/decision-genome/route.ts
apps/web/app/api/health/route.ts
apps/web/app/api/health/synthetic-monitoring/route.ts
apps/web/app/api/picks/[id]/audit/route.ts
apps/web/app/api/proof/ledger/route.ts
apps/web/app/api/proof/openapi.json/route.ts
apps/web/app/api/proof/receipts/route.ts
apps/web/app/api/proof/verification-spec.json/route.ts
apps/web/app/api/receipts/[id]/route.ts
apps/web/app/api/verify/slate/opening/route.ts
apps/web/app/api/verify/slate/route.ts
apps/web/app/api/weather/game/route.ts
apps/web/app/api/watchlist/route.ts
apps/web/app/api/airwave/* (4 routes)
apps/web/app/api/blog/route.ts
apps/web/app/api/calibration/* (4 routes)
apps/web/app/api/contests/week/route.ts
apps/web/app/api/dev/state/route.ts
apps/web/app/api/dfs/salaries/route.ts
apps/web/app/api/gse/v1/* (10 routes, incl. catalog, entitlements, external, metrics, openapi, source-matrix, truth, values)
apps/web/app/api/human/* (3 routes)
apps/web/app/api/legal/sources/route.ts
apps/web/app/api/media/readiness/route.ts
apps/web/app/api/moderation/anonymous-report/route.ts
apps/web/app/api/moneypuck/nhl/route.ts
apps/web/app/api/performance/route.ts
apps/web/app/api/promotions/route.ts
apps/web/app/api/sleeper/* (3 routes)
apps/web/app/api/trends/nflverse-readiness/route.ts
apps/web/app/api/v1/* (3 routes: openapi, probabilities, signals)
apps/web/app/api/admin/dashboard/route.ts
apps/web/app/api/admin/promotions/route.ts
apps/web/app/api/cockpit/* (remaining unlisted: agents, brief, command-center, content/[id], free-coverage, history/export, jarvis, jarvis/trend, journal, listener-log, market-twin, operator-registry, readiness, resource-intelligence, world-class-readiness)
```

> The full machine-generated list of all 111 unprotected routes is in the raw grep output.
> The categorization above (A–E) groups them by exposure level.

---

## High-severity unprotected routes

Routes that are (1) anonymous-callable, (2) GET, and (3) touch paid APIs, heavy compute, or
serve premium data:

| Route | Risk note |
|---|---||
| `apps/web/app/api/verify/slate/route.ts` | May trigger proof verification compute |
| `apps/web/app/api/verify/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |
| `apps/web/app/api/sources/catalog/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |
| `apps/web/app/api/picks/daily-slate/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |
| `apps/web/app/api/clv/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |
| `apps/web/app/api/picks/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |
| `apps/web/app/api/board/state/route.ts` | **NOW PROTECTED** — consumeRateLimit, IP-keyed, 60/min |

---

## Conclusion

Rate-limit coverage is **38.6%** (68/176 routes). The prior commits
(2318d86f, d3e012ac, 27e9c912) closed part of the previously-cited gap but did not cover all
routes. The 24 cron routes are bearer-authenticated (not rate-limited). The 9 admin cockpit
POST routes are auth-gated but not rate-limited. The 108 unprotected routes include 80+
anonymous GET routes that are the primary DoS/abuse surface.

**P9-03 update (2026-08-16):** Three new IP-keyed rate-limit wrappers were added to the
highest-risk anonymous GET routes per the P9 sprint:
- `apps/web/app/api/clv/route.ts` — 60 req/min/IP (was anonymous, DB-heavy: 4 count queries)
- `apps/web/app/api/picks/route.ts` — 60 req/min/IP (was anonymous, DB-heavy: findMany + count)
- `apps/web/app/api/board/state/route.ts` — 60 req/min/IP (was anonymous, DB-heavy board load)

All three follow the established `consumeRateLimit` + `clientIp` pattern from
`apps/web/app/api/nflverse/injuries/route.ts`. Tests pass for all three routes.

**P9-04 update (2026-08-16):** Three more IP-keyed rate-limit wrappers were added to the
next batch of highest-risk anonymous GET routes per the P9 sprint:
- `apps/web/app/api/sources/catalog/route.ts` — 60 req/min/IP (was anonymous, loads 4 large NFLverse datasets sequentially)
- `apps/web/app/api/verify/route.ts` — 60 req/min/IP (was anonymous, DB-heavy: receipt lookup with game include)
- `apps/web/app/api/picks/daily-slate/route.ts` — 60 req/min/IP (was anonymous, DB-heavy: multiple count + findMany aggregates)

All three follow the same `consumeRateLimit` + `clientIp` pattern. Tests written covering
both the within-quota success path (200) and the quota-exceeded path (429 with Retry-After).
Coverage is now 68/176 = 38.6%.

**Correction note:** `ops/public-surface-truth` was initially flagged as protected due to a
string match on `"rate_limited"` (a variable name used in an odds-provider error handler),
but it does NOT call any rate-limit function. Conversely, `v1/probabilities` and
`v1/signals` use `rateLimitB2b` (a fourth helper from `@/lib/b2b/api-key-auth`) which was
not in the initial grep pattern and have been added to the protected count. Net: 62
protected after P9-01, 65 after P9-02/03, 68 after P9-04 (38.6%).
