-- Versioned envelope: formal_incident + srqc_version (exactly-once runtime
-- handoff 2026-07-22, on top of Track A + Track B). formal_incident is the
-- durable row-store for an abstract CTI the Track B detection pass witnessed;
-- it is written at most once per witness event by reusing Track B's existing
-- processed_event gate (sink "formal_receipt_violation") — this migration adds
-- no dedup mechanism of its own. srqc_version is the human-activated
-- certificate-version register. Both are additive and IF NOT EXISTS-guarded,
-- same re-apply doctrine as the prior migrations in this directory (safe to
-- run twice against a database that already has these tables).
--
-- NOTE: formal_incident."srqcVersion" is a SOFT int reference to
-- srqc_version."version" — deliberately NOT a foreign key, so an incident can
-- be recorded even when no SrqcVersion row exists yet (detection must never be
-- blocked on certificate bookkeeping).

-- CreateTable
CREATE TABLE IF NOT EXISTS "formal_incident" (
    "id" TEXT NOT NULL,
    "violationKind" TEXT NOT NULL,
    "abstractState" JSONB NOT NULL,
    "eventIds" JSONB NOT NULL,
    "srqcVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formal_incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "formal_incident_status_createdAt_idx" ON "formal_incident"("status", "createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "srqc_version" (
    "version" INTEGER NOT NULL,
    "indInvHash" TEXT NOT NULL,
    "refinementReceiptHash" TEXT,
    "status" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "srqc_version_pkey" PRIMARY KEY ("version")
);
