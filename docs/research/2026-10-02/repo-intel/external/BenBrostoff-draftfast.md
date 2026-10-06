# BenBrostoff/draftfast — Dossier

**Stars:** 299 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-02-05 (low activity; 25 open issues, maintenance-light) · **Created:** 2015-08-14

## 1. Vision
The reference DFS lineup optimizer: a Python library that turns player pools + rule sets into valid DraftKings/FanDuel lineups, thousands at a time, with exposure control, stacking, and CSV import/export for bulk entry. Covers NFL classic, Showdown, MVP; plus NBA/MLB/NHL/PGA/NASCAR/soccer/F1 and 20+ rule sets.

## 2. The Ask
`pip install draftfast`, Python 3.12+. Input is a player pool with salary + projections (`Player(name, cost, proj, pos)` or a CSV from the contest's salaries export). Projections are BYO — the library optimizes; it does not project.

## 3. Constraints
- **License: NONE declared** (no license file on the API) — defaults to all-rights-reserved. Cannot be copied or vendored; study-only. This alone rules out adoption.
- Optimizer is deterministic greedy/LP-style, not a simulation engine: no ownership modeling, no GPP correlation/stacking logic beyond user-specified stacks, no Monte Carlo. Serious GPP tools have moved to sim-based construction.
- Maintenance is thin (pushed Feb 2026, 25 open issues); some rule sets may lag behind DK/FD slate changes.

## 4. GSE lens
This is the closest public analog to GSE's DFS lane, and the contrast is damning: **draftfast is an 11-year-old library with a complete rule-set table and CSV round-trip into contests, while GSE's optimizer still falls back to a sample slate because it has no live slate feed.** The optimizer exists; the feed doesn't. But the deeper lesson is architectural: draftfast's clean separation (projections IN, lineups OUT, rules as data) is exactly the seam GSE should enforce — the engine produces projections, the optimizer consumes them, and the slate feed is a third independent input. GSE's gap isn't the optimizer math; it's the two inputs (live slate, wired projections). Also note: no-license means GSE can't even borrow the rule-set table verbatim — must re-encode DK/FD rules from public contest rules.

## 5. Verdict
**REBUILD** — The RuleSet-as-data pattern and projection/optimizer separation are worth studying and re-implementing (MIT-clean room: re-derive DK/FD roster rules from contest pages, don't copy the code). No-license kills adoption.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/BenBrostoff/draftfast
- Gitdiagram: https://gitdiagram.com/BenBrostoff/draftfast
- Star history (299 stars): https://star-history.com/#BenBrostoff/draftfast
- github.dev: https://github.dev/BenBrostoff/draftfast
