@AGENTS.md

# Galaxy Sports Edge (GSE) — CLAUDE.md

## System Overview

A production-grade sports picks platform with real data ingestion, deterministic factor-model prediction ranking, subscription paywalls, content generation, and automated job scheduling. Positioning: **We're not AI. We're math you can read.** (rule 8 below; `docs/positioning.md`).

## Tech Stack

- **Hosting**: Vercel (production; merge-to-main auto-deploys; the build runs `scripts/deploy/migrate-if-configured.mjs` fail-closed and `scripts/vercel-skip-build.mjs` as `ignoreCommand`) + Neon (PostgreSQL)
- **Framework**: Next.js 14.2 (App Router only — no `pages/`) + TypeScript 5.9 (strict)
- **ORM**: Prisma 5.22 (`packages/db/prisma`; migrations are the source of truth — see `.claude/rules/prisma.md`)
- **Auth**: NextAuth.js v5 (Auth.js, beta)
- **Payments**: Stripe (subscriptions + webhooks; live keys in production since 2026-07-09)
- **Sports data**: free-first multi-source spine in `apps/web/lib/data-sources/*` (ESPN public, CFB, multi-source scores); The Odds API is optional (`oddsApiRequired: false`)
- **Claude API**: content generation only — never the source of truth for picks
- **Cache**: Redis via `ioredis`, used for the Claude response cache only (there is no job-queue library)
- **Background jobs**: Vercel Cron (`vercel.json`, 21 schedules → `apps/web/app/api/cron/*`)
- **Testing**: Vitest + Testing Library
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`; the `guardrails` job runs `scripts/guardrails/run-all.mjs`)

## Repository Structure

Workspaces: `apps/*`, `packages/*`, `workers/*` (23 packages). Hot paths first:

```
apps/web/                     — Next.js app: app/ (pages, API routes, cockpit, api/cron/*), components/, lib/
  apps/web/lib/entitlements.ts, lib/api-entitlement.ts   — server-side paywall (rule 3; .claude/rules/api-gating.md)
  apps/web/lib/pricing/pricing-phases.ts                 — pricing ladder single source of truth
  apps/web/lib/scraping/*                                — clearance engine + rights registry (.claude/rules/scraping.md)
  apps/web/lib/compliance-scanner/, lib/positioning-vocab.json — brand/positioning lint (rule 8)
  apps/web/lib/data-sources/*                            — free-first multi-source ingestion spine
  apps/web/lib/claude-api/*                              — Claude API router, numeric guard, response cache
  apps/web/lib/api/no-store.ts                           — jsonNoStore helper (rule 5; .claude/rules/nextjs-caching.md)
packages/db/                  — Prisma schema, migrations (source of truth; one idempotent baseline since 2026-09-02, pre-baseline SQL in prisma/migrations-archive/), client
packages/prediction-engine/   — Deterministic scoring, confidence, ranking; MODEL_VERSION frozen by scripts/guardrails/model-freeze.mjs
packages/data-ingestion/      — Source adapters and normalization
packages/ingestion-pipeline/  — Ingestion orchestration
packages/feature-store/       — Derived features for the engine
packages/stats-api/           — Stats API surface
packages/types/, packages/util/ — Shared types and utilities
packages/compliance/          — Compliance control library, evidence, export pack
packages/ai-council/          — AI-council checks (npm run guard:ai-council)
packages/crypto/              — Receipt/commitment primitives (see scripts/guardrails/pedersen-opener-boundary.mjs)
packages/{epistemic-twin,genesis-kernel,governed,ops,partner-stack,phase-c,quote-plane}/
                              — Read the package README before touching; several have no importers yet
workers/{data-refresh,pick-generation,content-publishing,airwave-listener}/
                              — Background jobs driven by Vercel Cron routes (no queue library); content-publishing is draft-only and hard-gated
scripts/guardrails/           — 26 CI guard scripts + agent-bash-guard.mjs (PreToolUse hook); run-all.mjs runs the suite
scripts/deploy/, scripts/ops/ — Vercel migrate gate, launch preflight, ledger checks
docs/ops/, docs/positioning.md — Runbooks, brand positioning (domain skills live in .claude/skills/, see below)
.claude/                      — commands/, rules/, agents/, skills/, settings.json (frozen by AGENTS.md law 2)
.github/workflows/            — ci.yml (12 jobs), daily-smoke.yml, external-watchdog.yml
```

## Non-Negotiable Rules

1. **No fake data** — all picks sourced from real API data
2. **No fabricated stats** — content is data-backed only
3. **No frontend-only paywalls** — enforcement is server-side only
4. **No secrets in code** — all keys via environment variables
5. **No stale data** — always validate timestamps and freshness
6. **Tests required** — no feature is complete without passing tests
7. **Types required** — TypeScript strict mode, no `any`
8. **Brand positioning** — We're not AI. We're math you can read. Copy, docs, and code describe the engine as deterministic statistical modeling (factor model, deterministic scoring, factor breakdown). Never frame the engine as AI. The canonical banned-phrase list is `docs/positioning.md` § "What Not To Say"; the machine-readable copy is `apps/web/lib/positioning-vocab.json`, enforced at runtime by `apps/web/lib/compliance-scanner/rules.ts` and in CI by `scripts/guardrails/trust-gate.mjs` plus `npm run lint:brand`. A violation is a blocking lint failure, not a style note.

## Subagent Domains

Defined in `.claude/agents/<name>.md` (tool-scoped; invoke via the Agent tool by name).

| Agent | Responsibility |
|---|---|
| data-ingestion-agent | API adapters, normalization, ingestion jobs |
| prediction-engine-agent | Scoring, confidence, ranking, versioning |
| subscriptions-billing-agent | Stripe, webhooks, entitlements |
| content-publishing-agent | Blog generation, SEO, publishing pipeline (draft-only) |
| frontend-app-agent | UI pages, components, UX |
| testing-qa-agent | Test coverage, QA, regression prevention |
| auditor | Read-only audits (used by the `/audit*` commands) |

## Prediction Engine Rules

- Structured odds/line data is source of truth
- Confidence scores: 0–100 (calibrated against historical results)
- Each pick must include: sport, game, pick type, line, confidence, tier (free/premium), generated_at, model_version
- All picks versioned and auditable

## Subscription Tiers

Pricing follows a **named, proof-gated ladder** (single source of truth:
`apps/web/lib/pricing/pricing-phases.ts`). Founding rates are live; each step-up is
triggered by a verified milestone and ships added value. Founding members are
grandfathered for life. See `docs/ops/archive/root-museum/COMPETITIVE_PRICING_AND_PACKAGING.md` (archived).

| Tier | Founding rate (live) | Access |
|---|---|---|
| Free | $0 | 2 picks/day teaser, no confidence scores; public Edge Index + calibration/track record |
| Pro | $14.99/mo · $99/yr | Full board (all picks), confidence scores, factor trail, line movement, Trend Lab + Parlay MRI, 7 sports |
| Elite | $24.99/mo · $179/yr | All Pro + real-time email & push alerts + CLV/line-value ledger |

(Fantasy tier — $4.99/mo · $49/yr — unlocks the fantasy suite; on the betting picks it sees the same free teaser, not the full board.)

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
REDIS_URL=
# Canonical public base URL. The single source of truth is
# apps/web/lib/seo/site-url.ts, which resolves to NEXT_PUBLIC_APP_URL when set,
# else defaults to the WWW host https://www.galaxysportsedge.com (never the apex).
NEXT_PUBLIC_APP_URL=
```

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

**Scraping is rights-gated, not banned.** Every extraction job passes `checkClearance()` (`apps/web/lib/scraping/clearance-engine.ts`) first; `wrapExtractedRecord()` enforces the rights envelope; no evasion tooling, ever. The full posture (source-rights statuses, what may be extracted, key invariants) is the path-scoped rule `.claude/rules/scraping.md`, loaded automatically when you touch `apps/web/lib/scraping/**` or the ingestion packages.

## Operating loop

Unattended runs follow **AGENTS.md → THE LOOP** (imported above): claim one ledger row, do exactly that task, run the verify block, mark it DONE with the real SHA. Interactive sessions use the same completion bar. Work selection for unattended runs comes from the ledger, not from "highest-leverage gap" judgment.

A task is NOT complete until: tests pass, types pass, build succeeds, and `npm run guardrails` is green.

## Agent skills (process capital)

Domain runbooks live in `.claude/skills/<name>/SKILL.md` (canonical, indexed by `.claude/skills/README.md`) so Claude Code loads them directly. Path-scoped rules live in `.claude/rules/`. Operator console steps: `docs/ops/OPERATOR.md`; operator-only remediation items: `docs/ops/OPERATOR_TASKS.md`. Run `npm run agent:eval` for the thin harness.

Per-developer overrides go in `CLAUDE.local.md` and `.claude/settings.local.json` (both gitignored); the shared files are frozen by AGENTS.md law 2.
