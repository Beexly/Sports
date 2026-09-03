-- CTI-candidate miner (M6 — online CTI-candidate miner, detection-only, on top
-- of Track A + Track B + the versioned envelope). cti_candidate is the durable
-- row-store for a proof-relevant abstract state that sits EXACTLY ONE modeled
-- abstract step away from a state the Formal Foundry's inductive invariant
-- forbids: the miner projects a real ledger window via srqc-projection.ts's
-- pure projectWindow, then for each NON-violating projected state applies the
-- pure abstract-successor relation (mirroring AbstractClaimExposure.tla's Next)
-- and records any one-step successor that DOES violate. "before" is that state,
-- "action" the modeled abstract action, "after" the forbidden successor.
--
-- These rows are candidate counterexamples for a HUMAN or LLM to consider
-- during weakest-precondition strengthening of the formal spec — they are NOT
-- consumed by any control-plane decision, and the miner NEVER edits any .tla
-- file or enforces anything. De-duplication is via a deterministic "id" (a
-- hash of before+action+after) inserted ON CONFLICT (id) DO NOTHING, so this
-- migration adds no dedup mechanism of its own. Additive and IF NOT EXISTS-
-- guarded, same re-apply doctrine as the prior migrations in this directory
-- (safe to run twice against a database that already has this table).

-- CreateTable
CREATE TABLE IF NOT EXISTS "cti_candidate" (
    "id" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "after" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cti_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cti_candidate_status_createdAt_idx" ON "cti_candidate"("status", "createdAt");
