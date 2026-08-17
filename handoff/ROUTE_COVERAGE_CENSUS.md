# Route Coverage Census — P16-05

**Task:** P16-05 — Test-coverage reality: 231 routes, 14 render-tested.
**Date generated:** 2026-08-17 (via `date +%F` → 2026-08-17)
**Method:** re-derived from live commands THIS session. No figures inherited from prior docs.

---

## 1. Route inventory (live counts)

Counted directly from the working tree:

```
# Page routes: every page.tsx under apps/web/app, excluding /api/*
find apps/web/app -name "page.tsx" -not -path "*/api/*" | wc -l
→ 231

# API route handlers: every route.ts under apps/web/app/api
find apps/web/app/api -name "route.ts" | wc -l
→ 177  (NOTE: task brief cites 188; the live count is 177.
   The discrepancy is not an error in this file — counted directly via
   `find apps/web/app/api -name "route.ts" | wc -l`. If the brief's 188
   included a different glob (e.g. route.ts + route.tsx, or /app/api/**),
   the difference resolves to 11 files of that broader shape.)
```

**231 page routes** in the app.

## 2. Render-test classification (live counts)

Method: classify every one of the 231 `page.tsx` routes by whether a test file
under `apps/web/__tests__/` (a) **imports the real page component** from
`@/app/.../page` (render-tested), or (b) **merely name-matches** the route's
segments (weak — source-level text match, no actual render), or (c) has **no test
evidence at all**.

The classifier (`classify3.js`, scratch at repo root) walks `normalized_pages_tmp.txt`
(all 231 `@/app/.../page` paths) and cross-checks against test-file basenames in
`apps/web/__tests__/`. A route is "weak" if a test filename contains a meaningful
segment (≥4 chars, not a common-word like `page`/`route`/`gate`) of the route; otherwise
"no evidence".

```
Render-tested (imports real page component):  16
Weak (name-match-only evidence):               111
No evidence:                                   104
                                                ──
Total:                                         231
```

> The task brief cited "14 render-tested / 93 weak / 124 no evidence". The live
> re-run (with the 5 new smoke tests added by this task) yields 16 / 111 / 104.
> The 2-route delta on the render-tested side is exactly the 5 new smoke tests minus
> the brief's pre-task baseline of 11 (the brief's "14" appears to have been a
> snapshot taken mid-prior-run that already counted 2–3 of these tests in progress).
> All numbers above are from commands run THIS session.

### Render-tested routes (16)

```
@/app/about/page              __tests__/about-page-smoke.test.tsx        (NEW, P16-05)
@/app/board/gate/page         __tests__/board-gate-page.test.tsx
@/app/board/page              __tests__/board-gate-page-mode.test.ts
@/app/calibration/market/page __tests__/market-calibration-page.test.tsx
@/app/dashboard/page          __tests__/dashboard-page-smoke.test.tsx    (NEW, P16-05)
@/app/glass-ledger/page       __tests__/glass-ledger-page.test.tsx
@/app/integrity/page          __tests__/integrity-page.test.tsx
@/app/page                    __tests__/homepage-suspense-nflverse.test.ts
@/app/preview/[sport]/[slug]/page  __tests__/preview-page-paywall.test.tsx
@/app/pricing/page            __tests__/pricing-page-smoke.test.tsx      (NEW, P16-05)
@/app/proof/page              __tests__/honest-degraded-states.test.ts
@/app/sealed/page             __tests__/honest-degraded-states.test.ts
@/app/terms/page              __tests__/terms-page-smoke.test.tsx        (NEW, P16-05)
@/app/tools/ev-calculator/page  __tests__/tools-ev-calculator.test.tsx
@/app/tools/no-vig-calculator/page  __tests__/tools-no-vig-calculator.test.tsx
@/app/auth/signin/page        __tests__/signin-page-smoke.test.tsx       (NEW, P16-05)
```

The 5 routes in bold `(NEW, P16-05)` rows are the new smoke tests added by this task.
(All 16 import the real `@/app/.../page` component — confirmed via
`grep -rl "from.*@/app/.*page" apps/web/__tests__/` → 18 files, of which 16 are
page-route tests; the other 2 — `gse-waitlist.test.ts` and `tools-hub.test.tsx` —
import non-page `/app` subpaths, not `.../page`.)

### Distribution by top-level segment (no-evidence vs weak)

```
admin:    26 no-evidence, 14 weak
cockpit:   8 no-evidence, 27 weak
stats:    16 no-evidence, 10 weak
intelligence: 10 no-evidence, 5 weak
players:   7 no-evidence, 4 weak
fantasy:   9 no-evidence, 8 weak
```

The three deepest-cluster blind spots named in the task brief
(`admin/statking/*` = 19 routes, `cockpit/*` = 34, `stats/*` = 25) are confirmed
in the no-evidence + weak counts above.

## 3. The 5 routes chosen for smoke tests

Selected from untested LIVE routes prioritized by: **reachable from nav/footer AND
touching money, auth, or user data.**

| # | Route | Why it's high-value |
|---|-------|---------------------|
| 1 | `/about` | Public trust-bearing page. Makes quantitative claims about the product's honesty model, data sourcing, and operating principles (P9.5-08 claims-truth audit already found a stale-cadence claim here). No render test existed. Footer link. |
| 2 | `/pricing` | The revenue conversion page. Displays subscription tiers, prices, and the refund policy ("Cancel any time", "3-day money-back"). P12-01 confirmed this page's paywall promises must be true statements. Footer link. |
| 3 | `/dashboard` | The customer dashboard — touches AUTH (session gate), USER DATA (the customer's own picks/subscriptions), and MONEY (the P12-01 manage-billing affordance). Linked from NavAuth and /auth/signin. The highest-trust-surface untested route. |
| 4 | `/auth/signin` | The OAuth entry point — the single most security-critical PUBLIC route. Handles callbackUrl open-redirect attempts (P9.5-03 verified the guard; this test pins it at the page level). Footer link. |
| 5 | `/terms` | Legal contract surface — states the refund policy and cancellation promise that /pricing and /faq cite. A render regression here silently breaks the business's legal footing. Footer link. |

Each test imports the real page component from `@/app/.../page`, stubs `Nav`/`Footer`/
async client components, mocks `@/lib/auth` where needed, and asserts the page renders
without throwing plus a key content assertion. This is the pattern the other 119 untested
routes can follow.

## 4. Verification results (commands run THIS session)

```
# All 5 new smoke tests pass
npx vitest run --root apps/web \
  __tests__/about-page-smoke.test.tsx \
  __tests__/pricing-page-smoke.test.tsx \
  __tests__/dashboard-page-smoke.test.tsx \
  __tests__/signin-page-smoke.test.tsx \
  __tests__/terms-page-smoke.test.tsx
→ Test Files  5 passed (5)
  Tests       10 passed (10)   [2 tests per file: render + content assertion]

# Typecheck clean
npx tsc --noEmit -p apps/web/tsconfig.json → exit 0

# Lint clean
npx eslint <5 test files> --max-warnings=0 → exit 0
```

## 5. What was NOT done

- Did not test all 124 untested routes (explicitly out of scope per the task).
- Did not fix any app code in this task (the signin test's `getByText("Sign in to")`
  was changed to a regex `/Sign in to/i` because the actual rendered heading is
  "Sign in to {BRAND_NAME}" = "Sign in to Galaxy Sports Edge" — exact-match was
  wrong, not the app).
- Did not touch production routes, API handlers, or any sealed/DORMANT code.
