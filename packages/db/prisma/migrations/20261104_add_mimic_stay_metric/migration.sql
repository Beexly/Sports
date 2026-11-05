-- Migration: Add MimicStayMetric table for GSI-WP-05 v3.0 / v4.0 TEB Clinical Evaluations
-- Model: MimicStayMetric (schema.prisma -> @@map("mimic_stay_metrics"))

CREATE TABLE IF NOT EXISTS "mimic_stay_metrics" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "septicShockOutcome" BOOLEAN NOT NULL,
    "clockVelocityDispersion" DOUBLE PRECISION NOT NULL,
    "dtwTemporalSlippage" DOUBLE PRECISION NOT NULL,
    "seifertIrreversibleEntropy" DOUBLE PRECISION NOT NULL,
    "chenLevyAreaCirculation" DOUBLE PRECISION NOT NULL,
    "v3UnifiedScore" DOUBLE PRECISION NOT NULL,
    "conformalSelectiveTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mimic_stay_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mimic_stay_metrics_stayId_key" ON "mimic_stay_metrics"("stayId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mimic_stay_metrics_septicShockOutcome_idx" ON "mimic_stay_metrics"("septicShockOutcome");
