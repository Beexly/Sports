---
name: gse-autopilot
description: Continues the live Galaxy Sports Edge queue autonomously through review, implementation, improvement, polish, verification, ledger updates, commit, push, and PR updates before beginning reconciliation.
argument-hint: "[continue|status|verify]"
---

# Objective

```text
MAXIMUM VERIFIED PRODUCT CAPABILITY PER TOKEN
ZERO ABANDONED ACTIVE WORK
ZERO ACCIDENTAL LOSS
ZERO DUPLICATE CANONICAL SYSTEMS
```

Argument: `$ARGUMENTS`

- empty or `continue`: continue the live queue autonomously;
- `status`: report the live queue, worktrees, branches, PRs, owner gates, and next item without editing;
- `verify`: independently review the current workstream and repair only confirmed findings.

# Establish live reality

Run:

```text
git status --short
git branch --show-current
git worktree list
git log -8 --oneline --decorate
git fetch --all --prune
gh pr list --state all --limit 200
```

Never stash, reset, clean, overwrite, rebase, discard, or force-push another agent's work. Continue coherent active work in its current worktree. Use a separate clean worktree for unrelated work.

# Queue authority

Read only what is needed, in this order:

1. current uncommitted work and active workstream;
2. live task/session tracker or handoff;
3. `docs/frontier/CURRENT_STATE.md`;
4. `docs/frontier/WORKSTREAM_QUEUE.md`;
5. active workstream contract files;
6. `docs/frontier/DECISION_REGISTER.md`;
7. `docs/frontier/RECOVERY_MATRIX.md`;
8. active PR descriptions and verified review findings;
9. Genesis queue/manifest only when needed for dependencies.

Live code, Git history, tests, and PR state outrank stale plans. Do not create a replacement queue. Resolve conflicting queues into one dependency graph and record the ruling.

# Queue-first law

Do not begin branch reconciliation while any of these remain dependency-ready:

- the current partially implemented workstream;
- an `IN_PROGRESS` item;
- a `QUEUED`, `NEXT`, or equivalent item;
- an explicitly authorized standing task arc;
- required review, improvement, polish, verification, ledger, commit, push, or PR work for a completed code slice.

A task is complete only after its contract is satisfied, tests pass, independent review is complete, confirmed findings are fixed, meaningful polish is complete, final gates pass, ledgers are updated, and the work is committed, pushed, and represented by the correct PR/accounting state.

# Mandatory execution loop

For every selected queue item:

```text
REVIEW
→ FREEZE CONTRACT
→ CODE
→ TARGETED TEST
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS
→ COMMIT / PUSH / PR
→ SELECT NEXT
→ CONTINUE
```

Before editing, freeze:

```text
WORKSTREAM
WHY NOW
USER / SYSTEM VALUE
CURRENT REALITY
RECOVERABLE ASSETS
CANONICAL OWNER
FILES / SYMBOLS EXPECTED
PROTECTED ZONES
ACCEPTANCE CRITERIA
VERIFICATION COMMANDS
ROLLBACK
EXPLICIT EXCLUSIONS
```

Recover existing code, tests, branches, and designs before building replacements. Implement the smallest coherent vertical slice that fully satisfies the contract. Do not add speculative architecture or consume scope merely because context remains.

# Review and improve

After the first green implementation, use one read-only verifier. If a protected zone changed, also use the independent red-team agent.

Review the actual diff for:

- hidden behavior or evaluation-population changes;
- settlement, CLV, calibration, proof, rights, entitlement, billing, migration, or public-claim risk;
- future-information or temporal leakage;
- fail-open behavior and fabricated states;
- duplicated canonical systems;
- vacuous tests;
- unsupported claims;
- incomplete acceptance criteria;
- unnecessary complexity and token-heavy design.

Fix every confirmed finding. Reject speculative rewrites that do not materially improve correctness, safety, usability, maintainability, evidence quality, resilience, or cost.

Polish includes accurate user-facing states, accessibility, responsive behavior, reduced motion, keyboard navigation, text zoom, API/type ergonomics, useful errors, honest unavailable states, operational observability, rollback clarity, and documentation aligned to actual behavior.

# Verification

Use targeted tests during edits. At final state, run each applicable gate once:

```text
focused tests
relevant workspace tests
full suite when repository law or risk requires it
typecheck
lint --max-warnings=0
applicable guardrails
git diff --check
secret scan
Prisma validation for schema changes
build for production-compilation changes
browser and accessibility QA for user-facing changes
```

Never claim an old or unrun result after the code changes.

# Durable completion and continuation

After each workstream:

- update `CURRENT_STATE.md`, `WORKSTREAM_QUEUE.md`, `DECISION_REGISTER.md`, `RECOVERY_MATRIX.md`, affected contracts, and handoffs;
- record exact verified status and remaining limitations;
- commit one coherent workstream;
- push with retry/backoff;
- create or update the correct PR;
- record a compact receipt;
- immediately select the next dependency-ready queue item and continue without asking the founder.

# Owner gates and hard boundaries

Record genuine founder-only decisions as:

```text
OWNER_GATE
Decision:
Why founder authority is required:
Safe non-destructive default:
Work completed around the gate:
Re-entry condition:
```

Continue every non-blocked path.

Never merge or push directly to `main`, deploy, apply production migrations, mutate Stripe/secrets/infrastructure, broaden source rights, activate models/providers/publishing/flags, auto-publish, delete branches without receipts, or alter protected settlement/CLV/calibration/proof/entitlement/public-population/MODEL_VERSION policy without its required ruling.

# Transition to reconciliation

Only after the live queue has no dependency-ready `IN_PROGRESS`, `QUEUED`, `NEXT`, or authorized standing work, and all completed work is verified, reviewed, polished, committed, pushed, and reflected in the ledgers:

1. create a queue-drain receipt;
2. ensure active worktrees are clean or explicitly parked behind owner gates;
3. load the canonical reconciliation contract from PR #125 or its eventual merged location;
4. execute the reconciliation inventory;
5. recover one bounded reconciliation wave at a time;
6. return to the next dependency-ready frontier/Genesis workstream afterward.

Continue until the queue is exhausted or every remaining path is genuinely owner-gated, externally blocked, or impossible to verify with available tools.
