-- Idempotent event ledger + processed_event (Track A, exactly-once runtime
-- handoff 2026-07-22). control_event_ledger is a generic, append-only record
-- of control-plane outcomes; processed_event is the per-(event, sink) gate a
-- pull-based consumer checks before acting, so replay of the same eventId
-- never produces more than one side effect per sink. Both are additive and
-- IF NOT EXISTS-guarded, same re-apply doctrine as the prior migrations in
-- this directory (safe to run twice against a database that already has
-- these tables).

-- CreateTable
-- `seq` is a monotonic BIGSERIAL insertion-order tiebreaker: control_event_ledger
-- rows are inserted by separate sequential SQL statements per invocation, so a
-- larger seq means "inserted later" — i.e. it reflects causal order even when two
-- events land in the SAME TIMESTAMP(3) createdAt millisecond. readRecentEvents
-- orders by (createdAt, seq) so the order-sensitive SRQC projection can never see
-- a FINALIZED_SUCCESS ahead of its own ATTEMPT_STARTED on a same-millisecond tie.
CREATE TABLE IF NOT EXISTS "control_event_ledger" (
    "eventId" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_event_ledger_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "control_event_ledger_seq_key" ON "control_event_ledger"("seq");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "control_event_ledger_source_sourceId_idx" ON "control_event_ledger"("source", "sourceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "control_event_ledger_createdAt_idx" ON "control_event_ledger"("createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "processed_event" (
    "eventId" TEXT NOT NULL,
    "sink" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("eventId","sink")
);

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "processed_event" ADD CONSTRAINT "processed_event_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "control_event_ledger"("eventId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
