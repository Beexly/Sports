-- Bet-time line lock (R-04, pairs with the R-01 settlement boundary fix).
-- Adds two NULLABLE columns to "pick_signal_snapshots" that freeze the
-- Pick.line / Pick.selection exactly as published at snapshot creation
-- (chosen-side semantics, decision D-010).
--
-- WHY: Pick.line/selection are overwritten on every ingestion refresh
-- (process-sport.ts pick upsert), so by settlement time they hold the
-- LAST-refresh values — not the bet-time values CLV must compare against.
-- The snapshot is created once and never updated (update: {}), making it the
-- correct immutable carrier for the locked line.
--
-- Fully additive and idempotent: ADD COLUMN IF NOT EXISTS, both nullable,
-- no backfill (pre-existing snapshots stay NULL → CLV degrades to null for
-- those picks; never computed from a drifted line). Nothing here touches the
-- published pick confidence/tier/grade/result or MODEL_VERSION.

ALTER TABLE "pick_signal_snapshots" ADD COLUMN IF NOT EXISTS "lineAtPrediction"      DOUBLE PRECISION;
ALTER TABLE "pick_signal_snapshots" ADD COLUMN IF NOT EXISTS "selectionAtPrediction" TEXT;
