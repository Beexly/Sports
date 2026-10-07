# F-9 ruling — LedgerChainEntry (Glass Ledger durable chain)

**Status: AMENDED AND APPROVED** (founder-delegated, 2026-08-20).
**Supersedes** the raw model in `2026-08-20-ledger-chain-durability-proposal.md`.
**Does not apply the migration.** File landing is not `prisma migrate deploy`.
**Does not flip** `LEDGER_CHAIN_ENABLED` or `PUBLISH_LEDGER`.

## Decision

APPROVE persistence of the Glass Ledger as a Postgres append-only table.
REJECT the original proposal as-is. It was the right *kind* of store (durable
rows, not serverless memory) and the wrong *shape* for an audit chain that
this product's identity rests on.

The in-memory/JSON store on `hermes/b6a-chain-append` (`7f3822c4`) stays
discarded. Do not merge it.

## Why the proposal was too thin

1. **No concurrency story.** `ORDER BY seq DESC LIMIT 1` then INSERT on a
   Vercel cron will fork or collide under concurrent sport workers. Unique
   `seq` is necessary but not sufficient; the write must take a transaction
   advisory lock on the chain, then insert, and treat unique-seq collision as
   retry-once.
2. **Native enum.** This repo's additive-migration doctrine (watchlist,
   OddsLineSnapshot.phase) uses TEXT + CHECK because Postgres has no
   `CREATE TYPE ... IF NOT EXISTS`. A new enum would not be safely
   re-appliable.
3. **FK to Pick.** An audit chain that CASCADE/RESTRICT-deletes with the
   pick is not an audit chain. `pickId` is a value, not a relation.
4. **No chain identity.** C-23 wants per-model tracks later. One public
   chain now (`chainId = glass-v1`) with uniqueness scoped to the chain
   avoids a second migration when a certification track is added. It is
   not a license to fork the public record.
5. **No hash-contract version.** `entryHash` is `sha256Hex(canonicalJson(...))`
   today. Without `hashAlg` + `canonVersion`, a future canonicalisation
   change silently poisons historical verification.
6. **Missing clocks.** SportsIR: `occurredAt` (decision/settle instant) and
   `createdAt` (transaction time). The proposal only had `createdAt`.
7. **Unconstrained hash columns.** SHA-256 hex is 64 chars. CHAR(64) plus
   a CHECK rejects garbage.

## Frozen hash contract (do not change)

`packages/prediction-engine/src/edge-lab/ledger-chain.ts` remains the only
hasher. The table does **not** put `entryType` / `chainId` / `canonVersion`
into the hash. Those are projections. The hashed payload is exactly
`pickCommittedFields` / `settlementCommittedFields`. Changing that would
void `scripts/edge-lab/recompute.ts`.

Genesis is implicit: seq 0 has `prevHash = GENESIS_HASH`
(`sha256("GSE-GLASS-LEDGER-GENESIS")`). No genesis row.

## Approved model

```
model LedgerChainEntry {
  id            String   @id @default(cuid())
  chainId       String   @default("glass-v1") @db.VarChar(32)
  seq           Int
  prevHash      String   @db.VarChar(64)
  entryHash     String   @db.VarChar(64)
  entryType     String   // "PICK" | "SETTLEMENT" — CHECK, not a native enum
  pickId        String
  payload       String   @db.Text // canonical JSON of committed fields (no entryHash)
  hashAlg       String   @default("sha256") @db.VarChar(16)
  canonVersion  Int      @default(1)
  modelVersion  String?
  occurredAt    DateTime // decisionAt (PICK) or settledAt (SETTLEMENT)
  createdAt     DateTime @default(now())

  @@unique([chainId, seq])
  @@unique([chainId, entryHash])
  @@unique([chainId, entryType, pickId]) // one PICK and one SETTLEMENT per pick
  @@index([pickId])
  @@index([occurredAt])
  @@index([createdAt])
  @@map("ledger_chain_entries")
}
```

## Persistence law (B-6a)

- `LEDGER_CHAIN_ENABLED === "true"` gates every call. Default OFF. Zero DB
  when off (including no table probe).
- Append inside `$transaction` with `pg_advisory_xact_lock` on `chainId`.
- Unique `(chainId, seq)` is the race backstop; unique
  `(chainId, entryType, pickId)` is the idempotent stand-down.
- Never throw to publish/settle. Catch, log, continue.
- Table-absent (migration not yet applied) degrades honestly — skip, do
  not 500.
- Application code never UPDATE/DELETE these rows.
- `book` on PICK entries is `"consensus"` when the lock price is the
  multi-book average already used at mint. Do not invent a sportsbook.

## What this unblocks

B-6a (append wiring), B-6b (`GET /api/proof/ledger-chain` in recompute.ts
shape), B-6c (`loadLedgerView` stays four-leg-guarded; chain rows are not
a license to publish SU%/CLV). External anchoring remains
`LEDGER_ANCHOR_ENABLED` + `FOUNDER-CONFIRMED` (inert).
