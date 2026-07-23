-- Compliance Control Monitor (CCM) + ISMS alignment kit — additive tables.
-- Independent of SRQC/admitUnderSRQC and of packages/governed; this package
-- MONITORS control state after the fact, it never gates anything. Same
-- re-apply doctrine as the prior migrations in this directory: additive,
-- IF NOT EXISTS-guarded, safe to run twice against a database that already
-- has these tables.

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_evidence" (
    "id"          TEXT NOT NULL,
    "controlId"   TEXT NOT NULL,
    "source"      TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "uri"         TEXT,
    "meta"        JSONB,

    CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_evidence_controlId_collectedAt_idx" ON "compliance_evidence"("controlId", "collectedAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_check_run" (
    "id"      TEXT NOT NULL,
    "at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok"      BOOLEAN NOT NULL,
    "results" JSONB NOT NULL,

    CONSTRAINT "compliance_check_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_exception" (
    "id"        TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "detail"    TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt"  TIMESTAMP(3),

    CONSTRAINT "compliance_exception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_exception_status_controlId_idx" ON "compliance_exception"("status", "controlId");
