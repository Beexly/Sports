# Galaxy Genesis — Queue-First Continuous Execution Contract

**Mode:** autonomous campaign execution with bounded, verified workstream loops  
**Primary rule:** finish the current queue before branch/PR reconciliation  
**Optimization target:** maximum verified product capability per token without losing, duplicating, or prematurely replacing work

## 1. Objective

Continue the repository's real current work from its live queue, active branch, task ledger, handoffs, PR state, and uncommitted changes. Finish every dependency-ready item already marked `IN_PROGRESS`, `QUEUED`, `NEXT`, or equivalent before beginning the stranded-branch reconciliation campaign.

The operating loop is:

```text
REVIEW
→ FREEZE CONTRACT
→ CODE
→ TARGETED VERIFY
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS
→ COMMIT / PUSH / PR
→ SELECT NEXT
→ CONTINUE
```

This is a campaign of bounded workstreams, not an unreviewed mega-diff. Each loop must become independently understandable, testable, reversible, and recoverable before the next loop starts.

## 2. Live state outranks stale plans

At campaign start and before every next selection, refresh:

```text
git status --short
git branch --show-current
git worktree list
git log -8 --oneline
git fetch --all --prune
gh pr list --state all --limit 200
```

Never replace live reality with an old plan or screenshot. Historical plans are evidence of intent and dependencies, not proof of current completion.

Queue authority order:

1. current uncommitted work and the active branch's explicit workstream;
2. live task tracker or session task list, when present;
3. `docs/frontier/CURRENT_STATE.md`;
4. `docs/frontier/WORKSTREAM_QUEUE.md` and workstream contracts;
5. `docs/frontier/DECISION_REGISTER.md` and `RECOVERY_MATRIX.md`;
6. active PR descriptions, review findings, handoffs, and branch-local ledgers;
7. `docs/genesis/WORK_QUEUE.md` and `CANON_MANIFEST.json`;
8. branch/PR reconciliation only after the queue-drain gate is satisfied.

When sources disagree, inspect code, Git history, tests, and live PR state. Record the ruling in the canonical ledger instead of maintaining two conflicting queues.

## 3. Protect active work

- Never stash, reset, clean, overwrite, rebase, or force-push another agent's uncommitted work.
- Continue a coherent active workstream in its existing worktree and branch.
- Use a separate clean worktree for any unrelated workstream.
- Allow only one writer per branch/worktree.
- A background research or verifier agent is read-only unless it owns a separate worktree and a frozen contract.
- Never abandon partially completed work merely because a newer program looks more exciting.

## 4. Queue-drain law

Before reconciliation begins, the conductor must prove all of the following:

```text
no current workstream remains partially implemented
no dependency-ready IN_PROGRESS item remains
no dependency-ready QUEUED/NEXT item remains in the current campaign queue
all completed items have tests, ledger updates, commit, push, and PR/accounting state
all owner gates are recorded with non-destructive defaults
all active worktrees are clean or contain explicitly parked owner-gated work
```

A task is not complete because code exists. It is complete only when its contract is met, verified, reviewed, polished, documented, committed, pushed, and reflected in the queue.

Blocked items remain in the ledger with:

```text
OWNER_GATE or BLOCKED
exact decision or dependency
why authority or evidence is missing
safe default disposition
work completed around the gate
re-entry condition
```

Continue around blocked items whenever a later item is genuinely dependency-ready. Never pretend a blocked dependency is satisfied.

## 5. Workstream loop

### A. Review

Inspect only the code, tests, history, PRs, decisions, and research necessary for the selected item. Identify:

- current behavior;
- partial implementation;
- reusable or stranded assets;
- collisions and canonical owners;
- user and system value;
- protected zones;
- failure modes;
- smallest complete vertical slice.

### B. Freeze the contract

Before editing, write:

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

### C. Code

- Recover before rebuilding.
- Make the smallest coherent implementation that completes the contract.
- Do not broaden scope to consume remaining context or tokens.
- Preserve evidence, rights, entitlement, bitemporal, settlement, CLV, calibration, proof, and public-claim invariants.
- No fabricated live state, sample data presented as real, silent fallbacks, or optimistic capability status.

### D. Targeted verification

Run tests nearest to changed behavior during implementation. Do not repeatedly run the entire repository suite.

### E. Independent review

Use one read-only verifier after the first green implementation. Protected-zone work also receives an independent red-team review.

The reviewer must inspect the actual diff and search for:

- hidden behavior or population changes;
- incorrect evidence/rights projection;
- fail-open behavior;
- entitlement leaks;
- temporal leakage;
- duplicated canonical systems;
- vacuous tests;
- unsupported claims;
- incomplete acceptance criteria;
- unnecessary complexity or token-heavy design.

### F. Improve

Fix every confirmed finding. Reject speculative rewrites that do not materially improve correctness, safety, usability, maintainability, evidence quality, or cost.

### G. Polish

Polish is not cosmetic filler. It includes:

- plain and accurate user-facing states;
- accessibility, responsive behavior, reduced motion, keyboard behavior, and text zoom where applicable;
- API and type ergonomics;
- helpful errors and honest unavailable states;
- removal of accidental duplication;
- comments and docs that match actual behavior;
- operational observability and rollback clarity.

### H. Final verification

Run applicable repository-native gates once on final code:

```text
focused tests
relevant workspace suite
full suite when repository law or risk requires it
typecheck
lint --max-warnings=0
applicable guardrails
git diff --check
secret scan
Prisma validation for schema-touching work
build for production-compilation surfaces
browser/a11y QA for user-facing behavior
```

Never claim an unrun command or inherit an old green result after code changed.

### I. Durable completion

- Update every affected queue, current-state file, decision ledger, recovery matrix, and handoff.
- Mark exact verified status, not aspirational status.
- Commit one coherent workstream.
- Push with retry/backoff.
- Create or update the correct PR.
- Record owner gates and remaining limits.
- Write a compact receipt to the repository or PR.

### J. Continue

Immediately select the next dependency-ready item from the live queue. Do not ask the founder whether to continue.

## 6. Priority law

Within the existing queue, select work by:

```text
live correctness / security / money-truth defect
+ active partially completed work
+ dependency unlocks
+ user-visible value
+ proof and trust value
+ recovery of already-built assets
+ reuse across future work
+ launch or revenue urgency
- protected-zone risk
- duplication risk
- implementation and token cost
```

Do not reorder the founder's accepted queue merely because another feature is more novel. Reorder only when fresh evidence reveals a correctness/security defect, an invalid dependency, or a stronger unblock. Record the reason.

## 7. Reconciliation transition

Only after the queue-drain law passes:

1. commit and push the final queue state;
2. write `QUEUE_DRAIN_RECEIPT.md` under `reports/reconciliation/` or the active handoff directory;
3. switch to a clean reconciliation worktree;
4. run `/genesis-reconcile inventory`;
5. complete the exhaustive inventory and recovery plan;
6. execute subsequent recovery waves one bounded capability at a time;
7. after reconciliation waves are drained, return to the next dependency-ready Genesis/frontier queue item.

Reconciliation must not interrupt a coherent in-progress task unless a proven correctness, security, or data-loss risk requires immediate intervention.

## 8. Autonomous boundaries

Do not:

- merge or push directly to `main`;
- deploy production;
- apply production migrations;
- mutate Stripe, live billing, secrets, or production infrastructure;
- broaden source permissions;
- activate providers, models, publishing, or gated flags;
- change settlement, CLV, calibration, proof, public-performance population, or `MODEL_VERSION` without the required owner gate;
- delete a branch without a deletion receipt;
- auto-publish content;
- hide blocked or failed work.

## 9. Campaign stop conditions

Continue until one of these is true:

1. the current queue and reconciliation recovery queue are both exhausted;
2. every remaining item is owner-gated or externally blocked and no surrounding work remains;
3. a tool, quota, environment, or repository failure makes further verified progress impossible;
4. a protected decision cannot be safely defaulted and blocks every remaining path.

On stop, return:

```text
CAMPAIGN BASELINE
WORKSTREAMS COMPLETED
CURRENT QUEUE STATE
CODE / PRODUCT VALUE ADDED
RECOVERED ASSETS
REVIEWS AND IMPROVEMENTS
POLISH COMPLETED
VERIFICATION EVIDENCE
BRANCHES / PRS
OWNER GATES
BLOCKERS
RECONCILIATION STATE
NEXT EXACT COMMAND
TOKEN-DISCIPLINE RECEIPT
```
