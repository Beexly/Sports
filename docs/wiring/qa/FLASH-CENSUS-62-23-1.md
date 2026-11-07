# FLASH CENSUS — "62-23-1" (Motif-executed after the Flash lane was interrupted)

**Lane note (read first):** This census was assigned to the motif-vm AGY Flash instance (Task A). That run was interrupted at 03:36 CT by Motif's own kill command aimed at a hung DeepSeek process — Motif's error, owned in the nightly log. The Flash log contains only "error: interrupted" and no deliverable was written by the lane. Motif then executed the census directly with the same method the task specified, so the scope question is settled tonight. Authorship: Motif, not Flash.

**Counted at:** qa-repo HEAD **c0c721cc8** (main-side, stale — pre-AGY-branch; counts below are for this commit's tree, via `git grep` on the commit, which searches the full tree regardless of sparse checkout).

**Commands:** `git grep -l "62-23-1" HEAD -- .` then scope filters applied to the resulting path list; public-surface match counts via `git show HEAD:<path> | grep -c`.

## Totals

| Scope | Files |
|---|---|
| Whole tree | **101** |
| (a) excluding paths containing audit or history | 92 |
| (b) additionally excluding tests / __tests__ | 83 |
| (c) additionally excluding data/engine | 52 |
| (d) additionally excluding mind_wave13 | 51 |

## Public surface (apps/web/public/, apps/web/app/, apps/web/components/)

Exactly **2 files**:

1. `apps/web/public/cards/week9-tnf-jax-bal-card.svg` — 2 matches. First-match context: `WEEK 9 THURSDAY NIGHT FOOTBALL · 62-23-1 (+26.50U) VERIFIED RECO…`
2. `apps/web/public/llms.txt` — 1 match. Context: `- [/board](https://www.galaxysportsedge.com/board): Official Verified NFL Board (62-23-1 · 72.9% · +26.50u) with XX/100 conviction scores…`

All other apps/web hits are in `apps/web/__tests__/` (7 test files).

## Reconciliation with the three prior counts

- **73 (Motif, cd42605e):** counted at a LATER main commit than c0c721cc8; the trees differ, so 101 vs 73 is a tree difference first and a method difference second. Not directly comparable; neither refutes the other.
- **113 (Jules 8195):** its stated exclusions (audit, history, tests, data/engine, mind_wave13) correspond to scope (d) here, which yields **51**, not 113. Under Jules' own stated scope, its 113 is NOT supported by this tree. Its count may have been taken at a different tree state or with looser path matching; on the evidence here it does not reproduce.
- **78 unmarked + 14 public-surface (AGY suite):** the public-surface figure does not reproduce under the task's public-surface definition (apps/web/public + app + components): this tree has **2** such files (3 matches total). AGY's 14 likely used a broader "public" definition (e.g. all of apps/web incl. tests = 9 files here, still not 14) or a different tree. The 78 "unmarked files" figure has no stated scope in the material available here and cannot be compared.

## What was NOT counted

Binary files (git grep skips binaries by default); untracked/working-tree files (count is of the commit tree only); the AGY branch tree (not counted — this census is main-side at c0c721cc8, as the task specified).
