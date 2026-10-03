-- LSRQC KERNEL v1: ind_inv_proposal (closed on-policy self-refinement loop, on
-- top of the CTI-candidate miner + the versioned SrqcVersion envelope). An
-- ind_inv_proposal is a HINDSIGHT SKILL minted ON-POLICY from one or more open
-- cti_candidate rows: a proposed STRENGTHENING of the currently-active
-- inductive-invariant certificate (srqc_version) that would additionally forbid
-- the abstract (before, action) pair whose successor a cti_candidate showed is
-- proof-forbidden. `activeVersionAtMint` records which live baseline it was
-- minted against — a proposal is a strengthening of the CURRENT certificate,
-- never minted in a vacuum.
--
-- Ranking columns (RANKING/ADVISORY ONLY — never gate an admit decision):
--   predicateKeys  executable IndInv keys this proposal would add
--   strength       Σ max(0, per-window delta) across observed windows
--   support        # windows with delta>0 (Prop2 multi-window variance guard)
--   variance       population variance of the per-window deltas
--
-- POSTURE (do not let this drift): PROPOSAL / RANKING INPUT ONLY. Minting a row
-- changes NO control-plane decision and NEVER activates a version; the only
-- path that flips an srqc_version to active is the explicit human/script accept
-- flow. admitUnderSRQC remains always-ADMIT in SHADOW. Additive and IF NOT
-- EXISTS-guarded, same re-apply doctrine as the prior migrations in this
-- directory (safe to run twice against a database that already has this table).
--
-- Idempotency: a UNIQUE (sourceWindowHash, activeVersionAtMint) index makes the
-- emitter's INSERT ... ON CONFLICT DO NOTHING mint at most one proposal per
-- (forbidden abstract transition, active baseline). Re-running the emitter over
-- the same open candidates writes zero new rows.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ind_inv_proposal" (
    "id" TEXT NOT NULL,
    "ctiCandidateIds" TEXT[] NOT NULL DEFAULT '{}',
    "predicateKeys" TEXT[] NOT NULL DEFAULT '{}',
    "proposedPredicateText" TEXT NOT NULL,
    "skillKind" TEXT NOT NULL,
    "sourceWindowHash" TEXT NOT NULL,
    "activeVersionAtMint" INTEGER NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "support" INTEGER NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "acceptedSrqcVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ind_inv_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ind_inv_proposal_sourceWindowHash_activeVersionAtMint_key" ON "ind_inv_proposal"("sourceWindowHash", "activeVersionAtMint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ind_inv_proposal_status_idx" ON "ind_inv_proposal"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ind_inv_proposal_activeVersionAtMint_idx" ON "ind_inv_proposal"("activeVersionAtMint");
