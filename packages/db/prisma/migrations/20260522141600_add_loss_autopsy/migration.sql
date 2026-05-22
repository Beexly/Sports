-- CreateEnum
CREATE TYPE "LossAutopsyStatus" AS ENUM ('DRAFT', 'PEER_REVIEW', 'PUBLISHED', 'RETRACTED');

-- CreateEnum
CREATE TYPE "LossRootCause" AS ENUM ('DATA_GAP', 'STALE_LINE', 'INJURY_SHOCK', 'WEATHER', 'OFFICIATING', 'VARIANCE', 'MODEL_DRIFT', 'HUMAN_OVERRIDE', 'OTHER');

-- CreateTable
CREATE TABLE "loss_autopsies" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "LossAutopsyStatus" NOT NULL DEFAULT 'DRAFT',
    "headline" VARCHAR(140) NOT NULL,
    "whatWeSaw" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whatWeLearned" TEXT NOT NULL,
    "rootCause" "LossRootCause" NOT NULL,
    "lessonTags" TEXT[],
    "modelVersion" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loss_autopsies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loss_autopsies_pickId_key" ON "loss_autopsies"("pickId");

-- CreateIndex
CREATE INDEX "loss_autopsies_authoredAt_idx" ON "loss_autopsies"("authoredAt");

-- CreateIndex
CREATE INDEX "loss_autopsies_status_idx" ON "loss_autopsies"("status");

-- CreateIndex
CREATE INDEX "loss_autopsies_rootCause_idx" ON "loss_autopsies"("rootCause");

-- AddForeignKey
ALTER TABLE "loss_autopsies" ADD CONSTRAINT "loss_autopsies_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
