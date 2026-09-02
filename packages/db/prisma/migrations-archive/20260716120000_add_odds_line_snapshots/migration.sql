-- Forward line archive for the Glass Ledger (handoff §2 P0): timestamped
-- OPENING / INTERIM / CLOSING odds snapshots. New model OddsLineSnapshot
-- (schema.prisma → @@map("odds_line_snapshots")).
--
-- Purely additive: a brand-new, empty table plus its two indexes. Written
-- IF NOT EXISTS end to end (table, FK inline in the CREATE TABLE, indexes)
-- so it is byte-safe to apply anytime, including re-applying against a DB
-- where it already landed — same hardening doctrine as
-- 20260710210000_add_book_disagreement_at_lock's ADD COLUMN IF NOT EXISTS.
-- The founder applies this; it is never run automatically from this repo.
--
-- Writer-side gating lives entirely in application code
-- (packages/ingestion-pipeline/src/line-archive.ts): the archive is inert
-- (LINE_ARCHIVE_ENABLED unset) until the founder flips it on, so this table
-- stays empty until then even once the migration is applied.

CREATE TABLE IF NOT EXISTS "odds_line_snapshots" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "line" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_line_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "odds_line_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_line_snapshots_gameId_market_capturedAt_idx" ON "odds_line_snapshots"("gameId", "market", "capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "odds_line_snapshots_phase_capturedAt_idx" ON "odds_line_snapshots"("phase", "capturedAt");
