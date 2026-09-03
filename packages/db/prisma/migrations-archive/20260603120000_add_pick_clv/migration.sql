-- Closing-Line Value (CLV) capture on picks.
-- Lock fields are written once at publish (immutable); close + graded fields are
-- filled at settlement by grading the lock against the derived closing line.
ALTER TABLE "picks" ADD COLUMN "clvLockLine" DOUBLE PRECISION,
ADD COLUMN "clvLockPrice" INTEGER,
ADD COLUMN "clvCloseLine" DOUBLE PRECISION,
ADD COLUMN "clvClosePrice" INTEGER,
ADD COLUMN "clvKind" TEXT,
ADD COLUMN "clvValue" DOUBLE PRECISION,
ADD COLUMN "clvVerdict" TEXT,
ADD COLUMN "clvCapturedAt" TIMESTAMP(3),
ADD COLUMN "clvGradedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "picks_clvVerdict_idx" ON "picks"("clvVerdict");
