# Revised Completion Report — Streams 12–14 (supersedes the 2026-10-22 claim of completion)

Status: **module-complete, record-incomplete.**
This report replaces the earlier version, which claimed completion on the strength of
shape tests and an incorrect body count. The evidence is in
`docs/ops/DEEP_REVIEW_2026-10-22.md`.

## 1. True coverage numbers

| Surface | Honest count |
|---|---|
| X records with an individually named, falsifiable test | **0 / 80** |
| X themes exercised by one function-level test | 8 / 8 |
| OSF posts fetched | 24 / 24 |
| OSF posts with an independent equation-level audit | **24 / 24** audited (138 claims; 18 mismatch claims open) |
| vitest tests | 49 passed; ~43 behavioral, ~6 shape-only |
| pytest tests | 7 passed; 5 behavioral, 2 accounting |
| P0 bugs found in deep review | 7 |
| P0 bugs fixed | 7 |
| P1 findings open | 15 |

The build is behaviorally tested at the module level. It is not tested at the record
or post level, and this report no longer claims otherwise.

## 2. Ingestion truth (corrected)

The first report said "1,727 conversation bodies". That was wrong: 1,075 of the 1,727
asset entries are PNG/MP3/MP4/ZIP binaries that were decoded as latin-1 text. Correct:

| Bucket | Count |
|---|---|
| Zip entries | 1,807 |
| Text conversation bodies | **652** |
| Binary assets (hashed, not text) | **1,075** |
| Non-body entries (thumbnails, previewdoc, webp) | 78 |
| Refused (auth, billing) | 2 |
| Sum | 1,807 |

Text-only body store: 130 MB (was 890 MB when binaries were misclassified).
Sanitizer redactions: 1,997 (was 3,358, inflated by binary text).

## 3. Verification run in this session

```
python scripts/ops/mine_grok_export_corpus.py --verify-deep
VERIFY OK entries=1807 assets=1727 text_bodies=652 binary_bodies=1075 non_bodies=78 refused=2 redactions=1997 sha256_mismatches=0

python scripts/ops/ingest_open_source_football.py --verify
VERIFY OK families=6 total_weight=5.944489 capped_movement=0.12 cap_bound=True

python scripts/ops/ingest_downloads_master_specs.py --verify
VERIFY OK docx=7 pdf=6 summaries=37 records=50 failures=0 text_chars=10691600

python scripts/ops/ingest_downloads_batch.py --verify
VERIFY OK sources=22 records=88 text_chars=21314650 redactions=66 kinds={'docx':1,'image':3,'text':10,'zip-binary':5,'zip-text':69}

python intelligence/ingestion/universal_handoff_feature_compiler.py --verify
VERIFY OK targetWeek=5 future_rows=0 known_rows=16 families=6

python scripts/ops/scan_sensitive.py
scan_sensitive: clean (180 files, default_paths=True)

pytest intelligence/tests/test_open_source_football_stream12.py
7 passed

vitest (3 files)
3 files passed, 49 tests passed
```

## 4. What is proven

- **±0.12 cap.** `master-situational-reasoning-aggregator.ts:198-202` sums
  probability-unit residuals, then clamps to ±0.12. A 10× over-cap input returns exactly
  ±0.12 and `capApplied: true`.
- **Week-5 leakage (documented path).** 0 future rows, 10,941 admitted rows.
- **Accounting.** 652 + 1,075 + 78 + 2 = 1,807; every zip entry has a disposition.
- **Hash integrity.** Every text body and every binary asset re-hashes clean against
  the zip.
- **Sanitizer bypass test.** Stripe, OpenAI, Anthropic, Google, Slack, Discord,
  private-key, JWT and Alibaba patterns each replace their marker in a unit test.
- **PASS discipline.** `publishAllowed: false` whenever `independentEdgeDecision` is
  `PASS` (test asserts it).

## 5. What is not proven / mislabeled

- **"Orthogonalized" families.** Only the market projection is removed; families are
  not orthogonal to each other. Off-diagonal Gram terms are non-zero.
- **"Epistemic variance".** Sample variance across five fixed deterministic heads — a
  deterministic disagreement measure, not an uncertainty estimate.
- **"Guided Grad-CAM".** Linear attribution `embedding · ReLU(head weight)`; no input
  gradient, no normalization, scores can be negative.
- **"80/80 records."** 0/80 individually named tests.
- **"24 posts verified."** 24 fetched, 0 independently audited.
- **"625 posts mined."** Unsubstantiated; correction appended to the corpus and locator.

## 6. P0 fixes landed in this review

1. Binary assets no longer ingested as text (`is_binary`, 890 MB → 130 MB).
2. Sanitizer covers Stripe/OpenAI/Anthropic/Google/Slack/Discord/private-key/JWT; `sk-`
   no longer masks the specific labels.
3. `scan_sensitive.py` bare command now scans 180 real files, not 0.
4. The 625-post claim is corrected in both source documents.
5. `--verify-deep` no longer crashes on a closed zip handle.
6. `rawUnshrunkDelta` is now recomputable from `familyRawDeltas` (11.9 exactly).
7. `shrunkUncappedDelta` now equals the precision-weighted sum the cap uses
   (0.970584…); the old 8.665 is preserved as `shrunkUnweightedDelta`.

## 7. Remaining P1 (not done)

1. Rename/rescope `orthogonalizeAndShrink` or add cross-family whitening.
2. Rename `epistemicVariance` → `headDisagreement`.
3. Rename `guidedGradCam` → `linearAttribution` or implement true Grad-CAM.
4. Build the 80-record table test (currently 0/80).
5. Finish the 24-post equation audit.
6. Add a warehouse file manifest with per-file sha256.
7. Make `inputHash` recomputable from the feed record.
8. Harden `fast_pbp_loader` against negative/NA/string weeks and duplicate rows.

## 8. Reproducibility

Rebuildable from committed artifacts: Grok index (zip path+sha recorded), Downloads
specs, user batch, OSF runtime feed, and the 24 OSF post texts (now committed under
`docs/engine/research/2026-10-22/osf-posts/`). Not rebuildable: warehouse priors
(root path only, no file hashes) and the aggregator record (hash of inputs not stored).
