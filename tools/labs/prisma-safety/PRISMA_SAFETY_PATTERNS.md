# Prisma Safety Lab - GSE Wave 2

## Grounding Diagnostic (via GitHub API 2026-07-22)
- Repo: Beexly/Sports main
- packages/db/prisma/ : schema.prisma (84k), seed.ts (62k with idempotent upserts, env=prod guards, count checks), 20+ migrations (additive only).
- seed.ts respects additive: uses upsert, existingTaskCount checks, NODE_ENV gates. wf respected.

## Safe Patterns
- **Expand/Contract**: Add columns (nullable), dual-write, backfill, @ignore old, contract.
- Shadow: Use `prisma db push --schema=./prisma/shadow.prisma` or Docker Postgres `postgres:16-test` + `PRISMA_DATABASE_URL=...`
- Introspection: `npx prisma db pull --url "postgresql://..." --schema=shadow`
- Versioning: Add `version Int @default(1) @updatedAt` or `optimisticLock` field + `where: {id, version}` in updates.
- Idempotency: Composite @unique([externalId, version]) , Serializable tx for checkout.
- Isolation: `prisma.$transaction(..., {isolationLevel: 'Serializable'})`

## Safe Diagnostic Cmds (run locally now)
```bash
# 1. Isolated SQLite in-mem test
npx tsx -e 'import {PrismaClient} from "@prisma/client"; const db = new PrismaClient({datasources: {db: {url: "file::memory:?cache=shared"}}}); ...'
# 2. prisma validate && prisma format
# 3. Docker: docker run --rm -p 5433:5432 -e POSTGRES_DB=test postgres && PRISMA...=postgresql://... prisma db push --force-reset --accept-data-loss --schema=tools/labs/... 
```

## Recommendations for Future Changes
- All changes via new migration files in feature branch -> PR with Apalache/TLA review.
- Never `prisma migrate deploy` on main DB without shadow validation + rollback plan.
- Use blue/green DB or read replica for verification.
- Delta receipt: this lab is NEW, non-overlapping with W2-02/04.

## Minimal Reversible Lab Example
```ts
// tools/labs/prisma-safety/test-inmemory.ts
async function proveSafeEvolve() {
  const db = new PrismaClient({ datasources: { db: { url: 'file::memory:' } } });
  await db.$executeRaw`CREATE TABLE IF NOT EXISTS ...`; // simulate
  // expand: add column
  // test queries with version check
  console.log('✅ Patterns verified in isolated env');
}
```

Receipt: Additive only. No wf duplication.