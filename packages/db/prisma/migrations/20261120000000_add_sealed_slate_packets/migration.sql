-- SealedSlatePacket: canonical Prisma migration for the model added to
-- schema.prisma by #1291 (Week 10 pre-sim wiring). Until now the table only
-- existed as a blueprint in docs/ops/migrations/20261115_sealed_slate_packet.sql
-- and was never applied (verified absent on prod Neon 2026-11-20), so CI's
-- `prisma migrate diff --exit-code` drift check failed on every run.
--
-- Shape is exactly what `prisma migrate diff --to-schema-datamodel` emits for
-- the model (no DEFAULT on "updatedAt": the schema declares @updatedAt, which
-- the Prisma client writes explicitly; adding a DB default would itself be
-- drift). IF NOT EXISTS guards keep the migration idempotent in case an
-- operator applied the docs/ops blueprint by hand first, mirroring the guarded
-- style of 20261113_board_quarantine_and_hnsw_fix.

-- CreateTable
CREATE TABLE IF NOT EXISTS "sealed_slate_packets" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "windowSlot" VARCHAR(32) NOT NULL,
    "lockVersion" VARCHAR(16) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'SEALED',
    "payloadJson" JSONB NOT NULL,
    "proseJson" JSONB,
    "dfsJson" JSONB,
    "sha256Receipt" VARCHAR(64) NOT NULL,
    "governedSignature" TEXT,
    "r2ObjectKey" VARCHAR(256),
    "sealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sealed_slate_packets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sealed_slate_packets_season_week_status_sealedAt_idx" ON "sealed_slate_packets"("season", "week", "status", "sealedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sealed_slate_packets_season_week_windowSlot_lockVersion_key" ON "sealed_slate_packets"("season", "week", "windowSlot", "lockVersion");