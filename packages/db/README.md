# @sports/db

**Galaxy Sports Edge Database Layer** — Prisma schema, client, and data access abstractions for GSE's PostgreSQL/Neon database.

## Overview

Centralized database package providing:
- **Prisma schema** (`prisma/schema.prisma`) defining all GSE tables
- **Type-safe Prisma Client** with auto-generated TypeScript types
- **Sample data** (seed fixtures) for development/testing
- **Utility functions** for common queries and transactions

## Key Tables

Core schema entities:
- `Pick` — predictions with locked lines, probabilities, settlement
- `Game` — NFL/MLB games with venue, weather, ingestion state
- `Team` — team metadata and season tracking
- `OddsSnapshot` — time-series of betting lines from multiple books
- `User` / `WaitlistEntry` — access control and founding tier
- `CalibrationHistory` — model performance tracking

## Scripts

```bash
pnpm db:generate      # Generate Prisma client from schema
pnpm db:push          # Push schema to dev database (no migration)
pnpm db:migrate       # Run prod migrations
pnpm db:seed          # Load sample data
pnpm db:studio        # Launch Prisma Studio (GUI)
```

## Usage

```typescript
import { db } from "@sports/db";

// Type-safe query
const picks = await db.pick.findMany({
  where: { status: "PENDING", commencedAt: { lte: new Date() } },
  include: { game: true },
});

// Transaction
await db.$transaction(async (tx) => {
  const settled = await tx.pick.updateMany({
    where: { id: { in: ids } },
    data: { status: "SETTLED" },
  });
  await tx.settlementLog.create({ data: { count: settled.count } });
});
```

## Environment

Required env vars:
- `DATABASE_URL` — Neon Postgres connection string (pooled)
- `DIRECT_URL` (optional) — direct (non-pooled) for migrations

## Schema Evolution

Migrations live in `prisma/migrations/`. For schema changes:
1. Edit `prisma/schema.prisma`
2. `pnpm db:migrate:dev --name <desc>` (local)
3. Commit migration + schema
4. `pnpm db:migrate` (production deploy)

**Never hand-edit migration SQL** — Prisma generates them.

## Related

- Neon console: https://console.neon.tech/
- Schema validation: enforced via `check-agent-ledger.mjs` sanity checks
- Settlement queries: `apps/web/lib/settlement-outbox/`

---

**Monorepo**: `packages/db` — imported via workspace `@sports/db`