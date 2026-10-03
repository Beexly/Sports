-- AI Control Plane — atomic credit-grant authorization reservation ledger
-- (Phase 2 PR-D, directive §11.3).
--
-- Additive and idempotent: tables/indexes use IF NOT EXISTS; named
-- constraints are (re)installed via guarded DO $$ blocks so the file is
-- byte-safe to re-apply — same hardening doctrine as
-- 20260722150000_add_ai_budget_reservations. Zero destructive statements.
--
-- PR-D does NOT own credit-grant snapshots (NOVA/S5 does). These two tables
-- are PR-D's own local reservation ledger, preventing a double-spend across
-- concurrent CreditAuthorizationPort.authorize() calls against the same
-- grant. "grantId" is intentionally NOT a foreign key into any NOVA/S5
-- table — S5's snapshot materialization is a separate persistence unit and
-- this migration must not create a hard ordering dependency on it landing
-- first.
--
-- The founder applies this; it is never run automatically from this repo.
-- CI uses `prisma db push` against a disposable Postgres.

CREATE TABLE IF NOT EXISTS "credit_grant_reservation_ledger" (
    "grantId"            TEXT NOT NULL,
    "reservedMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_grant_reservation_ledger_pkey" PRIMARY KEY ("grantId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservation_ledger_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservation_ledger" ADD CONSTRAINT "credit_grant_reservation_ledger_nonnegative_check"
      CHECK ("reservedMinorUnits" >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "credit_grant_reservations" (
    "id"                TEXT NOT NULL,
    "grantId"           TEXT NOT NULL,
    "amountMinorUnits"  BIGINT NOT NULL,
    "state"             TEXT NOT NULL,
    "settledMinorUnits" BIGINT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_grant_reservations_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_state_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_state_check"
      CHECK ("state" IN ('HELD', 'SETTLED', 'RELEASED', 'EXPIRED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_amount_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_amount_nonnegative_check"
      CHECK ("amountMinorUnits" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_grant_reservations_settled_nonnegative_check') THEN
    ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_settled_nonnegative_check"
      CHECK ("settledMinorUnits" IS NULL OR "settledMinorUnits" >= 0);
  END IF;
  ALTER TABLE "credit_grant_reservations" DROP CONSTRAINT IF EXISTS "credit_grant_reservations_grantId_fkey";
  ALTER TABLE "credit_grant_reservations" ADD CONSTRAINT "credit_grant_reservations_grantId_fkey"
    FOREIGN KEY ("grantId") REFERENCES "credit_grant_reservation_ledger"("grantId") ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

CREATE INDEX IF NOT EXISTS "credit_grant_reservations_grantId_idx" ON "credit_grant_reservations"("grantId");

CREATE INDEX IF NOT EXISTS "credit_grant_reservations_state_expiresAt_idx" ON "credit_grant_reservations"("state", "expiresAt");
