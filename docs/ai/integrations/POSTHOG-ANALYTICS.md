# PostHog: Product Analytics + Feature Flags for GSN

> Source: `PostHog/posthog` (MIT, 24k★)
> Purpose: User behavior data, conversion funnels, feature flag rollouts — the "what are users actually doing?" layer

## What This Solves

GSN has zero visibility into:
- How many FREE users hit the paywall before converting (or bouncing)?
- Which picks page layout drives more ELITE upgrades?
- What percentage of PRO users click the upgrade prompt in week 1?
- Which onboarding email drives the most picks views?

AgentOps tracks AI sessions. Sentry tracks errors. Neither answers "what are users doing?"

PostHog fills the gap:
- **Event tracking** — `pick_viewed`, `paywall_hit`, `upgrade_clicked`, `checkout_started`
- **Funnels** — `pick_viewed → paywall_hit → upgrade_clicked → checkout_started → subscription_activated`
- **Feature flags** — ship ELITE features to 10% of users before full rollout
- **Session replay** — watch exactly what a user did before they bounced at checkout
- **Cohorts** — "all ELITE users who viewed 5+ picks this week"

## Installation

```bash
# Client SDK (browser analytics)
npm install posthog-js --workspace=apps/web

# Server SDK (server-side events, feature flags in API routes)
npm install posthog-node --workspace=apps/web
```

## Configuration

### `apps/web/src/lib/posthog.ts`

```typescript
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Capture pageviews automatically
      capture_pageview: true,
      // Persist user identity across sessions
      persistence: "localStorage+cookie",
      // Don't capture on localhost dev
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.opt_out_capturing();
      },
    });
  }
}

// Server-side PostHog client (singleton)
import { PostHog } from "posthog-node";

let _serverPostHog: PostHog | null = null;

export function getServerPostHog(): PostHog {
  if (!_serverPostHog) {
    _serverPostHog = new PostHog(process.env.POSTHOG_KEY!, {
      host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return _serverPostHog;
}
```

### `apps/web/src/app/layout.tsx` (add PostHog provider)

```typescript
"use client";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // Handled by PostHogPageView
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

## GSN Use Case 1: The Conversion Funnel

Track every step from first pick view to ELITE subscription:

```typescript
import { usePostHog } from "posthog-js/react";

// components/PickCard.tsx
export function PickCard({ pick, userTier }: PickCardProps) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture("pick_viewed", {
      pick_id: pick.id,
      pick_tier: pick.tier,       // "FREE" | "PRO" | "ELITE"
      pick_sport: pick.sport,
      user_tier: userTier,
      is_locked: pick.tier !== "FREE" && userTier === "FREE",
    });
  }, [pick.id]);

  const handlePaywallHit = () => {
    posthog.capture("paywall_hit", {
      pick_id: pick.id,
      pick_tier: pick.tier,
      user_tier: userTier,
      location: "pick_card",
    });
  };

  const handleUpgradeClick = () => {
    posthog.capture("upgrade_clicked", {
      source: "paywall_gate",
      user_tier: userTier,
      target_tier: pick.tier,
    });
  };

  // ... render
}
```

In PostHog, build a funnel:
1. `pick_viewed` (where `is_locked = true`)
2. `paywall_hit`
3. `upgrade_clicked`
4. `checkout_started` (captured in Stripe redirect)
5. `subscription_activated` (captured server-side on webhook)

This shows exactly where users drop off. If 80% click upgrade but only 20% complete checkout → Stripe UX problem.

## GSN Use Case 2: Server-Side Event Capture (Subscription Events)

Stripe webhooks are server-side — capture subscription events from the API route:

```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts
import { getServerPostHog } from "@/lib/posthog";

export async function POST(req: Request) {
  // ... verify Stripe signature ...

  const ph = getServerPostHog();

  switch (event.type) {
    case "customer.subscription.created":
      ph.capture({
        distinctId: subscription.metadata.userId,
        event: "subscription_activated",
        properties: {
          plan: subscription.items.data[0]?.price?.nickname, // "PRO" | "ELITE"
          amount: subscription.items.data[0]?.price?.unit_amount,
          currency: subscription.currency,
        },
      });
      break;

    case "customer.subscription.deleted":
      ph.capture({
        distinctId: subscription.metadata.userId,
        event: "subscription_cancelled",
        properties: {
          plan: subscription.items.data[0]?.price?.nickname,
          reason: subscription.cancellation_details?.reason,
        },
      });
      break;
  }

  await ph.flushAsync();
  return Response.json({ received: true });
}
```

## GSN Use Case 3: Feature Flags for ELITE Rollouts

Roll out new ELITE features to 10% of users before full launch:

```typescript
// Server Component — feature flag evaluation at render time
import { getServerPostHog } from "@/lib/posthog";
import { auth } from "@/lib/auth";

export async function ElitePicksPage() {
  const session = await auth();
  const ph = getServerPostHog();

  const showNewPickLayout = session?.user?.id
    ? await ph.isFeatureEnabled("elite-picks-v2", session.user.id)
    : false;

  return showNewPickLayout ? <ElitePicksV2 /> : <ElitePicksV1 />;
}
```

Define the flag in PostHog dashboard:
- Flag key: `elite-picks-v2`
- Rollout: 10% of users where `subscription_tier = ELITE`
- After validating metrics → gradually increase to 100%

This means **zero deploys** to expand a feature rollout — just slide the percentage in the PostHog UI.

## GSN Use Case 4: Identify Users Across Sessions

Link PostHog anonymous IDs to your user IDs after sign-in:

```typescript
// After NextAuth sign-in resolves (client-side)
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogIdentify() {
  const { data: session } = useSession();
  const posthog = usePostHog();

  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        subscription_tier: session.user.subscriptionTier,
        created_at: session.user.createdAt,
      });
    } else {
      // User signed out — reset identity
      posthog.reset();
    }
  }, [session?.user?.id]);

  return null;
}
```

Add `<PostHogIdentify />` to the root layout. Now every event is linked to a real user.

## GSN Use Case 5: Weekly Retention Cohort

In PostHog dashboard: Cohorts → "ELITE users who viewed picks 2+ weeks in a row"

This surfaces churned ELITE users before they cancel — trigger an n8n re-engagement workflow
when a user drops out of their weekly active cohort.

## Environment Variables

```bash
# Public (exposed to browser)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Private (server-side only, same key works)
POSTHOG_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
```

## Privacy Compliance

PostHog is self-hostable — if sports data privacy is a concern:

```bash
# Self-hosted PostHog (Docker)
docker run -d --name posthog \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  posthog/posthog:latest
```

For self-hosted: set `NEXT_PUBLIC_POSTHOG_HOST=https://your-posthog.example.com`.

## What This Does NOT Cover

- Error aggregation → Sentry (`SENTRY-ERROR-TRACKING.md`)
- AI session telemetry → AgentOps
- Workflow automation triggered by events → n8n (`N8N-WORKFLOW-AUTOMATION.md`)
- Full distributed traces → OpenTelemetry (`OPENTELEMETRY-TRACING.md`)

## Status

- [ ] `npm install posthog-js posthog-node --workspace=apps/web`
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_KEY` to Vercel env
- [ ] Add `PHProvider` wrapper to `apps/web/src/app/layout.tsx`
- [ ] Add `PostHogIdentify` component (fires after NextAuth session)
- [ ] Instrument `PickCard`: `pick_viewed`, `paywall_hit`, `upgrade_clicked`
- [ ] Instrument Stripe webhook: `subscription_activated`, `subscription_cancelled`
- [ ] Build conversion funnel in PostHog dashboard
- [ ] Create `elite-picks-v2` feature flag — test new layouts safely
- [ ] Set up weekly retention cohort for ELITE users
