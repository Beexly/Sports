# START HERE — superseded; the work was FOUND and REVIEWED

The authoritative, evidence-backed finding for all three review requests lives in:

  handoff/claude/agent-os-runtime-visible-review/  (START_HERE.md, PATCH_REVIEW_REPORT.md, …)

**Headline (RESOLVED):** Codex's Agent OS Runtime work was located on branch
`codex/enforce-use-of-main-branch-in-git-setup` (commit `3a381d4c`; 138 files, +7057/−69, base
`0e70605`). The earlier "not present in beexly/sports" finding is **superseded** — the churning
SHAs were the same tree re-committed in a network-isolated Codex worktree; it has since landed on
GitHub.

It was reviewed first-hand, gate-by-gate: **db:generate ✅, typecheck ✅ (after clearing a stale
`.next` cache), 29 tests ✅, build ✅ (187 pages).** Verdict: **real, honest, additive, weakens no
safety gate — keep it.** Full detail (safety gate review, duplication-vs-my-branch, the one real
persistence gap, the 11 answers) is in the visible-patch review folder.
