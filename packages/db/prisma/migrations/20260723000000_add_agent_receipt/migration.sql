-- A++ Governed Receipts + Keyring (packages/governed): durable persistence
-- for signed GovernedReceipt objects. Additive, IF NOT EXISTS-guarded, same
-- re-apply doctrine as the prior migrations in this directory (safe to run
-- twice against a database that already has this table).
--
-- "raw" holds the full SignedGovernedReceipt JSON exactly as signed. It
-- contains no secrets by construction (no private key material, no raw tool
-- args — only argsDigest). The scalar columns are denormalized out of "raw"
-- for query convenience only.

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_receipt" (
    "id" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "decision" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "argsDigest" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_receipt_receiptId_key" ON "agent_receipt"("receiptId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_receipt_agentId_at_idx" ON "agent_receipt"("agentId", "at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_receipt_tool_at_idx" ON "agent_receipt"("tool", "at");
