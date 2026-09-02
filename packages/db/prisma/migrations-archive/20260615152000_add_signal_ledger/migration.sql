-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "valueRaw" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 0,
    "week" INTEGER NOT NULL DEFAULT 0,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signals_entityType_entityId_idx" ON "signals"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "signals_category_idx" ON "signals"("category");

-- CreateIndex
CREATE UNIQUE INDEX "signals_entityType_entityId_key_season_week_key" ON "signals"("entityType", "entityId", "key", "season", "week");

