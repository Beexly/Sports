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
│                    WORKER LAYER                                 │
│  BullMQ + Redis                                                 │
│  data-refresh (cron) │ pick-generation │ content-publishing     │
│  Alerting │ Logging │ Retry with backoff                        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Ingestion Pipeline
1. Cron job triggers every 30 min
2. The Odds API adapter fetches live odds for configured sports/markets
3. Normalizer maps raw data → internal schema
4. Freshness validator rejects stale data (>1hr old)
5. Upsert games + odds to PostgreSQL
6. Emit `data.refreshed` event

### Pick Generation Pipeline
1. `data.refreshed` event triggers pick generator
2. Prediction engine runs scoring algorithm on new odds
3. Assigns confidence score (0–100) per pick
4. Ranks picks by confidence
5. Tags each pick as FREE or PREMIUM based on confidence threshold
6. Stores picks with version + model metadata
7. Emits `picks.generated` event

### Content Pipeline
1. `picks.generated` event triggers content worker
2. Claude API generates data-backed blog content (NOT pick source)
3. Content stored as BlogPost with SEO metadata
4. Free preview generated for all posts
5. Full content gated by subscription

### Request Flow (API)
1. Request hits Next.js middleware
2. Auth check (NextAuth session)
3. Entitlement check (subscription tier)
4. Paywall enforcement (server-side, NEVER client-side)
5. Data returned with appropriate tier filtering

## Scalability Notes

- Database reads are the primary bottleneck — add read replicas when traffic grows
- Redis caching layer for picks (TTL = 15 min)
- BullMQ workers are horizontally scalable
- The Odds API rate limits: respect per-plan limits, cache aggressively
- CDN for static assets and public blog content

## Security Model

- All secrets in environment variables only
- Paywall enforced in API route middleware, not client
- Stripe webhooks verified with HMAC signature
- SQL injection prevented by Prisma parameterized queries
- XSS prevented by React's escaping + CSP headers
- CSRF protected by NextAuth built-in tokens
