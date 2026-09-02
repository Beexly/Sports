-- Week 1 hot-path index: the public board reads (GET /api/picks findMany + count,
-- board/state.ts) all filter isPublished = true AND isBootstrap = false AND
-- generatedAt BETWEEN window, then order by generatedAt. No existing index covers
-- that shape (only single-column generatedAt), so Postgres filters after the
-- range scan. Additive, non-unique, no data change.
--
-- Name matches Prisma's generated form (<table>_<col1>_<col2>_<col3>_idx) so
-- `prisma migrate diff` stays clean. IF NOT EXISTS keeps re-application safe.
-- CreateIndex
CREATE INDEX IF NOT EXISTS "picks_isPublished_isBootstrap_generatedAt_idx" ON "picks"("isPublished", "isBootstrap", "generatedAt");
