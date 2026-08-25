# Sports Prediction Platform — CLAUDE.md

## System Overview

A production-grade sports picks platform with real data ingestion, AI-assisted prediction ranking, subscription paywalls, content generation, and automated job scheduling.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router), TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js)
- **Payments**: Stripe (subscriptions + webhooks)
- **Sports Data**: The Odds API (real odds/lines data)
- **AI Layer**: Claude API (content generation only — not source of truth)
- **Scheduling**: Vercel Cron — 21 jobs declared in `apps/web/vercel.json`, each hitting an
  `/api/cron/*` route. `.github/workflows/external-cron.yml` is a higher-cadence backstop; that
  file records **Vercel-only** as the production scheduler source of truth until private-repo
  Actions minutes are restored, so it may sit idle by design. The long-running
  `workers/data-refresh` container schedules its own cycles with `setTimeout`
  (`workers/data-refresh/src/index.ts`), re-arming only after the previous cycle settles.
- **Testing**: Vitest + Testing Library
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

**Not in the stack** — both of these were claimed here for a long time and neither was ever
true. Do not re-add them to the list above without installing them first:

- **No job queue.** `bullmq` is a dependency of no `package.json` and is imported by nothing.
  BullMQ/Redis appear only in code comments, design docs, and the optional self-hosted
  `docker/oracle-vps/` stack — aspiration, not running code. Do not describe the platform as
  queue-backed.
- **No `supertest`.** It is a dependency of no `package.json` and appears in no source file.
  API routes are tested by importing and invoking their handlers directly under Vitest.

## Repository Structure

```
apps/web/           — Next.js app (frontend + API routes)
packages/db/        — Prisma schema, migrations, client
packages/prediction-engine/ — Core prediction scoring logic
packages/data-ingestion/    — API adapters (The Odds API, etc.)
packages/types/             — Shared TypeScript types
workers/            — Background jobs (data refresh, picks, content)
docs/               — Architecture and ops documentation
docker/             — Docker configs
.github/workflows/  — CI/CD pipelines
```

## Non-Negotiable Rules

1. **No fake data** — all picks sourced from real API data
2. **No fabricated stats** — content is data-backed only
3. **No frontend-only paywalls** — enforcement is server-side only
4. **No secrets in code** — all keys via environment variables
5. **No stale data** — always validate timestamps and freshness
6. **Tests required** — no feature is complete without passing tests
7. **Types required** — TypeScript strict mode, no `any`

## Subagent Domains

| Agent | Responsibility |
|---|---|
| data-ingestion-agent | API adapters, normalization, ingestion jobs |
| prediction-engine-agent | Scoring, confidence, ranking, versioning |
| subscriptions-billing-agent | Stripe, webhooks, entitlements |
| content-publishing-agent | Blog generation, SEO, publishing pipeline |
| frontend-app-agent | UI pages, components, UX |
| testing-qa-agent | Test coverage, QA, regression prevention |

## Prediction Engine Rules

- Structured odds/line data is source of truth
- Confidence scores: 0–100 (calibrated against historical results)
- Each pick must include: sport, game, pick type, line, confidence, tier (free/premium), generated_at, model_version
- All picks versioned and auditable

## Subscription Tiers

Pricing follows a **named, proof-gated ladder** (single source of truth:
`apps/web/lib/pricing/pricing-phases.ts`). Founding rates are live; each step-up is
triggered by a verified milestone and ships added value. Founding members are
grandfathered for life (mechanism: the comma-separated Stripe price-id lists — see the env
section below). Background: `docs/ops/archive/root-museum/COMPETITIVE_PRICING_AND_PACKAGING.md`
— **archived**; `docs/ops/CANONICAL.md` marks `docs/ops/archive/**` "Archaeology only", so read
it for history and treat `pricing-phases.ts` as the source of truth.

| Tier | Founding rate (live) | Access |
|---|---|---|
| Free | $0 | 2 picks/day teaser, no confidence scores; public Edge Index + calibration/track record |
| Pro | $14.99/mo · $99/yr | Full board (all picks), confidence scores, factor trail, line movement, Trend Lab + Parlay MRI, 7 sports |
| Elite | $24.99/mo · $179/yr | All Pro + graded-pick email & push alerts + CLV/line-value ledger |

(Fantasy tier — $4.99/mo · $49/yr — unlocks the fantasy suite; on the betting picks it sees the same free teaser, not the full board.)

**Elite alerts are NOT real-time — never describe them that way.** The only live alert path is
settlement-graded watchlist alerts: the hourly `settle-picks` cron drains the outbox inline plus
a 3-hourly `deliver-settlement-alerts` sweep, so worst-case latency is hours. There are no
new-pick, line-move, or pregame alerts. Commit `ff4626fec` (PR #587) removed "real-time" from
eight customer surfaces for exactly this reason; live copy says alerts fire "when a followed pick
grades" (`apps/web/lib/pricing/value-architecture.ts`, `apps/web/app/pricing/page.tsx`).

Ladder (named ahead of time): FOUNDING → PROVEN (≥100 settled + published calibration)
→ ESTABLISHED (≥500 settled + verified CLV ≥52.4%) → AUTHORITY (multi-season ROI).

## Environment Variables Required

```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
# Must be the exact live canonical host WITH www: https://www.galaxysportsedge.com
# (identical to NEXT_PUBLIC_APP_URL). See canonical-host note below.
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# Per-interval price IDs are what checkout reads. The monthly vars fall back to
# the legacy STRIPE_PRO_PRICE_ID / STRIPE_ELITE_PRICE_ID when unset.
#
# EACH STRIPE_*_PRICE_ID MAY HOLD A COMMA-SEPARATED LIST — and that list IS the
# grandfathering mechanism (apps/web/lib/billing/price-ids.ts):
#   - checkout charges the FIRST entry only (`currentPriceId`)
#   - ALL entries are recognized when classifying an existing subscription's
#     price id back to a tier (`tierForPriceId` → `allTierPriceIds`)
# Stripe Price objects are immutable, so advancing a pricing phase means creating
# a NEW price. Existing members keep their ORIGINAL price id forever.
# RULE: PREPEND the new id, NEVER replace the list.
#   STRIPE_PRO_MONTHLY_PRICE_ID=price_NEW,price_OLD,price_OLDER
# Dropping an old id makes a grandfathered member's renewal classify as FREE —
# a silent downgrade of the exact members we promised a lifetime rate to.
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ELITE_MONTHLY_PRICE_ID=
STRIPE_ELITE_ANNUAL_PRICE_ID=
STRIPE_FANTASY_MONTHLY_PRICE_ID=
STRIPE_FANTASY_ANNUAL_PRICE_ID=
# Point-of-sale Terms consent at Stripe Checkout. DEFAULT OFF. Order matters:
# set the Stripe Dashboard Terms-of-Service URL FIRST, THEN flip this to "true"
# (otherwise Stripe rejects every Checkout Session and new subscriptions 500).
# Unset/"false" = checkout omits consent_collection and behaves exactly as before.
STRIPE_TERMS_CONSENT_ENABLED=
THE_ODDS_API_KEY=
ANTHROPIC_API_KEY=
# Cron authorization. Genuinely required: apps/web/lib/cron/authorize.ts reads
# CRON_SECRET (and the optional CRON_SECRET_PREVIOUS); when NEITHER is set,
# authorizeCronSecret returns code "cron_secret_unset" and every /api/cron/*
# route answers HTTP 500 {"error":"CRON_SECRET not configured"} — i.e. the whole
# scheduler fails closed. Must match the Bearer token the caller sends.
CRON_SECRET=
# Canonical public base URL. The single source of truth is
# apps/web/lib/seo/site-url.ts, which resolves to NEXT_PUBLIC_APP_URL when set,
# else defaults to the WWW host https://www.galaxysportsedge.com (never the apex).
NEXT_PUBLIC_APP_URL=
```

### Optional / not required by the application

- **`CRON_SECRET_PREVIOUS`** — optional rotation twin for `CRON_SECRET`. When set, *either*
  secret authorizes (timing-safe on each), so a secret rotation can overlap without a window of
  401s. `packages/util/src/safe-equal.ts` → `authorizeCronSecret`. Unset is fine.
- **`REDIS_URL`** — **not required.** No application code reads it. Its only consumers are
  `docker/oracle-vps/compose.yml` (the optional self-hosted worker stack) and an opt-in
  reachability probe in `scripts/check-deploy-readiness.mjs`, which early-returns when the var
  is unset. Setting it on Vercel changes no behavior. It was listed as required here because of
  the (false) "BullMQ + Redis" queue claim in the Tech Stack. Note that
  `scripts/check-deploy-readiness.mjs` still carries `REDIS_URL` in its `REQUIRED` array and
  hard-fails without it — that array is stale for the same reason, and is tracked as follow-up
  work rather than silently loosened here.
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** — also read by zero code. Checkout is a server-side
  redirect to a Stripe-hosted Checkout Session; there is no `loadStripe` / `@stripe/stripe-js`
  client integration. It appears only in `.env*.example` and the `REQUIRED` array of
  `scripts/check-deploy-readiness.mjs`. Set it to keep that script green; nothing else reads it.

### Canonical host (single source of truth)

The one canonical base URL lives in `apps/web/lib/seo/site-url.ts` (`SITE_URL`):
`NEXT_PUBLIC_APP_URL` when set, else `https://www.galaxysportsedge.com` (the **www**
host — never the apex). All absolute-URL construction — `metadataBase`, `sitemap.ts`,
`robots.ts`, canonical tags, JSON-LD, RSS, bot-post links — resolves off it.

**OPERATOR (owner's env/console step — not code):**

- Set `NEXT_PUBLIC_APP_URL=https://www.galaxysportsedge.com` in the deploy env.
- Set `NEXTAUTH_URL=https://www.galaxysportsedge.com` (identical host).
- In the Google Cloud Console OAuth client, add
  `https://www.galaxysportsedge.com/api/auth/callback/google` to the Authorized
  redirect URIs.

The apex (`https://galaxysportsedge.com`) should redirect to www at the DNS/platform
layer (not in app code).

## Development Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run test         # run all tests
npm run test:watch   # watch mode
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:generate  # prisma generate
npm run db:push      # push schema to DB
npm run db:migrate   # run migrations
npm run db:seed      # seed data
```

## Legal Scraping Posture

**Scraping is rights-gated, not banned.**

Every extraction job MUST pass through the Scraping Clearance Engine (`apps/web/lib/scraping/clearance-engine.ts`) before running. A `ClearanceResult` with `allowed=false` MUST stop the job. Every extracted record MUST carry a `RightsSnapshot` captured at extraction time.

### Do not build evasion

- No CAPTCHA bypass, login bypass, or paywall bypass
- No fake accounts or credential misuse
- No proxy rotation to circumvent IP blocks or access controls
- No scraping of paths disallowed by source policy unless legal counsel approves
- No automated access after receiving a cease-and-desist without legal review
- Evasion tools must NOT be added to the Tool Registry

### Source rights classification

All sources live in `apps/web/lib/scraping/source-rights-registry.ts`. Statuses:

| Status | Meaning |
|---|---|
| `approved_public_logged_off` | Public access, facts only, no login, no contract |
| `approved_api` | Licensed API with explicit commercial terms |
| `approved_open_license` | CC0/CC-BY/CC-BY-SA/Apache/MIT open dataset |
| `approved_written_permission` | Written contract or explicit permission received |
| `vendor_candidate` | Commercial provider — evaluate via questionnaire |
| `manual_research_only` | Human UX/taxonomy review only |
| `permission_required` | Terms prohibit automation without consent |
| `blocked_technical_controls` | Anti-bot/CAPTCHA/IP-block active |
| `excluded` | No safe path; permanently excluded |

**scores24.live** → `permission_required`. Manual UX research is allowed. Automation requires written consent from Kiito OÜ (support@scores24.live).
**score24.com** → `vendor_candidate`. Complete vendor questionnaire before any ingestion.
**siriusxm-activator** → `excluded`. Circumvents paid access. No path to approval.

### What may be extracted

Facts (scores, standings, fixtures), timestamps, URLs, metadata, derived signals we generate, source references. See `apps/web/lib/scraping/data-rules.ts`.

**Never extract**: article bodies for republication, proprietary predictions, protected graphics/charts/logos, site copy, personal data without privacy review, account-gated content.

### Key invariants

- `checkClearance()` must be called before every extraction job — **this remains the rule; the
  gaps below are defects to close, not precedents to copy**
- `wrapExtractedRecord()` enforces the envelope — throws if clearance not granted
- Rights snapshots are point-in-time captures; do not mutate them
- Attribution text from the registry must propagate to all derived outputs

### Known clearance gaps (rule stands; coverage does not yet match it)

The invariant above is the rule, but it is **not currently true of every fetch site**. Stating
this openly so no agent reads "must be called before every extraction job" as a description of
the code and assumes a path is already gated.

`handoff/CLEARANCE_COVERAGE_AUDIT.md` (2026-08-15) audited all 17 registered `source_id`s and
recorded these open findings:

| Finding | Source | Gap |
|---|---|---|
| GSE-SEC-077 | `the-odds-api` | `packages/ingestion-pipeline/src/process-sport.ts`, `.../settle-sport.ts`, and `packages/data-ingestion/src/odds-provider-adapter.ts` fetch with no `checkClearance` |
| GSE-SEC-076 | `open-meteo` | `fetchWeatherFreeFirst` fetches without `checkClearance` |
| GSE-SEC-078 | `espn-public-api` | `multi-source-scores.ts` fetch sites bypass the gate `free-first-ingest.ts` has |
| GSE-SEC-079 | `sleeper-api` | uses `assertIngestible` (registration gate) rather than a runtime `checkClearance` |
| GSE-SEC-080 | `fpl-api` | adapter fetches ungated (no production caller today) |

**`paidCallJustified()` is not a clearance check.** In `process-sport.ts` / `settle-sport.ts` the
only guard before The Odds API call is `paidCallJustified()` — a **spend** guard (GSE-SEC-039)
that answers "is a paid source the only cleared option for this need?". It does not consult
`source-rights-registry.ts`, produce a `ClearanceResult`, or emit a `RightsSnapshot`. Do not
treat its presence as satisfying the invariant.

**Why it is structurally unenforceable there:** `checkClearance()` lives at
`apps/web/lib/scraping/clearance-engine.ts` and is reached via the `@/*` path alias, which is
defined **only** in `apps/web/tsconfig.json` (mapping to `apps/web/*`). `packages/*` extend
`tsconfig.base.json`, which declares no `paths`, so no `packages/*` module can import
`@/lib/scraping` — and none does. Closing GSE-SEC-077 therefore requires an architectural move
(extract the clearance engine into a shared package, or inject a clearance callback at the
pipeline boundary), not a one-line import. Until then the gap is real and must stay visible.

## Autonomous Loop Protocol

Each cycle must:
1. Analyze current state
2. Identify highest-leverage gap
3. Implement with real code
4. Run tests + typecheck + lint
5. Fix failures before moving on
6. Document what changed
7. Self-audit remaining gaps

A task is NOT complete until: tests pass, types pass, build succeeds.

## Agent skills (process capital)

See `docs/agent-skills/README.md` and `docs/ops/OPERATOR.md`.
Run `npm run agent:eval` for thin harness.
