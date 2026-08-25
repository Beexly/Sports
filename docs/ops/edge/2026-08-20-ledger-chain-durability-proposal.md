# Glass Ledger chain persistence — sealed-path proposal (B-6a)

**Status: AMENDED AND APPROVED (F-9, 2026-08-20).** The original model below
is retained as the proposal-of-record. The frozen schema, concurrency law,
and hash-contract constraints are in
`docs/ops/edge/2026-08-20-f9-ledger-chain-entry-ruling.md`. The in-memory
store on `hermes/b6a-chain-append` stays discarded. Migration FILE may land;
`prisma migrate deploy` is still founder-applied and is not this ruling.

## What went wrong in the first attempt

Hermes built `packages/prediction-engine/src/edge-lab/ledger-store.ts`
(branch `hermes/b6a-chain-append`, commit `7f3822c4`) as an in-memory array
with an optional local-JSON-file fallback (`LEDGER_STATE_FILE`). It then
got BLOCKED trying to wire it into `process-sport.ts` — the anchor line it
was patching around didn't match.

The anchor-matching failure isn't the real bug. Even if it had landed,
the store itself would have shipped a fake ledger. `process-sport.ts` runs
inside `apps/web/app/api/cron/refresh-odds/route.ts`, a Vercel serverless
function (verified: no `functions`/`maxDuration` override, standard Next.js
API route). Module-level `chain` state does not survive a cold start and
is not shared across concurrent invocations; `/tmp` is per-instance and
ephemeral. The moment `LEDGER_CHAIN_ENABLED` were ever flipped on, the
chain would silently restart from `GENESIS_HASH` on essentially every
request — a discontinuous, broken chain presented as a continuous one.
That is worse than not building it: it *looks* like the real audit trail
this platform's entire identity rests on, while being exactly the kind of
unverifiable claim the Kill Ledger and honest-claims doctrine exist to
prevent.

`ledger-chain.ts` (the pure hash-chain math, already correct, no I/O) says
so itself in its own header comment: "Callers... own persistence; this
module owns the chain math," and names the intended pattern explicitly —
mirror `freeze-slate-commitments.ts`'s DB-adapter approach. Hermes's store
deviated from the design that was already written down.

## The correct shape (Postgres, following the existing pattern exactly)

`PickProofReceipt` and `SlateCommitment` (schema.prisma:594, 623) are the
reference: durable rows, minted inside the same transaction as the thing
they attest to, never blocking a publish/settle on failure. A
`LedgerChainEntry` table should follow the identical shape:

```
model LedgerChainEntry {
  id          String   @id @default(cuid())
  seq         Int      @unique              // 0-indexed position in the chain
  prevHash    String                         // entryHash of seq-1, or GENESIS_HASH at seq 0
  entryHash   String   @unique               // sha256Hex(canonicalJson(entry minus this field))
  entryType   String                         // "PICK" | "SETTLEMENT"
  pickId      String                         // FK-by-value, mirrors PickProofReceipt.pickId
  payload     String   @db.Text              // canonical JSON of the appended fields
  createdAt   DateTime @default(now())

  @@index([pickId])
}
```

Persistence follows `freeze-slate-commitments.ts`'s pattern exactly:
append inside a `db.$transaction`, read the current tail row
(`orderBy: { seq: "desc" }, take: 1`) to get `prevHash`, insert the new
row, never throw to the caller (catch, log, continue — identical to the
existing receipt-mint failure isolation in `process-sport.ts`). The
`LEDGER_CHAIN_ENABLED` flag gates the whole append call with zero DB
interaction when off, exactly as documented for every other flag in this
codebase.

## Why this is blocked on the founder, not re-queued to Hermes

This needs a new migration under `packages/db/prisma/migrations/`, a
sealed path. Per standing doctrine, an autonomous agent may read and make
an evidence-based case for a sealed-path change but does not author and
land a new production schema migration unreviewed, especially with the
founder unavailable to review it tonight. The case is made above; the
migration itself is not written.

## What to do instead, right now

- Discard `hermes/b6a-chain-append`'s `ledger-store.ts` — do not merge it.
  It is not "close, needs a tweak"; it is the wrong persistence layer.
- B-6a, B-6b, B-6c all cascade from this and stay BLOCKED until the
  founder reviews and approves (or amends) the model above.
- B-7 (Consensus Clock + Line DNA libraries against fixtures) does not
  depend on the chain at all — proceed there next.
- When the founder approves, the migration + `ledger-store.ts` rewrite +
  `process-sport.ts`/`settle-sport.ts` wiring is a single, small, well-scoped
  task — the design above is already precise enough to implement directly.
