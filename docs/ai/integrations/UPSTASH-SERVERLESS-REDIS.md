# Upstash: Serverless Redis + Durable Job Queue for Vercel Edge

> Source: `upstash/upstash-redis` + `upstash/qstash-js` (MIT, Apache-2.0)
> Purpose: HTTP-based Redis and durable background jobs that work in Vercel Edge Functions — fills the gap where BullMQ (TCP Redis) can't run

## What This Solves

GSN uses BullMQ + Redis for pick generation jobs. This works great in the separate worker process (`workers/pick-generation`). But when GSN logic runs in Vercel Edge Functions or Next.js API routes:

- **TCP connections to Redis are not supported** in Vercel Edge runtime
- Rate limiting in middleware (`middleware.ts`) can't use `ioredis`
- Response caching in API routes can't use Redis directly

Upstash provides two HTTP-based services that solve this:

1. **Upstash Redis** — Redis-compatible API over HTTPS, works in Edge + serverless. Zero persistent connections. Per-request billing.
2. **Upstash QStash** — Durable HTTP job queue. Send an HTTP request to be delivered later (with retries, scheduling, deduplication). Replaces BullMQ for jobs that don't need the separate worker process.

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| BullMQ + Redis | Long-running worker jobs in the `workers/` process (TCP Redis, fine there) |
| Trigger.dev | Cron scheduling for periodic pick ingestion |
| n8n | No-code automation routing |
| **Upstash Redis** | **Edge-compatible rate limiting, caching, session storage (HTTP Redis)** |
| **Upstash QStash** | **Durable HTTP job queue for Next.js API routes (no separate worker needed)** |

BullMQ and Upstash are NOT competing — BullMQ stays for the worker process, Upstash fills the Edge gap.

## Installation

```bash
npm install @upstash/redis @upstash/ratelimit @upstash/qstash --workspace=apps/web
```

## GSN Use Case 1: Rate Limiting in Middleware (Edge-Compatible)

Current middleware can't enforce rate limits because ioredis won't work in Edge. Upstash Redis does:

**`apps/web/middleware.ts`** (extend existing middleware):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),  // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(100, "1 m"),  // 100 requests per minute
  analytics: true,  // Track in Upstash dashboard
});

// Apply to pick API routes only (not static assets)
export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/picks")) {
    return NextResponse.next();
  }

  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
```

## GSN Use Case 2: API Response Caching

Cache expensive odds API responses in Edge-compatible Redis:

```typescript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getOddsWithCache(sport: string): Promise<OddsData> {
  const cacheKey = `odds:${sport}:${new Date().toISOString().slice(0, 13)}`; // hourly key

  // Try cache first
  const cached = await redis.get<OddsData>(cacheKey);
  if (cached) return cached;

  // Fetch fresh
  const odds = await fetchFromOddsAPI(sport);

  // Cache for 55 minutes (fresh before the next hourly key)
  await redis.setex(cacheKey, 55 * 60, odds);

  return odds;
}
```

This works in Vercel serverless functions AND Edge Functions — unlike ioredis.

## GSN Use Case 3: QStash — Durable Pick Generation from API Routes

BullMQ requires a separate TCP connection and a persistent worker process. QStash lets you trigger pick generation directly from a Next.js API route without managing a worker:

**`apps/web/src/app/api/picks/generate/route.ts`**:

```typescript
import { Client } from "@upstash/qstash";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/require-admin";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { gameId } = await req.json();

  // Enqueue a durable job — QStash will deliver this to our worker endpoint
  // with automatic retries (up to 3x by default), deduplication, and scheduling
  const message = await qstash.publishJSON({
    url: `${process.env.NEXTAUTH_URL}/api/internal/pick-worker`,
    body: { gameId },
    retries: 3,
    delay: 0,
    deduplicationId: `pick:${gameId}:${Date.now()}`,
  });

  return Response.json({ messageId: message.messageId, queued: true });
}
```

**The worker endpoint** (receives QStash delivery):

```typescript
// apps/web/src/app/api/internal/pick-worker/route.ts
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generatePick } from "@sports/ai/pick-generation";

export const POST = verifySignatureAppRouter(async (req: Request) => {
  const { gameId } = await req.json();
  const pick = await generatePick(gameId);
  return Response.json({ pickId: pick.id });
});
```

QStash verifies the request signature so only QStash (not arbitrary callers) can invoke the worker.

## GSN Use Case 4: Deduplication for Ingestion Jobs

When the odds API fires a webhook for the same game twice, QStash deduplication prevents duplicate ingestion:

```typescript
await qstash.publishJSON({
  url: `${process.env.NEXTAUTH_URL}/api/internal/ingest`,
  body: { sport, gameId },
  deduplicationId: `ingest:${sport}:${gameId}`,  // Same ID = same job, deduplicated
  notBefore: Date.now() + 5 * 60 * 1000,         // 5 minute delay for webhook dedup window
});
```

Any identical `deduplicationId` within the window is silently dropped.

## Upstash Dashboard

- **Redis**: Visualize all keys, TTLs, memory usage
- **QStash**: Inspect queued messages, retry history, delivery logs
- Both have free tiers suitable for GSN volume

## Environment Variables

```bash
# Upstash Redis (from dashboard → Redis → Connect → REST API)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Upstash QStash (from dashboard → QStash)
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...

# Add to Vercel env vars (all are server-only — never expose to browser)
```

## When to Use BullMQ vs QStash

| Scenario | Use |
|---|---|
| Separate worker process, TCP Redis available | BullMQ (workers/pick-generation) |
| Job triggered from Next.js API route | QStash |
| Rate limiting in middleware (Edge) | Upstash Redis + Ratelimit |
| Session/cache in Edge Functions | Upstash Redis |
| Cron-triggered ingestion | Trigger.dev → QStash → worker |

## What This Does NOT Cover

- Worker process job queue (persistent TCP connection) → BullMQ
- Cron scheduling → Trigger.dev (`TRIGGER-DEV.md`)
- Full distributed traces → OpenTelemetry (`OPENTELEMETRY-TRACING.md`)

## Status

- [ ] Create Upstash account at upstash.com — free tier (10k commands/day Redis, 500 messages/day QStash)
- [ ] `npm install @upstash/redis @upstash/ratelimit @upstash/qstash --workspace=apps/web`
- [ ] Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` to Vercel env
- [ ] Add rate limiting to `middleware.ts` for `/api/picks` (100 req/min per IP)
- [ ] Add odds API response caching in `getOddsWithCache()` (55-min TTL)
- [ ] Add QStash token + signing keys to Vercel env
- [ ] Wire one pick generation trigger through QStash as proof-of-concept
- [ ] Verify: QStash delivers to `/api/internal/pick-worker` with signature verification
