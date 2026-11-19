-- Migration blueprint for SealedSlatePacket (apply via Prisma migrate dev / operator Neon console).
-- Stored in docs/ops/migrations/ because packages/db/prisma/migrations/** is operator-gated.

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sealed_slate_packets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sealed_slate_packets_season_week_windowSlot_lockVersion_key"
  ON "sealed_slate_packets"("season", "week", "windowSlot", "lockVersion");

CREATE INDEX IF NOT EXISTS "sealed_slate_packets_season_week_status_sealedAt_idx"
  ON "sealed_slate_packets"("season", "week", "status", "sealedAt");
