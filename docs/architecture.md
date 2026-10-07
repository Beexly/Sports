# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Next.js App Router (SSR + RSC)                                │
│  Public Pages │ Auth Pages │ Dashboard │ Admin                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                         API LAYER                               │
│  Next.js API Routes + Middleware                                │
│  Auth Enforcement │ Entitlement Check │ Rate Limiting           │
└──────────┬────────────────────────────────────┬─────────────────┘
           │                                    │
┌──────────▼──────────┐              ┌──────────▼──────────────┐
│   PREDICTION ENGINE  │              │   SUBSCRIPTION SERVICE  │
│   Scoring System     │              │   Stripe Integration    │
│   Confidence Rank    │              │   Webhook Handler       │
│   Pick Generation    │              │   Entitlement Store     │
│   Audit Trail        │              │   Lifecycle Events      │
└──────────┬──────────┘              └─────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  PostgreSQL (via Prisma)                                        │
│  Users │ Subscriptions │ Games │ Odds │ Picks │ Performance     │
│  Teams │ Leagues │ Sports │ BlogPosts │ AuditLogs               │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                    INGESTION LAYER                              │
│  The Odds API Adapter                                           │
│  Odds Normalization │ Game Normalization │ Freshness Validation │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                   SCHEDULING LAYER                              │
│  Vercel Cron → /api/cron/* routes (schedules in                 │
│  apps/web/vercel.json; live table in                            │
│  docs/ops/CRON_MATRIX.generated.md)                             │
│  GitHub Actions external-cron.yml = backstop for some jobs      │
│  Each route runs its pipeline in-process and returns            │
└─────────────────────────────────────────────────────────────────┘
```

**There is no job queue and no broker.** Nothing in the tree brokers work between
processes: the scheduler invokes an HTTP route, the route runs the pipeline
synchronously and returns. The `workers/` directory holds optional long-running
containers that re-arm themselves with `setTimeout` after each cycle settles
(`workers/data-refresh/src/index.ts`); they are not deployed by
`docker/docker-compose.yml` and production does not depend on them. Do not add a
queue, a broker, or a message bus to this diagram before one is actually
installed and on the live path.

## Data Flow

The stages below run **synchronously inside one cron invocation**, in call order —
they are not decoupled by events. There is no event bus, no pub/sub, and no
`data.refreshed` / `picks.generated` publisher anywhere in the tree; the arrows
here are function calls.

### Ingestion Pipeline
1. Vercel Cron hits `/api/cron/refresh-odds` on the schedule declared in
   `apps/web/vercel.json` — read the cadence from
   `docs/ops/CRON_MATRIX.generated.md`, never from this line
2. The Odds API adapter fetches live odds for configured sports/markets
3. Normalizer maps raw data → internal schema
4. Freshness validator drops games whose bookmaker `last_update` is older than
   `FRESHNESS_THRESHOLD_MS` (`packages/data-ingestion/src/config.ts` — default 4h,
   overridable via `ODDS_FRESHNESS_MAX_HOURS`); if every game is stale the whole
   run is rejected and no picks are generated
5. Upsert games + odds to PostgreSQL

### Pick Generation Pipeline
Same invocation: `refreshOdds()` calls `processSport()`
(`@sports/ingestion-pipeline`), which is the one code path shared by the cron
route, the admin trigger, and the optional worker container.

1. Prediction engine runs scoring algorithm on new odds
2. Assigns confidence score (0–100) per pick
3. Ranks picks by confidence
4. Tags each pick as FREE or PREMIUM
5. Stores picks with version + model metadata

### Content Pipeline
Separate scheduled job (`/api/cron/generate-drafts`), not a downstream subscriber.

1. Claude API generates data-backed content (NOT pick source)
2. Persisted as a `ContentDraft` row with `status=DRAFT` and `publishedAt=null`
3. No auto-publish path: publishing is a human action through the cockpit review
   flow, and `scripts/guardrails/draft-only.mjs` enforces that in CI

### Request Flow (API)
1. Request hits Next.js middleware
2. Auth check (NextAuth session)
3. Entitlement check (subscription tier)
4. Paywall enforcement (server-side, NEVER client-side)
5. Data returned with appropriate tier filtering

## Scalability Notes

Aspirational unless marked otherwise — none of the horizontal-scaling machinery
below is installed today.

- Database reads are the primary bottleneck — add read replicas when traffic grows
  *(not provisioned)*
- **No cache tier is deployed.** There is no cache server for picks or anything
  else. `apps/web/lib/claude-api/response-cache.ts` is deliberately store-agnostic
  and takes an injected client, so wiring one in later is a config change, not a
  rewrite — but nothing injects one on the live path
- Scheduled work scales with the serverless function, not with worker replicas —
  the cron routes are the execution units, and the schedule in
  `apps/web/vercel.json` is the only concurrency knob
- The Odds API rate limits: respect per-plan limits, cache aggressively *(live —
  see `packages/data-ingestion/src/odds-api-circuit-breaker.ts`)*
- CDN for static assets and public content

## Security Model

- All secrets in environment variables only
- Paywall enforced in API route middleware, not client
- Stripe webhooks verified with HMAC signature
- SQL injection prevented by Prisma parameterized queries
- XSS prevented by React's escaping + CSP headers
- CSRF protected by NextAuth built-in tokens
