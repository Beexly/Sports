# Trigger.dev: Reliable Background Jobs for Next.js + Vercel

> Source: `trigger-dev/trigger.dev` (Apache-2.0, 15k★)
> Purpose: The gap between unreliable Vercel cron jobs and heavy BullMQ worker infrastructure

## What This Solves

GSN has two async job options today:

1. **Vercel Cron** (current) — Fires HTTP webhooks on a schedule. Problems: 10-second timeout
   on Hobby plan (60s on Pro), no retry on failure, no job queue, no dashboard visibility.
   A failed settle-picks cron logs nothing, retries nothing, and silently drops settlement.

2. **BullMQ workers** (current) — Full Redis-backed job queue with retry and backoff.
   Problems: requires an always-on Node.js worker process, infrastructure to maintain,
   not natively integrated with Next.js App Router.

Trigger.dev fills the gap:
- **Runs inside Next.js** — define jobs as TypeScript functions in `app/` or `trigger/`
- **No worker to maintain** — jobs run on Trigger's infrastructure, triggered by schedule/webhook/event
- **Long-running tasks** — up to 1 hour per task (not the 10/60 second Vercel limit)
- **Retry with backoff** — automatic, configurable
- **Real-time dashboard** — see every job run, retry, and failure in the Trigger.dev UI
- **Waitpoint/sleep** — jobs can wait for external events without consuming server time

## How It Differs from BullMQ

| | BullMQ | Trigger.dev | Vercel Cron |
|---|---|---|---|
| Infrastructure | Redis + Node.js worker | Trigger.dev cloud | Vercel |
| Max task duration | Unlimited | 1 hour | 60s (Pro) |
| Retry | Manual config | Built-in, visual | No |
| Dashboard | None (you build it) | Real-time built-in | Vercel logs only |
| Next.js integration | Worker is separate | Native | HTTP-only |
| Local dev | docker-compose redis | `npx trigger.dev dev` | Vercel CLI |
| Cost | Your infra cost | Free / $25/mo | Included |
| Wake up for events | Manual webhook | `wait.for(event)` | No |

## Installation

```bash
npm install @trigger.dev/sdk@beta

# Initialize Trigger.dev in the web app
npx trigger.dev@beta init --project-ref <your-project-ref>
# Creates: apps/web/trigger.config.ts + apps/web/src/trigger/
```

## Configuration

**`apps/web/trigger.config.ts`**:
```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  runtime: "node",
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },
});
```

## GSN Use Case 1: Reliable Settlement Cron (Replaces Vercel Cron)

The current settle-picks cron has a 60-second timeout. Settlement for a full NFL slate
(15 games × multiple picks each) can take 3–5 minutes.

**`apps/web/src/trigger/settle-picks.ts`**:
```typescript
import { schedules } from "@trigger.dev/sdk/v3";
import { settleSport } from "@sports/ingestion-pipeline";
import { db } from "@sports/db";
import { getReadinessGates } from "@/lib/readiness-gates";

// Runs every 30 minutes — Trigger.dev handles scheduling
export const settlePicksTask = schedules.task({
  id: "settle-picks",
  // Every 30 minutes — more reliable than Vercel cron
  cron: "*/30 * * * *",
  // Up to 60 minutes — can process a full NFL slate
  maxDuration: 3600,

  run: async (payload) => {
    const gates = await getReadinessGates(db);
    const sports = ["americanfootball_nfl", "basketball_nba", "baseball_mlb"];

    const results = await Promise.allSettled(
      sports.map(sport => settleSport({ key: sport, name: sport, displayName: sport }, process.env.ODDS_API_KEY!, gates))
    );

    const summary = results.map((r, i) => ({
      sport: sports[i],
      status: r.status,
      result: r.status === "fulfilled" ? r.value : r.reason?.message,
    }));

    console.log("Settlement complete:", JSON.stringify(summary));
    return { summary };
  },
});
```

## GSN Use Case 2: ELITE Pick Alerts (Wait for Trigger Event)

When a high-confidence pick is generated, trigger an alert job that waits for the
pick to be published before sending notifications:

**`apps/web/src/trigger/elite-alerts.ts`**:
```typescript
import { task, wait } from "@trigger.dev/sdk/v3";
import { sendElitePickAlert } from "@/lib/notifications";
import { db } from "@sports/db";

export const sendEliteAlertTask = task({
  id: "send-elite-alert",
  maxDuration: 300, // 5 minutes to handle notification delivery retries

  run: async (payload: { pickId: string; userId: string }) => {
    const pick = await db.pick.findUniqueOrThrow({
      where: { id: payload.pickId },
      include: { game: true },
    });

    // Wait until the game is within 2 hours of kickoff (or immediately if already close)
    const kickoff = pick.game.commenceTime;
    const twoHoursBefore = new Date(kickoff.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    if (now < twoHoursBefore) {
      // Sleep until 2 hours before kickoff — Trigger.dev handles this natively
      await wait.until({ date: twoHoursBefore });
    }

    await sendElitePickAlert({
      userId: payload.userId,
      pick,
      channel: "push", // iOS/Android push notification
    });

    return { sent: true, pickId: payload.pickId };
  },
});

// Trigger from pick generation:
// await sendEliteAlertTask.trigger({ pickId: newPick.id, userId: subscription.userId });
```

## GSN Use Case 3: Nightly Market Research (Runs While You Sleep)

**`apps/web/src/trigger/market-research.ts`**:
```typescript
import { schedules } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@sports/db";

export const nightlyMarketResearch = schedules.task({
  id: "nightly-market-research",
  cron: "0 3 * * *", // 3am UTC every night
  maxDuration: 1800, // 30 minutes

  run: async () => {
    const anthropic = new Anthropic();

    // Research tomorrow's slate
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingGames = await db.game.findMany({
      where: {
        status: "SCHEDULED",
        commenceTime: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      take: 10,
    });

    // Generate market intelligence for each game
    const insights = await Promise.all(
      upcomingGames.map(async (game) => {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001", // Cheap for batch analysis
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `Brief market intelligence for ${game.homeTeamName} vs ${game.awayTeamName}: key narrative, public betting lean, and one sharp angle. 3 bullets max.`,
          }],
        });
        return {
          gameId: game.id,
          insight: response.content[0].type === "text" ? response.content[0].text : "",
        };
      })
    );

    // Store insights for morning picks generation
    await db.marketIntelligence.createMany({
      data: insights.map(i => ({ ...i, generatedAt: new Date() })),
      skipDuplicates: true,
    });

    return { gamesAnalyzed: upcomingGames.length };
  },
});
```

## GSN Use Case 4: Data Refresh with Per-Game Fan-Out

Instead of one monolithic data refresh job, fan out to per-game workers:

```typescript
import { task, batch } from "@trigger.dev/sdk/v3";

// Parent job: fetches the slate and triggers child jobs per game
export const dataRefreshOrchestrator = schedules.task({
  id: "data-refresh-orchestrator",
  cron: "*/15 * * * *", // Every 15 minutes during game hours
  maxDuration: 60,

  run: async () => {
    const activeGames = await db.game.findMany({
      where: { status: "LIVE" },
    });

    // Fan out — each game gets its own job with its own retry
    await batch.triggerAndWait(
      activeGames.map(game => ({
        id: "refresh-game-scores",
        payload: { gameId: game.id },
      }))
    );

    return { gamesRefreshed: activeGames.length };
  },
});

export const refreshGameScores = task({
  id: "refresh-game-scores",
  maxDuration: 30,

  run: async (payload: { gameId: string }) => {
    const scores = await fetchScoresFromOddsApi(payload.gameId);
    await updateGameScores(payload.gameId, scores);
    return { gameId: payload.gameId, updated: true };
  },
});
```

## Local Development

```bash
# Start Trigger.dev dev mode (connects local to Trigger cloud for testing)
npx trigger.dev@beta dev

# In another terminal:
npm run dev --workspace=apps/web

# Test trigger a scheduled task manually:
npx trigger.dev@beta trigger settle-picks
```

## Environment Variables

```bash
# apps/web/.env.local
TRIGGER_SECRET_KEY=tr_dev_...    # from trigger.dev dashboard
TRIGGER_PROJECT_REF=proj_...
```

## Migration Path from Vercel Cron

Week 1: Move `settle-picks` to Trigger.dev. Keep Vercel cron as backup for 2 weeks.
Week 2: Move `data-refresh` to Trigger.dev fan-out pattern.
Week 3: Wire `send-elite-alert` for ELITE tier notifications.
Week 4: Remove Vercel cron entries.

## Status

- [ ] Sign up at trigger.dev, create project
- [ ] `npm install @trigger.dev/sdk@beta`
- [ ] `npx trigger.dev@beta init` in `apps/web`
- [ ] Create `src/trigger/settle-picks.ts` — migrate from Vercel cron
- [ ] Test locally with `npx trigger.dev@beta dev`
- [ ] Add `TRIGGER_SECRET_KEY` to Vercel env vars
- [ ] Create `src/trigger/elite-alerts.ts` — wire ELITE tier push notifications
- [ ] Create `src/trigger/market-research.ts` — nightly AI research
- [ ] Remove redundant Vercel cron entries after 2-week parallel run
