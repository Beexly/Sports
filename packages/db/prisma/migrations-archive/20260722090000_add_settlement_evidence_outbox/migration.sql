-- Settlement Evidence + Transactional Outbox (Phase 1E).
--
-- Converges and replaces two rejected designs:
--   * #157's in-place Game sighting counter (read-count-then-increment was
--     not atomic; retries counted as corroboration; score arrival RESET the
--     counter, destroying anomaly history).
--   * #144's in-loop settlement notification hook (fail-isolated but not
--     durable: a crash after the pick update lost the notification, a blind
--     retry risked duplicates).
--
-- Four brand-new, purely additive tables. Written IF NOT EXISTS end to end
-- (tables, FKs inline in the CREATE TABLE, unique indexes, indexes) so the
-- migration is byte-safe to re-apply — same hardening doctrine as
-- 20260717120000_add_watchlist and 20260719120000_add_push_subscriptions.
-- Zero destructive statements. State-machine columns are TEXT (not native
-- Postgres enums) per the Watchlist.entityType convention: Postgres has no
-- `CREATE TYPE ... IF NOT EXISTS`, so a new native enum would not be safely
-- re-appliable. `result` reuses the existing "PickResult" enum type, which
-- is guaranteed to exist (the picks table depends on it).

-- Append-only deduplicated sightings. The compound unique
-- (gameId, settlementRunId, payloadFingerprint) is the retry firewall:
-- re-inserting the same run/payload is a no-op (ON CONFLICT DO NOTHING), so
-- a retry can never count as fresh corroboration. Corroboration is derived
-- by COUNT(DISTINCT "settlementRunId") — never an in-place counter.
CREATE TABLE IF NOT EXISTS "settlement_observations" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "settlementRunId" TEXT NOT NULL,
    "payloadFingerprint" TEXT NOT NULL,
    "observedSourceStatus" TEXT NOT NULL,
    "homeScorePresent" BOOLEAN NOT NULL,
    "awayScorePresent" BOOLEAN NOT NULL,
    "mappingStatus" TEXT NOT NULL,
    "freshnessState" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settlement_observations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_observations_gameId_settlementRunId_payloadFing_key"
    ON "settlement_observations"("gameId", "settlementRunId", "payloadFingerprint");

CREATE INDEX IF NOT EXISTS "settlement_observations_gameId_idx" ON "settlement_observations"("gameId");

-- At most one anomaly row per (gameId, anomalyType) — the unique constraint
-- IS the single-open-anomaly invariant, and what makes the race-safe
-- upsert-by-unique pattern possible.
CREATE TABLE IF NOT EXISTS "settlement_anomalies" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distinctRunCount" INTEGER NOT NULL DEFAULT 1,
    "resolutionActor" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionReason" TEXT,

    CONSTRAINT "settlement_anomalies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settlement_anomalies_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_anomalies_gameId_anomalyType_key"
    ON "settlement_anomalies"("gameId", "anomalyType");

CREATE INDEX IF NOT EXISTS "settlement_anomalies_state_idx" ON "settlement_anomalies"("state");

-- Durable owner-decision receipt. The unique FK on anomalyId is the
-- exactly-once guarantee for review-threshold promotion.
CREATE TABLE IF NOT EXISTS "settlement_decisions" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "decisionKind" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settlement_decisions_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "settlement_anomalies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_decisions_anomalyId_key"
    ON "settlement_decisions"("anomalyId");

-- Transactional outbox: appended in the SAME transaction as the pick's
-- PENDING→result update. pickId unique: one settlement = one event.
CREATE TABLE IF NOT EXISTS "pick_settlement_events" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "result" "PickResult" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "channelOutcomes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pick_settlement_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pick_settlement_events_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pick_settlement_events_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pick_settlement_events_pickId_key"
    ON "pick_settlement_events"("pickId");

CREATE INDEX IF NOT EXISTS "pick_settlement_events_status_claimedAt_idx"
    ON "pick_settlement_events"("status", "claimedAt");
