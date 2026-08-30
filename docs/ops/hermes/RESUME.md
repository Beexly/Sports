RESUME. You may have been cut off mid-run. That is normal. Do not restart from scratch
and do not re-read anything you do not need.

STEP 0 — does the live ledger exist?

The live ledger is `docs/ops/AGENT_LEDGER.md`. AGENTS.md (2026-08-20) froze
`handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`. Those files still exist
on disk. Do not resume work from them.

**If `docs/ops/AGENT_LEDGER.md` exists**, go to STEP 1. Use only that file.

**If it does NOT exist**, stop. Do not recreate `handoff/LEDGER.md`. Do not invent
a backlog from `CONTINUOUS.md`. Write BLOCKED in the runner log: live ledger
missing, fetch origin/main, and wait for relaunch.

STEP 1 — recover interrupted state.
If any task is marked CLAIMED, it was interrupted:
  - run its test. Green and committed already? mark DONE and move on.
  - otherwise `git checkout -- <that task's files>`, then re-claim it and redo it.
Also run `git status --short`. If it shows anything you cannot explain, revert it.
You start every session from a clean tree.

STEP 2 — continue the loop.
Read `docs/ops/AGENT_LEDGER.md` Rules, then: first unclaimed row you can do ->
CLAIMED (same commit that begins the work) -> do it -> verify -> DONE (real SHA
or #PR) or BLOCKED -> next. Never stop.

When the ledger has no unclaimed row you can do, open the latest
`docs/ops/hermes/BUILD-QUEUE-*.md` if present. Do not fall back to
`docs/ops/hermes/CONTINUOUS.md` or `handoff/LEDGER.md`.

Your laws are in `AGENTS.md` at the repo root and are already loaded.

KNOWN BLOCKED TASK: P1-15 (isotonic-pava). A previous run concluded its failure is a
REAL CODE DEFECT, not test drift. Do not "fix" it by editing the test, and do not
patch the algorithm. Mark it BLOCKED, write the defect description in the evidence
column, and move on. A genuine algorithmic bug in calibration is an owner decision.

Work until you are cut off again. Something will relaunch you. The ledger is what
makes that lossless, so keep it accurate and keep its evidence to one line per task.

Begin at STEP 0.
