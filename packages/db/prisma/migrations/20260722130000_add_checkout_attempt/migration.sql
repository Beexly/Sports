-- Durable CheckoutAttempt (PR #160, directive 5.1/5.3/5.4/5.5/5.7).
--
-- The server-side source of truth for checkout idempotency: one row per
-- (user, client intent) generation, carrying the FULL canonical commercial
-- fingerprint, the persisted Stripe idempotency key, and an outcome-classified
-- lifecycle (CREATED → REQUEST_IN_FLIGHT → SESSION_CREATED → COMPLETED, with
-- AMBIGUOUS/FAILED/EXPIRED/CANCELED handled by webhook + repair reconciliation).
--
-- Retention decision (5.7): the users FK is NULLABLE with ON DELETE SET NULL —
-- a financial audit record NEVER disappears because a user row is deleted.
-- subjectUserId/subjectEmail are immutable snapshots taken at creation so the
-- subject stays identifiable after detachment.
--
-- Audit identity (5.4): originalClientIntentId is written once and never
-- cleared; activeClientIntentId is the separate active-key column used by the
-- compound unique. CHECK constraints below make both invariants DB-enforced.
--
-- Safe reapplication doctrine: every statement is guarded (IF NOT EXISTS /
-- duplicate_object handling), so re-running this migration on a database that
-- already carries it is a no-op — proven by the disposable-Postgres rehearsal.
-- NOTE: a dev database carrying the earlier db-push-only DRAFT shape of
-- checkout_attempts (single clientIntentId column) must be reset (db push);
-- that shape never existed outside disposable sandboxes.
--
-- Rollback: this migration is purely additive. To roll back, drop in reverse
-- order (no other table references these objects):
--   DROP TABLE IF EXISTS "checkout_attempts";
--   DROP TYPE IF EXISTS "CheckoutOutcomeClass";
--   DROP TYPE IF EXISTS "CheckoutAttemptStatus";

-- CreateEnum (guarded)
DO $$ BEGIN
  CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('CREATED', 'REQUEST_IN_FLIGHT', 'SESSION_CREATED', 'AMBIGUOUS', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (guarded)
DO $$ BEGIN
  CREATE TYPE "CheckoutOutcomeClass" AS ENUM ('DEFINITIVE_REJECTION', 'AMBIGUOUS_NETWORK_OUTCOME', 'RETRIABLE_NO_REQUEST_SENT', 'CONFIGURATION_FAILURE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "checkout_attempts" (
    "id" TEXT NOT NULL,
    "originalClientIntentId" TEXT,
    "activeClientIntentId" TEXT,
    "userId" TEXT,
    "subjectUserId" TEXT NOT NULL,
    "subjectEmail" TEXT,
    "customerId" TEXT,
    "tier" "SubscriptionTier" NOT NULL,
    "interval" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requestFingerprint" TEXT NOT NULL,
    "fingerprintVersion" TEXT NOT NULL DEFAULT 'v2',
    "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "lastOutcomeClass" "CheckoutOutcomeClass",
    "stripeIdempotencyKey" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "lastErrorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_stripeIdempotencyKey_key" ON "checkout_attempts"("stripeIdempotencyKey");

-- CreateIndex (webhook reconciliation lookup)
CREATE INDEX IF NOT EXISTS "checkout_attempts_stripeSessionId_idx" ON "checkout_attempts"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_attempts_userId_idx" ON "checkout_attempts"("userId");

-- CreateIndex (retention: subject snapshot survives user deletion)
CREATE INDEX IF NOT EXISTS "checkout_attempts_subjectUserId_idx" ON "checkout_attempts"("subjectUserId");

-- CreateIndex (repair-job scan of unresolved/expiring attempts)
CREATE INDEX IF NOT EXISTS "checkout_attempts_status_expiresAt_idx" ON "checkout_attempts"("status", "expiresAt");

-- CreateIndex (race safety: one ACTIVE attempt per (user, intent);
-- NULL active keys are distinct, so released/token-less rows never collide)
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_attempts_userId_activeClientIntentId_key" ON "checkout_attempts"("userId", "activeClientIntentId");

-- AddForeignKey (guarded) — retention decision: SET NULL, never CASCADE.
DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- State CHECK constraints (guarded). Prisma cannot model CHECKs; they are the
-- DB-level enforcement of the attempt-lifecycle contract.

-- The active key is either the immutable original intent id or released (NULL):
-- history can never be rewritten to a different intent.
DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_active_key_matches_origin_chk"
    CHECK ("activeClientIntentId" IS NULL OR "activeClientIntentId" = "originalClientIntentId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Terminal non-completed attempts (FAILED/EXPIRED/CANCELED) must have released
-- their active key — a dead generation can never squat on an intent id.
-- (COMPLETED intentionally KEEPS its key so the same intent 409s forever.)
DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_terminal_key_released_chk"
    CHECK ("status" NOT IN ('FAILED', 'EXPIRED', 'CANCELED') OR "activeClientIntentId" IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A COMPLETED attempt always carries its completion timestamp.
DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_completed_at_chk"
    CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Commercial sanity: positive quantity, canonical lowercase currency.
DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_quantity_positive_chk"
    CHECK ("quantity" > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_currency_lowercase_chk"
    CHECK ("currency" = lower("currency"));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
