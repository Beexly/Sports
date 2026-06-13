-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('episodic', 'semantic', 'procedural', 'preference', 'decision', 'failure', 'source', 'agent_performance', 'escalation_rule', 'public_claim_rule');

-- CreateEnum
CREATE TYPE "MemoryState" AS ENUM ('candidate', 'confirmed', 'repeated_pattern', 'conflicted', 'stale', 'superseded', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "jarvis_memory_events" (
    "id" TEXT NOT NULL,
    "memory_type" "MemoryType" NOT NULL,
    "memory_state" "MemoryState" NOT NULL DEFAULT 'candidate',
    "scope" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "full_text" TEXT,
    "source_type" TEXT NOT NULL,
    "source_ref" TEXT,
    "source_timestamp" TIMESTAMP(3),
    "actor" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "tags" TEXT[],
    "related_decision_id" TEXT,
    "related_agent_id" TEXT,
    "supersedes_memory_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "embedding_ref" TEXT,
    "metadata" JSONB,
    "owner_approval" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jarvis_memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jarvis_decisions" (
    "id" TEXT NOT NULL,
    "decision_title" TEXT NOT NULL,
    "decision_summary" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB,
    "alternatives_rejected" JSONB,
    "owner" TEXT NOT NULL,
    "decision_date" TIMESTAMP(3) NOT NULL,
    "revisit_date" TIMESTAMP(3),
    "outcome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "source_refs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jarvis_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemoryDecisionLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "jarvis_memory_events_memory_state_idx" ON "jarvis_memory_events"("memory_state");

-- CreateIndex
CREATE INDEX "jarvis_memory_events_memory_type_idx" ON "jarvis_memory_events"("memory_type");

-- CreateIndex
CREATE INDEX "jarvis_memory_events_scope_idx" ON "jarvis_memory_events"("scope");

-- CreateIndex
CREATE INDEX "jarvis_memory_events_created_at_idx" ON "jarvis_memory_events"("created_at");

-- CreateIndex
CREATE INDEX "jarvis_decisions_decision_date_idx" ON "jarvis_decisions"("decision_date");

-- CreateIndex
CREATE INDEX "jarvis_decisions_status_idx" ON "jarvis_decisions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_MemoryDecisionLink_AB_unique" ON "_MemoryDecisionLink"("A", "B");

-- CreateIndex
CREATE INDEX "_MemoryDecisionLink_B_index" ON "_MemoryDecisionLink"("B");

-- AddForeignKey
ALTER TABLE "jarvis_memory_events" ADD CONSTRAINT "jarvis_memory_events_supersedes_memory_id_fkey" FOREIGN KEY ("supersedes_memory_id") REFERENCES "jarvis_memory_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemoryDecisionLink" ADD CONSTRAINT "_MemoryDecisionLink_A_fkey" FOREIGN KEY ("A") REFERENCES "jarvis_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemoryDecisionLink" ADD CONSTRAINT "_MemoryDecisionLink_B_fkey" FOREIGN KEY ("B") REFERENCES "jarvis_memory_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
