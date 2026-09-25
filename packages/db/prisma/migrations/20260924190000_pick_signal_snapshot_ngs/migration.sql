-- Persist whether the immutable pick-signal snapshot had a usable NGS context.
--
-- v5.3.0 prices persisted nflverse NGS team context into SPREAD and H2H
-- confidence. Outcome learning must be able to separate NGS-active picks from
-- their otherwise identical no-NGS predecessors; this flag is intentionally a
-- boolean presence fact, not a post-hoc recomputation of the current signal row.
--
-- Additive and idempotent. Prisma migrations run in a transaction; no
-- CONCURRENTLY. Historical snapshots remain false when no NGS was supplied at
-- pick creation time.
ALTER TABLE "pick_signal_snapshots"
  ADD COLUMN IF NOT EXISTS "hadNgsSignal" BOOLEAN NOT NULL DEFAULT false;
