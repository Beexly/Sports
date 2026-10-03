-- Week 1 hot-path index (2026-09-02).
-- The public board and daily slate (apps/web/app/api/picks/route.ts,
-- apps/web/lib/board/state.ts) filter picks by isPublished + isBootstrap and a
-- generatedAt range on every request; no existing index covered that shape.
-- Idempotent: Prisma migrations run in a transaction, so no CONCURRENTLY.
CREATE INDEX IF NOT EXISTS "picks_isPublished_isBootstrap_generatedAt_idx"
  ON "picks"("isPublished", "isBootstrap", "generatedAt");
