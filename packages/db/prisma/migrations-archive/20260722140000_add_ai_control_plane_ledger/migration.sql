-- AI Control Plane — authoritative invocation claim / attempt / financial
-- attribution ledger + telemetry recovery queue (directive §9).
--
-- Additive and idempotent: tables/indexes use IF NOT EXISTS; columns use
-- ADD COLUMN IF NOT EXISTS; named constraints are (re)installed via guarded
-- DO $$ blocks so the file is byte-safe to re-apply — same hardening doctrine
-- as 20260717120000_add_watchlist. Zero destructive statements against data;
-- only obsolete CHECK constraint DEFINITIONS are dropped before re-adding
-- their widened replacements.
--
-- Enum-like columns are plain TEXT guarded by CHECK constraints, not native
-- Postgres enums (no `CREATE TYPE ... IF NOT EXISTS`); mirrors
-- OddsLineSnapshot.phase / Watchlist.entityType.
--
-- The founder applies this; it is never run automatically from this repo. CI
-- uses `prisma db push` against a disposable Postgres.

-- CreateTable: AiInvocation (atomic claim anchor, §9.2)
CREATE TABLE IF NOT EXISTS "ai_invocations" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "taskClass" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "dataClass" TEXT NOT NULL,
    "costMode" TEXT NOT NULL,
    "envClass" TEXT NOT NULL,
    "envClassSource" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorSubjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "telemetryStatus" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "requestFingerprint" TEXT NOT NULL,
    "executionOwnerToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "stealCount" INTEGER NOT NULL DEFAULT 0,
    "resultRef" TEXT,
    "resultHash" TEXT,
    "resultJson" JSONB,
    "blockedReasonCode" TEXT,
    "blockedDetail" TEXT,

    CONSTRAINT "ai_invocations_pkey" PRIMARY KEY ("id")
);

-- Columns for a pre-existing table shape (idempotent re-application).
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "requestFingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "executionOwnerToken" TEXT;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP(3);
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "stealCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "resultRef" TEXT;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "resultHash" TEXT;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "resultJson" JSONB;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "blockedReasonCode" TEXT;
ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "blockedDetail" TEXT;
ALTER TABLE "ai_invocations" ALTER COLUMN "requestFingerprint" DROP DEFAULT;

-- (Re)install invocation CHECK constraints: widened status set (§9.2/§9.6),
-- non-dispatchable BLOCKED rows (no owner token, a reason code required).
DO $$
BEGIN
  ALTER TABLE "ai_invocations" DROP CONSTRAINT IF EXISTS "ai_invocations_status_check";
  ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_status_check"
    CHECK ("status" IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'AMBIGUOUS', 'POLICY_BLOCKED', 'BUDGET_BLOCKED', 'BLOCKED'));
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_telemetryStatus_check') THEN
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_telemetryStatus_check"
      CHECK ("telemetryStatus" IN ('OK', 'DEGRADED'));
  END IF;
  ALTER TABLE "ai_invocations" DROP CONSTRAINT IF EXISTS "ai_invocations_envClassSource_check";
  ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_envClassSource_check"
    CHECK ("envClassSource" IN ('explicit', 'derived', 'UNRESOLVED'));
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_invocations_blocked_nondispatchable_check') THEN
    -- §9.6: a BLOCKED decision row is structurally non-dispatchable — it can
    -- never carry an execution owner token or a lease.
    ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_blocked_nondispatchable_check"
      CHECK ("status" <> 'BLOCKED' OR ("executionOwnerToken" IS NULL AND "leaseExpiresAt" IS NULL));
  END IF;
  -- §9.6: a BLOCKED row always carries a reason. ONE-WAY implication only:
  -- a CONFIGURATION_BLOCKED row reclaimed after the config was fixed keeps
  -- its blockedReasonCode/blockedDetail as durable incident history even
  -- after its status moves on (the incident record is never erased).
  ALTER TABLE "ai_invocations" DROP CONSTRAINT IF EXISTS "ai_invocations_blocked_reason_check";
  ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_blocked_reason_check"
    CHECK ("status" <> 'BLOCKED' OR "blockedReasonCode" IS NOT NULL);
END $$;

-- CreateTable: AiAttempt (§9.4 durable attempt semantics)
CREATE TABLE IF NOT EXISTS "ai_attempts" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "providerRequested" TEXT NOT NULL,
    "providerUsed" TEXT,
    "providerAccount" TEXT,
    "region" TEXT,
    "modelRequested" TEXT NOT NULL,
    "modelResolved" TEXT,
    "substitutionId" TEXT,
    "providerRequestId" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "pricingVersion" TEXT,
    "requestFingerprint" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "attemptNonce" TEXT NOT NULL,
    "resultHash" TEXT,

    CONSTRAINT "ai_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_attempts" ADD COLUMN IF NOT EXISTS "requestFingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ai_attempts" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ai_attempts" ADD COLUMN IF NOT EXISTS "attemptNonce" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ai_attempts" ADD COLUMN IF NOT EXISTS "resultHash" TEXT;
ALTER TABLE "ai_attempts" ALTER COLUMN "requestFingerprint" DROP DEFAULT;
ALTER TABLE "ai_attempts" ALTER COLUMN "policyVersion" DROP DEFAULT;
ALTER TABLE "ai_attempts" ALTER COLUMN "attemptNonce" DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_attempts_status_check') THEN
    ALTER TABLE "ai_attempts" ADD CONSTRAINT "ai_attempts_status_check"
      CHECK ("status" IN ('DISPATCHED', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'AMBIGUOUS'));
  END IF;
  -- Evidence preservation (§6.2 doctrine): RESTRICT, never CASCADE.
  ALTER TABLE "ai_attempts" DROP CONSTRAINT IF EXISTS "ai_attempts_invocationId_fkey";
  ALTER TABLE "ai_attempts" ADD CONSTRAINT "ai_attempts_invocationId_fkey"
    FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- CreateTable: AiFinancialAttribution (§9.5 constrained financial evidence)
CREATE TABLE IF NOT EXISTS "ai_financial_attributions" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "attemptId" TEXT,
    "estimatedGrossUsd" DECIMAL(12,6) NOT NULL,
    "fundingLabel" TEXT NOT NULL,
    "reconciledLabel" TEXT,
    "creditGrantSnapshotId" TEXT,
    "billedUsd" DECIMAL(12,6),
    "reconciledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT "ai_financial_attributions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_financial_attributions" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_financial_attributions" ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_fundingLabel_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_fundingLabel_check"
      CHECK ("fundingLabel" IN ('CASH_EXPECTED', 'CREDIT_ELIGIBLE_UNCONFIRMED', 'CREDIT_EXPECTED_FROM_ACTIVE_GRANT', 'LOCAL_RESOURCE', 'EXTERNAL_FREE_ALLOWANCE_UNCONFIRMED', 'BLOCKED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_reconciledLabel_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_reconciledLabel_check"
      CHECK ("reconciledLabel" IS NULL OR "reconciledLabel" IN ('CREDIT_APPLIED_CONFIRMED', 'CASH_CHARGED_CONFIRMED', 'NO_VENDOR_CHARGE_CONFIRMED', 'UNRECONCILED'));
  END IF;
  -- §9.5: no confirmed reconciliation fields without a reconciliation time.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_confirmed_requires_reconciledAt_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_confirmed_requires_reconciledAt_check"
      CHECK (("reconciledLabel" IS NULL AND "billedUsd" IS NULL) OR "reconciledAt" IS NOT NULL);
  END IF;
  -- §9.5: billed and estimated amounts are never negative.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_billed_nonnegative_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_billed_nonnegative_check"
      CHECK ("billedUsd" IS NULL OR "billedUsd" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_estimate_nonnegative_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_estimate_nonnegative_check"
      CHECK ("estimatedGrossUsd" >= 0);
  END IF;
  -- §9.5: a confirmed-credit label requires a grant allocation reference.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_credit_requires_grant_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_credit_requires_grant_check"
      CHECK ("reconciledLabel" IS DISTINCT FROM 'CREDIT_APPLIED_CONFIRMED' OR "creditGrantSnapshotId" IS NOT NULL);
  END IF;
  -- §9.5: version sanity.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_version_positive_check') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_version_positive_check"
      CHECK ("version" >= 1);
  END IF;
  -- Evidence preservation (§6.2 doctrine): RESTRICT, never CASCADE; and the
  -- §9.5 FK from attempt id.
  ALTER TABLE "ai_financial_attributions" DROP CONSTRAINT IF EXISTS "ai_financial_attributions_invocationId_fkey";
  ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_invocationId_fkey"
    FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_financial_attributions_attemptId_fkey') THEN
    ALTER TABLE "ai_financial_attributions" ADD CONSTRAINT "ai_financial_attributions_attemptId_fkey"
      FOREIGN KEY ("attemptId") REFERENCES "ai_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: AiTelemetryRecovery (§9.7 durable drain-later queue)
CREATE TABLE IF NOT EXISTS "ai_telemetry_recovery" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "ai_telemetry_recovery_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "ai_telemetry_recovery" DROP CONSTRAINT IF EXISTS "ai_telemetry_recovery_kind_check";
  ALTER TABLE "ai_telemetry_recovery" ADD CONSTRAINT "ai_telemetry_recovery_kind_check"
    CHECK ("kind" IN ('FINALIZE_SUCCESS', 'FINALIZE_AMBIGUOUS', 'FINALIZE_FAILURE', 'ATTEMPT_TELEMETRY'));
  -- Evidence preservation (§6.2 doctrine): RESTRICT, never CASCADE. The
  -- recovery queue exists precisely to preserve writes that could not land —
  -- a cascading delete of the parent invocation would silently drop exactly
  -- those undelivered writes (and a BLOCKED invocation, having no attempt or
  -- attribution children to RESTRICT on, would otherwise be freely deletable
  -- together with its recovery rows).
  ALTER TABLE "ai_telemetry_recovery" DROP CONSTRAINT IF EXISTS "ai_telemetry_recovery_invocationId_fkey";
  ALTER TABLE "ai_telemetry_recovery" ADD CONSTRAINT "ai_telemetry_recovery_invocationId_fkey"
    FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- CreateIndex — the atomic-claim anchor (§9.2): ON CONFLICT target.
CREATE UNIQUE INDEX IF NOT EXISTS "ai_invocations_requestId_taskClass_key" ON "ai_invocations"("requestId", "taskClass");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_invocations_taskClass_createdAt_idx" ON "ai_invocations"("taskClass", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_attempts_invocationId_ordinal_key" ON "ai_attempts"("invocationId", "ordinal");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_attempts_invocationId_idx" ON "ai_attempts"("invocationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_financial_attributions_invocationId_idx" ON "ai_financial_attributions"("invocationId");

-- CreateIndex — §9.5: version history unique per invocation…
CREATE UNIQUE INDEX IF NOT EXISTS "ai_financial_attributions_invocationId_version_key" ON "ai_financial_attributions"("invocationId", "version");

-- …and exactly ONE current attribution per invocation (partial unique index;
-- also the ON CONFLICT target of the idempotent pre-dispatch create).
CREATE UNIQUE INDEX IF NOT EXISTS "ai_financial_attributions_one_current_key"
  ON "ai_financial_attributions"("invocationId") WHERE "isCurrent";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_telemetry_recovery_deliveredAt_leaseExpiresAt_idx" ON "ai_telemetry_recovery"("deliveredAt", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_telemetry_recovery_invocationId_idx" ON "ai_telemetry_recovery"("invocationId");
