# ElectricSQL: Real-Time Postgres Sync for Live Pick Updates

> Source: `electric-sql/electric` (Apache-2.0, 10k★)
> Purpose: Stream Postgres changes to the browser in real time — users see pick odds update without polling, refreshing, or custom WebSocket infrastructure

## What This Solves

GSN's current data flow:
1. Pick odds change in Postgres (from the ingestion worker)
2. The user's browser shows the old odds until they refresh
3. OR the frontend polls `/api/picks` every N seconds — wasting API quota, adding latency, burning Vercel function invocations

ElectricSQL closes this loop with zero custom WebSocket or polling code:
- Define a **Shape** (a SQL query subset) — e.g., today's picks for this user's tier
- ElectricSQL streams every INSERT/UPDATE/DELETE from Postgres to the browser via HTTP long-polling (no WebSocket, works through Vercel/CDN)
- React components update in real time when odds shift, pick confidence changes, or new picks land

## What This Does NOT Duplicate

| Tool | What it does |
|---|---|
| PostHog | Tracks user behavior events (client → analytics server) |
| OpenTelemetry | Distributed traces (server → observability backend) |
| BullMQ | Background job queue (server-to-server async work) |
| **ElectricSQL** | **Real-time Postgres rows → browser (server → client sync)** |

This is a genuinely new data flow direction: database → client, without a route or polling layer.

## Installation

```bash
# React hook + client sync
npm install @electric-sql/react electric-sql --workspace=apps/web

# ElectricSQL service (handles change data capture from Postgres)
# → runs as a sidecar in Docker or on Railway/Fly.io
```

## Architecture

```
Postgres → ElectricSQL service (CDC) → HTTP Shape log → @electric-sql/react hook → React re-render
```

No custom WebSocket server. No polling loop. One declarative Shape definition.

## GSN Use Case 1: Live Pick Odds Feed

Users see odds update as the ingestion worker writes new data — no refresh required.

**`apps/web/app/picks/live-picks-feed.tsx`**:

```tsx
"use client";
import { useShape } from "@electric-sql/react";
import { PickCard } from "@/components/pick-card";

interface LivePicksProps {
  userTier: "FREE" | "PRO" | "ELITE";
  sport: string;
}

export function LivePicksFeed({ userTier, sport }: LivePicksProps) {
  // This Shape streams any INSERT/UPDATE to picks where these conditions hold.
  // When a new pick lands or odds shift, the component re-renders automatically.
  const { data: picks, isLoading } = useShape<{
    id: string;
    sport: string;
    selection: string;
    spread: number;
    confidence: number;
    tier: string;
    updated_at: string;
  }>({
    url: `${process.env.NEXT_PUBLIC_ELECTRIC_URL}/v1/shape`,
    params: {
      table: "Pick",
      where: `sport = '${sport}' AND status = 'PENDING' AND settled_at IS NULL`,
    },
  });

  if (isLoading) return <PicksSkeleton />;

  // Filter by tier on the client (server-side paywall enforcement still applies)
  const visiblePicks = picks.filter((p) => {
    if (userTier === "ELITE") return true;
    if (userTier === "PRO") return p.tier !== "ELITE";
    return p.tier === "FREE";
  });

  return (
    <div className="space-y-4">
      {visiblePicks.map((pick) => (
        <PickCard key={pick.id} pick={pick} userTier={userTier} />
      ))}
    </div>
  );
}
```

When the ingestion worker writes a new pick or updates odds, the Shape updates and the component re-renders — no user action needed.

## GSN Use Case 2: Live Settlement Feed

When a game settles, show the WIN/LOSS instantly across all open sessions:

```tsx
"use client";
import { useShape } from "@electric-sql/react";

export function RecentResultsFeed({ userId }: { userId: string }) {
  const { data: results } = useShape<{
    id: string;
    selection: string;
    outcome: "WIN" | "LOSS" | "PUSH" | "VOID";
    units_won: number;
    settled_at: string;
  }>({
    url: `${process.env.NEXT_PUBLIC_ELECTRIC_URL}/v1/shape`,
    params: {
      table: "Pick",
      where: `outcome IS NOT NULL AND settled_at > NOW() - INTERVAL '7 days'`,
    },
  });

  return (
    <div>
      {results.map((r) => (
        <ResultRow key={r.id} result={r} />
      ))}
    </div>
  );
}
```

No polling. No `/api/results` route needed. Settlement appears instantly.

## GSN Use Case 3: Live Ingestion Run Status

Show the operator a live view of ingestion run state from the cockpit:

```tsx
"use client";
import { useShape } from "@electric-sql/react";

export function IngestionRunStatusPanel() {
  const { data: runs } = useShape<{
    id: string;
    sport: string;
    status: string;
    picks_generated: number;
    started_at: string;
    completed_at: string | null;
  }>({
    url: `${process.env.NEXT_PUBLIC_ELECTRIC_URL}/v1/shape`,
    params: {
      table: "IngestionRun",
      where: "started_at > NOW() - INTERVAL '24 hours'",
    },
  });

  return (
    <table>
      {runs.map((run) => (
        <tr key={run.id}>
          <td>{run.sport}</td>
          <td>{run.status}</td>
          <td>{run.picks_generated}</td>
        </tr>
      ))}
    </table>
  );
}
```

When `process-sport.ts` finishes and writes the IngestionRun row, the cockpit panel updates immediately.

## Running ElectricSQL

### Local Dev (Docker)

```bash
# ElectricSQL service (reads Postgres logical replication)
docker run -d --name electric \
  -e DATABASE_URL=postgresql://sports:sports_test@host.docker.internal:5432/sports \
  -e DATABASE_USE_IPV6=false \
  -p 3000:3000 \
  electricsql/electric:latest

export NEXT_PUBLIC_ELECTRIC_URL=http://localhost:3000
```

### Production (Railway or Fly.io)

```bash
# Deploy Electric as a service — connects to Neon Postgres
# Railway: one-click deploy from their template
# Fly.io: 256MB RAM container, ~$3/month
# OR: Electric Cloud (managed, free tier available)

NEXT_PUBLIC_ELECTRIC_URL=https://your-electric-instance.railway.app
```

### Postgres Requirement: Logical Replication

```sql
-- Enable on Neon (already enabled by default):
-- Settings → Logical Replication → Enable

-- Verify:
SELECT * FROM pg_replication_slots;
```

Neon has logical replication enabled by default. No Postgres config change needed.

## Security: Shape Permissions

Electric Shapes are public by default. Add an auth proxy to enforce tier access:

```typescript
// apps/web/src/app/api/picks-shape/route.ts
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  const tier = session?.user?.subscriptionTier ?? "FREE";

  // Build tier-appropriate where clause
  const where = tier === "ELITE"
    ? "status = 'PENDING'"
    : `status = 'PENDING' AND tier = '${tier}'`;

  // Proxy to Electric with the tier-restricted shape
  const electricUrl = new URL(`${process.env.ELECTRIC_URL}/v1/shape`);
  electricUrl.searchParams.set("table", "Pick");
  electricUrl.searchParams.set("where", where);

  const response = await fetch(electricUrl);
  return new Response(response.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
```

Point the frontend at `/api/picks-shape` instead of the Electric URL directly.

## Performance

- Electric uses HTTP/1.1 long-polling — no WebSocket management, works through Vercel CDN and Next.js middleware
- Shape log is append-only and cacheable — Cloudflare/Vercel edge can cache the static portions
- Shapes stream only the rows matching the `where` clause — no over-fetching

## What This Does NOT Cover

- Server-side pick generation → Mastra + BullMQ workers
- Pick paywall enforcement → server-side middleware (never frontend-only)
- User behavior analytics → PostHog
- Background job scheduling → Trigger.dev

## Environment Variables

```bash
# Electric service endpoint (public URL)
NEXT_PUBLIC_ELECTRIC_URL=http://localhost:3000  # local dev
# In Vercel:
NEXT_PUBLIC_ELECTRIC_URL=https://electric.your-domain.com

# Internal Electric URL (for server-side proxy route)
ELECTRIC_URL=http://electric:3000  # Docker compose internal
```

## Status

- [ ] Enable logical replication on Neon Postgres (Settings → Logical Replication)
- [ ] Deploy ElectricSQL service (Docker locally, Railway/Fly.io in production)
- [ ] Add `NEXT_PUBLIC_ELECTRIC_URL` to Vercel env
- [ ] Replace polling in `LivePicksFeed` with `useShape` hook
- [ ] Add auth proxy route `/api/picks-shape` for tier-gated shapes
- [ ] Add `RecentResultsFeed` component using settlement shape
- [ ] Add live `IngestionRunStatusPanel` to cockpit using ingestion run shape
- [ ] Verify: change a pick confidence in DB → browser updates without refresh
