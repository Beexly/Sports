# Sentry: Production Error Tracking for Next.js + BullMQ Workers

> Source: `getsentry/sentry-javascript` (MIT, 30k★)
> Purpose: Zero-blind-spot error visibility across HTTP, background jobs, and AI generation pipelines

## What This Solves

GSN currently has no structured error aggregation. Errors either:
- Disappear silently in BullMQ worker processes
- Surface as vague 500s in Vercel logs with no context
- Show in AgentOps AI sessions only — not the HTTP or database layer
- Are discovered by users before the team

Sentry fills the gap:
- **Every unhandled error** captured with full stack trace, user context, request metadata
- **BullMQ worker errors** — failed jobs, retries, and dead-letter queue events
- **Pick generation failures** — Claude API timeouts, Odds API 429s, schema validation errors
- **Performance** — which route is slow, which database query is the bottleneck
- **Release tracking** — did this deploy introduce new errors?

**Critical distinction**: AgentOps = AI session telemetry. Sentry = production error aggregation.
They are complementary, not duplicates. Neither covers what the other does.

## Installation

```bash
# Install Sentry Next.js SDK
npm install @sentry/nextjs --workspace=apps/web

# Or with automatic setup wizard (recommended for first install)
npx @sentry/wizard@latest -i nextjs --workspace=apps/web
```

## Configuration

### `apps/web/sentry.client.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Capture 10% of sessions for performance monitoring (free tier friendly)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay for UI bug reproduction — 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask PII in session replays
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
});
```

### `apps/web/sentry.server.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Higher server-side sample rate — server errors are more critical
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  integrations: [
    // Automatic Prisma query tracing — see which queries are slow
    Sentry.prismaIntegration(),
  ],
});
```

### `apps/web/sentry.edge.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### `apps/web/next.config.ts` (wrap with Sentry)

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // ... existing config
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true, // Wire Vercel cron monitors automatically
});
```

## GSN Use Case 1: BullMQ Worker Error Capture

BullMQ errors currently vanish. Wrap every worker processor:

**`packages/ingestion-pipeline/src/workers/base-worker.ts`**:

```typescript
import * as Sentry from "@sentry/nextjs";

export function withSentryWorker<T>(
  jobName: string,
  processor: (job: Job<T>) => Promise<void>
) {
  return async (job: Job<T>) => {
    return Sentry.withScope(async (scope) => {
      scope.setTag("job.name", jobName);
      scope.setTag("job.id", job.id ?? "unknown");
      scope.setContext("job", {
        data: job.data,
        attemptsMade: job.attemptsMade,
        opts: job.opts,
      });

      try {
        await processor(job);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "job.failed": true },
        });
        throw error; // Re-throw so BullMQ handles retry
      }
    });
  };
}
```

Usage:
```typescript
const worker = new Worker(
  "settle-picks",
  withSentryWorker("settle-picks", async (job) => {
    await settleSport(job.data);
  }),
  { connection: redis }
);
```

## GSN Use Case 2: Pick Generation Error Context

When Claude or Odds API calls fail, capture the full context:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function generatePickWithSentry(gameId: string, sport: string) {
  return Sentry.startSpan(
    { name: "generate-pick", op: "ai.generate" },
    async () => {
      Sentry.setContext("pick-generation", { gameId, sport });

      try {
        // Set a breadcrumb for each stage
        Sentry.addBreadcrumb({ message: "Fetching odds", data: { gameId } });
        const odds = await fetchOdds(gameId);

        Sentry.addBreadcrumb({ message: "Calling Claude", data: { model: "claude-sonnet-5" } });
        const pick = await callClaude(odds);

        Sentry.addBreadcrumb({ message: "Persisting pick", data: { pickId: pick.id } });
        await db.pick.create({ data: pick });

        return pick;
      } catch (error) {
        // Sentry captures automatically — but add extra context for AI errors
        if (error instanceof Anthropic.APIError) {
          Sentry.setTag("error.type", "anthropic_api");
          Sentry.setTag("error.status", String(error.status));
        }
        throw error;
      }
    }
  );
}
```

## GSN Use Case 3: User-Scoped Errors (Tier-Aware)

Attach subscription tier to every error — know if ELITE users are hitting more bugs:

**`apps/web/src/middleware.ts`** (or wherever session is read):

```typescript
import * as Sentry from "@sentry/nextjs";

// After getting the session in a Server Component or API route:
if (session?.user) {
  Sentry.setUser({
    id: session.user.id,
    email: session.user.email ?? undefined,
    // Custom fields
    subscription_tier: session.user.subscriptionTier, // "FREE" | "PRO" | "ELITE"
  });
}
```

Now every error in Sentry is tagged with `subscription_tier` — filter by `tier:ELITE` to see if premium users are having a worse experience.

## GSN Use Case 4: Paywall Bypass Attempt Tracking

Track when users attempt to access premium content without entitlement (security signal):

```typescript
import * as Sentry from "@sentry/nextjs";

// In the server-side paywall enforcement (NOT frontend):
if (!hasAccess(user.subscriptionTier, pick.tier)) {
  Sentry.captureMessage("Paywall bypass attempt", {
    level: "warning",
    tags: {
      "user.tier": user.subscriptionTier,
      "pick.tier": pick.tier,
      "pick.id": pick.id,
    },
    user: { id: user.id },
  });

  return { error: "UNAUTHORIZED" };
}
```

This surfaces in Sentry as a warning stream — spike in warnings = potential exploit being probed.

## GSN Use Case 5: Release Health Tracking

Tag every deploy with the git SHA — Sentry shows error rate per release:

```bash
# .env.local / Vercel env vars
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=gsn-web
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...  # Client-side (public)
# VERCEL_GIT_COMMIT_SHA is auto-set by Vercel
```

Sentry's release page shows: "This deploy introduced 3 new errors in `settle-picks`."

## Source Maps (Upload on Build)

Sentry needs source maps to show readable stack traces (not minified):

```bash
# Already handled by withSentryConfig in next.config.ts
# But set the auth token:
SENTRY_AUTH_TOKEN=sntrys_...  # from sentry.io → Settings → Auth Tokens
```

In Vercel: add `SENTRY_AUTH_TOKEN` as a build-time environment variable (not runtime).

## Alerting

In the Sentry dashboard:
1. **Critical alerts**: any new error in `settle-picks` or `generate-pick` → PagerDuty / email
2. **Warning alerts**: paywall bypass attempts > 10/hour → Slack #gsn-security
3. **Performance alerts**: p95 response time for `/api/picks` > 3s → Slack #gsn-engineering

## What This Does NOT Cover

- AI session telemetry (prompts, token usage) → AgentOps handles this
- Full distributed tracing across services → OpenTelemetry (`OPENTELEMETRY-TRACING.md`)
- User behavior funnels → PostHog (`POSTHOG-ANALYTICS.md`)
- Scheduled job reliability → Trigger.dev dashboard

## Status

- [ ] `npm install @sentry/nextjs --workspace=apps/web`
- [ ] Add `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` to Vercel env
- [ ] Add `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- [ ] Wrap `next.config.ts` with `withSentryConfig`
- [ ] Add `withSentryWorker` to `packages/ingestion-pipeline` BullMQ processors
- [ ] Set `Sentry.setUser()` in session middleware
- [ ] Add paywall bypass `captureMessage` in server-side enforcement
- [ ] Configure Sentry alerts: settle-picks errors → email; paywall bypass spikes → Slack
