# GSE ORG — roles, handoffs, and what "done" means

Read with `AGENT-ALIGNMENT.md`. That file says what is true; this one says who does what and when
work may move.

## Why this exists

Thirteen sessions in eight days produced a duplicated metrics module, a split working tree running
stale code for hours, a stale defect record, and a review whose two criticals were artifacts of its
own redacted view. Every one of those is an org failure, not a coding failure. The fix is not more
care — it is narrow roles and checkable transitions.

## Roles

One session takes one role. A session that finds itself doing two roles stops and hands off.

| Role | Owns | May not |
|---|---|---|
| **Architect** | Deciding what to build and in what order. Writes the plan and the acceptance criteria. | Write implementation code. |
| **Builder** | Implementing one task from an architect's plan, with tests. | Change the plan, or touch a file another builder holds. |
| **Reviewer** | Adversarial read of a diff against its criteria. Verdict only. | Edit the tree. |
| **Verifier** | Re-running the evidence: tests, live checks, byte-level confirmation. | Trust the builder's or reviewer's claim. |
| **Librarian** | Session hygiene, the alignment record, the handoff, defect ledger. | Touch engine code. |

The **user is the scheduler**, not the router. Work moves between roles on a handoff, not on a
relay through chat.

## The handoff contract

Work may only move to another role with all four of these written down:

1. **What changed** — files, and the commit SHA.
2. **What was proven** — the exact commands run and their exit codes.
3. **What was not proven** — named, not implied.
4. **What the next role must do** — one sentence.

A handoff missing any of the four is not a handoff. It is a status update.

Every handoff lands as a dated entry in `docs/strategy/HANDOFF.md`. That file is the org's memory
and the DoD gate checks it has an entry for today.

## Definition of done

Enforced by `scripts/guardrails/definition-of-done.mjs`. A task is done when:

1. The tree is not behind origin.
2. A test file is staged alongside any package change.
3. The alignment record is staged when a guarded path is staged.
4. `HANDOFF.md` carries an entry for today.

`node scripts/guardrails/definition-of-done.mjs --check` reports all four without failing — use it
at session start. The pre-commit hook fails on 1, 3 and 4.

## Verification standard

A reviewer's finding is a **lead**, not a fact. Before a finding is accepted:

- **Read the bytes, not the rendered view.** Two of four criticals in the 2026-10-28 review were
  redaction artifacts — `-2147483648` displayed as `-[PHONE]`, `` `Bearer `` as `***`. `cat -A` or a
  Python `repr` settles it in seconds.
- **Reproduce before fixing.** A claim that is not reproduced is not a bug.
- **Disprove with a run.** "Non-ASCII keys diverge" died to one command producing the same digest
  from both runtimes.

Reviewers that skip this generate work. Verifiers exist to catch exactly that.

## Enablement

`ENABLED = false` is inert metadata (`acceptance-gate.ts:20`) — nothing reads it, so it says nothing
about what is live. A module is live when a **caller on the scoring path invokes it**, and that is
the only test. 146 of the 199 flagged modules have no such caller.

Promotion is a task with a gate, not a flag flip: name the caller, name the test, name the
calibration check.

## What this does not fix

Roles do not make the engine reason. The location is still a league-average constant
(`engine-reasoning-audit-2026-10-28.md`). They only stop sessions from rebuilding each other.
