-- CreateTable
-- Regenerated: the previously-committed version of this migration was missing
-- both base CREATE TABLE statements (it contained only a later ALTER TABLE
-- adding `teamIndex`), which would have failed `prisma migrate deploy` in
-- production against a table that was never created. Never applied to any
-- real database (this PR has not merged), so safe to correct in place rather
-- than layering a fix-up migration on top of a broken one.
CREATE TABLE "filter_state_snapshots" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "observations" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "teamIndex" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "filter_state_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "filter_state_snapshots_scope_key" ON "filter_state_snapshots"("scope");

-- CreateTable
CREATE TABLE "shadow_signals" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "shadowProb" DOUBLE PRECISION NOT NULL,
  "marketProb" DOUBLE PRECISION NOT NULL,
  "liveConfidence" INTEGER,
  "outcome" INTEGER,
  "modelProbs" JSONB,
  "settledAt" TIMESTAMP(3),
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shadow_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shadow_signals_gameId_modelVersion_key" ON "shadow_signals"("gameId", "modelVersion");
CREATE INDEX "shadow_signals_settledAt_idx" ON "shadow_signals"("settledAt");
CREATE INDEX "shadow_signals_evaluatedAt_idx" ON "shadow_signals"("evaluatedAt");
