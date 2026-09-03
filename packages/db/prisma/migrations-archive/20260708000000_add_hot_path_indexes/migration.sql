-- Hot-path index coverage (from the 2026-07-08 data-layer audit).
-- All are additive, non-unique, and safe to apply online; no data change.

-- Odds: closing-line lookups filter gameId + order/range on fetchedAt.
-- CreateIndex
CREATE INDEX "odds_gameId_fetchedAt_idx" ON "odds"("gameId", "fetchedAt");

-- IngestionRun: "latest successful run" lookups filter status + order by completedAt.
-- CreateIndex
CREATE INDEX "ingestion_runs_status_completedAt_idx" ON "ingestion_runs"("status", "completedAt");

-- Pick: dashboard settled-history ordering/ranges on settledAt.
-- CreateIndex
CREATE INDEX "picks_settledAt_idx" ON "picks"("settledAt");
