-- AI Control Plane — atomic budget reservations (Phase 2 PR-C, blueprint §C).
-- Two brand-new, empty tables written only by the DORMANT reservation engine
-- (apps/web/lib/ai-control-plane/budget.ts) and the dormant executeAiTask
-- facade; no call site uses either yet, so this is zero runtime change and NO
-- cash cost mode is enabled anywhere.
--
-- Purely additive and idempotent: every statement is IF NOT EXISTS (tables,
-- FKs inline in CREATE TABLE, indexes) so it is byte-safe to (re)apply anytime
-- — same hardening doctrine as 20260722140000_add_ai_control_plane_ledger,
-- 20260717120000_add_watchlist and 20260716120000_add_odds_line_snapshots.
-- Zero destructive statements.
--
-- Enum-like columns are plain TEXT guarded by CHECK constraints, not native
-- Postgres enums (no `CREATE TYPE ... IF NOT EXISTS`), mirroring the existing
-- convention (OddsLineSnapshot.phase / Watchlist.entityType / the PR-B tables).
--
-- The ATOMICITY GUARANTEE is a DB property, not an app one: reservation is a
-- single conditional UPDATE
--   UPDATE ai_budget_windows
--   SET reservedUsd = reservedUsd + $amount
--   WHERE id = $window AND reservedUsd + settledUsd + $amount <= capUsd;
-- Postgres row locking serializes concurrent writers on the same row and the
-- WHERE guard admits exactly the set of holds that fit under capUsd, so the
-- invariant reservedUsd + settledUsd <= capUsd can never be violated even under
-- unbounded concurrency. The engine acquires multiple windows in a fixed
-- lexicographic id order inside ONE transaction (deadlock-free, all-or-nothing).
--
-- The founder applies this; it is never run automatically from this repo. CI
-- uses `prisma db push` against a disposable Postgres.

-- CreateTable: AiBudgetWindow
CREATE TABLE IF NOT EXISTS "ai_budget_windows" (
    "id" TEXT NOT NULL,
    "scopeKind" TEXT NOT NULL,
    "capUsd" DECIMAL(12,6) NOT NULL,
    "reservedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "settledUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_budget_windows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_budget_windows_scopeKind_check" CHECK ("scopeKind" IN ('REQUEST', 'DAILY', 'MONTHLY', 'SURFACE', 'PROVIDER_ACCOUNT', 'ENTITY')),
    CONSTRAINT "ai_budget_windows_nonneg_check" CHECK ("reservedUsd" >= 0 AND "settledUsd" >= 0 AND "capUsd" >= 0)
);

-- CreateTable: AiBudgetReservation
CREATE TABLE IF NOT EXISTS "ai_budget_reservations" (
    "id" TEXT NOT NULL,
    "invocationId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "amountUsd" DECIMAL(12,6) NOT NULL,
    "state" TEXT NOT NULL,
    "settledUsd" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_budget_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_budget_reservations_state_check" CHECK ("state" IN ('HELD', 'SETTLED', 'RELEASED', 'EXPIRED')),
    CONSTRAINT "ai_budget_reservations_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "ai_budget_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_invocationId_idx" ON "ai_budget_reservations"("invocationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_windowId_idx" ON "ai_budget_reservations"("windowId");

-- CreateIndex: supports the sweepExpired scan (HELD past expiresAt).
CREATE INDEX IF NOT EXISTS "ai_budget_reservations_state_expiresAt_idx" ON "ai_budget_reservations"("state", "expiresAt");
