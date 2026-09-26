# Glass Ledger hash chain — DBA audit, apply/rollback runbook, tamper model

**Subject:** `packages/db/prisma/migrations/20260820090000_add_ledger_chain_entries`
and the `LedgerChainEntry` model (PR #601, branch `claude/f9-ledger-chain`).

**Verdict: APPROVE WITH CHANGES.** The DDL is safe, additive, idempotent and
non-blocking — verified by applying it to a real PostgreSQL 16.13 instance, not
by reading it. Two changes are required before the chain can be called
tamper-evident, and one documented claim in the PR is factually wrong.

Everything below was produced by running the statement shown against a
disposable local Postgres 16.13 cluster. No production or hosted database was
contacted.

---

## 1. Is it truly additive?

Yes.

| Check | Result |
|---|---|
| `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE FROM` / `UPDATE` in the migration | none |
| `ALTER TABLE` against any pre-existing relation | none |
| Foreign keys **out of** `ledger_chain_entries` | `0` (`pg_constraint … contype='f'`) |
| Foreign keys **into** `ledger_chain_entries` | `0` (`pg_constraint … confrelid=…`) |
| New enum types (`CREATE TYPE`) | none — `entryType` is `TEXT` + `CHECK` |
| Objects created | 1 table, 1 primary key, 6 CHECK constraints, 6 indexes |

The zero-FK decision is correct and should not be "fixed" later. A foreign key
from `ledger_chain_entries.pickId` to `picks.id` would (a) take a lock on
`picks` at migration time, (b) make every `picks` delete either fail or cascade
into evidence, and (c) let a pick deletion silently rewrite history. Evidence
must outlive its subject.

## 2. Is it truly idempotent?

Yes — applied three times in a row against the same database, exit 0 each time.

```
=== APPLY #1 ===
CREATE TABLE
CREATE INDEX  (x6)
apply1 exit=0

=== APPLY #2 (idempotency) ===
NOTICE:  relation "ledger_chain_entries" already exists, skipping
NOTICE:  relation "ledger_chain_entries_chainId_seq_key" already exists, skipping
NOTICE:  relation "ledger_chain_entries_chainId_entryHash_key" already exists, skipping
NOTICE:  relation "ledger_chain_entries_chainId_entryType_pickId_key" already exists, skipping
NOTICE:  relation "ledger_chain_entries_pickId_idx" already exists, skipping
NOTICE:  relation "ledger_chain_entries_occurredAt_idx" already exists, skipping
NOTICE:  relation "ledger_chain_entries_createdAt_idx" already exists, skipping
apply2 exit=0
apply3 exit=0
```

**Caveat, worth knowing:** `CREATE TABLE IF NOT EXISTS` is idempotent, not
*convergent*. If a table named `ledger_chain_entries` already exists with a
different shape, the statement is skipped silently and the CHECK constraints
are never added. Re-running the migration is therefore safe, but it is not a
repair tool. Verify shape with the query in §6 rather than assuming a clean
re-apply fixed anything.

## 3. Can it be applied to a live database without locking anything that matters?

Yes. Locks held by the entire migration, executed as a single transaction
against a database that also contained a populated `picks` table
(`pg_locks`, user objects only — OIDs ≥ 16384):

```
        mode         |                    locked_object
---------------------+-----------------------------------------------------
 AccessExclusiveLock | ledger_chain_entries
 ShareLock           | ledger_chain_entries
 AccessExclusiveLock | pg_toast.pg_toast_16416
 ShareLock           | pg_toast.pg_toast_16416
 AccessExclusiveLock | pg_toast.pg_toast_16416_index
 AccessExclusiveLock | ledger_chain_entries_pkey
 AccessExclusiveLock | "ledger_chain_entries_chainId_seq_key"
 AccessExclusiveLock | "ledger_chain_entries_chainId_entryHash_key"
 AccessExclusiveLock | "ledger_chain_entries_chainId_entryType_pickId_key"
 AccessExclusiveLock | "ledger_chain_entries_pickId_idx"
 AccessExclusiveLock | "ledger_chain_entries_occurredAt_idx"
 AccessExclusiveLock | "ledger_chain_entries_createdAt_idx"
(12 rows)
```

`picks` does not appear. The only relations locked are the new table, its own
TOAST relation, and its own indexes — objects no other session can reach
because they did not exist a moment earlier. The indexes are created
non-`CONCURRENTLY`, which would be a problem on a populated table and is a
non-issue on a table that is empty by construction.

**Runtime is effectively instant** and independent of database size: nothing is
scanned, nothing is rewritten.

## 4. Is the chain actually tamper-evident? (linkage, not just hash)

**Partly. The content is tamper-evident. The table's projection columns are not.**

### What the hash genuinely covers

`entryHash = sha256(payload)` where `payload` is the canonical JSON of the
entry's committed fields — and those committed fields **include `seq` and
`prevHash`**. That is the part people usually get wrong, and this PR got it
right: the linkage is *inside* the preimage, so an entry cannot be re-pointed
at a different predecessor without changing its own hash, which in turn breaks
the next entry's `prevHash`. Verified by test:

- mutate a hashed field → `ROW_ENTRY_HASH_MISMATCH`, `verifyChain` invalid.
- mutate a field **and** re-hash the row so the row is internally consistent →
  still caught, at the *next* entry (`CHAIN_PREV_HASH_BROKEN` at index 2).
- delete a middle row → `CHAIN_SEQ_NOT_CONTIGUOUS`.

### The defect: unhashed projection columns

Thirteen columns are stored; the hash covers the contents of one of them
(`payload`). The rest — `chainId`, `entryType`, `pickId`, `seq`, `prevHash`,
`hashAlg`, `canonVersion`, `modelVersion`, `occurredAt` — are projections
lifted out of the payload so the table can be indexed. **Nothing compares them
back to the payload**, and three of them are load-bearing:

- `UNIQUE (chainId, entryType, pickId)` is the only thing preventing a second
  PICK row, or a second SETTLEMENT row, for one pick;
- `entryType` + `pickId` is the lookup that answers "does this pick exist?"
  before a settlement is appended (`appendSettlementToChain`);
- `chainId` scopes the entire public export.

Against the migration exactly as written, one `UPDATE` rewrites all four of
`entryType`, `pickId`, `seq` and `prevHash` with no error, leaving `payload`
and `entryHash` untouched:

```
UPDATE ledger_chain_entries
   SET "entryType"='PICK', "pickId"='p-other', seq=7, "prevHash"=repeat('0',64)
 WHERE seq=1;
UPDATE 1

 seq | entryType | pickId  |  prevHash | entryHash
-----+-----------+---------+-----------+-----------
   0 | PICK      | p1      | 299dd470… | 70ebc22b…
   7 | PICK      | p-other | 00000000… | 84fbb460…
```

`verifyChain` — the verifier `scripts/edge-lab/recompute.ts` runs, and the only
one shipped — reports **VALID** for every one of those edits, because it reads
the parsed payload and never sees the columns. The settlement is now indexed as
a PICK belonging to a different pick, and the uniqueness guard that was
supposed to make history append-only has been stood down. The hash is intact
the whole time.

### The other blind spot: truncation

A hash chain cannot detect its own truncation. Deleting the tip row — or any
suffix — leaves a shorter chain that verifies perfectly. This is asserted as an
honest negative in the test suite rather than papered over:

```
expect(verifyChain(rowsToEntries(truncated)).valid).toBe(true);
expect(auditLedgerChainRows(truncated).ok).toBe(true);
```

The only defence is an externally published tip digest.
`packages/prediction-engine/src/edge-lab/ledger-anchor.ts` builds exactly that
payload but performs **no network call and is hard-gated** — so today nothing
is published, and truncation is undetectable in practice. That is a gap in the
*programme*, not in this migration, but it must not be described as solved.

Note also that the anchor alone is not sufficient: in the projection-tamper
case above the tip hash and the row count are both unchanged, so an anchor
check passes while the table lies. Anchor and projection binding are
complementary, not alternatives.

## 5. The PR's "founder-applied" claim is false

`migration.sql` and the `schema.prisma` comment both state:

> The founder applies this; it is never run automatically from this repo.

`vercel.json`:

```
"buildCommand": "cd ../.. && npm run db:generate && node scripts/deploy/migrate-if-configured.mjs && … npm run build --workspace=@sports/web"
```

and `scripts/deploy/migrate-if-configured.mjs`:

> `VERCEL_ENV=production` → run `prisma migrate deploy`; missing env still fails
> loudly (a production deploy must never skip schema migration).

So the migration lands **automatically on the next production build after this
merges to main**, inside a gate that is deliberately fail-closed: a migration
error fails the deploy. The DDL is safe to auto-apply (§1–§3), so this is not a
blocker — but the comments must be corrected, because an operator who believes
"nothing happens until I run it" will be wrong about when the table appears and
about what a migration failure costs. It also adds one more row to the
`_prisma_migrations` reconciliation described in
`docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`.

## 6. Required changes

### 6a. Bind the projection columns to the payload (schema)

`packages/db/prisma/migrations/<ts>_bind_ledger_chain_projections/migration.sql`:

```sql
-- Hardening for 20260820090000_add_ledger_chain_entries.
-- The projection columns are indexed and queried but NOT hashed. Bind them to
-- the hashed payload so an UPDATE cannot change what the database DOES without
-- breaking a constraint. Additive, idempotent, non-blocking (NOT VALID first).
DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ledger_chain_entries'::regclass
      AND conname  = 'ledger_chain_entries_projection_binds_payload_check'
  ) THEN
    ALTER TABLE "ledger_chain_entries"
      ADD CONSTRAINT "ledger_chain_entries_projection_binds_payload_check"
      CHECK (
            ("payload"::jsonb ->> 'pickId')       IS NOT DISTINCT FROM "pickId"
        AND ("payload"::jsonb ->> 'prevHash')     IS NOT DISTINCT FROM "prevHash"
        AND ("payload"::jsonb ->> 'seq')::integer IS NOT DISTINCT FROM "seq"
        AND ("entryType" = 'SETTLEMENT') = jsonb_exists("payload"::jsonb, 'outcome')
      ) NOT VALID;
  END IF;
END
$mig$;

ALTER TABLE "ledger_chain_entries"
  VALIDATE CONSTRAINT "ledger_chain_entries_projection_binds_payload_check";
```

Verified against Postgres 16.13: applies cleanly, is re-appliable (the `DO`
block stands in for the `ADD CONSTRAINT IF NOT EXISTS` Postgres does not have),
accepts honest rows written by `ledger-chain-store.ts`, and rejects all four
projection tampers:

```
=== TAMPER 1: flip entryType column ===
ERROR:  new row for relation "ledger_chain_entries" violates check constraint
        "ledger_chain_entries_projection_binds_payload_check"
=== TAMPER 2: rewrite pickId column ===   ERROR: … same constraint
=== TAMPER 3: rewrite seq column ===      ERROR: … same constraint
=== TAMPER 4: rewrite prevHash column === ERROR: … same constraint

 seq | entryType  | pickId
-----+------------+--------
   0 | PICK       | p1
   1 | SETTLEMENT | p1        ← unchanged
```

`jsonb_exists(...)` is used rather than the `?` operator so no driver mistakes
it for a bind placeholder. `NOT VALID` + `VALIDATE` takes `SHARE UPDATE
EXCLUSIVE`, never `ACCESS EXCLUSIVE`, so it stays non-blocking if the table is
ever non-empty when this lands.

This constraint does **not** make the row immutable — it makes any edit that
changes the table's *behaviour* also break a constraint. `payload` and
`entryHash` are still governed by the hash chain, and §6b covers the rest.

### 6b. Ship the row-level audit (no schema change — landed in this PR)

`packages/prediction-engine/src/edge-lab/ledger-chain-row-audit.ts` +
`scripts/edge-lab/audit-ledger-rows.ts` audit the raw rows rather than the
parsed export. They catch everything `verifyChain` catches, plus:

- every projection column vs. the hashed payload (`ROW_COLUMN_DIVERGED`),
- `sha256(payload) == entryHash` as a **direct preimage** check — `verifyChain`
  re-projects known fields and so never proves the stored bytes are the
  preimage, and silently ignores extra keys smuggled into the payload,
- `canonicalJson(JSON.parse(payload)) == payload`,
- the exact committed key set (a *missing* key makes `verifyChain` **throw**
  rather than report, because `canonicalJson` refuses `undefined`),
- mixed `chainId`, unsupported `hashAlg`/`canonVersion`, duplicate `entryHash`,
- an optional external anchor — the only check that catches tip truncation.

### 6c. Correct the "founder-applied" comments

See §5. `migration.sql`, `schema.prisma`, and the `EMPTY_NOTE`/`TABLE_NOTE`
strings in `app/api/proof/ledger-chain/route.ts` should say the table is
applied by `prisma migrate deploy` on the next production build.

---

## 7. Runbook — apply

The migration is applied automatically by the production build (§5). To apply
it out of band, e.g. to a staging branch database:

```bash
# 1. Confirm what is pending. Read-only.
npm run db:migrate:status --workspace=packages/db

# 2. Apply. Additive only; ~instant; locks nothing that exists (§3).
npm run db:migrate --workspace=packages/db      # prisma migrate deploy

# 3. Verify shape — CREATE TABLE IF NOT EXISTS does NOT converge an existing
#    table, so check rather than assume.
psql "$DATABASE_URL" -c "\d+ ledger_chain_entries"
psql "$DATABASE_URL" -c "
  SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
   WHERE conrelid = 'ledger_chain_entries'::regclass ORDER BY conname;"
```

Expected: 1 PK + 6 CHECKs (7 with §6a), 7 indexes, **zero** foreign keys in
either direction.

Writes stay off until `LEDGER_CHAIN_ENABLED=true` is set in the runtime
environment. Applying the table and enabling writes are two separate,
independently reversible decisions — keep them that way.

## 8. Runbook — audit a live chain

```bash
# Dump raw rows, including the unhashed projection columns the public export
# does not carry.
psql "$DATABASE_URL" -At -c "
  SELECT coalesce(json_agg(t ORDER BY t.seq), '[]'::json)
    FROM (SELECT * FROM ledger_chain_entries
           WHERE \"chainId\" = 'glass-v1' ORDER BY seq) t" > rows.json

# Audit. Second argument is the externally published anchor
# {"tipHash":"<64 hex>","count":<n>} — WITHOUT it, truncation is not ruled out.
npx tsx scripts/edge-lab/audit-ledger-rows.ts rows.json anchor.json
```

Exit `0` clean, `2` findings (each printed with its code, row index, column and
explanation), `3` I/O. Sample output on an untampered chain with no anchor:

```
rows audited:     2
tip hash:         84fbb460e32dc6f7317c17acc47617c951172ea4df880e3b62cbe37e8f363f2f
anchor supplied:  NO — tip truncation NOT ruled out

UNALTERED — 2 row(s), tip 84fbb460…. NO ANCHOR SUPPLIED: removal of rows from
the END of the chain was NOT ruled out.
```

and on the `entryType` tamper, with a matching anchor:

```
anchor supplied:  yes

findings (1):
  [ROW_COLUMN_DIVERGED] index 1 col entryType: entryType column is "PICK" but
  the hashed payload encodes a SETTLEMENT entry …

BROKEN — 1 finding(s) across 2 row(s): ROW_COLUMN_DIVERGED
```

Note the anchor matched and the audit still failed — that is the point of §6a
and §6b: an anchor pins the *tip*, not the *columns*.

`scripts/edge-lab/recompute.ts` remains the right tool for the **public**
export (`GET /api/proof/ledger-chain`), which anyone can run without database
access. The row audit is the operator-side complement, not a replacement.

## 9. Runbook — rollback

```sql
DROP TABLE "ledger_chain_entries";
```

Then delete the `_prisma_migrations` row for
`20260820090000_add_ledger_chain_entries` so `migrate deploy` does not consider
it applied, and unset `LEDGER_CHAIN_ENABLED`.

**Cost, measured:**

- Dependent objects: `0` inbound foreign keys, `0` dependent views/rules.
  `DROP TABLE` succeeds with no `CASCADE`.
- Blast radius on other tables: none. After the drop, `picks` still returned
  its full row count.
- Application impact: none while the flag is off. With the flag on, the store
  classifies a missing table as `skipped: "table_missing"` and the proof route
  returns `200 { entries: [], note }` rather than a 500 — the fail-open path is
  the same one that runs before the table is ever created.
- What is actually lost: the chain history itself. It is not reconstructible
  from `picks` — the whole point is that the entries were committed at decision
  time. **Export first** (§8) if there is any chance of wanting the record
  back.

A cheaper partial rollback: leave the table in place and set
`LEDGER_CHAIN_ENABLED` to anything other than `true`. Writes stop, the table
sits empty or frozen, the public export goes honest-empty, and nothing is lost.
Prefer this unless the table itself must go.

## 10. Residual risk after the required changes

| Risk | Status |
|---|---|
| Edit a hashed field | Detected (hash + linkage) |
| Edit a hashed field and re-hash the row | Detected at the next entry |
| Delete a mid-chain row | Detected (seq gap) |
| Edit a projection column | Detected by §6a (rejected) and §6b (reported) |
| Delete the tip / a suffix | **Not detected** without a published anchor |
| Rewrite the entire chain from a chosen point forward | **Not detected** without a published anchor |
| Move rows to another `chainId` | Reported by §6b as a mixed chain; equivalent to deletion for the export |

The last two are the reason `ledger-anchor.ts` exists. Until an anchor is
actually published on a schedule, the honest public claim is "no entry has been
altered", not "no entry has been removed". The audit tooling is written to say
exactly that and refuses to print "VERIFIED" without an anchor.
