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
- **Queue**: BullMQ + Redis
- **Testing**: Vitest + Testing Library + Supertest
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

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

| Tier | Access |
|---|---|
| Free | 1 pick/day, no confidence scores |
| Pro ($19/mo) | All picks, confidence scores, line movement |
| Elite ($49/mo) | All Pro + early access, analytics, alerts |

## Environment Variables Required

```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_ELITE_PRICE_ID=
THE_ODDS_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=
```

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
