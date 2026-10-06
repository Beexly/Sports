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

STEP 0.5 - the bus. This is how you find out what the other agents did.

Two other agents work this repo (`opus`, and whichever of `grok`/`flash` is not you).
The bus is a shared git channel so none of you rebuild what another already built.

Your id must be exact. If `GSE_AGENT_ID` is unset, STOP and write one line in the
runner log asking for it. Do NOT guess: two agents sharing an id defeats the lock
and is worse than no bus at all.

The clone lives beside this repo at `..\agent-bus`. If it is missing:
  git clone https://github.com/Beexly/agent-bus ../agent-bus

Then, before you pick any task:
  node ../agent-bus/bin/bus.mjs poll

That returns every message and claim since you were last awake. Read it first.
It is the difference between picking up unfinished work and duplicating it.

If the bus is unreachable, write one line saying so and CONTINUE with the ledger.
A missing bus never stops the loop.

STEP 1 — recover interrupted state.
If any task is marked CLAIMED, it was interrupted:
  - run its test. Green and committed already? mark DONE and move on.
  - otherwise `git checkout -- <that task's files>`, then re-claim it and redo it.
Also run `git status --short`. If it shows anything you cannot explain, revert it.
You start every session from a clean tree.

STEP 2 — continue the loop.
Read `docs/ops/AGENT_LEDGER.md` Rules, then, for the first unclaimed row you can do:

  node ../agent-bus/bin/bus.mjs claim <ROW-ID> --note "<one line>"

  granted:false means another agent already holds that row. Take the next one.
  That answer is authoritative - their claim already landed.

  granted:true means it is yours. Mark the row CLAIMED in the same commit that
  begins the work, exactly as before.

-> do it -> verify -> DONE (real SHA or #PR) or BLOCKED -> then release it:

  node ../agent-bus/bin/bus.mjs release <ROW-ID> --outcome done --evidence "<sha>"

-> next. Never stop.

The bus is the LOCK (seconds, and the other agents see it). The ledger stays the
durable record CI checks. Claim on the bus BEFORE you start, not after: a claim
that lands after the work is a receipt, not a lock, and by then someone else has
already built the same thing.

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
