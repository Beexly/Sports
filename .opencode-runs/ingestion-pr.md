## Why

`processSport()`'s first write — `db.ingestionRun.create()` — sat **above** the `try` that records failures. With Postgres unreachable it threw outside the catch, so:

- no `IngestionRun` row of any status was written
- `getOdds()` was never reached
- **zero credits were spent**, so the credit governor reported perfectly healthy
- no owner alert fired

That is how a database outage stayed invisible for 8+ hours. The one durable record that would have made it self-diagnosing was the record the outage prevented from existing.

## The fix

**Part A** — the run-open moves inside its own guard. On failure it logs, calls `notifyOwner`, and returns a `status:"failed"` envelope tagged `run_open_failed`.

**Part B** — the catch block's own `status:"FAILED"` write is guarded too, so a database that dies *mid-cycle* cannot throw past the owner alert and lose the record precisely when the outage is real.

Two design points:

- It reports through **DB-independent channels** (`console.error` + `notifyOwner`). A durable DB write is impossible during a DB outage, so relying on one is what made this invisible.
- It **stops** rather than continuing. `Odds.ingestionRunId` is `NOT NULL`; fabricating a run id would produce unattributable writes.

## Verification

- Full `ingestion-pipeline` suite: **92 files passed / 1 skipped, 1,457 tests passed / 6 skipped / 0 failed**, vitest exit 0
- Existing `process-sport.test.ts`: **81 tests pass**, no regression
- New `process-sport-db-outage.test.ts`: **5 cases pass**
- **Falsification** (the part that matters): the same 5 cases run against the *unpatched* file all fail with `Can't reach database server at gse-postgres`. The tests pin the fix; they are not vacuously green.
- `tsc --noEmit`: 1 error, **identical to the pre-change baseline** (pre-existing Windows path-casing error via `@types/ws`). Zero new type errors.

## What this does NOT do

It makes the next outage **visible**. It does not make the pipeline work without a database — if Postgres is still unreachable, ingestion still produces no odds. It now produces a loud, attributable failure instead of silence.

## Relationship to the live incident

`docs/ops/PRODUCTION-INCIDENT-db-unreachable.md` records the current outage. The root cause there is a wrong `neondb_owner` credential, **not** this code path. This PR is preventive: it removes the reason the outage was able to hide for eight hours.

Law check: no weight, gate, `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`, `PERFORMANCE_STATS` or `MODEL_VERSION` touched.
