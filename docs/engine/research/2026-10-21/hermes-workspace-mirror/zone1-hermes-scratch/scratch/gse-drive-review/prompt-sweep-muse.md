Deep extraction pass 3. Do not modify G:\ or any Sports checkout. Extract ONLY to C:\Users\Garrett\AppData\Local\Temp\gse-extract\muse\. Write one report file.

First verify the dump path (use whichever exists): G:\My Drive\GSE. 10.2.26 OR G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26

Your slice: `arxiv-sweep-2026-10-02.zip` (1,380 entries) — its SCREENING PIPELINE ARTIFACTS. Prior passes read paper PDFs and the calibration briefs. Do not repeat those.

Your job — digest what the sweep's own scoring machinery decided:
1. Extract to your temp dir.
2. Read the pipeline artifacts: master.jsonl (~1.47MB), manifest.json, manifest-500.jsonl, batch_1..5.jsonl, scored_batch_1..5.jsonl, screened_batch_1..5.md, phase2-candidates-{bayes,calibration,causal,market,marketretry,merged,topup}.jsonl, phase2-triage-scored-*.jsonl, selection-750.jsonl, reserve-100.jsonl, skip-report.json, search stats, ledger-tracker.jsonl, RECONCILIATION-NOTES.md, existing-research-map.md.
3. Report with real counts from the files (never invented):
   a) Pipeline funnel: how many papers fetched → screened → scored → selected (750) → reserved (100) → skipped, at each stage, per the files' own counters.
   b) The scoring rubric the sweep used (read the code: fetch_arxiv.py, bayes_search/filter/rebuild/retry.py, build_manifest.py) — one paragraph, named functions.
   c) TOP-25 digest: the 25 highest-scored phase2 candidates with their score, title, arxiv id, and the scorer's one-line reason. Rank strictly by the numbers in the files; ties broken by id.
   d) Overlap: how many of the top-25 are ALREADY represented in the Sports repo (docs/arxiv-program/, packages/data-ingestion/ paper files, or the 1494/1704/1601 briefs) — check by arxiv id, name the file when found.
   e) The reconciliation math (64 existing IDs excluded, 42 in-corpus, 10 pilot exclusions) — verify those numbers against RECONCILIATION-NOTES.md and flag any mismatch.

Report: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\muse-sweep-digest.md — funnel counts, rubric, top-25 table, overlap verdicts, reconciliation check.
