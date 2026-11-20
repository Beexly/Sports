---
name: session-close
description: Manual end-of-session verification, docs/ops/STATE.md update, ledger reconciliation, and commit handoff checklist.
disable-model-invocation: true
allowed-tools: Bash(npm run *), Bash(npx *), Bash(git *), Read, Edit, Grep, Glob
---

# Session close

Manual-only checklist executed when closing out a session or preparing a PR/commit handoff.

## 1. Run Full Verification Directly (No Truncating Pipes)
Run the project gates required by your changes and inspect exact exit codes without piping through `head` or `tail`:
```powershell
npm run guardrails
npm run build --workspace=@sports/web
npm run check:ledger
```

## 2. Independent Diff Review & Status Check
- Spawn an independent `auditor` or `code-reviewer` subagent (or review the complete `git diff` / `git status --short` yourself) to confirm scope discipline and ensure no temporary artifacts or pytest side-effect noise remain staged.

## 3. Reconcile Ledger & `docs/ops/STATE.md`
- Update any owned rows in `docs/ops/AGENT_LEDGER.md` (`DONE` requires a verified 7+ hex SHA from `git rev-parse --verify <sha>` and push confirmation; unpushed commits stay `UNPUSHED`; owner-only tasks stay `OWNER_GATE`).
- Keep `docs/ops/STATE.md` concise (~60 lines: ground truth, owner queue <= 3, quarantined/in-flight items).

## 4. Structured Commit / Handoff Block
Include explicit observed verification results, pushed branch + SHA, and a `NOT RUN / NOT VERIFIED` line for anything skipped. Never claim unverified passes or modify frozen `.claude/settings.json`, `.claude/hooks/`, or `.githooks/`.

## Completion Criteria
Done when required guards/build pass, `docs/ops/STATE.md` and `docs/ops/AGENT_LEDGER.md` match git state, and working tree is clean on target remote branch.
