-- W1 shadow metrics: one row per Track B (formal-receipt-job.ts) detection
-- pass, whether or not that pass witnessed a violation. Base-rate operating
-- evidence, additive-only. PURE OBSERVATION: no admission/control-plane
-- decision reads this table; deleting it changes no runtime behavior.
--
-- No unique constraint on (windowSince, windowUntil): an overlapping or
-- duplicate cron re-run over the same window is expected (see
-- formal-receipt-job.ts's own "overlap is intentionally cheap here" doc
-- comment) and simply produces a second, redundant-but-harmless metric
-- sample with the same counts.

-- CreateTable
CREATE TABLE IF NOT EXISTS "srqc_shadow_metric" (
    "id" TEXT NOT NULL,
    "windowSince" TIMESTAMP(3) NOT NULL,
    "windowUntil" TIMESTAMP(3) NOT NULL,
    "eventsSeen" INTEGER NOT NULL,
    "ge2Count" INTEGER NOT NULL,
    "rejectedUnbound" INTEGER NOT NULL,
    "admitWouldRefuse" INTEGER NOT NULL,
    "srqcVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srqc_shadow_metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "srqc_shadow_metric_windowSince_idx" ON "srqc_shadow_metric"("windowSince");
