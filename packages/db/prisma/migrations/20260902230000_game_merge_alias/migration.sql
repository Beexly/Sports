-- Game merge alias — duplicate-row cleanup (see scripts/ops/merge-duplicate-games.ts
-- and packages/ingestion-pipeline/src/game-identity.ts).
--
-- Production evidence (Neon, 2026-09-02): the same real contest exists up to
-- three times in `games` under different feed ids (Odds API hash, TheRundown
-- hex, `espn:<sportKey>:<id>`, `espn:<short>:<id>`), each with its own picks.
-- `picks` carries @@unique([gameId, pickType]), so a duplicate row cannot
-- always be re-pointed onto the row we keep as canonical without a unique
-- collision — pick history must never be lost or mutated.
--
-- This migration adds a single nullable self-reference, `mergedIntoGameId`:
-- when set, the row is an ALIAS/tombstone of the game it points to. The row
-- itself is NEVER deleted (so un-repointed child rows, most importantly
-- `picks`, stay valid), but ingestion code follows `mergedIntoGameId` to the
-- live canonical row instead of treating the alias as canonical going
-- forward.
--
-- Additive and idempotent — ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT
-- EXISTS, and the named FK (re)installed via a guarded DO $$ block — same
-- hardening doctrine as packages/db/prisma/migrations/20260101000000_baseline
-- and packages/db/prisma/migrations-archive/20260722140000_add_ai_control_plane_ledger.
-- Byte-safe to apply anytime, including re-applying against a database where
-- it already landed. The founder applies this; it is never run automatically
-- from this repo.

-- AlterTable
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "mergedIntoGameId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "games_mergedIntoGameId_idx" ON "games"("mergedIntoGameId");

-- AddForeignKey (self-reference; ON DELETE SET NULL so a hard-deleted
-- canonical row — never done by the merge script itself, but not otherwise
-- forbidden at the schema level — un-aliases its former duplicates rather
-- than blocking the delete or cascading it onto alias rows and their picks)
DO $$ BEGIN
  ALTER TABLE "games" ADD CONSTRAINT "games_mergedIntoGameId_fkey"
    FOREIGN KEY ("mergedIntoGameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
