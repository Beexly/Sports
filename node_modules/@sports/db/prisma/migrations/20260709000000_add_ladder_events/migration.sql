-- Backfill the missing migration for the LadderEvent model.
--
-- The `LadderEvent` model (schema.prisma → @@map("ladder_events")) was added to
-- the datamodel and is used by production code (packages/prediction-engine/src/
-- ladder/heartbeat.ts + reduce.ts) WITHOUT a corresponding migration, so the
-- table never existed in the database. Deploying that code without this table
-- fails at runtime (Prisma P2021 "table does not exist") on the ladder path —
-- which is exactly why the fail-closed migration gate correctly refused to ship
-- it. This migration reconciles the schema drift: it creates the table and the
-- six indexes the model declares.
--
-- Additive and safe: a brand-new, empty table. The index builds are instant
-- (no rows), so plain CREATE INDEX is used (no CONCURRENTLY needed).

-- CreateTable
CREATE TABLE "ladder_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "track" TEXT,
    "modelVersion" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladder_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ladder_events_idempotencyKey_key" ON "ladder_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ladder_events_type_idx" ON "ladder_events"("type");

-- CreateIndex
CREATE INDEX "ladder_events_track_idx" ON "ladder_events"("track");

-- CreateIndex
CREATE INDEX "ladder_events_modelVersion_idx" ON "ladder_events"("modelVersion");

-- CreateIndex
CREATE INDEX "ladder_events_sourceEventId_idx" ON "ladder_events"("sourceEventId");

-- CreateIndex
CREATE INDEX "ladder_events_occurredAt_idx" ON "ladder_events"("occurredAt");
