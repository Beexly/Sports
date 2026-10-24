# Downloads ingest 2026-10-21

Measured from the files Garrett pointed at in Downloads. Secret scan was clean before copy. Large JSON dumps and .pyc files were not copied.

## Corpus

- `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md` in Downloads is byte-identical to the copy already on this branch (sha256 0c477ddd7f73). It has 25 headings matching `### RECORD `. Its title says "Full 80-Record Synthesis." The heading count is 25, not 80.
- `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21 (1).md` and `(2).md` are byte-identical (sha256 5ac20711b19d, 64,973 bytes, 653 lines). Heading count matching `### Record ` is 80. That file is banked here as `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21-xsearch-80.md`. The records are attributed X posts. They were not re-fetched.

## Also banked

- Situational Context v2 (30,957 bytes) and the context locator (10,547 bytes).
- census-gse58-addendum-2026-10-15 (35,363 bytes).
- Docx text extract of GSE Omni-Cognitive World Model Architecture (240 paragraphs, 85,611 chars). The binary docx was not committed.
- Two diagrams: a relative-bias bar chart (naive regression 68.0%, M-DoT-PFN +2.0%, oracle ~1.5%) and a GSE Phase V continual-learning block diagram. No equations were printed on the second diagram.
- Source modules from skeletrack_system, gse_sequence, gse_improved, gse_brain, gse_integrations, aggressive_ingest, browsed_files, and ngs_coords. Not wired into the engine. The repo's existing `intelligence/vision/skeletrack_v2.py` and `scripts/ops/all_odds_sources.py` were not overwritten. The Downloads `all_odds_sources.py` is a different file (13,789 vs 14,277 bytes) and is stored beside this ledger.

## Not copied

- gse_integrations ESPN injuries JSON (18,706,039 bytes) and scoreboard JSON (604,140 bytes).
- gse_brain schedule JSON duplicates (601,669 bytes each).
- `__pycache__` and `.pyc`.
