-- Trusted Actor Model (Phase 1B) — actor receipts + durable rate limiting.
--
-- Additive only. IF NOT EXISTS keeps every statement idempotent against a
-- database that already received the schema via `prisma db push` (the CI
-- doctrine) and against re-application. No column is dropped, renamed, or
-- narrowed; no data is rewritten.
--
-- actor_receipts (directive 4.3): one immutable row per audited write carrying
-- the COMPLETE TrustedActor audit contract. Audit rows reference receipts by
-- plain id (no FK on purpose: receipts are append-only and never deleted, and
-- an FK relation would couple their lifecycle to mutable domain rows).
--
-- rate_limit_counters (directive 4.1): durable fixed-window counters consumed
-- by ONE atomic conditional upsert (INSERT .. ON CONFLICT DO UPDATE .. WHERE
-- count < limit). Keys are opaque HMAC digests / internal ids — never raw IPs.
-- Retention is bounded (48h; see RATE_COUNTER_MAX_RETENTION_MS), supported by
-- the window_start index.

-- Actor receipts ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "actor_receipts" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "authorityScope" TEXT NOT NULL,
    "tenant" TEXT,
    "project" TEXT,
    "requestId" TEXT,
    "runId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "emailSnapshot" TEXT,
    "policyVersion" TEXT NOT NULL,
    "operation" TEXT,
    "credentialMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_receipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "actor_receipts_subjectId_observedAt_idx"
    ON "actor_receipts"("subjectId", "observedAt");
CREATE INDEX IF NOT EXISTS "actor_receipts_createdAt_idx"
    ON "actor_receipts"("createdAt");

-- Durable rate-limit counters --------------------------------------------------
CREATE TABLE IF NOT EXISTS "rate_limit_counters" (
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("scope", "key", "window_start")
);

CREATE INDEX IF NOT EXISTS "rate_limit_counters_window_start_idx"
    ON "rate_limit_counters"("window_start");

-- Receipt references on existing audit rows (additive + nullable) --------------
ALTER TABLE "moderation_reports" ADD COLUMN IF NOT EXISTS "reporterReceiptId" TEXT;
ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "actorReceiptId" TEXT;
ALTER TABLE "moderation_appeals" ADD COLUMN IF NOT EXISTS "appellantReceiptId" TEXT;
ALTER TABLE "moderation_appeals" ADD COLUMN IF NOT EXISTS "reviewerReceiptId" TEXT;
ALTER TABLE "agent_handoffs" ADD COLUMN IF NOT EXISTS "actor_receipt_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "actor_receipt_id" TEXT;
ALTER TABLE "subagent_runs" ADD COLUMN IF NOT EXISTS "reviewer_receipt_id" TEXT;
