# GSE Finish-Line — Diff Classification

**As of:** 2026-06-29 (finish-line re-execution). Classifies the working-tree changes so
only safe, intended files are staged. Verified via `git status --porcelain`.

## Working-tree set (all under `docs/gse/`)

| File | Class | Stage? |
|---|---|---|
| `local-completion-status.md` (M) | intended docs | ✅ yes |
| `owner-decision-packet.md` (M) | intended docs | ✅ yes |
| `final-owner-decision-packet.md` | intended docs | ✅ yes |
| `finish-line-branch-status.md` | intended docs | ✅ yes |
| `finish-line-no-claim-scan.md` | intended docs | ✅ yes |
| `finish-line-validation-results.md` | intended docs | ✅ yes |
| `backtest-truth-verdict.md` | intended docs | ✅ yes |
| `diff-classification.md` (this file) | intended docs | ✅ yes |
| `pr-open-packet.md` | intended docs | ✅ yes |
| `preview-ci-status.md` | intended docs | ✅ yes |
| `pr3-tlaps-runbook.md` | parallel-agent artifact (formal-safety) | ✅ yes (reviewed clean) |
| `formal/PR3Waitlist.tla` | parallel-agent artifact (TLA+ spec) | ✅ yes (reviewed clean) |
| `formal/pr3_runbook_check.py` | parallel-agent artifact (BFS checker) | ✅ yes (reviewed clean, inert) |

## Why the parallel-agent artifacts are safe to include
- No banned positive-claim terms (grep clean).
- `pr3_runbook_check.py` imports **no** os/sys/subprocess/socket/network and uses no
  `open()/exec()/eval()/__import__` — pure in-memory state-machine BFS, prints to stdout.
  **Committed as a doc artifact; not executed.**
- `.tla` is a formal spec (text). `pr3-tlaps-runbook.md` documents the PR3 (gated) migration.
  None touches `schema.prisma`, source, or config.

## Explicitly NOT staged (none present, confirmed)
- secrets / `.env` — none
- runtime lead files (`.gse-local/`) — none
- source / config / `schema.prisma` changes — **none** (working tree is docs-only)
- `node_modules`, `.next`, generated junk — none staged
- Lumera files / XXX files — none
- unrelated-branch work — none

## Verdict
The entire working tree is documentation/formal-artifact text under `docs/gse/`. Safe to
stage in full. No code, schema, config, secret, or cross-lane file is involved.
