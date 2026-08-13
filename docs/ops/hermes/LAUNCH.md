# Hermes / Laguna — Launch Guide

Two jobs, run in this order, on separate nights (or back-to-back if you're awake):

1. **`AUDIT_PROMPT.md`** — 28 read-only probes. Hermes changes no source, only writes
   reports into `handoff/`.
2. **`BUILD_QUEUE.md`** — 8 build tasks, ordered safest-first, one commit each, no push.

Run the audit **first**. It is read-only, so a mis-behaving agent can't hurt
anything, and it tells you how much you can trust this setup before you let it write.

---

## 0. The thing that matters most

**The safety hook does not protect Hermes.**

`.claude/settings.json` + `scripts/guardrails/agent-bash-guard.mjs` block dangerous
shell commands — but only for **Claude Code**. Hermes is a different program and
never sees them. Every rail for Hermes is *text in the prompt* plus *your review of
the diff*.

That is why both prompts:
- forbid `git push` entirely (you push, after reading the diff),
- forbid touching secrets, schema, guards, and CI,
- require a mechanically-checkable Definition of Done per task,
- cap retries so one stuck task can't eat the whole night.

**Your review is the merge gate. Nothing Hermes does reaches GitHub without you.**

---

## 1. Model choice

Laguna is Poolside's coding model. Verified routes as of 2026-08-13:

| Route | Cost | Context |
|---|---|---|
| `poolside/laguna-s-2.1:free` (OpenRouter) | **$0/$0** | 262K |
| `poolside/laguna-xs-2.1:free` (OpenRouter) | **$0/$0** | 262K |

OpenRouter free-tier limits: **20 req/min; 50 req/day** with no credits, **1,000/day**
once you've bought $10 lifetime. An overnight build run will exceed 50 requests —
**buy the $10 credit before you start**, or the job dies around midnight.

Alternatives if Laguna stalls (both verified, both free):
- `nvidia/nemotron-3.5-lightning:free` — 1M context, built for agent execution steps
- Local: `ollama pull qwen3-coder:30b` — no rate limit at all, slower

If a task keeps failing on Laguna, that's signal the task is under-specified, not
that you need a bigger model. Tell me which task and I'll rewrite the spec.

---

## 2. Setup (once, before either job)

```bash
cd ~/Sports          # or C:\Users\Garrett\...\Sports
git fetch origin
git checkout claude/fable-5-ultracode-plan-ptru4e
git pull
npm install          # required — several guards need node_modules
mkdir -p handoff
```

**Windows note:** run in **Git Bash**, not PowerShell. Both prompts use `git grep`,
`node`, `npm` and `git` only — all cross-platform — but the shell syntax assumes
bash. Git Bash ships with Git for Windows.

Sanity check before launching (all three must succeed):

```bash
npm run typecheck
npm run lint
node scripts/guardrails/run-all.mjs
```

The third prints `20/25 passed` or better. Five known failures are expected:
`model-freeze` (#419), `api-v1-boundary` (#420), `ai-transport-import-boundary`
(#421) are tracked base-branch debt; `actor-minting-boundary` and `ai-council`
pass once `npm install` has run. **If you see a different failure list, stop and
tell me** — the baseline moved and both prompts assume it.

---

## 3. Running a job

Point Hermes at the repo root and paste the prompt file's contents as the task.
Give it the whole file — it is written to be self-contained.

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
cat handoff/AUDIT_FINDINGS.md      # the register
cat handoff/AUDIT_COVERAGE.md      # what it could not check
cat handoff/JOURNAL.md
git status --short                 # MUST be clean — the audit writes only to handoff/
```
If `git status` shows changes outside `handoff/`, the agent broke its read-only
contract. Discard everything (`git checkout -- .`) and tell me.

**After the build run:**
```bash
cat handoff/BUILD_SUMMARY.md      # per-task: what it built, what it was unsure about
cat handoff/JOURNAL.md
cat handoff/INVENTORY.md          # from H2 — the .agents / .claude/commands count
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
npm run typecheck && npm run lint && npm test
node scripts/guardrails/run-all.mjs
git diff origin/claude/fable-5-ultracode-plan-ptru4e...HEAD
```
- Gates green + diff reads sane → `git push origin claude/fable-5-ultracode-plan-ptru4e`
- Anything off → `git reset --hard origin/claude/fable-5-ultracode-plan-ptru4e`
  (throws away the whole night; nothing was pushed, so nothing is lost upstream)

You can also keep the good commits and drop the bad ones — `git rebase -i
origin/claude/fable-5-ultracode-plan-ptru4e` — since every task commits separately
and tags its message with `[hermes-Tn]`.

---

## 5. What I could not verify from here

Stated plainly so you don't trust it by accident:

- **I have not run Hermes.** I don't know its exact CLI flags, how it takes a
  system prompt, or whether it respects a working-directory boundary. The prompts
  assume it can read files, edit files, and run shell commands in a fixed cwd.
- **I have not tested Laguna on these tasks.** The task specs are calibrated for a
  mid-tier model, but the real failure rate is unknown until you run it.
- **OpenRouter free-tier limits change.** The 50/day and 1,000/day numbers were
  read from OpenRouter on 2026-08-13. Re-check before a long run.
- **`npm install` was never run in my environment**, so `npm test` and
  `npm run lint` have not been executed end-to-end by me on this branch. Typecheck
  and the guard suite were verified with a scratch toolchain.

Everything else in both prompts — file paths, current failures, guard behavior,
the entity-graph schema, the response-cache API — I verified directly this session.
