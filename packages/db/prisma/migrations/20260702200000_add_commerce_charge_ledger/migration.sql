-- Append-only processed-charge ledger for crypto passes (idempotency spine).
-- Insert-before-grant; unique chargeCode makes webhook replays no-ops and
-- preserves the record of every distinct payment (a second real payment
-- extends the pass instead of disappearing).

-- CreateTable
CREATE TABLE "commerce_charges" (
    "id" TEXT NOT NULL,
    "chargeCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "stripeSubToCancel" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commerce_charges_chargeCode_key" ON "commerce_charges"("chargeCode");

-- CreateIndex
CREATE INDEX "commerce_charges_userId_idx" ON "commerce_charges"("userId");
