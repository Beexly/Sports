-- CreateEnum
CREATE TYPE "AgentHandoffStatus" AS ENUM ('pending', 'accepted', 'rejected', 'escalated');

-- CreateEnum
CREATE TYPE "AgentHandoffRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "SubagentParentReviewStatus" AS ENUM ('pending_review', 'accepted', 'rejected', 'edited');

-- AlterTable
ALTER TABLE "jarvis_memory_events" ADD COLUMN     "related_agent_run_id" TEXT;

-- CreateTable
CREATE TABLE "agent_handoffs" (
    "id" TEXT NOT NULL,
    "source_seat" TEXT NOT NULL,
    "target_seat" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "risk_level" "AgentHandoffRiskLevel" NOT NULL DEFAULT 'low',
    "authority_tier" INTEGER NOT NULL,
    "status" "AgentHandoffStatus" NOT NULL DEFAULT 'pending',
    "owner_approval_required" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subagent_runs" (
    "id" TEXT NOT NULL,
    "subagent_id" TEXT NOT NULL,
    "parent_seat" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "input_context" TEXT NOT NULL,
    "output_artifact_ref" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "uncertainty" TEXT NOT NULL,
    "evidence" TEXT[],
    "prohibited_actions_checked" BOOLEAN NOT NULL DEFAULT false,
    "parent_review_status" "SubagentParentReviewStatus" NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subagent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_handoffs_source_seat_created_at_idx" ON "agent_handoffs"("source_seat", "created_at");

-- CreateIndex
CREATE INDEX "agent_handoffs_target_seat_created_at_idx" ON "agent_handoffs"("target_seat", "created_at");

-- CreateIndex
CREATE INDEX "agent_handoffs_status_idx" ON "agent_handoffs"("status");

-- CreateIndex
CREATE INDEX "agent_handoffs_created_at_idx" ON "agent_handoffs"("created_at");

-- CreateIndex
CREATE INDEX "subagent_runs_subagent_id_created_at_idx" ON "subagent_runs"("subagent_id", "created_at");

-- CreateIndex
CREATE INDEX "subagent_runs_parent_seat_created_at_idx" ON "subagent_runs"("parent_seat", "created_at");

-- CreateIndex
CREATE INDEX "subagent_runs_parent_review_status_idx" ON "subagent_runs"("parent_review_status");

-- CreateIndex
CREATE INDEX "subagent_runs_created_at_idx" ON "subagent_runs"("created_at");

-- AddForeignKey
ALTER TABLE "jarvis_memory_events" ADD CONSTRAINT "jarvis_memory_events_related_agent_run_id_fkey" FOREIGN KEY ("related_agent_run_id") REFERENCES "subagent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
