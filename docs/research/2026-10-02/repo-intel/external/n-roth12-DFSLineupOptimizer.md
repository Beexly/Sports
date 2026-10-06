# n-roth12/DFSLineupOptimizer — Dossier

**Stars:** 12 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2024-09-13 (low activity) · **Created:** 2023-03-26

## 1. Vision
A small, dependency-free Python optimizer for NFL DFS: reads a contest CSV (DK/FD/Yahoo salaries), optimizes one lineup or generates many, supports full-roster, Captain, and MVP formats, exports entry-ready CSVs. Explicitly offline — projections come from the salaries CSV's fantasy-points-per-game column unless the user edits them.

## 2. The Ask
A contest CSV downloaded from the DK/FD/Yahoo contest page. Built-in-modules only; `pip install lineup-optimizer` from PyPI.

## 3. Constraints
- **License: MIT** — clean.
- No simulation, no ownership, no stacking beyond user-specified team stacks; projection input is naive (FPPG from the salary file) — the repo is honest that this is a placeholder for real projections.
- Quiet since Sept 2024; DK/FD CSV formats drift, and there's nobody home to fix parsers.

## 4. GSE lens
The instructive part is what it *admits*: it runs offline and uses FPPG as a stand-in projection, and it says so up front. GSE's optimizer falls back to a sample slate — functionally the same honesty, but inverted: the projections are (becoming) real while the slate is fake. The repo's real lesson is the **CSV-in/CSV-out contract with the contest page**: a live slate feed doesn't have to be an API — DK/FD publish player pools as downloadable CSVs per contest. GSE's "no live slate feed" gap could be closed with a *scheduled CSV puller* as the v1 producer, no API partnership required. That's a smaller, uglier, faster fix than waiting for a sanctioned feed — and this repo proves the CSV contract is a known-working seam.

## 5. Verdict
**REBUILD** — Rebuild the CSV-seam idea as GSE's v1 slate producer (scheduled pull + parse of contest player-pool CSVs into the optimizer). MIT allows studying the parser, but GSE should write its own against current DK formats.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/n-roth12/DFSLineupOptimizer
- Gitdiagram: https://gitdiagram.com/n-roth12/DFSLineupOptimizer
- Star history (12 stars): https://star-history.com/#n-roth12/DFSLineupOptimizer
- github.dev: https://github.dev/n-roth12/DFSLineupOptimizer
