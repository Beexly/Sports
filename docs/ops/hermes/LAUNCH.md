# Hermes / Laguna — Launch Guide

Two jobs, run in this order, on separate nights (or back-to-back if you're awake):

1. **`AUDIT_PROMPT.md`** — 28 read-only probes. Hermes changes no source, only writes
   reports into `handoff/` (which is gitignored).
2. **`BUILD_QUEUE.md`** — 11 tasks: six zero-risk reports/single-line changes, five
   code tasks. One commit each, no push.

Run the audit **first**. It is read-only, so a misbehaving agent can't hurt anything,
and it tells you how much to trust this setup before you let it write code.

---

## 0. The thing that matters most

**The safety hook does not protect Hermes.**

`.claude/settings.json` + `scripts/guardrails/agent-bash-guard.mjs` block dangerous
shell commands — but only for **Claude Code**. Hermes is a different program and never
sees them. Every rail for Hermes is *text in the prompt*, *exit-code checks*, and
*your review of the diff*.

That is why both prompts:
- forbid `git push` entirely (you push, after reading the diff),
- forbid touching secrets, schema, guards, CI, and the three known-debt files,
- require a mechanically-checkable Definition of Done per task,
- cap retries so one stuck task can't eat the whole night.

One rail runs automatically regardless: the repo's **pre-commit secret scan** installs
itself via `npm install` and checks every Hermes commit. The prompts ban
`--no-verify`, so it cannot be bypassed silently.

**Your review is the merge gate. Nothing Hermes does reaches GitHub without you.**

---

## 1. Model choice — the $0 path is the default

You have no budget, so the default engine is the one with no meter:

**PRIMARY (free, unlimited): local Ollama.**
```bash
ollama pull qwen3-coder:30b
```
No rate limit, no credit card, runs all night. Slower per token than a hosted route,
but an overnight job doesn't care about latency — it cares about not dying at 2am.

**SECONDARY (free, hosted, rate-capped): OpenRouter free routes.**
`poolside/laguna-s-2.1:free` (262K ctx) and `nvidia/nemotron-3.5-lightning:free`
(1M ctx) are both verified $0/$0 — **but** with no credits the cap is **50 requests
per day**, and an agent loop burns that in under an hour. Free-tier OpenRouter is
fine for testing a single task in the evening, not for the overnight run.

**OPTIONAL accelerator ($10, once, only when you have it):** $10 lifetime credit
raises OpenRouter's free-route cap to 1,000/day, which fits a full overnight run on
Laguna. This is a nice-to-have, not a requirement — do not spend money you need.

If a task keeps failing on the local model, that's usually signal the task spec is
thin, not that you need a bigger model. Paste me the task number and the journal
error and I'll rewrite the spec.

---

## 2. Setup (once, before either job)

```bash
cd <repo root>
git fetch origin
git checkout claude/fable-5-ultracode-plan-ptru4e
git pull
npm install          # required — installs deps, generates the Prisma client,
                     # and activates the pre-commit secret scan
mkdir -p handoff
```

**Windows note:** run in **Git Bash**, not PowerShell. Both prompts use `git grep`,
`node`, `npm` and `git` only — all cross-platform — but the shell syntax assumes
bash. Git Bash ships with Git for Windows.

Sanity check before launching — **these exact numbers were measured on this branch
on 2026-08-13 after a full `npm install`:**

```bash
npm run typecheck 2>&1 | grep -c "error TS"      # prints 3  (known debt, issue #421)
npm run lint                                      # exit 0
node scripts/guardrails/run-all.mjs | tail -2     # 22/25 passed
```

The 3 typecheck errors live in `execute-autonomy-cycle.ts`,
`ranking-power-control.ts`, `proven-path-seed.ts` — deliberate open design questions,
off-limits to Hermes. The 3 failing guards are `model-freeze` (#419),
`api-v1-boundary` (#420), `ai-transport-import-boundary` — tracked base-branch debt.

**If your numbers differ from these, stop and tell me** — the baseline moved and
both prompts assume it did not.

---

## 3. Running a job

Point Hermes at the repo root and paste the prompt file's contents as the task.
Give it the whole file — each is written to be self-contained.

```
Working directory: <repo root>
Task: <paste the full contents of AUDIT_PROMPT.md or BUILD_QUEUE.md>
```

Let it run. Do not babysit. Both prompts end with an explicit STOP condition and
write a journal as they go, so an interrupted run is still readable.

---

## 4. Morning review

**After the audit:**
```bash
cat handoff/AUDIT_FINDINGS.md      # the register — spot-check file:line refs
cat handoff/AUDIT_COVERAGE.md      # what it could not check
cat handoff/JOURNAL.md
git status --short                 # MUST print nothing (handoff/ is gitignored)
```
If `git status` prints anything, the agent broke its read-only contract. Discard
(`git checkout -- .`) and tell me.

**After the build run:**
```bash
cat handoff/BUILD_SUMMARY.md       # per-task: built what, unsure about what
cat handoff/JOURNAL.md
cat handoff/INVENTORY.md           # H2 — .agents / .claude/commands count
cat handoff/ROUTE_AUTH_INVENTORY.md  # H4 — all 176 API routes vs auth
cat handoff/DOC_DRIFT.md           # H5 — docs pointing at missing files
cat handoff/TEST_GAP_MAP.md        # H6 — revenue-core test gaps
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
npm run typecheck 2>&1 | grep -c "error TS"   # still 3
npm run lint && npm test
node scripts/guardrails/run-all.mjs           # still 22/25
git diff origin/claude/fable-5-ultracode-plan-ptru4e...HEAD
```
- Gates at baseline + diff reads sane → `git push origin claude/fable-5-ultracode-plan-ptru4e`
- Anything off → keep the good commits, drop the bad:
  `git rebase -i origin/claude/fable-5-ultracode-plan-ptru4e` — every task is one
  tagged `[hermes-Hn]` commit, so surgery is cheap. Nuclear option:
  `git reset --hard origin/claude/fable-5-ultracode-plan-ptru4e` (nothing was
  pushed, so nothing is lost upstream).

The four `handoff/` reports are the real yield either way — they are the raw
material for the next Claude session's judgment work (paywall audit, doc cleanup,
test writing), even if every code task got abandoned.

---

## 5. What I verified, and what I could not

**Verified directly (Linux container, this branch, 2026-08-13, full `npm install`):**
typecheck = exactly 3 known errors · lint clean · guards 22/25 with exactly the 3
named failures · Prisma client generates with `EntityType` present · every audit
probe command executed with output counts recorded in the prompt · the pre-commit
secret-scan hook activates on install.

**Not verified — stated plainly so you don't trust it by accident:**
- **I have not run Hermes.** I don't know its exact CLI flags or how it takes a
  system prompt. The prompts assume it can read files, edit files, and run shell
  commands in a fixed cwd.
- **I have not tested Laguna or local qwen3-coder on these tasks.** The specs are
  calibrated for a mid-tier model; the real failure rate is unknown until you run it.
- **OpenRouter limits change.** 50/day (no credit) and 1,000/day ($10 lifetime) were
  read from OpenRouter on 2026-08-13. Re-check before a long run.
- **Windows/Git Bash behavior** — everything was verified on Linux; Git Bash should
  behave identically for these commands, but I could not test it from here.
