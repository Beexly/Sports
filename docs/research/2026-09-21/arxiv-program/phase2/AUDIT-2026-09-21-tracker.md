# Tracker Audit — 2026-09-21 (post wave-2)

## Method
Parsed all 772 `arxiv-deep/*.md` ledger files with every verdict format found
(`**Verdict:** X`, `**Verdict: X**`, `**X**` after `## Verdict`, bare `X` after
`## Verdict`, `**X.**`) and reconciled against
`arxiv-program/state/ledger-tracker-750.jsonl` (arXiv IDs version-normalized).

## Findings
- 755/772 files have a parseable verdict; 17 are notes/index files without verdicts.
- Wave-2 commit `13b6a27c2` claimed "tracker 485 → 605" but the tracker file was
  never updated — only 485 lines were on disk. Rebuilt from wave-2 reader
  reports (three different report schemas: `id`/`arxiv_id`/`arxiv` keys).
- 11 valuable ledgers were missing from the tracker — added (program_phase 2).
- **Integrity catch:** tracker entry `2603.04864v1` (recorded ADAPT) pointed at
  ledger `0212`, whose actual verdict is **REJECT** (BRIDGE CHI accessibility
  paper, arXiv:2602.23288v1) and whose paper ID didn't even match. A REJECT was
  counted as valuable. Removed. Per the replace-on-REJECT rule this slot needs
  a fresh replacement read in wave 3.
- 2 lanes fixed: `2209.08778` → markets, `2402.16300` → abstention.
- 3 reader-20 ledgers (1087–1089) use `**ADAPT.**` (trailing period); verified
  genuine ADAPT and kept.

## Verified count after audit
**579 valuable** (365 phase 1 + 214 phase 2). 171 remain to reach 750.
Commit: `86f76c7` on Beexly/Sports@main.
