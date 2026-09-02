-- Phase 2: persist gate decisions without changing existing pick or game behavior.
CREATE TYPE "GateDecisionStatus" AS ENUM ('SCORING', 'PUBLISHED', 'GATED');

CREATE TABLE "gate_decisions" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "pickId" TEXT,
  "status" "GateDecisionStatus" NOT NULL,
  "reason" VARCHAR(240) NOT NULL,
  "reasonCode" VARCHAR(80) NOT NULL,
  "edgeIndex" DOUBLE PRECISION,
  "confidence" INTEGER,
  "modelVersion" TEXT NOT NULL,
  "isBootstrap" BOOLEAN NOT NULL DEFAULT true,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidenceRefs" JSONB,

  CONSTRAINT "gate_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gate_decisions_gameId_idx" ON "gate_decisions"("gameId");
CREATE INDEX "gate_decisions_pickId_idx" ON "gate_decisions"("pickId");
CREATE INDEX "gate_decisions_status_evaluatedAt_idx" ON "gate_decisions"("status", "evaluatedAt");
CREATE INDEX "gate_decisions_isBootstrap_idx" ON "gate_decisions"("isBootstrap");

ALTER TABLE "gate_decisions"
  ADD CONSTRAINT "gate_decisions_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "games"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gate_decisions"
  ADD CONSTRAINT "gate_decisions_pickId_fkey"
  FOREIGN KEY ("pickId") REFERENCES "picks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
