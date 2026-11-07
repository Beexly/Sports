# RECOMPUTE-QUEUE — Equation-count row: the brain's 5,367 construction

Motif, 2026-11-07 ~03:20 CT. Subject: `computeDynamicEquationCounts()` in
`apps/web/lib/jarvis/stealth-skeleton-brain.ts` (branch
agy/total-wiring-2026-11-07; same construction on main), which computes the
public "5,367 canonical equations" figure as 1,666 + 3,742 − 41.

## What each term actually is (all three verified by direct count)

- **1,666 — REAL, and it is the matrix count, read live.** The brain reads
  `data/engine/thousand_equation_matrix_2026.json`'s `total_equations` field
  when the file is reachable. Motif recount: the file carries exactly 1,666
  entries, and the 12,304-entry executable catalog cites it from exactly
  1,666 entries (1,098 with EQ-MC- locators, 568 with EQ- locators).
- **3,742 — REAL count, WRONG category.** The brain reads
  `docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json` and
  counts its `nodes` array. Motif recount in the sparse clone: nodes = 3,742,
  totalNodes field = 3,742, all canonicalIds distinct. **But the nodes are
  research-source crosswalk records, not equations:** sourceBreakdown =
  ARXIV 2,577 · OPENALEX 761 · KAGGLE 182 · HUGGINGFACE 84 · DOCX_OMML 277
  (canonicalId prefixes ARXIV 2,726 / OPENALEX 473 / DOCX_OMML 277 / KAGGLE
  182 / HUGGINGFACE 84). Node[0] is "arXiv:1807.09236 — Empirical Bayes
  shrinkage of Bradley-Terry-Luce MLEs," a paper record with engine sources.
- **41 — NO countable set exists.** `overlapCount` is a hardcoded constant
  in the brain (line 145); it is not computed from anything. Motif checked
  the obvious candidate: crosswalk canonicalIds ∩ catalog EQ ids = **0** —
  the two sets share no identifier space at all, so no ID-based overlap of
  41 (or any number) exists between them.

## Verdict
5,367 = (1,666 matrix equation entries) + (3,742 research-paper crosswalk
records) − (41, an uncomputed constant). The sum adds two different kinds of
thing and subtracts a number with no measured referent. The estate's real,
countable equation sets are: **12,304** (executable catalog, blob-verified)
and **1,666** (thousand-matrix). Any public "equations" figure should be one
of those, with its source named — or the crosswalk should be counted as what
it is: 3,742 research records.

Filed as evidence for AGY Wave 5 (equation registry) and the morning audit.
The display strings that publish 5,367 (brain badge "5,367 EQ + GSI" at
brain.ts:338 and generated copy) belong to the same removal pass as the
2.66e-7 display strings (RECOMPUTE-QUEUE-CLOSE-2026-11-07.md).
