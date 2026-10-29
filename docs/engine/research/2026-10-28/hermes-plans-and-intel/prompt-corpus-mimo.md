Deep extraction pass 3. Do not modify G:\ or any Sports checkout. Extract ONLY to C:\Users\Garrett\AppData\Local\Temp\gse-extract\mimo\. Write one report file.

First verify the dump path (use whichever exists): G:\My Drive\GSE. 10.2.26 OR G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26

Your slice: `corpus-intelligence-2026-10-02.zip` (4,414 entries; ~3,748 files under briefs/c01–c07). Prior passes only read calibration-specific briefs (c03/r48, c09/c09-d30, c10/r50 calibration cohort). Do not repeat those.

Your job — mine the reader briefs for GSE-seam material at scale:
1. Extract to your temp dir.
2. Triage with grep across all briefs for lines naming: acceptance gate, numeric threshold, sample size (n=), Brier/ECE/CLV numbers, "GSE seam", "wire", "adopt", "refuse", "fail-closed", DataGap.
3. From the hit-ranked top ~60 briefs, read enough of each to extract: (paper/method it summarizes) → (the concrete number or gate it measured) → (the GSE seam it names, if any) → (ADOPT / REBUILD / REFUSE / FOUNDER-GATED verdict as the brief itself states it).
4. Produce a digest table of up to 40 rows, ranked by how concrete the number is. Cite the exact brief path for every row. If a brief contains a number you cannot verify, quote it as the brief's claim — never as fact.
5. Also report: the c01–c07 directory structure (which r-numbers exist per c-dir, total counts), and anything labeled founder-gated.

Report: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\mimo-corpus-digest.md — structure census, the 40-row digest, and the founder-gated list.
