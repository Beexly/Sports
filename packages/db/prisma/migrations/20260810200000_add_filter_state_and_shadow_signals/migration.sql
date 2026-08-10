-- CreateTable
CREATE TABLE "filter_state_snapshots" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filter_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadow_signals" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "shadowProb" DOUBLE PRECISION NOT NULL,
    "marketProb" DOUBLE PRECISION NOT NULL,
    "liveConfidence" INTEGER,
    "outcome" INTEGER,
    "settledAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadow_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "filter_state_snapshots_scope_key" ON "filter_state_snapshots"("scope");

-- CreateIndex
CREATE INDEX "shadow_signals_settledAt_idx" ON "shadow_signals"("settledAt");

-- CreateIndex
CREATE INDEX "shadow_signals_evaluatedAt_idx" ON "shadow_signals"("evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shadow_signals_gameId_modelVersion_key" ON "shadow_signals"("gameId", "modelVersion");

