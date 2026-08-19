RESUME. You may have been cut off mid-run. That is normal. Do not restart from scratch
and do not re-read anything you do not need.

STEP 0 — does the ledger exist?

Check for `handoff/LEDGER.md`.

**If it exists**, go to STEP 1.

**If it does NOT exist**, you must rebuild it before doing anything else. It is an
index, not the record — the record is git history, so nothing is lost. Rebuild it:

```bash
mkdir -p handoff
git log --oneline -60
```

Every commit tagged `[hermes-<id>]` is a task that is already DONE. Do not redo any of
them. Create `handoff/LEDGER.md` with this header and one row per task:

```
# Hermes Continuous Run - Ledger
branch: <git rev-parse --abbrev-ref HEAD>   start commit: <git log -1 --format=%h>
baseline: typecheck=0  lint=0  guards=23/25

| id | task | status | at | evidence / commit |
|---|---|---|---|---|
```

Fill it in this order:
1. One `DONE` row per `[hermes-*]` commit found, with its short hash as evidence.
2. Then read `handoff/MASKED_TEST_DEBT.md` and add a `TODO` row for every Class B
   file that has no matching commit. **Skip every Class A file** — those are red by
   design pending owner decisions on #419/#420 and are off-limits.
3. Then add `TODO` rows for the remaining phases in `docs/ops/hermes/CONTINUOUS.md`
   (PHASE 1b, 1c, 1d, 2, 3, 4).

Then continue to STEP 1. Rebuilding takes one pass — do not agonize over it, and do
not verify each commit by re-running its tests. The commit is the evidence.

STEP 1 — recover interrupted state.
If any task is marked CLAIMED, it was interrupted:
  - run its test. Green and committed already? mark DONE and move on.
  - otherwise `git checkout -- <that task's files>`, then re-claim it and redo it.
Also run `git status --short`. If it shows anything you cannot explain, revert it.
You start every session from a clean tree.

STEP 2 — continue the loop.
First TODO -> CLAIMED -> do it -> verify -> DONE or BLOCKED -> commit -> next.
Never stop. When every row is DONE or BLOCKED, open
`docs/ops/hermes/CONTINUOUS.md`, take the next phase, and append its tasks as TODO.
Its STANDING ORDERS never run out, so there is always a next task.

Your laws are in `AGENTS.md` at the repo root and are already loaded. Do not re-read
`CONTINUOUS.md` in full - jump only to the section for the phase you are on. Reading
it end to end is what fills your context and ends your session early.

KNOWN BLOCKED TASK: P1-15 (isotonic-pava). A previous run concluded its failure is a
REAL CODE DEFECT, not test drift. Do not "fix" it by editing the test, and do not
patch the algorithm. Mark it BLOCKED, write the defect description in the evidence
column, and move on. A genuine algorithmic bug in calibration is an owner decision.

Work until you are cut off again. Something will relaunch you. The ledger is what
makes that lossless, so keep it accurate and keep its evidence to one line per task.

Begin at STEP 0.
