# MIND STAGING RECOUNT (Motif, 2026-11-07)

Rotation item from the wiring audit: the staging manifests' self-reported counts, recounted from the files (main HEAD c0c721cc8 trees; brain/mind.jsonl does NOT exist on main — staging is the whole mind corpus in-repo, per the standing single-writer wall: Motif never writes brain/mind.jsonl).

Manifest self-reports: mind_2026_11_05_manifest.json — total_records 1,389, trainer_ready 1,281 (92.22%), full_corpus_records 1,272, "pdf_pointers_hydrated 877/877", status verified_clean_deduplicated. mind_batch4_5_7_manifest.json — total 1,463, trainer_ready 1,292 (88.31%).

Recounts (every JSONL line parsed; 0 unparseable anywhere):
- mind_2026_11_05_full_corpus.jsonl: 1,389 lines, 1,281 trainer_ready — **manifest matches exactly.** (Its full_corpus_records 1,272 is a subset definition, not the line count.)
- mind_batch3_batch4 file: 1,463 lines, 1,292 trainer_ready — **batch manifest matches exactly.**
- mind_2026_11_06_mega_sweep_corpus.jsonl: 710 lines, 710 trainer_ready.
- mind_2026_11_06_zero_skip_theorems: 2,949 lines, 2,949 trainer_ready.
- downloads_225 corpus: 510 lines, 510 ready. wave8: 115/115. wave10: 240/240. wave11: 100/100. wave12: 169/169.
- master_aggregator_tnf_jax_bal: 31 lines, **0 flagged trainer_ready**. wave13 sheaf/navier-stokes: 114 lines, **0 flagged** — RESOLVED on inspection: both files simply use different record schemas that have no trainer_ready field at all (wave13 = document-chunk records with sha256 provenance; the aggregator file = runtime stream records). Not unflagged mind records — different record types sharing the staging folder.
- brain/feeds/unified_mind_staging_waves1_to_12: 6,250 lines, 5,899 trainer_ready (94.4%).
- **Staging total: 14,040 lines, 13,265 trainer_ready-flagged (94.48%), 0 corrupt lines.**

Note on totals: the files overlap by design (the unified feed aggregates waves 1–12; the batch file restates batch 3/4), so 14,040 is a line total across files, NOT a deduplicated record count. The manifests' two headline claims that could be checked exactly, checked out exactly — a cleaner result than most of tonight's fleet numbers.
