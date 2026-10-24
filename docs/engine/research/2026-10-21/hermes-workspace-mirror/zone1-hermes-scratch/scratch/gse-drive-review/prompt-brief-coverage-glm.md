Brief-coverage reconciliation — the INGEST-AND-LEARN completeness check. Every raw research brief must be claimed by the distilled layer, or the gap is named. Read-only; no checkout modifications; no git.

Extraction to reuse (already on disk, do not re-extract):
C:\Users\Garrett\AppData\Local\Temp\gse-extract\mimo\corpus-intelligence\briefs\ — cluster dirs c01..c07 (+c07d if present)

Distilled layer (what claims to cover them):
C:\Users\Garrett\Sports\.worktrees\calib-boundary\docs\engine\research\2026-10-02\corpus-deep\deep\c01..c10\
Each cluster dir carries: buildable-systems.md, challenges.md, syntheses.md, verified-claims.md (+ working\* deep files).

Job:
1. Census: count brief files per cluster dir (c01..c07d). Report the table.
2. For each cluster: list the brief r-directories (e.g. c01\r01, c01\r02...) present in the briefs tree.
3. Coverage check: the distilled cluster's verified-claims.md + buildable-systems.md cite papers by bare arXiv id (e.g. 0440, 1172, 0643). Extract every id cited across the distilled files of that cluster (regex \b\d{4}\.\d{4,5}\b plus 4-digit short forms where the brief dir names them — use the brief dir names as the id universe: each brief dir under cXX\rNN is named with the paper slug; treat every brief dir as one paper).
4. Verdict per brief dir: COVERED (its slug/ids appear in the distilled files or the cluster summary names it) / UNCOVERED (no distilled mention found). Use rg for speed. Spot-check 10 UNCOVERED verdicts by actually reading one distilled file mentioning that topic area.
5. Report: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\glm-brief-coverage.md
   - briefs-per-cluster table
   - covered/uncovered counts per cluster
   - the FULL list of UNCOVERED brief dirs (this is the finding — papers in the corpus that the distilled layer never claims)
   - the 10 spot-check results
Write the report incrementally (census table first, then clusters as you finish them).
No git commands. No writes outside the temp dir and the report file.
