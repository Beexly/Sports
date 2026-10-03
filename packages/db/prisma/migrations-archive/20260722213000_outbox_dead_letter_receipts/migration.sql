-- Durable owner-queue escalation for dead-lettered deliveries (directive
-- 6.5, PR #161 review fix): a delivery that exhausts its attempts becomes a
-- durable owner work item — not just a transient health-endpoint reason
-- string. Exactly once per delivery (unique deliveryId), append-only from
-- pipeline code, RESTRICT so the receipt survives its delivery row.
--
-- Written IF NOT EXISTS / guarded DO block, same re-apply doctrine as
-- 20260722090000 and 20260722183000: safe to run twice against a database
-- that already has this table (the acceptance harness proves this).

-- CreateTable
CREATE TABLE IF NOT EXISTS "outbox_dead_letter_receipts" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reason" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_dead_letter_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_dead_letter_receipts_deliveryId_key" ON "outbox_dead_letter_receipts"("deliveryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outbox_dead_letter_receipts_acknowledgedAt_createdAt_idx" ON "outbox_dead_letter_receipts"("acknowledgedAt", "createdAt");

-- AddForeignKey (constraint-name-guarded swap, same pattern as the prior
-- hardening migration's FK swaps — re-appliable, never touches row data)
DO $$
BEGIN
    ALTER TABLE "outbox_dead_letter_receipts" DROP CONSTRAINT IF EXISTS "outbox_dead_letter_receipts_deliveryId_fkey";
    ALTER TABLE "outbox_dead_letter_receipts"
        ADD CONSTRAINT "outbox_dead_letter_receipts_deliveryId_fkey"
        FOREIGN KEY ("deliveryId") REFERENCES "pick_settlement_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;
