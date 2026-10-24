# Launch QA Checklist — Galaxy Sports Edge

Last verified: 2026-05-21. Distilled from the Front-End Checklist
(github.com/thedaviddias/Front-End-Checklist) and tailored to the
Galaxy Sports Edge platform's actual surfaces, brand-safety
invariants, and Stripe paywall architecture.

Severity legend:
- **MUST** — blocks the launch. Any failure here keeps the deploy off.
- **SHOULD** — strongly recommended. A failure should be acknowledged in writing.
- **NICE** — polish. Track but do not block.

## 1 · Brand safety (MUST)

These are the non-negotiables from CLAUDE.md and the trust-claim
registry. If any of these fail, the launch is illegal-feeling, not
just buggy.

- [ ] **MUST** — `npm run test:brand-safety` passes (banned-phrase
      scanner across all public surfaces). Output: 0 hits.
- [ ] **MUST** — `evaluatePublicPerformancePolicy()` returns BLOCKED
      when `PERFORMANCE_STATS_ENABLED` is unset. Verified at
      `/dashboard`, `/api/picks/daily-slate`, `/api/performance`.
- [ ] **MUST** — Sample-mode banner renders on `/dashboard`, `/picks`
      while `DEMO_PICKS_ENABLED=true`. The "verified record" reads
      "Collecting…" with no numeric claims.
- [ ] **MUST** — No occurrence of any banned phrase in rendered HTML
      (`npm run smoke:prod` confirms post-deploy).
- [ ] **MUST** — Risk disclosure visible on every page that displays
      picks. Footer disclaimer present site-wide.
- [ ] **SHOULD** — All published copy reads as analytical
      ("intelligence", "signal", "edge") not promotional ("lock",
      "guaranteed", "easy money").

## 2 · Server-side paywall enforcement (MUST)

Per CLAUDE.md non-negotiable #3 — paywall must be enforced on the
server, not the client. Frontend gating alone is a free bypass.

- [ ] **MUST** — `/api/picks/daily-slate` returns 200 for FREE tier
      but redacts confidence + factor breakdown.
- [ ] **MUST** — `/api/picks/*/snapshot` requires PRO+ entitlement
      and returns 402 (or redirect) for FREE tier.
- [ ] **MUST** — Confidence numbers are stripped from the JSON
      response, not just hidden in the UI, for FREE users.
- [ ] **MUST** — Stripe webhook signature is verified before any
      entitlement state change. (`apps/web/app/api/webhooks/stripe/route.ts`)
- [ ] **MUST** — `getEntitlements()` is called at the route handler
      level, not just at component render time.
- [ ] **SHOULD** — A regression test asserts that a FREE-tier
      session cannot fetch a PREMIUM pick's confidence value through
      any documented API path.

## 3 · Secrets and environment variables (MUST)

- [ ] **MUST** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `THE_ODDS_API_KEY`,
      `DATABASE_URL`, `DIRECT_URL` set in Vercel.
- [ ] **MUST for paid launch** — `STRIPE_SECRET_KEY` is the **live**
      key (not `sk_test_*`) and `STRIPE_WEBHOOK_SECRET` matches the live
      endpoint. Silent launch may run test keys while the paywall is off.
- [ ] **MUST** — No secret value appears in the repo (`git grep
      "sk_live_\|sk_test_\|pk_live_\|nhst_\|whsec_"` returns nothing).
- [ ] **MUST** — `.env.local` is in `.gitignore` and not tracked.
- [ ] **SHOULD** — `NEXT_PUBLIC_APP_URL` set to
      `https://galaxysportsedge.com` (overrides default in
      `robots.ts` / `sitemap.ts` / OG image).
- [ ] **NICE** — Vercel secret rotation calendar drafted (90-day
      rotation for Stripe restricted keys).

## 4 · Data integrity (MUST)

Per CLAUDE.md non-negotiable #1, #2, #5.

- [ ] **MUST** — Production has `FORCE_REAL_PRISMA=true`,
      `DEMO_PICKS_ENABLED` unset, `DATABASE_URL` pointing at Neon.
- [ ] **MUST** — `seedPicks()` is gated on `NODE_ENV !== "production"`
      and cannot run against a prod DB.
- [ ] **MUST** — `FRESHNESS_THRESHOLD_MS` enforced in the data-refresh
      worker — stale data triggers an alert, not a pick.
- [ ] **MUST** — Every published pick has `dataFreshnessAt` within
      the freshness window and `modelVersion` populated.
- [ ] **SHOULD** — `PERFORMANCE_STATS_ENABLED` stays `false` until
      ≥100 canonical settled picks have accumulated.
- [ ] **SHOULD** — The data-refresh worker has a configured retry
      and a failure-alert path (Sentry / email / Slack).

## 5 · Head, meta, social (MUST/SHOULD)

- [ ] **MUST** — `<html lang="en">` declared.
- [ ] **MUST** — UTF-8 charset declared.
- [ ] **MUST** — Responsive viewport meta tag present.
- [ ] **MUST** — `<title>` is unique per route and under 60 chars.
- [ ] **MUST** — `<meta name="description">` is unique per route,
      120–160 chars, and free of banned phrases.
- [ ] **MUST** — `robots.ts` disallows `/admin`, `/cockpit`, `/api`,
      `/auth`, `/dashboard`, `/brief`.
- [ ] **MUST** — `sitemap.ts` lists every public route and only public
      routes.
- [ ] **MUST** — Dynamic OG image renders at `/opengraph-image.png`
      (Next.js edge runtime) with brand wordmark + tagline.
- [ ] **SHOULD** — Twitter / X card metadata present
      (`twitter:card`, `twitter:site`).
- [ ] **SHOULD** — `<link rel="canonical">` set per page where
      applicable.
- [ ] **NICE** — `manifest.json` / `site.webmanifest` configured for
      PWA install on mobile.

## 6 · Performance (SHOULD)

- [ ] **SHOULD** — First Contentful Paint < 1.8s on 4G (Lighthouse).
- [ ] **SHOULD** — Largest Contentful Paint < 2.5s.
- [ ] **SHOULD** — Cumulative Layout Shift < 0.1.
- [ ] **SHOULD** — Total Blocking Time < 200ms.
- [ ] **SHOULD** — Bundle size for `/dashboard` < 200KB gzipped JS.
- [ ] **SHOULD** — Images: `<Image>` with `sizes`/`priority` where
      above-the-fold; WebP/AVIF preferred.
- [ ] **NICE** — Preload critical fonts; subset fonts to Latin if all
      copy is English.

## 7 · Accessibility (SHOULD)

- [ ] **SHOULD** — Color contrast ≥ 4.5:1 for body text, 3:1 for
      large/UI text.
- [ ] **SHOULD** — All interactive elements reachable via keyboard
      with visible focus ring.
- [ ] **SHOULD** — Form fields have `<label>` associated.
- [ ] **SHOULD** — Buttons have descriptive labels, not just icons.
- [ ] **SHOULD** — `<main>` and skip-to-content link present.
- [ ] **SHOULD** — ARIA landmarks: header, nav, main, footer.
- [ ] **NICE** — Run axe-core / Lighthouse a11y audit and fix any
      "serious" or "critical" findings.

## 8 · Security (MUST)

- [ ] **MUST** — HTTPS enforced (Vercel handles this — confirm in
      project settings).
- [ ] **MUST** — Strict-Transport-Security header set.
- [ ] **MUST** — Content-Security-Policy in place (allow Stripe,
      Google OAuth, Anthropic; deny inline scripts where possible).
- [ ] **MUST** — `X-Frame-Options: DENY` (no embedding).
- [ ] **MUST** — Stripe webhook endpoint validates signature
      header before mutating state.
- [ ] **MUST** — NextAuth secret rotated to a fresh 32-byte value;
      not reused from any other project.
- [ ] **MUST** — Admin/cockpit routes return 404 (not 403) for
      non-admin users — avoid leaking the existence of admin paths.
- [ ] **SHOULD** — Rate limiting on auth endpoints (Upstash Ratelimit
      or middleware-based).
- [ ] **SHOULD** — CSRF protection on state-changing POST/DELETE
      routes that don't go through NextAuth.

## 9 · Subscriptions and billing (MUST before paid launch)

- [ ] **MUST before paid launch** — Stripe `STRIPE_PRO_PRICE_ID` and
      `STRIPE_ELITE_PRICE_ID` set and point to live products.
- [ ] **MUST before paid launch** — `npm run stripe:seed` confirmed
      against live mode.
- [ ] **MUST before paid launch** — Customer portal link (`/api/subscriptions/portal`)
      works end-to-end with a real test purchase.
- [ ] **MUST** — Webhook handles: `checkout.session.completed`,
      `customer.subscription.updated`, `customer.subscription.deleted`,
      `invoice.payment_failed`.
- [ ] **MUST** — Failed-payment path downgrades the user to FREE but
      does NOT delete account data.
- [ ] **SHOULD** — Refund flow documented in `ops-runbook.md`.

## 10 · Pre-deploy hard gate (MUST)

These commands must all pass cleanly before pushing to main:

```
npm install
npm run db:generate
npm run typecheck     # 0 errors
npm run lint          # 0 warnings
npm run test          # all suites green
npm run build         # next build succeeds
npm run guardrails    # trust + model-freeze + draft-only
npm run deploy:ready  # readiness CLI green
```

After Vercel deploys:

```
npm run smoke:prod    # banned-phrase scan on rendered HTML
                      # security-header audit
                      # parallel route checks (200/302/404 expected)
```

## 11 · Day-1 post-launch monitoring (SHOULD)

- [ ] **SHOULD** — Vercel analytics dashboard bookmarked.
- [ ] **SHOULD** — Stripe dashboard set to email alerts on first
      successful charge.
- [ ] **SHOULD** — Upstash dashboard bookmarked for rate-limit
      monitoring.
- [ ] **SHOULD** — Neon dashboard bookmarked for DB connection /
      latency.
- [ ] **SHOULD** — Manual `/cockpit` health check 1×/day for first
      7 days, then 1×/week.
- [ ] **NICE** — Set up an automated daily Jarvis snapshot via
      `scripts/post-deploy-smoke.mjs` in a cron / Vercel Cron Job.

## Sign-off

Section | Owner | Date | Result
--- | --- | --- | ---
1 — Brand safety | | |
2 — Paywall | | |
3 — Secrets | | |
4 — Data integrity | | |
5 — Head / meta | | |
6 — Performance | | |
7 — Accessibility | | |
8 — Security | | |
9 — Subscriptions | | |
10 — Pre-deploy gate | | |
11 — Day-1 monitoring | | |
