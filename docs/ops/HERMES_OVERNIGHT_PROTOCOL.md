# Hermes Overnight Execution Protocol

**Purpose**: let a free local coding agent (Hermes Agent driving an Ollama model,
per `docs/ops/DEV_LEVERAGE_RUNBOOK.md`) execute the remaining build tasks
overnight, **safely**, on this heavily-governed repo. Designed for a
local-model-class executor: every step is mechanical, every change is gated, and
ambiguity resolves to "stop and journal," never "improvise."

**Scope**: Tasks **T2 and T3 only** from
`docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`. T1 (model-advisor) is already
implemented and verified. T4–T6 are change-proposal-gated — **forbidden** for
unattended runs.

---

## 1. Operator setup (you, before bed — 5 minutes)

```bash
# 1. Local engine (see DEV_LEVERAGE_RUNBOOK §1):
ollama pull qwen3-coder:30b        # or your installed coder tag

# 2. Fresh clone/branch state:
cd ~/Sports && git fetch origin && git checkout claude/fable-5-ultracode-plan-ptru4e && git pull

# 3. Install deps once so gates can run:
npm install

# 4. Start Hermes pointed at the local model, working dir = repo root.
#    Give it the bootstrap prompt from §2 verbatim.
```

## 2. Bootstrap prompt (paste into Hermes verbatim)

```
You are working overnight, unattended, on the Sports repo (branch
claude/fable-5-ultracode-plan-ptru4e). You are a careful, mechanical executor.

MISSION
Execute Task T2, then Task T3, from docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md.
Read that file first, then docs/intelligence/NEXT_LEVEL_INTELLIGENCE_MASTER_PLAN.md
sections 7-8, then CLAUDE.md. Follow the specs exactly.

HARD RULES (violating any of these = stop immediately and journal)
1. NEVER run npm install <package>, add dependencies, or edit any package.json.
2. NEVER modify: apps/web/lib/ai-control-plane/**, packages/db/prisma/**,
   scripts/guardrails/**, .github/**, any file with "sealed" or "DORMANT" in its
   header, docs/intelligence/**, docs/ops/**.
3. NEVER push. Commit locally only. Never use --force, --no-verify, or reset.
4. NEVER touch git config, secrets, .env*, or anything outside the repo.
5. NEVER fabricate data, scores, prices, or test results.
6. Work ONLY on: apps/web/app/cockpit/api-costs/** (T2), the eval:prompts
   implementation files (T3), reports/**, and new *.test.ts files next to them.
   ADDITION — the companion charter `HERMES_AUDIT_CHARTER.md` legitimately widens
   this allow-list for Phase A hardening to also include `tools/model-advisor/**`
   and `handoff/**` (for report/summary files). That widening is the only
   deviation from this rule's strict list. The three prohibitions below remain
   absolute in BOTH documents:
   a. NEVER edit any package.json or run `npm install <pkg>` (charter Prime
      Directive 3 confirms this).
   b. NEVER edit auth.ts or any auth/session/RBAC file — it is outside both
      allow-lists.
   c. "new *.test.ts files next to code you are hardening" means tests co-located
      with the specific file being hardened, NOT cross-package mocks or fixture
      changes that widen scope beyond the touched file.

LOOP (repeat per task)
a. Read the task spec section fully. List the exact files you will touch.
b. Implement the smallest complete increment.
c. Run: npm run typecheck && npm run lint && npm test
d. All green -> git add <files> && git commit -m "feat(scope): <what> [overnight-T2|T3]"
e. Any red -> fix and rerun. If the SAME failure survives 2 fix attempts:
   git checkout -- <changed files>, journal the failure, move to the next task.
f. After each commit, append to handoff/OVERNIGHT_JOURNAL.md:
   timestamp, task, files touched, gate results, next step.

STOP CONDITIONS (stop = write final journal entry, then idle)
- Both tasks committed green, or attempted with 2-strike failures journaled.
- Any hard-rule conflict, merge conflict, or unexpected repo state.
- Any gate (typecheck/lint/test) failing for a reason you did not cause.

Your final journal entry must list: commits made (hashes + messages), tests
added, anything skipped and why, and exact commands for the human to verify.
```

## 3. Why these rails (context for the human)

- **T2/T3 only**: they are read-only-data UI + eval harness work — no schema, no
  deps, no sealed surfaces. T4–T6 require owner-approved change proposals
  (doctrine: `SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` §1) and must never
  run unattended.
- **No push**: your review is the merge gate. Local commits are cheap to audit
  and cheap to discard (`git reset --hard origin/...`).
- **Two-strike rule**: local-model agents loop on hard failures; capping retries
  converts a wasted night into a journaled, reviewable attempt.
- **Journal**: `handoff/OVERNIGHT_JOURNAL.md` is the morning source of truth.

## 4. Morning review checklist (you, with coffee — 10 minutes)

```bash
cd ~/Sports
cat handoff/OVERNIGHT_JOURNAL.md              # what happened
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD   # what was committed
npm run typecheck && npm run lint && npm test # trust nothing, re-verify
git diff origin/claude/fable-5-ultracode-plan-ptru4e...HEAD -- apps/ | less  # read the diff
```

- Diff clean + gates green + journal coherent → `git push -u origin claude/fable-5-ultracode-plan-ptru4e`.
- Anything off → `git reset --hard origin/claude/fable-5-ultracode-plan-ptru4e`
  and hand the journaled failure to a stronger session (Claude Code) — that is
  the routing table in `docs/reference/MODEL_LANDSCAPE.md` §E working as intended:
  the local tier attempts, the frontier tier closes.

## 5. What Hermes must NOT be asked to do (ever, unattended)

The fabricated-handbook installer, any `npm install`, provider-registry
activation, Prisma/schema changes, guard edits, Stripe/paywall code, scraping
jobs, publishing content, or anything under `docs/adr/` approval gates. If a
night's plan seems to need one of these, the plan is wrong — stop.
