Closes the loop on the 8-hour production outage of 2026-09-29.

**Why this was invisible.** `processSport`'s first write — `db.ingestionRun.create()` at `:340` — sat **above** the `try` that records failures. With Postgres unreachable it threw outside the catch, so:

- no `IngestionRun` row of any status was written
- `getOdds()` was never reached
- **zero credits were spent, so the credit governor reported HEALTHY**
- no owner alert fired

The one durable record that would have made the outage self-diagnosing was the record the outage prevented from existing. A separate audit found the same shape in the alerting path itself (`isLowQuota(null)` → "not low").

**What changes.** The run-open moves inside its own try/catch: on a DB outage it logs, calls `notifyOwner`, and returns a `status:"failed"` envelope tagged `run_open_failed`. The catch block's own `FAILED` write is guarded too, so a DB dying mid-cycle can't throw *past* the alert.

Two deliberate design points: it reports through **DB-independent** channels, because a durable DB write is impossible during a DB outage; and it **stops** rather than continuing, because `Odds.ingestionRunId` is `NOT NULL` and a fabricated run id would produce unattributable writes.

**Verified on the real file**, in an isolated worktree:
- 5 new regression tests pass
- full ingestion-pipeline suite: **92 files passed / 1 skipped, 1457 tests passed / 6 skipped / 0 failed**
- **falsification:** the same 5 cases *fail* against the unpatched file with `Can't reach database server at gse-postgres` — so they pin the fix rather than merely passing

**Honest scope:** this makes the next outage *visible*. It does not make the pipeline work without a database. If Postgres is unreachable, ingestion still produces no odds — it now produces a loud, attributable failure instead of silence.

The root cause of that outage was three **empty** production env vars, fixed separately. This is the guard so the next one is readable.

**Note for reviewers:** an earlier attempt at this branch (#957) went red on a test file that no longer exists. This is a clean re-application onto current `main` (`8b77a9d5b`), with the suite re-run here rather than inherited.