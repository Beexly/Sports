-- W6 prerequisite: a human review label on FormalIncident, orthogonal to
-- `status`. `status` answers "is anyone still looking at this" (ops-queue
-- state); `reviewOutcome` answers "was this a real violation or a
-- projection/modeling artifact" — the correctness label the ablation
-- counters (ablation-counters.ts) aggregate over. Additive-only, nullable
-- columns; no backfill needed (existing rows are simply unreviewed).

-- AlterTable
ALTER TABLE "formal_incident" ADD COLUMN IF NOT EXISTS "reviewOutcome" TEXT;
ALTER TABLE "formal_incident" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "formal_incident" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "formal_incident_reviewOutcome_idx" ON "formal_incident"("reviewOutcome");
