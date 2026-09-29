# Ingestion outage containment — design + measured proof (2026-09-29)

**Status: PROPOSED, NOT APPLIED.** The fix lives in `apply-fix.js` and has been
verified against a generated copy of the real module. `process-sport.ts` in the
repo is untouched.

A subagent (task-1) built this and was killed by an OpenRouter server error
*after* producing the measurements and *before* writing its write-up. Everything
it measured is reconstructed here from its own artifacts, which are preserved
alongside this file.

## The bug being fixed

`packages/ingestion-pipeline/src/process-sport.ts:340`

```ts
const run = await db.ingestionRun.create({
  data: { sport: sport.key, status: "RUNNING" },
});
```

This is the **first** write in `processSport()` and it sits **above** the `try`
that opens at line 384. Production Postgres is currently unreachable (see
`PRODUCTION-INCIDENT-db-unreachable.md`), so it throws outside the catch:

- no `IngestionRun` row of any status is written,
- `getOdds()` is never reached,
- zero credits are spent, so the credit governor reports healthy,
- the failure is invisible to every dashboard in the repo.

The one durable record that would have made this self-diagnosing is the record
the outage prevents from existing.

## The measured proof

`apply-fix.js` patches a **temp copy**, never the repo, and the copy is then run
against the real 81-test suite plus two added outage proofs. Both directions
were measured:

| | Result |
|---|---|
| **BASELINE** (repo source, unpatched) | `PROOF_A {"threw":"Can't reach database server at gse-postgres…"}` |
| **PATCHED** | `PROOF_A {"threw":"(did not throw)","resolvedEnvelope":{...}}` |

So the baseline reproduces the exact production error string, and the patched
copy resolves with a normal envelope instead. The existing 81-test suite was run
against the patched copy to confirm no regression.

## The shape of the fix

Part A — guard the run-open itself:

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
} catch (err) {
  // report via console + Sentry (both DB-independent), then rethrow or return
}
```

Two design points worth the reviewer's attention:

1. **It reports through DB-independent channels.** The durable DB write is
   impossible during a DB outage, so the failure has to be announced by
   `console` and `captureError`/Sentry — the same `captureError` path the rest of
   the ingestion pipeline already uses.
2. **It STOPS rather than continuing.** `Odds.ingestionRunId` is `NOT NULL`, so
   every downstream write needs a real run id. Carrying on with a fabricated id
   would produce writes that cannot be attributed to a cycle — worse than
   stopping.

## Why this is not applied yet

- It is a behaviour change on the ingestion path, which the founder's rails
  place behind explicit approval.
- The fix is verified against a **generated copy**, not against the repo file.
  Before merging, the patch must be applied to the real `process-sport.ts` and
  the full ingestion suite run on it.
- The root cause is still an unreachable database. **This fix makes the next
  outage visible; it does not make the pipeline work without a database.**

## Files here

| File | What |
|---|---|
| `apply-fix.js` | the patch, applied to a temp copy only |
| `build-suite-v2.js` | builds the generated test suite |
| `ast-proof.js`, `ast-proof2.js` | AST-level proof that the guards are positioned correctly |
| `outage.proof.test.ts` | the two outage proofs, standalone |
| `suite/__tests__/outage-proof.test.ts` | generated: real module + 81 existing tests + 2 outage proofs |

Re-run: `node apply-fix.js` then run the suite under `suite/`. Nothing here
writes to the repo.
