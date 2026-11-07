# Cited-path census — the catalog's 2,577 real_source_file values vs the real repo

Motif, 2026-11-07 ~03:55 CT. Closes the remainder the DeepSeek salvage left
open (MATH-QA-FINDINGS §5: "whether the 2,576 absent cited paths exist
elsewhere in the full repo — Jules equation-QA lane owns that census").
Method: every distinct `real_source_file` in
`data/equations/equation_executable_catalog_12304.json` checked against
(a) the qa-repo sparse clone's working tree AND (b) its full HEAD tree
listing (`git ls-tree -r HEAD`), so sparse-checkout gaps cannot masquerade
as absences. The clone's HEAD is main-side; branch-only paths would need a
second pass, but the catalog predates the AGY branch.

## Result
- Distinct cited files: **2,577**
- Present in the working tree: **1,580** (including the thousand-matrix
  itself) — these carry **3,245** of the 12,304 entries.
- Absent from the working tree but present in the HEAD tree: **4**
  (intelligence/reasoning/engine_plan_recovered_equations.py,
  intelligence/reasoning/mind_eq_recovered_functions.py,
  brain/feeds/2026-10-28-quad-engine-crosswalk.jsonl,
  brain/feeds/unified_mind_staging_waves1_to_12_2026_11_06.jsonl).
- **Not in the repo tree at all: 993**, carrying **9,059 entries (73.6%)**.
  Of the 993:
  - **663 are not file paths at all** — placeholder strings ("LOCAL_PATH")
    and fragment citations ("lane-a-situational/repos-wave-REPOS-A-1.md#A-R1-01"
    style anchor references into a lane scratch file that is not in the repo).
  - **330 are path-shaped but exist nowhere in the tree** — dominated by a
    `corpus_pdf/` prefix (session transcripts and Drive-sweep indexes cited
    as if they were repo files, e.g. "corpus_pdf/GDrive_MegaSweep::INDEX-BOOKS-B.md").

## Verdict
The catalog header's `authentic_source_verified_count = 12,304` cannot be
sustained: for 9,059 of 12,304 entries (73.6%), the cited source does not
exist in the repository — and for the majority of those, the citation is not
even a path. 3,245 entries cite files that verifiably exist. Provenance for
the rest is unverifiable from the repo, full stop.

Cross-check (same run): the thousand-matrix's own header splits its 1,666 as
citable_verified 1,340 + computed 326 — consistent with the wiring audit's
earlier count, and its signalFamilyIdx coverage recount matches the salvage
exactly (258 distinct, range 12–276, absent 0–11, 17, 262–265, 268, 275,
277–278).
