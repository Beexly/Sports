# STAGED-IMPROVEMENT 1 — Per-signal literature re-query (INV-01)

**Changes a published number?** NO.
**Risk:** low. Gated on `GSE_LITERATURE_BRIDGE=1`, non-blocking.
**Files:** `apps/web/lib/ops/signal-ledger-writer.ts`,
`apps/web/lib/ops/signal-ledger-writer-types.ts`,
`apps/web/app/api/cron/signal-ledger-write/route.ts`.

---

## Why

The literature bridge currently fires once per cron tick
(`23 * * * *`). A signal written at 12:04 does not re-query the literature
until 13:23. The mandate requires that "every new signal can re-query
relevant premises."

## What changes

### 1. `apps/web/lib/ops/signal-ledger-writer-types.ts`

Add an optional bridge hook to the writer options. The writer must stay
free of a Prisma import (that property is what lets it be unit-tested with
no database — see the file's own header at lines 1-5), so the hook is
injected, not imported.

```ts
/** Optional hook invoked once per successfully written signal. */
export interface SignalWriteHook {
  readonly onSignalWritten?: (candidate: SignalWriteCandidate) => Promise<void>;
}

export interface SignalWriteOptions extends SignalWriteHook {
  readonly batchSize?: number;
  readonly deadline?: Date;
}
```

### 2. `apps/web/lib/ops/signal-ledger-writer.ts`

Inside the per-candidate loop, after `report.written += 1`:

```ts
if (options.onSignalWritten) {
  // NON-BLOCKING: a literature failure must never fail a signal write.
  try {
    await options.onSignalWritten(c);
  } catch (error) {
    report.errors.push(
      `literature bridge: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

Note: `report.errors.length > 0` makes the cron route return 500
(`apps/web/app/api/cron/signal-ledger-write/route.ts` — the `failed` check).
A literature failure would therefore turn a GREEN cron RED. **That is
correct behaviour** — the same reasoning the route already uses for
"skipped rows": a silent zero is how the table was allowed to sit empty
for the life of the project. But it means the bridge must be robust
enough not to flap.

### 3. `apps/web/app/api/cron/signal-ledger-write/route.ts`

```ts
const literatureEnabled = process.env.GSE_LITERATURE_BRIDGE === "1";
report = await writeSignalCandidates(db, scoped, {
  deadline,
  ...(literatureEnabled
    ? {
        onSignalWritten: async (c) => {
          await bridgeSignalsToLiterature(
            { db: db as never },
            [{
              key: c.key,
              entityId: c.entityId,
              entityType: c.entityType,
              value: c.value,
              category: c.category,
              season: c.season,
              week: c.week,
              capturedAt: c.capturedAt,
            }],
          );
        },
      }
    : {}),
});
```

## The scale problem, and the fix

The writer handles 80,000 rows in one tick (the route's own shard comment
documents this: two shards of ~59,201 to stay under the 300 s deadline).
A per-signal embed would be 80,000 API calls per tick.

**The bridge already collapses duplicates.** `makeEventKey(signalKey,
entityId, at, 5min)` produces the same key for the same signal + entity in
the same 5-minute window, and `retrieveForEvent` upserts on
`lit.retrieval_event.event_key`. So the *storage* is idempotent.

**But the EMBED is not deduplicated** — each call embeds before it learns
the event already exists.

**Requirement:** dedupe the embed, not just the write. The cleanest form is
to embed once per DISTINCT `(signalKey, rounded value)` per tick and reuse
the vector. With 32 signal keys and normalized values in [-1, 1], a 3-decimal
bucket gives a few hundred distinct embeddings per tick instead of 80,000.

**This must be measured before it ships.** Acceptance: the `refresh-wire`
tick (10-min cron, small volume) and the `signal-ledger-write` tick
(hourly, 80k rows) must both complete inside their deadlines, with the
embedding-call count logged and asserted to be a small multiple of the
distinct-signal count, not of the row count.

## Acceptance

- [ ] A signal written at T re-queries the literature within the same tick.
- [ ] `lit.retrieval_event` gains a row for that signal's event key.
- [ ] Embedding calls per tick ≤ (distinct signal keys × value buckets), not
      the row count. **Measured and logged.**
- [ ] A literature failure does not fail the signal write, and does surface
      in `report.errors`.
- [ ] `GSE_LITERATURE_BRIDGE` unset ⇒ byte-identical behaviour to today.
