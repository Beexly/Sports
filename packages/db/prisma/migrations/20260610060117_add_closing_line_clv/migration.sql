-- Additive CLV scaffold (WIN-01 / WIN-02): closing-line snapshot + per-pick
-- Closing-Line Value columns. Fully additive and idempotent — no destructive
-- change, no enum change (reuses "OddsMarket"), no data backfill.
--
-- Nothing here touches the published pick confidence/tier/grade/result or
-- MODEL_VERSION. The closing snapshot is captured best-effort near kickoff;
-- the per-pick clv* columns are NULL until both a bet-time line/price and a
-- closing reference exist (degrade-to-null, no fabricated value).
--
-- Idempotent: guarded so a re-run (e.g. an interrupted in-build migrate) is a
-- no-op. CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + a guarded
-- index/constraint creation.

-- 1. Closing-line snapshot table (mirrors "opening_lines").
CREATE TABLE IF NOT EXISTS "closing_lines" (
  "id"             TEXT NOT NULL,
  "gameId"         TEXT NOT NULL,
  "market"         "OddsMarket" NOT NULL,
  "spread"         DOUBLE PRECISION,
  "total"          DOUBLE PRECISION,
  "homePrice"      DOUBLE PRECISION,
  "awayPrice"      DOUBLE PRECISION,
  "closingRef"     TEXT NOT NULL DEFAULT 'consensus',
  "bookmakerCount" INTEGER NOT NULL DEFAULT 0,
  "isStale"        BOOLEAN NOT NULL DEFAULT false,
  "capturedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "closing_lines_pkey" PRIMARY KEY ("id")
);

-- Unique closing snapshot per game+market+reference (idempotent upsert key).
CREATE UNIQUE INDEX IF NOT EXISTS "closing_lines_gameId_market_closingRef_key"
  ON "closing_lines"("gameId", "market", "closingRef");

CREATE INDEX IF NOT EXISTS "closing_lines_gameId_idx"
  ON "closing_lines"("gameId");

-- FK to games, cascade on delete (mirrors opening_lines). Guarded so a re-run
-- does not error on an already-present constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_lines_gameId_fkey'
  ) THEN
    ALTER TABLE "closing_lines"
      ADD CONSTRAINT "closing_lines_gameId_fkey"
      FOREIGN KEY ("gameId") REFERENCES "games"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Per-pick CLV columns — all NULLABLE, all additive. These NEVER feed the
--    published number; they are computed shadow proof only.
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "closingLine"   DOUBLE PRECISION;
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "closingPrice"  DOUBLE PRECISION;
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "clvPoints"     DOUBLE PRECISION;
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "clvCents"      DOUBLE PRECISION;
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "clvPositive"   BOOLEAN;
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "clvComputedAt" TIMESTAMP(3);
