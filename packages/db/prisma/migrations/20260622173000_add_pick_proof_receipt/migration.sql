-- CreateTable
CREATE TABLE "pick_proof_receipts" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "modelProb" DOUBLE PRECISION NOT NULL,
    "marketFairProb" DOUBLE PRECISION NOT NULL,
    "edge" DOUBLE PRECISION NOT NULL,
    "entryOdds" INTEGER NOT NULL,
    "line" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pick_proof_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pick_proof_receipts_pickId_key" ON "pick_proof_receipts"("pickId");

-- CreateIndex
CREATE INDEX "pick_proof_receipts_contentHash_idx" ON "pick_proof_receipts"("contentHash");

-- AddForeignKey
ALTER TABLE "pick_proof_receipts" ADD CONSTRAINT "pick_proof_receipts_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

