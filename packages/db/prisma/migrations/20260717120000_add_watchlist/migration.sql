-- Watchlist — the follow/alert retention primitive (competitive teardown:
-- a per-entity subscribe/alert loop is a proven sticky-engagement driver we
-- lacked). Users follow a TEAM or PLAYER; a GRADED-only alert loop can later
-- notify them — never an ungraded tip. See
-- apps/web/lib/watchlist/alert-eligibility.ts for the doctrine and
-- apps/web/lib/watchlist/alert-dispatch.ts for the (inert-by-default) send
-- seam. New model Watchlist (schema.prisma → @@map("watchlist_entries")).
--
-- Purely additive: a brand-new, empty table plus its indexes. Written
-- IF NOT EXISTS end to end (table, FK inline in the CREATE TABLE, unique
-- index, index) so it is byte-safe to apply anytime, including re-applying
-- against a DB where it already landed — same hardening doctrine as
-- 20260716120000_add_odds_line_snapshots. Zero destructive statements.
--
-- entityType is a plain TEXT column guarded by a CHECK constraint, not a
-- native Postgres enum — Postgres has no `CREATE TYPE ... IF NOT EXISTS`,
-- so a brand-new enum type here would not be safely re-appliable. This
-- mirrors the existing convention of OddsLineSnapshot.phase / Pick.clvVerdict,
-- which are also String columns for small fixed value sets rather than
-- native Postgres enums.
--
-- The founder applies this; it is never run automatically from this repo.
-- Application code fails gracefully (503, not 500) when this table is
-- absent — see apps/web/lib/watchlist/db.ts (mirrors
-- packages/ingestion-pipeline/src/line-archive.ts's table-absent doctrine).

CREATE TABLE IF NOT EXISTS "watchlist_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "watchlist_entries_entityType_check" CHECK ("entityType" IN ('TEAM', 'PLAYER')),
    CONSTRAINT "watchlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_entries_userId_entityType_entityId_key" ON "watchlist_entries"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "watchlist_entries_userId_idx" ON "watchlist_entries"("userId");
