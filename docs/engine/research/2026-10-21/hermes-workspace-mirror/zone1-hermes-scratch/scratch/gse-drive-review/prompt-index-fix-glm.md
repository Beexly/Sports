MASTER-PAPER-INDEX correction — reproduce, recount, patch. Read-only except the one file you patch.

Target: C:\Users\Garrett\Sports\.worktrees\calib-boundary\docs\arxiv-program\research\MASTER-PAPER-INDEX.md

Step 1 — reproduce the index's own scoping. Read its method/verification section (lines 1-40)
and obey exactly whatever glob root, regex, and family-scoping it defines. Do not substitute
your own.

Step 2 — recount against the live tree:
- code modules matching its regex (its stated root)
- unique arXiv IDs among them
- arxiv-deep ledger coverage of those IDs (ledger dir: docs/arxiv-program/research/2026-09-21/arxiv-deep,
  filenames like NNNN-slug.md)
- the family table row count (the 181-row table it describes)
- whether 1602.00542 (experimental/1602-00542-cluster-seeking-js.ts or any file) exists anywhere

Known facts from a prior audit (impl-verify-pickle.md): current count is 306 modules not 308,
family count is 179 not 181, and 1602.00542 is gone. VERIFY these yourself before trusting them.

Step 3 — patch ONLY the stale numbers in the index. Add a dated re-verification note:
"Re-verified 2026-10-02 (host: Windows calib-boundary worktree): <the new numbers>. Prior run
pre-dated <whatever deletion drifted>." Keep every other line byte-identical. If the index's
verification script exists in the repo, run IT instead of hand-rolling.

Write your report to coverage-index-fix.md in this dir. Do not run git.
