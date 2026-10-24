# Post-launch: Neon serverless driver swap

**Status:** queued for after launch is stable. Do not do this during launch crunch.

## What

Replace the standard `pg` driver (which Prisma wraps) with `@neondatabase/serverless` for our Neon Postgres connection. The serverless driver uses WebSockets over HTTPS instead of raw TCP, which is the better fit for Vercel's serverless function runtime — fewer cold-start surprises, fewer connection-pool issues on Vercel scale-up.

Source: `@neondatabase/serverless` (MIT, https://github.com/neondatabase/serverless).

## Why not now

1. Prisma's client is wired to the `pg` driver via the standard `DATABASE_URL`. Swapping during launch crunch with no real Postgres to test against is the wrong order of operations.
2. The standard driver works fine — it's a performance optimization, not a correctness fix.
3. Our cron handlers cap at 300s on Vercel; even with the standard driver we're well within budget for the ingestion loop.

## When to do it

After the first stable production week, when we have a baseline of:
- Average `/api/picks` p95 latency
- Cold-start incidence in Vercel logs
- Any connection-related errors in Sentry / observability

If cold-start latency on DB-touching routes exceeds ~400ms p95, this is the first thing to try.

## How

**Adapter scaffold already in repo.** A feature-flagged helper lives at `packages/db/src/neon-serverless-adapter.ts`. It uses dynamic `import()` so the absent deps don't break the existing build. When you're ready to flip it on, follow the steps in the file header. Two paths — pick based on what Prisma does at the time of the swap:

### Path A (preferred): Prisma's official Neon adapter
Prisma ships `@prisma/adapter-neon`. Install it and `@neondatabase/serverless`, then in the Prisma client init:

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
export const db = new PrismaClient({ adapter });
```

This keeps all existing Prisma queries unchanged — the swap is at the connection layer.

### Path B (fallback): npm alias
If the adapter is unavailable, alias `pg` to `@neondatabase/serverless` in `package.json`:

```json
{
  "dependencies": {
    "pg": "npm:@neondatabase/serverless@^1.0.0"
  },
  "overrides": {
    "pg": "npm:@neondatabase/serverless@^1.0.0"
  }
}
```

This is the documented drop-in path the serverless driver supports.

## Verification

1. `npm run typecheck` — must stay green; Prisma types should be unchanged.
2. `npm run test` — full suite green.
3. `npm run build` — bundle size delta should be small (serverless driver is smaller than pg).
4. Manually exercise `/api/picks`, `/api/picks/daily-slate`, `/api/subscriptions/portal`, the cron routes. Look for any "client has already been connected" or pool-exhaustion errors.
5. Re-run `npm run smoke:prod` against galaxysportsedge.com.

## Rollback

`git revert` the swap commit. The standard `pg` path remains in lockstep with stock Prisma docs, so reverting is straightforward.

## Out of scope

- DIRECT_URL stays pointed at the direct (port 5432) Neon endpoint for migrations. Prisma migrations don't use the serverless driver.
- This change does NOT affect the worker process (`workers/data-refresh`), which runs in a different runtime (Railway / Fly / EC2) where the standard `pg` is the right choice.
