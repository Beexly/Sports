RESUME. You may have been cut off mid-run. That is normal. Do not restart from scratch
and do not re-read anything you do not need.

STEP 1 — recover state.
Open `handoff/LEDGER.md`. If any task is marked CLAIMED, it was interrupted:
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
`CONTINUOUS.md` in full — jump only to the section for the phase you are on. Re-reading
it end to end is what filled your context last time.

Work until you are cut off again. Something will relaunch you. The ledger is what makes
that lossless, so keep it accurate and keep its evidence to one line per task.

Begin at STEP 1.
