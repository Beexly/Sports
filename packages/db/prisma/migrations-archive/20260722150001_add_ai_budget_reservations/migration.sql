-- AI Control Plane — atomic budget reservations (Phase 2 PR-C, blueprint §C,
-- hardened per directive §10).
--
-- Two brand-new, empty tables written only by the DORMANT reservation engine
-- (apps/web/lib/ai-control-plane/budget.ts) and the sealed executor's §9
-- pipeline; no call site uses either yet, so this is zero runtime change and
-- NO cash cost mode is enabled anywhere.
--
-- Purely additive and idempotent: every statement is IF NOT EXISTS / guarded
-- so it is byte-safe to (re)apply anytime — same hardening doctrine as
-- 20260722140000_add_ai_control_plane_ledger. Zero data-destructive
-- statements (the tail's constraint drop+re-add pairs touch only constraint
-- definitions, never rows, and re-validate all existing rows on re-add).
--
-- Enum-like columns are plain TEXT guarded by CHECK constraints, not native
-- Postgres enums, mirroring the existing convention.
--
-- ── THE CAP INVARIANT IS A DATABASE PROPERTY (§10.2) ──
-- Money that counts against a window's cash cap is
--     reservedUsd (worst-case holds, incl. reconciliation holds)
--   + provisionalUsd (provisionally settled actuals, pre-reconciliation)
--   + confirmedBilledUsd (reconciled billed actuals)
-- and the DB CHECK below refuses any row where that sum exceeds capUsd —
-- UNLESS the window is OVERAGE_LOCKED: when an actual charge exceeded its
-- hold, the REAL charge is preserved (never truncated to fit the cap), the
-- window locks (its state blocks every further reserve via the engine's
-- conditional UPDATE `AND state = 'ACTIVE'`), and an owner incident fires.
-- Silent negative or over-cap state is impossible; an over-cap state is
-- representable ONLY together with the explicit OVERAGE_LOCKED circuit
-- breaker.
--
-- Reservation is a single conditional UPDATE (never read-then-write):
--   UPDATE ai_budget_windows
--   SET reservedUsd = reservedUsd + $amount
--   WHERE id = $window AND state = 'ACTIVE'
--     AND reservedUsd + provisionalUsd + confirmedBilledUsd + $amount <= capUsd;
-- Postgres row locking serializes concurrent writers; the WHERE guard admits
-- exactly the set of holds that fit. Multi-window acquisition happens in fixed
-- lexicographic id order inside ONE transaction (deadlock-free,
-- all-or-nothing).
--
-- The founder applies this; it is never run automatically from this repo. CI
-- uses `prisma db push` against a disposable Postgres (db push does not emit
-- CHECK constraints, so the PG acceptance test applies this file directly).

-- CreateTable: AiBudgetWindow
CREATE TABLE IF NOT EXISTS "ai_budget_windows" (
    "id" TEXT NOT NULL,
    "scopeKind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capUsd" DECIMAL(12,6) NOT NULL,
    -- §10.7: reserved / provisional / confirmed-billed / confirmed-credit /
    -- released / disputed are tracked SEPARATELY — worst-case holds are never
    -- reported as settled actuals.
    "reservedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "provisionalUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "confirmedBilledUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "confirmedCreditUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "releasedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "disputedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_budget_windows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_budget_windows_scopeKind_check"
      CHECK ("scopeKind" IN ('REQUEST', 'DAILY', 'MONTHLY', 'SURFACE', 'PROVIDER_ACCOUNT', 'ENTITY', 'EMERGENCY_OVERRIDE')),
    CONSTRAINT "ai_budget_windows_state_check"
      CHECK ("state" IN ('ACTIVE', 'OVERAGE_LOCKED')),
    CONSTRAINT "ai_budget_windows_nonneg_check"
      CHECK ("capUsd" >= 0 AND "reservedUsd" >= 0 AND "provisionalUsd" >= 0
         AND "confirmedBilledUsd" >= 0 AND "confirmedCreditUsd" >= 0
         AND "releasedUsd" >= 0 AND "disputedUsd" >= 0),
    -- §10.2: the cap invariant lives in the DATABASE. Over-cap is
    -- representable ONLY under the explicit OVERAGE_LOCKED circuit breaker.
    CONSTRAINT "ai_budget_windows_cap_check"
      CHECK ("reservedUsd" + "provisionalUsd" + "confirmedBilledUsd" <= "capUsd"
             OR "state" = 'OVERAGE_LOCKED')
);

-- CreateTable: AiBudgetReservation
CREATE TABLE IF NOT EXISTS "ai_budget_reservations" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    -- §10.6: (invocationId, windowId, reservationVersion) is UNIQUE — the
    -- idempotency key for reserve; a duplicate reserve returns the existing
    -- hold instead of double-holding.
    "reservationVersion" INTEGER NOT NULL DEFAULT 1,
    "amountUsd" DECIMAL(12,6) NOT NULL,
    -- §10.1 reservation lifecycle:
    --   HELD                  → worst-case hold before/after dispatch
    --   PROVISIONALLY_SETTLED → actual applied, pre-reconciliation
    --   RECONCILIATION_HOLD   → ambiguous/unproven charge: NEVER sweepable,
    --                           resolves only via authoritative reconcile
    --   CONFIRMED_SETTLED     → reconciled (billed or credit)
    --   RELEASED              → freed without a charge
    --   EXPIRED               → freed by the sweeper (proven-clean stale hold)
    "state" TEXT NOT NULL,
    "provisionalUsd" DECIMAL(12,6),
    "confirmedUsd" DECIMAL(12,6),
    "confirmedKind" TEXT,
    -- True when the provisional actual exceeded the hold (§10.2 overage).
    "overage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_budget_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_budget_reservations_state_check"
      CHECK ("state" IN ('HELD', 'PROVISIONALLY_SETTLED', 'RECONCILIATION_HOLD', 'CONFIRMED_SETTLED', 'RELEASED', 'EXPIRED')),
    CONSTRAINT "ai_budget_reservations_nonneg_check"
      CHECK ("amountUsd" >= 0
         AND ("provisionalUsd" IS NULL OR "provisionalUsd" >= 0)
         AND ("confirmedUsd" IS NULL OR "confirmedUsd" >= 0)),
    CONSTRAINT "ai_budget_reservations_version_check"
      CHECK ("reservationVersion" >= 1),
    -- §10.7: provisional/confirmed fields exist ONLY in the states that mean
    -- them — a worst-case hold can never masquerade as a settled actual —
    -- AND a PROVISIONALLY_SETTLED row must CARRY its provisional amount (a
    -- settled-without-an-amount row is unrepresentable, so window arithmetic
    -- can never under-decrement provisional money). provisionalUsd MAY remain
    -- on CONFIRMED_SETTLED (audit trail of the pre-reconciliation amount) but
    -- is NOT required there: a row confirmed straight from
    -- RECONCILIATION_HOLD never had one.
    CONSTRAINT "ai_budget_reservations_provisional_state_check"
      CHECK (("provisionalUsd" IS NULL OR "state" IN ('PROVISIONALLY_SETTLED', 'CONFIRMED_SETTLED'))
         AND ("state" <> 'PROVISIONALLY_SETTLED' OR "provisionalUsd" IS NOT NULL)),
    CONSTRAINT "ai_budget_reservations_confirmed_state_check"
      CHECK (("state" = 'CONFIRMED_SETTLED') = ("confirmedUsd" IS NOT NULL)),
    CONSTRAINT "ai_budget_reservations_confirmed_kind_check"
      CHECK (("confirmedUsd" IS NULL) = ("confirmedKind" IS NULL)),
    CONSTRAINT "ai_budget_reservations_confirmed_kind_enum_check"
      CHECK ("confirmedKind" IS NULL OR "confirmedKind" IN ('BILLED', 'CREDIT')),
    -- §10.6: relational integrity. BOTH parents RESTRICT — financial evidence
    -- must never be silently deleted out from under a hold, and that doctrine
    -- covers the window side too: deleting an ai_budget_windows row must NOT
    -- cascade away its RECONCILIATION_HOLD / CONFIRMED_SETTLED reservation
    -- evidence. A window with any reservation history is undeletable.
    CONSTRAINT "ai_budget_reservations_windowId_fkey"
      FOREIGN KEY ("windowId") REFERENCES "ai_budget_windows"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_budget_reservations_invocationId_fkey"
      FOREIGN KEY ("invocationId") REFERENCES "ai_invocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- §10.6 idempotency key.
CREATE UNIQUE INDEX IF NOT EXISTS "ai_budget_reservations_invocation_window_version_key"
  ON "ai_budget_reservations"("invocationId", "windowId", "reservationVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_invocationId_idx" ON "ai_budget_reservations"("invocationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_windowId_idx" ON "ai_budget_reservations"("windowId");

-- CreateIndex: supports the sweepExpired scan (HELD past expiresAt).
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_state_expiresAt_idx" ON "ai_budget_reservations"("state", "expiresAt");

-- ── Draft-lineage drift remediation (idempotent) ──
-- A database that applied an EARLIER draft of this file may still carry
--   (a) ON DELETE CASCADE on the window FK, and
--   (b) the one-directional provisional-state CHECK.
-- Re-issuing drop+add here aligns any such database with the constraints the
-- CREATE TABLE above declares; on a fresh apply this is a semantic no-op.
-- Both ADDs validate existing rows, so drift can never survive silently.
ALTER TABLE "ai_budget_reservations"
  DROP CONSTRAINT IF EXISTS "ai_budget_reservations_windowId_fkey";
ALTER TABLE "ai_budget_reservations"
  ADD CONSTRAINT "ai_budget_reservations_windowId_fkey"
    FOREIGN KEY ("windowId") REFERENCES "ai_budget_windows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_budget_reservations"
  DROP CONSTRAINT IF EXISTS "ai_budget_reservations_provisional_state_check";
ALTER TABLE "ai_budget_reservations"
  ADD CONSTRAINT "ai_budget_reservations_provisional_state_check"
    CHECK (("provisionalUsd" IS NULL OR "state" IN ('PROVISIONALLY_SETTLED', 'CONFIRMED_SETTLED'))
       AND ("state" <> 'PROVISIONALLY_SETTLED' OR "provisionalUsd" IS NOT NULL));
