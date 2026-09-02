-- Phase 3: persist Claude API cost records and per-surface budget overrides.
CREATE TABLE "claude_api_call_records" (
  "id" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DECIMAL(10, 6) NOT NULL,
  "userId" TEXT,
  "gameId" TEXT,
  "templateKind" TEXT,
  "durationMs" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "errorKind" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "claude_api_call_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claude_api_budgets" (
  "id" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "monthlyBudgetUsd" DECIMAL(10, 2) NOT NULL,
  "alertThresholds" JSONB NOT NULL,
  "overrideActive" BOOLEAN NOT NULL DEFAULT false,
  "overrideExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "claude_api_budgets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "claude_api_call_records_observedAt_idx"
  ON "claude_api_call_records"("observedAt");
CREATE INDEX "claude_api_call_records_surface_observedAt_idx"
  ON "claude_api_call_records"("surface", "observedAt");
CREATE INDEX "claude_api_call_records_userId_idx"
  ON "claude_api_call_records"("userId");
CREATE INDEX "claude_api_call_records_gameId_idx"
  ON "claude_api_call_records"("gameId");

CREATE UNIQUE INDEX "claude_api_budgets_surface_key"
  ON "claude_api_budgets"("surface");

ALTER TABLE "claude_api_call_records"
  ADD CONSTRAINT "claude_api_call_records_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "claude_api_call_records"
  ADD CONSTRAINT "claude_api_call_records_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "games"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
