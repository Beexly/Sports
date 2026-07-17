---
name: gse-run
description: Galaxy Sports Edge execution conductor. Selects, contracts, implements, and verifies one workstream per invocation using the docs/frontier ledgers. Usage - /gse-run next | recover | <workstream-id> | verify
---

# /gse-run — GSE execution conductor

One invocation = one workstream, fully verified, then stop. Never ask the founder questions; resolve via code, tests, git history, PRs, and conservative reversible defaults. Record genuine founder-authority blocks as OWNER_GATE entries in `docs/frontier/DECISIONS.md` and keep working around them.

## Modes

- `/gse-run next` — select and execute the highest-leverage unblocked workstream.
- `/gse-run recover` — execute the top item of `docs/frontier/RECOVERY_MATRIX.md`.
- `/gse-run <workstream-id>` — execute that specific `Wxxx` from `docs/frontier/WORK_QUEUE.md`.
- `/gse-run verify` — re-run the verification gates for the most recent workstream only.

## Procedure for `next`

1. Baseline: `git status --short && git branch --show-current && git log -5 --oneline`; list open PRs vs `origin/main`.
2. Read ONLY `docs/frontier/CURRENT_STATE.md`, `WORK_QUEUE.md`, `RECOVERY_MATRIX.md`, `DECISIONS.md`. Do not reread the documentation tree.
3. Select the highest-leverage unblocked workstream (dependency order in WORK_QUEUE.md wins over excitement).
4. Freeze the contract (template in `docs/frontier/EXECUTION_PROTOCOL.md`) BEFORE editing.
5. Map existing implementation with gse-scout (read-only, narrow). Recover before rewriting.
6. Implement the smallest complete vertical slice (gse-builder discipline: one frozen contract, no scope expansion).
7. Targeted tests during development; full gates once at completion (see EXECUTION_PROTOCOL.md).
8. Independent verification (gse-verifier discipline: verify claims against the actual diff and command output).
9. Protected zones (list in EXECUTION_PROTOCOL.md) additionally get a gse-red-team adversarial pass.
10. Update CURRENT_STATE.md, WORK_QUEUE.md, DECISIONS.md; append to RECOVERY_MATRIX.md if classifications changed.
11. Commit and push the working branch; prepare/update its PR if one exists.
12. Emit the completion receipt (format in EXECUTION_PROTOCOL.md). Stop. Do not start another workstream.

## Token discipline

Search by symbol/route/schema, not by reading trees. Redirect large command output to the scratchpad and inspect failures only. At most one subagent at a time. Cheaper models for narrow discovery and routine verification; strongest reasoning for orchestration and protected-zone review.
