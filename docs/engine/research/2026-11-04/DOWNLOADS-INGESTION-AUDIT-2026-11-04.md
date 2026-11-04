# Downloads Ingestion Audit — 2026-11-04

**Scope:** every path in the 357-item Downloads list supplied by Garrett.
**Verdict:** 319/357 in the corpus. The other 38 are 37 byte-identical
duplicates and 1 truncated download. No text-bearing file is missing.

## Method

1. Wrote the 357 paths to `audit_filelist.txt`.
2. Checked existence: **357/357 present on disk**.
3. Built the set of basenames already in the merged manifest across
   `pdf_path`, `path`, `source_path`, `file_path`, `local_path`.
4. Ingested every uncovered file with `scripts/research/ingest_downloads_audit_2026_11_04.py`:
   - `.md/.txt/.py/.ts/.cu/.log/.json/.csv/.ris/.eml` → read as text
   - `.docx` → python-docx (paragraphs + tables)
   - `.pdf` → pymupdf
   - `.ipynb` → JSON cell extraction
   - `.html` → BeautifulSoup, scripts/styles stripped
   - `.xlsx` → openpyxl
   - `.db` → sqlite3 schema + row counts
   - `.zip` → entry listing
   - `.png` → easyocr (4 card graphics)
5. Deduped by SHA-256 so byte-identical copies collapse.
6. Merged into the manifest, rebuilt the index, verified retrieval.

## Result

| Metric | Value |
|---|---|
| Listed | 357 |
| Present on disk | 357 |
| In corpus | **319** |
| Not in corpus | 38 |
| Newly ingested | 203 (199 text/docx/pdf/ipynb/html/xlsx/sqlite/zip + 4 OCR) |
| Characters ingested | 11,731,375 |
| Empty extractions | 0 |

### The 38 not in the corpus

| Class | Count | Detail |
|---|---|---|
| Byte-identical duplicates | 37 | Same SHA-256/MD5 as a file that IS in the corpus |
| Truncated download | 1 | `Unconfirmed 394316.crdownload` — PDF header, 0 pages, unusable |

Duplicate examples (all verified by hash):
- `CONTENT-STACK-AUDIT-2026-10-28.md` == `CONTENT-STACK-AUDIT-2026-10-28 - Copy.md`
- `vmls.pdf` == `vmls_boyd_vandenberghe.pdf` (MD5 `fd98ef4e…`)
- `2309.15253.pdf` == `2309.15253v2.pdf` (MD5 `ad6c7246…`)
- `takeout-20261027T043625Z-1-001.zip` == `… (1).zip`
- 33 more `(1)`/`(2)`/`- Copy` pairs

## The three named reports — verified

| Report | Chars | Distinctive strings checked | Result |
|---|---|---|---|
| `RUN-REPORT.md` | 7,183 | AIGoat, 127.0.0.1:8000, FLEET-HARDENING-CHECKLIST, Alembic | all PRESENT |
| `TEST-REPORT.md` | 8,964 | MemPalace, 96.6%, LongMemEval, 13/20, 84582fb | all PRESENT |
| `BAKEOFF-REPORT.md` | 13,978 | OXR, MarkItDown, 174/200, 1910.03779, Forecast Aggregation | all PRESENT |

## Bug found and fixed during the audit

`local_doc` was absent from `SOURCE_PRIORITY`, so it defaulted to 9 (lowest).
An `openalex` metadata stub of the same title outranked the ingested text and
dedupe kept the **0-char stub**. `RUN-REPORT.md`, `TEST-REPORT.md` and
`BAKEOFF-REPORT.md` were all indexed as empty despite 7–14K chars of text.

Fix in `intelligence/research/corpus_index.py`:
- `local_doc` registered at priority 0 (it carries full text).
- A record with `has_full_text` now beats a title-only stub regardless of
  source priority.

Regression tests: `test_local_doc_is_a_registered_source_priority`,
`test_dedupe_full_text_beats_a_higher_priority_stub`.

## Corpus state after ingestion

| Metric | Before | After |
|---|---|---|
| Deduped records | 6,295 | **6,495** |
| Full text | 2,717 | **3,046** |
| Unique terms | 262,469 | **284,717** |
| Avg doc length | 1,987 | **2,676** |

## Retrieval verification

Eight probes, all on-target:
- "tau hat solution" → TAU HAT SOLUTION (1)
- "injury overlay" → test gse injury overlay
- "engine blueprint" → GSE Coach Brain LLM & Engine
- "situational context" → Master Execution Report The Belichick
- "Sinkhorn optimal transport" → ACCELERATING SINKHORN ALGORITHM
- "NFL win probability" → iWinRNFL
- "defensive coverage disguise" → Decoding Defensive Coverage Responsibilities
- "DFS lineup optimization" → Optimising Daily Fantasy Sports Teams

## Test status

356 passed, exit 0 (full suite). 32 corpus-index tests including the two new
dedupe regressions.

## What is NOT claimed

- The 4 card PNGs are OCR'd, not hand-verified. OCR can misread digits; the
  text is in the corpus but should not be treated as authoritative for odds.
- The `.crdownload` is genuinely unusable (0 pages). It is not in the corpus
  and cannot be until the download completes.
- Duplicates are collapsed, not deleted from disk. Every original file is
  still in `C:\Users\Garrett\Downloads`.
