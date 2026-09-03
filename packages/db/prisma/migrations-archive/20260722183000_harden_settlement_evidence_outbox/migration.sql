-- Settlement evidence + outbox HARDENING (directive section 6, PR #161).
--
-- Corrects, on the still-draft evidence/outbox tables introduced by
-- 20260722090000_add_settlement_evidence_outbox:
--   6.1 Durable SettlementRun identity — a scheduler retry / process restart
--       reuses the same run id (upsert on idempotencyKey) instead of minting
--       randomUUID() per settleSport() call and fabricating corroboration.
--   6.2 Evidence FKs flip CASCADE → RESTRICT: append-only evidence cannot be
--       erased by deleting a parent game/pick/anomaly row.
--   6.3 OwnerDecisionRequest (idempotent queue request) + append-only
--       SettlementDecisionEvent history replace the consumed-single-decision
--       design.
--   6.4 pick_settlement_deliveries: one row per follower x channel x
--       destination x event with an honest per-delivery state machine.
--   6.5 Lease/fencing columns (leaseToken/leaseOwner/leaseExpiresAt/
--       nextAttemptAt/claimVersion) on deliveries.
--   6.6 Immutable event payload + settlement-time recipient materialization
--       columns on pick_settlement_events.
--   6.10 post_settlement_work: durable repairable work-state for CLV /
--        snapshot / TeamGameLog post-processing.
--
-- Written IF NOT EXISTS / guarded DO blocks end to end so the migration is
-- safe to re-apply (same doctrine as 20260722090000). TEXT state columns,
-- not native enums (no `CREATE TYPE IF NOT EXISTS` in Postgres).
-- The only non-additive statements are the FK swaps, which are
-- constraint-name-guarded and never touch row data.

-- ── 6.1 durable settlement runs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "settlement_runs" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "scheduledWindow" TEXT NOT NULL,
    "sourceSnapshotFingerprint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReusedAt" TIMESTAMP(3),

    CONSTRAINT "settlement_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_runs_idempotencyKey_key"
    ON "settlement_runs"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "settlement_runs_sport_scheduledWindow_idx"
    ON "settlement_runs"("sport", "scheduledWindow");

-- New evidence columns (additive, nullable — pre-hardening rows keep NULL).
ALTER TABLE "settlement_observations"
    ADD COLUMN IF NOT EXISTS "sourceSnapshotFingerprint" TEXT,
    ADD COLUMN IF NOT EXISTS "sourceObservedAt" TIMESTAMP(3);

-- ── 6.2 CASCADE → RESTRICT on every evidence FK ────────────────────────────
-- Constraint names are Prisma's deterministic defaults from the prior
-- migration. DROP IF EXISTS + re-ADD inside a guarded DO block keeps the
-- swap re-appliable.
DO $$
BEGIN
    ALTER TABLE "settlement_observations" DROP CONSTRAINT IF EXISTS "settlement_observations_gameId_fkey";
    ALTER TABLE "settlement_observations"
        ADD CONSTRAINT "settlement_observations_gameId_fkey"
        FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "settlement_anomalies" DROP CONSTRAINT IF EXISTS "settlement_anomalies_gameId_fkey";
    ALTER TABLE "settlement_anomalies"
        ADD CONSTRAINT "settlement_anomalies_gameId_fkey"
        FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "settlement_decisions" DROP CONSTRAINT IF EXISTS "settlement_decisions_anomalyId_fkey";
    ALTER TABLE "settlement_decisions"
        ADD CONSTRAINT "settlement_decisions_anomalyId_fkey"
        FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "pick_settlement_events" DROP CONSTRAINT IF EXISTS "pick_settlement_events_pickId_fkey";
    ALTER TABLE "pick_settlement_events"
        ADD CONSTRAINT "pick_settlement_events_pickId_fkey"
        FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "pick_settlement_events" DROP CONSTRAINT IF EXISTS "pick_settlement_events_gameId_fkey";
    ALTER TABLE "pick_settlement_events"
        ADD CONSTRAINT "pick_settlement_events_gameId_fkey"
        FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- ── 6.3 owner request + append-only decision events ────────────────────────
CREATE TABLE IF NOT EXISTS "owner_decision_requests" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "requestKind" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_decision_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "owner_decision_requests_anomalyId_fkey"
        FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "owner_decision_requests_anomalyId_key"
    ON "owner_decision_requests"("anomalyId");

CREATE TABLE IF NOT EXISTS "settlement_decision_events" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "decisionKind" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorReceipt" JSONB NOT NULL,
    "priorState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_decision_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settlement_decision_events_anomalyId_fkey"
        FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "settlement_decision_events_anomalyId_createdAt_idx"
    ON "settlement_decision_events"("anomalyId", "createdAt");

-- ── 6.4/6.6 parent-event payload + recipient materialization ───────────────
ALTER TABLE "pick_settlement_events"
    ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "payload" JSONB,
    ADD COLUMN IF NOT EXISTS "recipientsMaterializedAt" TIMESTAMP(3);

-- ── 6.4/6.5 per-recipient/channel delivery rows with lease fencing ─────────
CREATE TABLE IF NOT EXISTS "pick_settlement_deliveries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "destinationVersion" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "claimVersion" INTEGER NOT NULL DEFAULT 0,
    "leaseToken" TEXT,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorClass" TEXT,
    "attemptHistory" JSONB,
    "latencyMs" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_settlement_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pick_settlement_deliveries_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "pick_settlement_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_deliveries_idempotencyKey_key"
    ON "pick_settlement_deliveries"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_deliveries_eventId_userId_channel_destinat_key"
    ON "pick_settlement_deliveries"("eventId", "userId", "channel", "destinationId");
CREATE INDEX IF NOT EXISTS "pick_settlement_deliveries_status_nextAttemptAt_idx"
    ON "pick_settlement_deliveries"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "pick_settlement_deliveries_eventId_idx"
    ON "pick_settlement_deliveries"("eventId");

-- ── 6.10 durable post-settlement work-state ────────────────────────────────
CREATE TABLE IF NOT EXISTS "post_settlement_work" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "post_settlement_work_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "post_settlement_work_subjectId_kind_key"
    ON "post_settlement_work"("subjectId", "kind");
CREATE INDEX IF NOT EXISTS "post_settlement_work_status_idx"
    ON "post_settlement_work"("status");
