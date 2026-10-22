Corpus-briefs digest — RETRY with the fast path. The extraction already exists; do NOT re-extract.

Extraction (reuse as-is): C:\Users\Garrett\AppData\Local\Temp\gse-extract\mimo\corpus-intelligence\briefs\ — clusters c01..c07, c07d (if present).

Full corpus inventory to cover: every *.md under those cluster dirs EXCEPT c03\r48\** (already digested in an earlier pass; skip it).

Method (learned from the timed-out first attempt):
- Use `rg` (ripgrep), never grep -r. Never `for f in $(find ...)` over 2,400 files.
- Pass 1 (ranking): one rg --count-matches call per signal pattern set, writing to two temp files:
  a) signal density: pattern 'Brier|ECE|\bCLV\b|sample size|threshold|acceptance gate|ADOPT|REFUSE|REBUILD|n ?= ?[0-9]'
  b) GSE-seam density: pattern 'GSE seam|GSE-seam|fail-closed|DataGap|founder-gated'
  Rank files by (3*b + a) descending.
- Pass 2 (reading): READ the top 60 ranked files only, fully. For each: one digest row —
  | file | paper/subject | method (1 line) | strongest numeric result (verbatim) | GSE seam (or "none stated") | disposition |
  Disposition enum: QUEUED-BUILDABLE (method + gate stated) / QUEUED-RESEARCH (idea or pointer only) / NOT-APPLICABLE / DUPLICATE (name the cluster summary that covers it).
- Pass 3 (coverage check): count files per cluster dir (rg --files | count) and report briefs-per-cluster, so the census can reconcile the 2,221 brief files against the corpus-deep distilled layer.
- The other ~2,340 files are covered by the ranking pass alone — list the top 150 by rank with their counts, no full read. Say honestly that only the top 60 were fully read.

Report: write C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\mimo-corpus-digest.md incrementally (write the ranking table FIRST, then append digest rows as you go, so a crash never loses everything).
No git commands. No writes outside the temp dir and the report file.
