-- AlterTable
ALTER TABLE "pick_proof_receipts" ADD COLUMN     "slateKey" TEXT;

-- CreateTable
CREATE TABLE "slate_commitments" (
    "id" TEXT NOT NULL,
    "slateKey" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slate_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slate_commitments_slateKey_key" ON "slate_commitments"("slateKey");

-- CreateIndex
CREATE INDEX "slate_commitments_committedAt_idx" ON "slate_commitments"("committedAt");

-- CreateIndex
CREATE INDEX "pick_proof_receipts_slateKey_idx" ON "pick_proof_receipts"("slateKey");

-- AddForeignKey
ALTER TABLE "pick_proof_receipts" ADD CONSTRAINT "pick_proof_receipts_slateKey_fkey" FOREIGN KEY ("slateKey") REFERENCES "slate_commitments"("slateKey") ON DELETE SET NULL ON UPDATE CASCADE;

