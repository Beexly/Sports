-- Glass Ledger durable hash chain (F-9 / B-6a).
-- New model LedgerChainEntry (schema.prisma → @@map("ledger_chain_entries")).
--
-- Purely additive: a brand-new, empty table plus its indexes and CHECKs.
-- Written IF NOT EXISTS end to end so it is byte-safe to apply anytime,
-- including re-applying against a DB where it already landed — same
-- hardening doctrine as 20260717120000_add_watchlist and
-- 20260716120000_add_odds_line_snapshots. Zero destructive statements.
--
-- entryType is a plain TEXT column guarded by a CHECK constraint, not a
-- native Postgres enum — Postgres has no `CREATE TYPE ... IF NOT EXISTS`,
-- so a brand-new enum type here would not be safely re-appliable.
--
-- No foreign key to picks: the chain is evidence. Deleting a pick must not
-- delete or block history.
--
-- The founder applies this; it is never run automatically from this repo.
-- Application code fails open (skip, never throw) when this table is
-- absent — see packages/ingestion-pipeline/src/ledger-chain-store.ts.

CREATE TABLE IF NOT EXISTS "ledger_chain_entries" (
    "id" TEXT NOT NULL,
    "chainId" VARCHAR(32) NOT NULL DEFAULT 'glass-v1',
    "seq" INTEGER NOT NULL,
    "prevHash" VARCHAR(64) NOT NULL,
    "entryHash" VARCHAR(64) NOT NULL,
    "entryType" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "hashAlg" VARCHAR(16) NOT NULL DEFAULT 'sha256',
    "canonVersion" INTEGER NOT NULL DEFAULT 1,
    "modelVersion" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_chain_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_chain_entries_entryType_check" CHECK ("entryType" IN ('PICK', 'SETTLEMENT')),
    CONSTRAINT "ledger_chain_entries_hashAlg_check" CHECK ("hashAlg" IN ('sha256')),
    CONSTRAINT "ledger_chain_entries_canonVersion_check" CHECK ("canonVersion" >= 1),
    CONSTRAINT "ledger_chain_entries_seq_check" CHECK ("seq" >= 0),
    CONSTRAINT "ledger_chain_entries_prevHash_check" CHECK ("prevHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ledger_chain_entries_entryHash_check" CHECK ("entryHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_chain_entries_chainId_seq_key"
  ON "ledger_chain_entries"("chainId", "seq");

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_chain_entries_chainId_entryHash_key"
  ON "ledger_chain_entries"("chainId", "entryHash");

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_chain_entries_chainId_entryType_pickId_key"
  ON "ledger_chain_entries"("chainId", "entryType", "pickId");

CREATE INDEX IF NOT EXISTS "ledger_chain_entries_pickId_idx"
  ON "ledger_chain_entries"("pickId");

CREATE INDEX IF NOT EXISTS "ledger_chain_entries_occurredAt_idx"
  ON "ledger_chain_entries"("occurredAt");

CREATE INDEX IF NOT EXISTS "ledger_chain_entries_createdAt_idx"
  ON "ledger_chain_entries"("createdAt");
