-- CreateEnum
CREATE TYPE "ModerationReasonCode" AS ENUM ('HARASSMENT', 'HATE_SPEECH', 'THREATS', 'DOXXING', 'TOUT_BEHAVIOR', 'GUARANTEED_WINNER_LANGUAGE', 'PRESSURE_TO_BET', 'BEGINNER_MOCKING', 'LOSS_SHAMING', 'CHASING_LOSSES_ENCOURAGEMENT', 'SELF_EXCLUSION_CIRCUMVENTION', 'UNDERAGE_PARTICIPATION', 'PIRATED_CONTENT', 'PERSONAL_DATA_SHARING', 'SPAM_REFERRAL_FLOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ModerationActionKind" AS ENUM ('NUDGE', 'REMOVE', 'MUTE_24H', 'MUTE_7D', 'SUSPEND', 'BAN');

-- CreateEnum
CREATE TYPE "ModerationAppealStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED', 'EXPIRED');

-- CreateTable
CREATE TABLE "moderation_reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "contentRef" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "reason" "ModerationReasonCode" NOT NULL,
    "notes" TEXT,
    "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "contentRef" TEXT,
    "surface" TEXT,
    "action" "ModerationActionKind" NOT NULL,
    "reason" "ModerationReasonCode" NOT NULL,
    "notes" TEXT,
    "reportId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_appeals" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "appellantId" TEXT NOT NULL,
    "grounds" TEXT NOT NULL,
    "status" "ModerationAppealStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_reports_targetUserId_idx" ON "moderation_reports"("targetUserId");

-- CreateIndex
CREATE INDEX "moderation_reports_status_createdAt_idx" ON "moderation_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_reports_surface_idx" ON "moderation_reports"("surface");

-- CreateIndex
CREATE INDEX "moderation_reports_reason_idx" ON "moderation_reports"("reason");

-- CreateIndex
CREATE INDEX "moderation_actions_targetUserId_createdAt_idx" ON "moderation_actions"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_actions_action_idx" ON "moderation_actions"("action");

-- CreateIndex
CREATE INDEX "moderation_actions_reportId_idx" ON "moderation_actions"("reportId");

-- CreateIndex
CREATE INDEX "moderation_actions_expiresAt_idx" ON "moderation_actions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_appeals_actionId_key" ON "moderation_appeals"("actionId");

-- CreateIndex
CREATE INDEX "moderation_appeals_status_slaDeadline_idx" ON "moderation_appeals"("status", "slaDeadline");

-- CreateIndex
CREATE INDEX "moderation_appeals_appellantId_idx" ON "moderation_appeals"("appellantId");

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "moderation_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "moderation_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

