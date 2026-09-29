# Ingestion outage containment — APPLIED (2026-09-29)

**Status: APPLIED to `process-sport.ts` on branch
`fix/ingestion-run-open-outage-guard`.** Founder-approved. Verified on the REAL
repo file, not a generated copy.

A subagent (task-1) built this and was killed by an OpenRouter server error
*after* producing its measurements and *before* writing its write-up. Everything
it measured is reconstructed here from its own artifacts, which are preserved
alongside this file.

## What changed when it was applied

The patch from `apply-fix.js` was applied verbatim to
`packages/ingestion-pipeline/src/process-sport.ts` (both anchors were confirmed
to exist in the real file first; `notifyOwner` was already imported at line 85,
so no new import was needed):

- **PART A** — `process-sport.ts:340`: the run-open is now inside its own
  try/catch. On a DB outage it logs, calls `notifyOwner`, and returns a
  `status: "failed"` envelope tagged `run_open_failed:`.
- **PART B** — the catch block's own `status: "FAILED"` write is now guarded, so
  a DB that dies mid-cycle cannot throw *past* the owner alert and the failed
  envelope.

A permanent regression test was added at
`src/__tests__/process-sport-db-outage.test.ts` (5 cases) — the pre-merge gate
this document asked for, which the temp-copy proof could not provide.

## Verification on the real file

| Check | Result |
|---|---|
| Full ingestion-pipeline suite | **92 files passed, 1 skipped / 1457 tests passed, 6 skipped, 0 failed** (`vitest run` exit 0) |
| Existing `process-sport.test.ts` | 81 tests pass — no regression |
| New `process-sport-db-outage.test.ts` | 5 tests pass on the patched file |
| **Falsification** — same 5 tests on the UNPATCHED file | **all 5 FAIL** with `Can't reach database server at gse-postgres` |
| `tsc --noEmit` | 1 error, identical to the pre-change baseline (a pre-existing Windows path-casing error in `@types/ws` via `packages/db`); **zero new type errors** |

The falsification row is the one that matters: the new tests fail without the fix
and pass with it, so they pin the behaviour rather than merely passing.

## The bug that was fixed

`packages/ingestion-pipeline/src/process-sport.ts:340` (pre-fix line number)

```ts
const run = await db.ingestionRun.create({
  data: { sport: sport.key, status: "RUNNING" },
});
```

This is the **first** write in `processSport()` and it sat **above** the `try`
that opens further down. Production Postgres was unreachable (see
`PRODUCTION-INCIDENT-db-unreachable.md`), so it threw outside the catch:

- no `IngestionRun` row of any status was written,
- `getOdds()` was never reached,
- zero credits were spent, so the credit governor reported healthy,
- the failure was invisible to every dashboard in the repo.

The one durable record that would have made this self-diagnosing is the record
the outage prevents from existing.

## The measured proof (pre-application, on a temp copy)

`apply-fix.js` patched a **temp copy**, never the repo, and the copy was then run
against the real 81-test suite plus two added outage proofs. Both directions
were measured:

| | Result |
|---|---|
| **BASELINE** (repo source, unpatched) | `PROOF_A {"threw":"Can't reach database server at gse-postgres…"}` |
| **PATCHED** | `PROOF_A {"threw":"(did not throw)","resolvedEnvelope":{...}}` |

So the baseline reproduced the exact production error string, and the patched
copy resolved with a normal envelope instead.

## The shape of the fix

PART A — guard the run-open itself:

```ts
// The IngestionRun row is the only durable record that this cycle ran, and
// this is the FIRST write — so a database outage lands right here, above the
// try that records failures. Left unguarded the throw escapes processSport
// and the owner is never told. Open the run under its own guard and report
// through the DB-independent channels. We STOP rather than continue: every
// write below needs a real run id (Odds.ingestionRunId is NOT NULL).
let run: { id: string };
try {
  run = await db.ingestionRun.create({ ... });
} catch (openErr) {
  // console.error + notifyOwner, then return the failed envelope
}
```

Two design points worth the reviewer's attention:

1. **It reports through DB-independent channels.** The durable DB write is
   impossible during a DB outage, so the failure has to be announced by
   `console` and `notifyOwner`/Telegram — the same `notifyOwner` path the rest of
   the ingestion pipeline already uses.
2. **It STOPS rather than continuing.** `Odds.ingestionRunId` is `NOT NULL`, so
   every downstream write needs a real run id. Carrying on with a fabricated id
   would produce writes that cannot be attributed to a cycle — worse than
   stopping.

## What this does NOT do

The root cause is still an unreachable database. **This fix makes the next
outage visible; it does not make the pipeline work without a database.** If
Postgres is still unreachable, ingestion still produces no odds — it now
produces a loud, attributable failure instead of silence.

## Files here (design artifacts, unchanged by application)

| File | What |
|---|---|
| `apply-fix.js` | the patch, applied to a temp copy only |
| `build-suite-v2.js` | builds the generated test suite |
| `ast-proof.js`, `ast-proof2.js` | AST-level proof that the guards are positioned correctly |
| `outage.proof.test.ts` | the two outage proofs, standalone; asserts the pre-fix DEFECT and now fails against the patched source, by design |
| `suite/__tests__/outage-proof.test.ts` | generated: real module + 81 existing tests + 2 outage proofs |

Re-run the original harness: `node apply-fix.js`, then run the suite under
`suite/`. The permanent regression test now lives in the repo proper at
`packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts`.
